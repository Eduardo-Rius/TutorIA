import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_DIRECTOR_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_DAYCARE_ID,
} from "../firstLightLabHarness";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";
import type { AuthenticationProvider } from "../../../application/ports/AuthenticationProvider";

describe("SR-MD-21C — Gobernanza de Aprobación Semanal e Integridad de Revisión en Lactantes B", () => {
  const PLAN_LACTANTES_B = "plan-lactantes-b-sr-md-21c";
  const PLAN_LACTANTES_A = "plan-lactantes-a-sr-md-21c";

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

  const createMockAuth = (uid: string = FIRST_LIGHT_DIRECTOR_ID): AuthenticationProvider => ({
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue({ uid, email: `${uid}@lab.tutoria.invalid` }),
  });

  const setupBasePlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    planId: string,
    roomId: string
  ): Promise<WeeklyPlanning> => {
    const plan = WeeklyPlanning.create(
      planId,
      FIRST_LIGHT_DAYCARE_ID,
      roomId,
      FIRST_LIGHT_TEACHER_ID,
      "2026-08-24",
      "2026-08-28"
    );
    const source = new DeterministicPedagogicalRecommendationSource();
    const days = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = days;
    plan.observations = "OBSERVACIÓN DE CONTROL — SR-MD-21 / LACTANTES B";
    plan.identifiedNeeds = "CONTROL SR-MD-21-LB-01";
    for (const d of plan.days) {
      plan.markTeacherDayReviewed(d.dayOfWeek, FIRST_LIGHT_TEACHER_ID, new Date());
    }
    plan.submit();
    await repo.save(plan);
    return plan;
  };

  it("1. Cinco días revisados y sin pendientes: aprobación habilitada", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const plan = await setupBasePlan(repo, PLAN_LACTANTES_B, "room-lactantes-b");
    const service = new PlanningWorkflowService(repo);

    // Marcar los 5 días como revisados por la Dirección
    await service.markDirectorDayReviewed(plan.planningId, "MONDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "TUESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "WEDNESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "THURSDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "FRIDAY", "DIRECTOR");

    window.history.replaceState({}, "", `/?planId=${plan.planningId}`);

    render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth()}
      />
    );

    // Indicador coherente: 5/5 días revisados
    await waitFor(() => {
      expect(screen.getByText(/5\/5 días revisados/i)).toBeTruthy();
    });

    // Botón habilitado y sin mensaje de días pendientes
    const approveBtn = screen.getByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i }) as HTMLButtonElement;
    expect(approveBtn.disabled).toBe(false);
    expect(screen.queryByText(/Días pendientes:/i)).toBeNull();
  });

  it("2. Cuatro días revisados y lunes pendiente: aprobación bloqueada y mensaje explícito", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const plan = await setupBasePlan(repo, PLAN_LACTANTES_B, "room-lactantes-b");
    const service = new PlanningWorkflowService(repo);

    // Solo martes a viernes revisados; lunes pendiente
    await service.markDirectorDayReviewed(plan.planningId, "TUESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "WEDNESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "THURSDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "FRIDAY", "DIRECTOR");

    window.history.replaceState({}, "", `/?planId=${plan.planningId}`);

    render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/4\/5 días revisados/i)).toBeTruthy();
    });

    const approveBtn = screen.getByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i }) as HTMLButtonElement;
    expect(approveBtn.disabled).toBe(true);
    expect(screen.getByText(/Días pendientes: Lunes/i)).toBeTruthy();
  });

  it("3. Observación del lunes atendida, pero revisión institucional aún pendiente: comportamiento correcto y explícito", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const plan = await setupBasePlan(repo, PLAN_LACTANTES_B, "room-lactantes-b");
    const service = new PlanningWorkflowService(repo);

    // Martes a viernes revisados
    await service.markDirectorDayReviewed(plan.planningId, "TUESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "WEDNESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "THURSDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "FRIDAY", "DIRECTOR");

    // Lunes tiene observación ya resuelta (atendida), pero su directorReviewed es false
    const latestPlan = (await repo.findById(plan.planningId))!;
    const mondayActId = latestPlan.days[0]!.activities[0]!.activityId;
    latestPlan.granularObservations = [
      {
        observationId: "obs-mon-1",
        targetId: mondayActId,
        activityId: mondayActId,
        observation: "Ajustar cascabeles",
        originalContent: "Original",
        currentContent: "Modificado por la asistente",
        status: "RESOLVED",
        reviewer: "DIRECTOR",
        authorRole: "DIRECTOR",
        resolvedBy: "Ceci",
        resolvedAt: new Date(),
        timestamp: new Date(),
      } as any,
    ];
    latestPlan.days[0]!.directorReviewed = false;
    await repo.save(latestPlan);

    window.history.replaceState({}, "", `/?planId=${plan.planningId}`);

    render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth()}
      />
    );

    // 1. Contador muestra 4/5 (NO 5/5 anticipado)
    await waitFor(() => {
      expect(screen.getByText(/4\/5 días revisados/i)).toBeTruthy();
    });

    // 2. Aprobación bloqueada con indicación explícita de Lunes
    const approveBtn = screen.getByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i }) as HTMLButtonElement;
    expect(approveBtn.disabled).toBe(true);
    expect(screen.getByText(/Días pendientes: Lunes/i)).toBeTruthy();

    // 3. Pestaña de Lunes activa: el botón de acción "Marcar día revisado" está DISPONIBLE
    expect(screen.getByRole("button", { name: /Marcar día revisado/i })).toBeTruthy();
  });

  it("4. Lunes nuevamente revisado tras atender observación: aprobación habilitada", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const plan = await setupBasePlan(repo, PLAN_LACTANTES_B, "room-lactantes-b");
    const service = new PlanningWorkflowService(repo);

    await service.markDirectorDayReviewed(plan.planningId, "TUESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "WEDNESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "THURSDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "FRIDAY", "DIRECTOR");

    const latestPlan = (await repo.findById(plan.planningId))!;
    const mondayActId = latestPlan.days[0]!.activities[0]!.activityId;
    latestPlan.granularObservations = [
      {
        observationId: "obs-mon-1",
        targetId: mondayActId,
        activityId: mondayActId,
        observation: "Ajustar cascabeles",
        originalContent: "Original",
        currentContent: "Modificado",
        status: "RESOLVED",
        reviewer: "DIRECTOR",
        authorRole: "DIRECTOR",
        resolvedBy: "Ceci",
        resolvedAt: new Date(),
        timestamp: new Date(),
      } as any,
    ];
    latestPlan.days[0]!.directorReviewed = false;
    await repo.save(latestPlan);

    window.history.replaceState({}, "", `/?planId=${plan.planningId}`);

    render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth()}
      />
    );

    await waitFor(() => expect(screen.getByText(/4\/5 días revisados/i)).toBeTruthy());

    // La Educadora revisa formalmente el lunes y hace clic en "Marcar día revisado"
    const markMondayBtn = screen.getByRole("button", { name: /Marcar día revisado/i });
    await act(async () => {
      fireEvent.click(markMondayBtn);
    });

    // Contador sube a 5/5
    await waitFor(() => {
      expect(screen.getByText(/5\/5 días revisados/i)).toBeTruthy();
    });

    // Botón pasa a "Día revisado" deshabilitado
    expect(screen.getByRole("button", { name: /Día revisado/i })).toBeTruthy();

    // Aprobación general habilitada
    const approveBtn = screen.getByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i }) as HTMLButtonElement;
    expect(approveBtn.disabled).toBe(false);
    expect(screen.queryByText(/Días pendientes:/i)).toBeNull();

    // Comprobar persistencia real en el repositorio
    const persisted = await repo.findById(plan.planningId);
    expect(persisted!.days[0]!.directorReviewed).toBe(true);
  });

  it("5. Recarga F5: el estado y la habilitación permanecen consistentes con el repositorio", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const plan = await setupBasePlan(repo, PLAN_LACTANTES_B, "room-lactantes-b");
    const service = new PlanningWorkflowService(repo);

    // Persistir todos los 5 días como revisados
    await service.markDirectorDayReviewed(plan.planningId, "MONDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "TUESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "WEDNESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "THURSDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "FRIDAY", "DIRECTOR");

    window.history.replaceState({}, "", `/?planId=${plan.planningId}`);

    // Montar Sesión 1
    const { unmount } = render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth()}
      />
    );

    await waitFor(() => expect(screen.getByText(/5\/5 días revisados/i)).toBeTruthy());
    const btnSession1 = screen.getByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i }) as HTMLButtonElement;
    expect(btnSession1.disabled).toBe(false);

    // Simular F5 / recarga
    unmount();

    // Montar Sesión 2
    render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth()}
      />
    );

    await waitFor(() => expect(screen.getByText(/5\/5 días revisados/i)).toBeTruthy());
    const btnSession2 = screen.getByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i }) as HTMLButtonElement;
    expect(btnSession2.disabled).toBe(false);
    expect(screen.queryByText(/Días pendientes:/i)).toBeNull();
  });

  it("6. Lactantes A no presenta regresiones en su flujo de revisión y aprobación", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const plan = await setupBasePlan(repo, PLAN_LACTANTES_A, "room-lactantes-a");
    const service = new PlanningWorkflowService(repo);

    await service.markDirectorDayReviewed(plan.planningId, "MONDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "TUESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "WEDNESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "THURSDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "FRIDAY", "DIRECTOR");

    window.history.replaceState({}, "", `/?planId=${plan.planningId}`);

    render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/5\/5 días revisados/i)).toBeTruthy();
    });

    const approveBtn = screen.getByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i }) as HTMLButtonElement;
    expect(approveBtn.disabled).toBe(false);
  });
});
