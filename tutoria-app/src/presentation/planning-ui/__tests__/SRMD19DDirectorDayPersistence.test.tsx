import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";
import { PlanningDemoApp } from "../PlanningDemoApp";

describe("SR-MD-19-E / D — Persistencia y Gobernanza de Revisión Diaria por Directora", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== "undefined" && window.history) {
      window.history.replaceState({}, "", "/");
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== "undefined" && window.history) {
      window.history.replaceState({}, "", "/");
    }
  });

  const setupTestEnvironment = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  it("1. Directora autorizada marca un día: persiste directorReviewed en repositorio y confirma con toast", async () => {
    const { repo, service, source } = setupTestEnvironment();

    const plan = WeeklyPlanning.create("plan-19e-1", "00000000-0000-4000-8000-000000000001", "room-lactantes-a", "lab-teacher-anita", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          role="DIRECTOR"
        />
      );
    });

    // Ubicar botón "Marcar día revisado" en el primer día (Lunes)
    const reviewDayBtn = screen.getByText("Marcar día revisado");
    expect(reviewDayBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(reviewDayBtn);
    });

    // Confirmación inequívoca en la UI
    await waitFor(() => {
      expect(screen.getByText("✓ Día marcado como revisado")).toBeTruthy();
    });

    // Botón cambia al estado persistido "Día revisado"
    await waitFor(() => {
      expect(screen.getByText("Día revisado")).toBeTruthy();
    });

    // Verificar en el repositorio que directorReviewed es true
    const persisted = await repo.findById("plan-19e-1");
    expect(persisted).not.toBeNull();
    expect(persisted!.days[0]!.directorReviewed).toBe(true);
    expect(persisted!.status).toBe("IN_REVIEW"); // La planeación sigue en IN_REVIEW
  });

  it("2. Recarga y recuperación del indicador persistido: sobrevive a remontaje", async () => {
    const { repo, service, source } = setupTestEnvironment();

    const plan = WeeklyPlanning.create("plan-19e-2", "00000000-0000-4000-8000-000000000001", "room-lactantes-a", "lab-teacher-anita", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    // Lunes y Martes ya fueron revisados y persistidos
    plan.days[0]!.directorReviewed = true;
    plan.days[1]!.directorReviewed = true;
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    // Simular carga de página (F5)
    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          role="DIRECTOR"
        />
      );
    });

    // En Lunes debe mostrar "Día revisado" directamente
    await waitFor(() => {
      expect(screen.getByText("Día revisado")).toBeTruthy();
    });

    // Mensaje de estado debe reflejar los días pendientes de revisión
    expect(screen.getByText(/Días pendientes: Miércoles, Jueves, Viernes/i)).toBeTruthy();

    // Navegar a Miércoles (día no revisado aún)
    const wedTab = screen.getByRole("tab", { name: /Miércoles 26/i });
    await act(async () => {
      fireEvent.click(wedTab);
    });

    // Miércoles presenta el botón activo "Marcar día revisado"
    expect(screen.getByText("Marcar día revisado")).toBeTruthy();
  });

  it("3. Cinco días marcados secuencialmente: contador alcanza 5/5 y habilita botón de aprobación", async () => {
    const { repo, service, source } = setupTestEnvironment();

    const plan = WeeklyPlanning.create("plan-19e-3", "00000000-0000-4000-8000-000000000001", "room-lactantes-a", "lab-teacher-anita", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          role="DIRECTOR"
        />
      );
    });

    const dayTabs = [
      /Lunes 24/i,
      /Martes 25/i,
      /Miércoles 26/i,
      /Jueves 27/i,
      /Viernes 28/i,
    ];

    for (let i = 0; i < 5; i++) {
      const tab = screen.getByRole("tab", { name: dayTabs[i]! });
      await act(async () => {
        fireEvent.click(tab);
      });

      const btn = await screen.findByText("Marcar día revisado");
      await act(async () => {
        fireEvent.click(btn);
      });

      await waitFor(() => {
        expect(screen.getByText("Día revisado")).toBeTruthy();
      });
    }

    // Todos los días quedaron revisados
    const finalPlan = await repo.findById("plan-19e-3");
    expect(finalPlan!.days.every(d => d.directorReviewed === true)).toBe(true);

    // Botón APROBAR TODA LA PLANEACIÓN debe estar habilitado
    const approveBtn = screen.getByText("✓ APROBAR TODA LA PLANEACIÓN").closest("button");
    expect(approveBtn).not.toBeNull();
    expect(approveBtn!.disabled).toBe(false);
  });

  it("4. Error de permisos: no aparece éxito falso, muestra error visible y no incrementa contador", async () => {
    const { repo, service, source } = setupTestEnvironment();

    const plan = WeeklyPlanning.create("plan-19e-4", "00000000-0000-4000-8000-000000000001", "room-lactantes-a", "lab-teacher-anita", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    // Simular error de permisos de Firestore
    vi.spyOn(service, "markDirectorDayReviewed").mockRejectedValueOnce(
      new Error("Missing or insufficient permissions")
    );

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          role="DIRECTOR"
        />
      );
    });

    const btn = screen.getByText("Marcar día revisado");
    await act(async () => {
      fireEvent.click(btn);
    });

    // Muestra error visible
    await waitFor(() => {
      expect(screen.getByText(/❌ Error al marcar día revisado/i)).toBeTruthy();
      expect(screen.getByText(/Missing or insufficient permissions/i)).toBeTruthy();
    });

    // NO debe mostrar toast de éxito
    expect(screen.queryByText("✓ Día marcado como revisado")).toBeNull();

    // El botón sigue en estado activo "Marcar día revisado" (no pasó a "Día revisado")
    expect(screen.getByText("Marcar día revisado")).toBeTruthy();

    // En el repositorio sigue false
    const current = await repo.findById("plan-19e-4");
    expect(current!.days[0]!.directorReviewed).toBeFalsy();
  });

  it("5. Error de red: no aparece éxito falso y muestra error visible", async () => {
    const { repo, service, source } = setupTestEnvironment();

    const plan = WeeklyPlanning.create("plan-19e-5", "00000000-0000-4000-8000-000000000001", "room-lactantes-a", "lab-teacher-anita", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    // Simular error de red
    vi.spyOn(service, "markDirectorDayReviewed").mockRejectedValueOnce(
      new Error("Network connection lost")
    );

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          role="DIRECTOR"
        />
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Marcar día revisado"));
    });

    await waitFor(() => {
      expect(screen.getByText(/❌ Error al marcar día revisado: Network connection lost/i)).toBeTruthy();
    });

    expect(screen.queryByText("✓ Día marcado como revisado")).toBeNull();
  });

  it("6. Negativa: Ceci no puede aprobar una planeación con algún directorReviewed: false, incluso cuando exista una observación granular RESOLVED en ese día", async () => {
    const { repo, service, source } = setupTestEnvironment();

    const plan = WeeklyPlanning.create("plan-19e-6", "00000000-0000-4000-8000-000000000001", "room-lactantes-a", "lab-teacher-anita", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    const monAct = recs[0]!.activities[0]!;

    // Observación en Lunes está RESOLVED
    plan.granularObservations = [
      {
        targetId: monAct.activityId,
        observation: "Quita infantiles y pon maternales",
        originalContent: "Cantar una canción infantil",
        currentContent: "Cantar una canción maternal",
        status: "RESOLVED",
        reviewer: "DIRECTOR",
        timestamp: new Date(),
        resolvedBy: "Ceci",
        resolvedAt: new Date(),
      },
    ];

    // Lunes tiene directorReviewed = false. Martes a Viernes tienen directorReviewed = true.
    plan.days[0]!.directorReviewed = false;
    plan.days[1]!.directorReviewed = true;
    plan.days[2]!.directorReviewed = true;
    plan.days[3]!.directorReviewed = true;
    plan.days[4]!.directorReviewed = true;
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          role="DIRECTOR"
        />
      );
    });

    // Se verifica el botón de aprobación
    const approveBtn = screen.getByText("✓ APROBAR TODA LA PLANEACIÓN").closest("button");
    expect(approveBtn).not.toBeNull();
    // La prueba exige que la aprobación esté bloqueada (disabled = true) porque Lunes tiene directorReviewed = false
    expect(approveBtn!.disabled).toBe(true);
  });
});
