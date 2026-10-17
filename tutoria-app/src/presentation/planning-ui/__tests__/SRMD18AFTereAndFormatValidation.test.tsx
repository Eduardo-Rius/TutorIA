import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import {
  FirstLightLabBanner,
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_ANITA_EMAIL,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_CECI_EMAIL,
  FIRST_LIGHT_DIRECTOR_ID,
  FIRST_LIGHT_TERE_EMAIL,
  FIRST_LIGHT_SUPERVISOR_ID,
  FIRST_LIGHT_DAYCARE_ID,
  FIRST_LIGHT_PLANNING_ID,
} from "../firstLightLabHarness";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";
import { DIRECT_PDA_CATALOG } from "../../../domain/planning/DirectCurricularCatalog";
import type { AuthenticationProvider } from "../../../application/ports/AuthenticationProvider";

describe("SR-MD-18-AF — Tere Enablement & Official Format Line-Break Fidelity", () => {
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

  const createMockAuth = (uid: string | null): AuthenticationProvider => ({
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue(uid ? { uid, email: `${uid}@lab.tutoria.invalid` } : null),
  });

  const createClosedPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    planningId = FIRST_LIGHT_PLANNING_ID
  ) => {
    const plan = WeeklyPlanning.create(
      planningId,
      FIRST_LIGHT_DAYCARE_ID,
      "room-lactantes-a",
      FIRST_LIGHT_TEACHER_ID,
      "2026-08-24",
      "2026-08-28"
    );
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.observations = "Observaciones de lactantes A";
    plan.identifiedNeeds = "Fortalecer motricidad fina";
    plan.specialSituations = "Dos subgrupos etarios";
    plan.availableMaterials = "Libros de tela lavables";

    // Add explicit adaptations with line breaks to Monday activity description
    plan.days[0]!.activities[0]!.description =
      "Lectura compartida.\n• Adaptación 43 días a 3 meses: En brazos.\n• Adaptación 4 a 6 meses: En colchoneta.";

    // Set canonical PDA on Monday
    const pda2 = DIRECT_PDA_CATALOG[1]!; // TUTORIA-PDA-0002
    plan.setActivityCurricularTraceability("MONDAY", plan.days[0]!.activities[0]!.activityId, [
      { pdaId: pda2.id, catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" },
    ]);

    // Approve evaluations on all 5 days
    for (const d of plan.days) {
      d.evaluation = `Evaluación aprobada para ${d.dayOfWeek}`;
      d.evaluationStatus = "APPROVED";
    }

    plan.status = "CLOSED";
    plan.closedBy = FIRST_LIGHT_DIRECTOR_ID;
    plan.closedAt = new Date();
    await repo.save(plan);
    return { plan, pda2 };
  };

  it("1. Anita puede iniciar sesión y conservar su rol TEACHER", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const { unmount } = render(
      <FirstLightLabBanner
        isEligible={true}
        authenticatedEmail={null}
        onLogin={mockLogin}
        onLogout={vi.fn()}
      />
    );

    const select = screen.getByTestId("first-light-identity-select");
    fireEvent.change(select, { target: { value: "TEACHER" } });
    const input = screen.getByTestId("first-light-password-input");
    fireEvent.change(input, { target: { value: "pass-anita" } });
    fireEvent.click(screen.getByTestId("first-light-login-btn"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("pass-anita", FIRST_LIGHT_ANITA_EMAIL);
    });

    unmount();

    // Verify PlanningDemoApp bootstrap for Anita
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_TEACHER_ID);

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
        />
      );
    });

    expect(screen.getByText("Anita (Pedagoga)")).toBeTruthy();
  });

  it("2. Ceci puede iniciar sesión y conservar su rol DIRECTOR", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const { unmount } = render(
      <FirstLightLabBanner
        isEligible={true}
        authenticatedEmail={null}
        onLogin={mockLogin}
        onLogout={vi.fn()}
      />
    );

    const select = screen.getByTestId("first-light-identity-select");
    fireEvent.change(select, { target: { value: "DIRECTOR" } });
    const input = screen.getByTestId("first-light-password-input");
    fireEvent.change(input, { target: { value: "pass-ceci" } });
    fireEvent.click(screen.getByTestId("first-light-login-btn"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("pass-ceci", FIRST_LIGHT_CECI_EMAIL);
    });

    unmount();

    // Verify PlanningDemoApp bootstrap for Ceci
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_DIRECTOR_ID);

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
        />
      );
    });

    expect(screen.getByText("Ceci (Directora)")).toBeTruthy();
  });

  it("3. Tere puede iniciar sesión en LAB y obtener SUPERVISOR", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const { unmount } = render(
      <FirstLightLabBanner
        isEligible={true}
        authenticatedEmail={null}
        onLogin={mockLogin}
        onLogout={vi.fn()}
      />
    );

    const select = screen.getByTestId("first-light-identity-select");
    fireEvent.change(select, { target: { value: "SUPERVISOR" } });
    const input = screen.getByTestId("first-light-password-input");
    expect(input.getAttribute("placeholder")).toBe("Contraseña de Directora LAB");
    fireEvent.change(input, { target: { value: "pass-tere" } });
    fireEvent.click(screen.getByTestId("first-light-login-btn"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("pass-tere", FIRST_LIGHT_TERE_EMAIL);
    });

    unmount();

    // Verify PlanningDemoApp bootstrap for Tere
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    await createClosedPlan(repo, source);
    const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
        />
      );
    });

    // Should render SupervisorList
    expect(screen.getByText("Registros semanales cerrados")).toBeTruthy();
    // Tere persona button should be active and styled
    const tereBtn = (screen.getByTestId("role-btn-supervisor") || screen.getByRole("button", { name: /Directora/i })) as HTMLButtonElement;
    expect(tereBtn).toBeTruthy();
    expect(tereBtn.disabled).toBe(false);
    expect(tereBtn.className).toContain("bg-role-supervisor");
  });

  it("4. Una identidad ajena a las tres autorizadas sigue siendo rechazada", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth("lab-unauthorized-impostor");

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
        />
      );
    });

    expect(screen.getByTestId("lab-bootstrap-error")).toBeTruthy();
    expect(
      screen.getByText("La identidad autenticada no corresponde a un usuario autorizado en First Light LAB.")
    ).toBeTruthy();
  });

  it("5. Tere puede consultar únicamente expedientes cerrados dentro de su alcance", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();

    // Create a closed plan and an active (approved) plan
    const { plan: closedPlan } = await createClosedPlan(repo, source, "plan-closed-1");

    const draftPlan = WeeklyPlanning.create(
      "plan-draft-2",
      FIRST_LIGHT_DAYCARE_ID,
      "room-lactantes-a",
      FIRST_LIGHT_TEACHER_ID,
      "2026-08-24",
      "2026-08-28"
    );
    draftPlan.days = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    draftPlan.status = "APPROVED_FOR_EXECUTION";
    await repo.save(draftPlan);

    const supervisorPlans = await service.listSupervisorClosedPlanning("SUPERVISOR", FIRST_LIGHT_DAYCARE_ID);
    expect(supervisorPlans.length).toBe(1);
    expect(supervisorPlans[0]!.planningId).toBe("plan-closed-1");
  });

  it("6. Tere no puede modificar, aprobar, rechazar ni cerrar planeaciones", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    await createClosedPlan(repo, source, "plan-1");

    await expect(service.approve("plan-1", "SUPERVISOR", "Tere")).rejects.toThrow(
      "Only Director can approve planning"
    );
    await expect(service.reject("plan-1", "Feedback", "Tere", "SUPERVISOR")).rejects.toThrow(
      "Only Director can reject planning"
    );
    await expect(service.closeWeek("plan-1", "SUPERVISOR", "Tere")).rejects.toThrow(
      "Only Director can formally close the week"
    );
    await expect(
      service.saveDailyEvaluationDraft("plan-1", "MONDAY", "Draft", "SUPERVISOR", "2026-08-24")
    ).rejects.toThrow("Only Teacher can save daily evaluation draft");
  });

  it("7. La vista de supervisión permite acceder al formato oficial IMSS", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    await createClosedPlan(repo, source, "plan-closed-official");
    const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
        />
      );
    });

    // Click on the closed planning in SupervisorList
    const planCard = screen.getByText(/Semana del 24 al 28 de agosto/i).closest("button")!;
    await act(async () => {
      fireEvent.click(planCard);
    });

    // In SupervisorReview, click "VER VERSIÓN OFICIAL IMSS"
    const viewOfficialBtn = screen.getByText("VER VERSIÓN OFICIAL IMSS");
    await act(async () => {
      fireEvent.click(viewOfficialBtn);
    });

    // Verify PrintableView renders
    expect(screen.getAllByText(/3D11-009-003/).length).toBeGreaterThan(0);
    expect(screen.getByText("Imprimir PDF")).toBeTruthy();
  });

  it("8. Las adaptaciones de Lactantes A conservan sus saltos de línea con whitespace-pre-line", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    await createClosedPlan(repo, source, "plan-whitespace-test");
    const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
        />
      );
    });

    // Navigate to PrintableView
    const planCard = screen.getByText(/Semana del 24 al 28 de agosto/i).closest("button")!;
    await act(async () => {
      fireEvent.click(planCard);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("VER VERSIÓN OFICIAL IMSS"));
    });

    // Locate the description paragraph containing adaptations
    const adaptationText = screen.getByText(/• Adaptación 43 días a 3 meses: En brazos/);
    expect(adaptationText.className).toContain("whitespace-pre-line");
  });

  it("9. El formato sigue mostrando únicamente las referencias PDA realmente registradas", async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    const { pda2 } = await createClosedPlan(repo, source, "plan-pda-test");
    const mockAuth = createMockAuth(FIRST_LIGHT_SUPERVISOR_ID);

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
        />
      );
    });

    // Navigate to PrintableView
    const planCard = screen.getByText(/Semana del 24 al 28 de agosto/i).closest("button")!;
    await act(async () => {
      fireEvent.click(planCard);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("VER VERSIÓN OFICIAL IMSS"));
    });

    // In Monday's reverso, verify pda2 mark is present
    const mondayReverso = screen.getByTestId("direct-reverso-MONDAY");
    expect(within(mondayReverso).getByTestId(`pda-mark-${pda2.id}`)).toBeTruthy();

    // Verify unreferenced PDA (e.g. pda 0001) is unmarked
    const pda1 = DIRECT_PDA_CATALOG[0]!;
    expect(within(mondayReverso).getByTestId(`pda-unmarked-${pda1.id}`)).toBeTruthy();
  });
});
