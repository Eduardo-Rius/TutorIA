import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";
import { PlanningDemoApp } from "../PlanningDemoApp";

describe("SR-MD-19-B — Flujo de Atención de Observaciones por Directora (Ceci)", () => {
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

  it("1. Ceci visualiza observación modificada por Anita y pulsa MARCAR COMO ATENDIDA con confirmación inequívoca", async () => {
    const { repo, service, source } = setupTestEnvironment();

    // Crear planeación en IN_REVIEW con observación en estado CHANGED_BY_EDUCATOR
    const plan = WeeklyPlanning.create("plan-sr19b-1", "00000000-0000-4000-8000-000000000001", "room-lactantes-a", "lab-teacher-anita", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs inicial", "Needs", "Sit", "Mat");
    plan.days = recs;
    const targetActivity = recs[0]!.activities[0]!;

    plan.granularObservations = [
      {
        targetId: targetActivity.activityId,
        observation: "Reemplazar pelotas duras por esponja",
        originalContent: "Pelotas de plástico",
        currentContent: "Pelotas de esponja lavables",
        status: "CHANGED_BY_EDUCATOR",
        reviewer: "Ceci",
        timestamp: new Date(),
      },
    ];
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    // Renderizar aplicación como Ceci (DIRECTOR)
    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          role="DIRECTOR"
        />
      );
    });

    // Expandir la actividad
    const reviewActBtn = screen.getAllByText("Revisar")[0]!;
    await act(async () => {
      fireEvent.click(reviewActBtn);
    });

    // Verificar que se ve la observación previa, antes y ahora
    expect(screen.getByText("MI OBSERVACIÓN PREVIA:")).toBeTruthy();
    expect(screen.getByText("Reemplazar pelotas duras por esponja")).toBeTruthy();
    expect(screen.getByText("Pelotas de plástico")).toBeTruthy();
    expect(screen.getByText("Pelotas de esponja lavables")).toBeTruthy();

    // Localizar botón MARCAR COMO ATENDIDA
    const markAttendedBtn = screen.getByText("MARCAR COMO ATENDIDA");
    expect(markAttendedBtn).toBeTruthy();

    // Pulsar botón
    await act(async () => {
      fireEvent.click(markAttendedBtn);
    });

    // Verificar confirmación inequívoca en la UI
    await waitFor(() => {
      expect(screen.getByText("OBSERVACIÓN ATENDIDA")).toBeTruthy();
    });

    // Verificar persistencia en el repositorio
    const persistedPlan = await repo.findById("plan-sr19b-1");
    expect(persistedPlan).not.toBeNull();
    expect(persistedPlan!.status).toBe("IN_REVIEW"); // La planeación sigue en IN_REVIEW
    expect(persistedPlan!.granularObservations[0]!.status).toBe("RESOLVED");
    expect(persistedPlan!.granularObservations[0]!.resolvedBy).toBe("Ceci");

    // Invariante de seguridad: 'days' NO fue mutado (no se agregó directorReviewed al array de la educadora)
    for (const d of persistedPlan!.days) {
      expect((d as any).directorReviewed).toBeFalsy();
    }
  });

  it("2. Estado RESOLVED se conserva tras recarga y permite continuar revisando otros días", async () => {
    const { repo, service, source } = setupTestEnvironment();

    const plan = WeeklyPlanning.create("plan-sr19b-2", "00000000-0000-4000-8000-000000000001", "room-lactantes-a", "lab-teacher-anita", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    const monAct = recs[0]!.activities[0]!;
    const wedAct = recs[2]!.activities[0]!;

    plan.granularObservations = [
      {
        targetId: monAct.activityId,
        observation: "Ajuste Lunes",
        originalContent: "Original Lunes",
        currentContent: "Corregido Lunes",
        status: "RESOLVED", // Ya resuelto previamente
        reviewer: "Ceci",
        timestamp: new Date(),
        resolvedBy: "Ceci",
        resolvedAt: new Date(),
      },
      {
        targetId: wedAct.activityId,
        observation: "Ajuste Miércoles",
        originalContent: "Original Miércoles",
        currentContent: "Corregido Miércoles",
        status: "CHANGED_BY_EDUCATOR", // Pendiente de atender
        reviewer: "Ceci",
        timestamp: new Date(),
      },
    ];
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    // Simular carga inicial tras F5
    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          role="DIRECTOR"
        />
      );
    });

    // Lunes debe mostrar el badge de resuelto directamente
    const reviewMonBtn = screen.getAllByText("Revisar")[0]!;
    await act(async () => {
      fireEvent.click(reviewMonBtn);
    });
    expect(screen.getByText("OBSERVACIÓN ATENDIDA")).toBeTruthy();
    expect(screen.queryByText("MARCAR COMO ATENDIDA")).toBeNull();

    // Navegar a Miércoles
    const wedTab = screen.getByRole("tab", { name: /Miércoles 26/i });
    await act(async () => {
      fireEvent.click(wedTab);
    });

    // Expandir actividad de Miércoles
    const reviewWedBtn = screen.getAllByText("Revisar")[0]!;
    await act(async () => {
      fireEvent.click(reviewWedBtn);
    });

    // Miércoles aún tiene el botón activo
    expect(screen.getByText("MARCAR COMO ATENDIDA")).toBeTruthy();
  });

  it("3. Error en persistencia muestra mensaje de error y no reporta falso éxito", async () => {
    const { repo, service, source } = setupTestEnvironment();

    const plan = WeeklyPlanning.create("plan-sr19b-3", "00000000-0000-4000-8000-000000000001", "room-lactantes-a", "lab-teacher-anita", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    const targetActivity = recs[0]!.activities[0]!;

    plan.granularObservations = [
      {
        targetId: targetActivity.activityId,
        observation: "Ajuste",
        originalContent: "Orig",
        currentContent: "Corr",
        status: "CHANGED_BY_EDUCATOR",
        reviewer: "Ceci",
        timestamp: new Date(),
      },
    ];
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    // Simular fallo de repositorio (e.g. permission-denied de Firestore)
    vi.spyOn(service, "resolveGranularObservation").mockRejectedValueOnce(
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

    await act(async () => {
      fireEvent.click(screen.getAllByText("Revisar")[0]!);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("MARCAR COMO ATENDIDA"));
    });

    // Debe mostrar mensaje de error explícito y NO reportar éxito
    await waitFor(() => {
      expect(screen.getByText(/❌ Error al marcar atendida/i)).toBeTruthy();
    });

    // La observación en el repositorio sigue en CHANGED_BY_EDUCATOR
    const currentPlan = await repo.findById("plan-sr19b-3");
    expect(currentPlan!.granularObservations[0]!.status).toBe("CHANGED_BY_EDUCATOR");
  });
});
