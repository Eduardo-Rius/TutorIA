import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { PlanningDemoApp, getInstitutionalActorLabel } from "../PlanningDemoApp";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import type { AuthenticationProvider } from "../../../application/ports/AuthenticationProvider";
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_DAYCARE_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_DIRECTOR_ID,
  FIRST_LIGHT_CECI_EMAIL,
  FIRST_LIGHT_G002_DAYCARE_ID,
  FIRST_LIGHT_G002_TEACHER_ID,
  FIRST_LIGHT_G002_TEACHER_EMAIL,
  FIRST_LIGHT_G002_DIRECTOR_ID,
  FIRST_LIGHT_G002_DIRECTOR_EMAIL,
  FIRST_LIGHT_G002_SUPERVISOR_ID,
  FIRST_LIGHT_G002_SUPERVISOR_EMAIL,
} from "../firstLightLabHarness";

describe("SR-MD-26N — Incidente de Autorización Educadora G002 & Aislamiento de Guarderías", () => {
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

  const createMockAuth = (
    uid: string = FIRST_LIGHT_G002_DIRECTOR_ID,
    email: string = FIRST_LIGHT_G002_DIRECTOR_EMAIL
  ): AuthenticationProvider => ({
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue({ uid, email }),
  });

  const setupBasePlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    planId: string,
    daycareId: string,
    teacherId: string,
    roomId: string = "room-lactantes-b"
  ): Promise<WeeklyPlanning> => {
    const plan = WeeklyPlanning.create(
      planId,
      daycareId,
      roomId,
      teacherId,
      "2026-08-24",
      "2026-08-28"
    );
    const source = new DeterministicPedagogicalRecommendationSource();
    const days = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = days;
    plan.observations = "OBSERVACIÓN DE CONTROL — SR-MD-26N G002";
    plan.identifiedNeeds = "CONTROL SR-MD-26N-01";
    for (const d of plan.days) {
      plan.markTeacherDayReviewed(d.dayOfWeek, teacherId, new Date());
    }
    plan.submit();
    await repo.save(plan);
    return plan;
  };

  it("1. Educadora G002 accede exitosamente a planeación de su guardería (G002) sin pantalla de error", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const planId = "3a705e9b-6f0c-424a-90eb-07ca3c451501";
    const plan = await setupBasePlan(
      repo,
      planId,
      FIRST_LIGHT_G002_DAYCARE_ID,
      FIRST_LIGHT_G002_TEACHER_ID,
      "room-lactantes-b"
    );
    const service = new PlanningWorkflowService(repo);

    window.history.replaceState({}, "", `/?planId=${planId}`);

    render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth(FIRST_LIGHT_G002_DIRECTOR_ID, FIRST_LIGHT_G002_DIRECTOR_EMAIL)}
      />
    );

    // No debe mostrar el bloqueo "Acceso No Autorizado"
    await waitFor(() => {
      expect(screen.queryByTestId("director-auth-error")).toBeNull();
      expect(screen.queryByText(/La sesión actual no corresponde a la Dirección autorizada/i)).toBeNull();
    });

    // Debe mostrar la vista de revisión de la Educadora (botón de retorno y nombre de sala)
    await waitFor(() => {
      expect(screen.getByText(/← Volver al listado/i)).toBeTruthy();
      expect(screen.getByText(/Lactantes B/i)).toBeTruthy();
    });
  });

  it("2. Educadora G002 puede revisar todos los días y aprobar la planeación, registrando su UID", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const planId = "plan-g002-approval-test";
    const plan = await setupBasePlan(
      repo,
      planId,
      FIRST_LIGHT_G002_DAYCARE_ID,
      FIRST_LIGHT_G002_TEACHER_ID,
      "room-lactantes-b"
    );
    const service = new PlanningWorkflowService(repo);

    // Marcar los 5 días como revisados por la Dirección de G002
    await service.markDirectorDayReviewed(plan.planningId, "MONDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "TUESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "WEDNESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "THURSDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "FRIDAY", "DIRECTOR");

    window.history.replaceState({}, "", `/?planId=${planId}`);

    render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth(FIRST_LIGHT_G002_DIRECTOR_ID, FIRST_LIGHT_G002_DIRECTOR_EMAIL)}
      />
    );

    // Esperar a que el botón de aprobación esté habilitado
    await waitFor(() => {
      const approveBtn = screen.getByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i }) as HTMLButtonElement;
      expect(approveBtn.disabled).toBe(false);
    });

    const approveBtn = screen.getByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i });
    fireEvent.click(approveBtn);

    // Verificar en el repositorio que el plan fue aprobado con el UID de la Educadora G002 y NO con "Ceci"
    await waitFor(async () => {
      const updated = await service.getPlanning(planId);
      expect(updated?.status).toBe("APPROVED");
      expect(updated?.approvedBy).toBe(FIRST_LIGHT_G002_DIRECTOR_ID);
    });
  });

  it("3. Aislamiento entre guarderías: Educadora G002 NO puede acceder a planeación de G001", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const g001PlanId = "plan-g001-isolated";
    await setupBasePlan(
      repo,
      g001PlanId,
      FIRST_LIGHT_DAYCARE_ID,
      FIRST_LIGHT_TEACHER_ID,
      "room-lactantes-a"
    );
    const service = new PlanningWorkflowService(repo);

    // Navegar a plan de G001 con sesión de Educadora G002
    window.history.replaceState({}, "", `/?planId=${g001PlanId}`);

    render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth(FIRST_LIGHT_G002_DIRECTOR_ID, FIRST_LIGHT_G002_DIRECTOR_EMAIL)}
      />
    );

    // Debe mostrar error de aislamiento: no pertenece a la estancia autorizada
    await waitFor(() => {
      expect(screen.getByText(/La planeación solicitada no pertenece a la estancia autorizada/i)).toBeTruthy();
    });

    // Cero exposición del contenido pedagógico
    expect(screen.queryByText(/← Volver al listado/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i })).toBeNull();
  });

  it("4. Aislamiento inverso: Educadora Ceci (G001) NO puede acceder a planeación de G002", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const g002PlanId = "plan-g002-isolated-from-ceci";
    await setupBasePlan(
      repo,
      g002PlanId,
      FIRST_LIGHT_G002_DAYCARE_ID,
      FIRST_LIGHT_G002_TEACHER_ID,
      "room-lactantes-b"
    );
    const service = new PlanningWorkflowService(repo);

    // Navegar a plan de G002 con sesión de Educadora Ceci de G001
    window.history.replaceState({}, "", `/?planId=${g002PlanId}`);

    render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth(FIRST_LIGHT_DIRECTOR_ID, FIRST_LIGHT_CECI_EMAIL)}
      />
    );

    // Debe bloquearse con error explícito de estancia no autorizada
    await waitFor(() => {
      expect(screen.getByText(/La planeación solicitada no pertenece a la estancia autorizada/i)).toBeTruthy();
    });

    expect(screen.queryByText(/← Volver al listado/i)).toBeNull();
  });

  it("5. Educadora G002 no puede asumir el rol Directora (SUPERVISOR)", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const planId = "plan-g002-role-guard";
    await setupBasePlan(
      repo,
      planId,
      FIRST_LIGHT_G002_DAYCARE_ID,
      FIRST_LIGHT_G002_TEACHER_ID,
      "room-lactantes-b"
    );
    const service = new PlanningWorkflowService(repo);

    window.history.replaceState({}, "", `/?planId=${planId}`);

    render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth(FIRST_LIGHT_G002_DIRECTOR_ID, FIRST_LIGHT_G002_DIRECTOR_EMAIL)}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/← Volver al listado/i)).toBeTruthy();
    });

    // El botón de Directora debe estar deshabilitado
    const supervisorBtn = screen.getByTestId("role-btn-supervisor") as HTMLButtonElement;
    expect(supervisorBtn.disabled).toBe(true);

    // Intentar click no debe cambiar el rol a SUPERVISOR
    fireEvent.click(supervisorBtn);
    expect(screen.queryByText(/Contenido de la Planeación y Evaluaciones \(Lectura Institucional\)/i)).toBeNull();
  });

  it("6. getInstitutionalActorLabel reconoce correctamente actores y correos de G002", () => {
    // Asistente Educativa G002
    expect(getInstitutionalActorLabel(FIRST_LIGHT_G002_TEACHER_ID)).toBe("Asistente Educativa");
    expect(getInstitutionalActorLabel(FIRST_LIGHT_G002_TEACHER_EMAIL)).toBe("Asistente Educativa");
    expect(getInstitutionalActorLabel(FIRST_LIGHT_G002_TEACHER_ID, "room-lactantes-b")).toBe("Asistente Educativa LB");

    // Educadora G002
    expect(getInstitutionalActorLabel(FIRST_LIGHT_G002_DIRECTOR_ID)).toBe("Educadora");
    expect(getInstitutionalActorLabel(FIRST_LIGHT_G002_DIRECTOR_EMAIL)).toBe("Educadora");

    // Directora G002
    expect(getInstitutionalActorLabel(FIRST_LIGHT_G002_SUPERVISOR_ID)).toBe("Directora");
    expect(getInstitutionalActorLabel(FIRST_LIGHT_G002_SUPERVISOR_EMAIL)).toBe("Directora");
  });

  it("7. No regresión: Educadora Ceci en G001 puede seguir revisando y aprobando normalmente", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const g001PlanId = "plan-g001-ceci-regression";
    const plan = await setupBasePlan(
      repo,
      g001PlanId,
      FIRST_LIGHT_DAYCARE_ID,
      FIRST_LIGHT_TEACHER_ID,
      "room-lactantes-a"
    );
    const service = new PlanningWorkflowService(repo);

    await service.markDirectorDayReviewed(plan.planningId, "MONDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "TUESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "WEDNESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "THURSDAY", "DIRECTOR");
    await service.markDirectorDayReviewed(plan.planningId, "FRIDAY", "DIRECTOR");

    window.history.replaceState({}, "", `/?planId=${g001PlanId}`);

    render(
      <PlanningDemoApp
        service={service}
        source={new DeterministicPedagogicalRecommendationSource()}
        initialRole="DIRECTOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: "true",
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth(FIRST_LIGHT_DIRECTOR_ID, FIRST_LIGHT_CECI_EMAIL)}
      />
    );

    await waitFor(() => {
      const approveBtn = screen.getByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i }) as HTMLButtonElement;
      expect(approveBtn.disabled).toBe(false);
    });

    const approveBtn = screen.getByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i });
    fireEvent.click(approveBtn);

    await waitFor(async () => {
      const updated = await service.getPlanning(g001PlanId);
      expect(updated?.status).toBe("APPROVED");
      expect(updated?.approvedBy).toBe(FIRST_LIGHT_DIRECTOR_ID);
    });
  });
});
