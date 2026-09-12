import React from "react";
import { render, screen, fireEvent, act, waitFor, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";
import { DIRECT_PDA_CATALOG } from "../../../domain/planning/DirectCurricularCatalog";

describe("Tere Closed Curricular Visibility (H1R9-F.5.3.11)", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createPlanWithPDAs = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    planningId = "plan-tere-1"
  ) => {
    const plan = WeeklyPlanning.create(
      planningId,
      "d1",
      "lactantes-c",
      "t1",
      "2026-08-24",
      "2026-08-28"
    );
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.observations = "Observaciones de grupo";
    plan.identifiedNeeds = "Necesidades identificadas";
    plan.specialSituations = "Situaciones especiales";
    plan.availableMaterials = "Materiales disponibles";

    // Set canonical PDA on Monday first activity
    const pda1 = DIRECT_PDA_CATALOG[0]!;
    plan.setActivityCurricularTraceability("MONDAY", plan.days[0]!.activities[0]!.activityId, [
      { pdaId: pda1.id, catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" },
    ]);

    // Set canonical PDA on Friday last activity (De lo Humano y lo Comunitario)
    const pda28 = DIRECT_PDA_CATALOG.find((e) => e.id === "TUTORIA-PDA-0028")!;
    const friLastAct = plan.days[4]!.activities[plan.days[4]!.activities.length - 1]!;
    plan.setActivityCurricularTraceability("FRIDAY", friLastAct.activityId, [
      { pdaId: pda28.id, catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" },
    ]);

    await repo.save(plan);
    return { plan, pda1, pda28, friLastActId: friLastAct.activityId };
  };

  it("1. Negative visibility: Tere cannot see plannings before CLOSED (APPROVED_FOR_EXECUTION and READY_FOR_CLOSURE are hidden)", async () => {
    const { repo, service, source } = createTestDeps();
    const { plan } = await createPlanWithPDAs(repo, source);

    // State 1: APPROVED_FOR_EXECUTION
    plan.status = "APPROVED_FOR_EXECUTION";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repo.save(plan);

    const supervisorApproved = await service.listSupervisorApprovedPlanning("SUPERVISOR");
    expect(supervisorApproved.length).toBe(1);

    const supervisorClosed = await service.listSupervisorClosedPlanning("SUPERVISOR");
    expect(supervisorClosed.length).toBe(0);

    // Render Tere view
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Tere (Supervisora)"));
    });

    expect(screen.getByText("Aún no hay semanas cerradas para supervisión.")).toBeDefined();
    expect(screen.queryByText("Guardería IMSS Demo (001)")).toBeNull();

    // State 2: 5/5 daily evaluations approved -> READY_FOR_CLOSURE
    for (let i = 0; i < 5; i++) {
      plan.days[i]!.evaluation = `Evaluación día ${i + 1}`;
      plan.days[i]!.evaluationStatus = "APPROVED";
    }
    expect(plan.isReadyForClosure).toBe(true);
    await repo.save(plan);

    const supervisorClosed2 = await service.listSupervisorClosedPlanning("SUPERVISOR");
    expect(supervisorClosed2.length).toBe(0);
  });

  it("2. Real lifecycle & read-only consultation: Tere opens legitimately CLOSED planning and sees stored PDAs without edit controls", async () => {
    const { repo, service, source } = createTestDeps();
    const planningId = "plan-tere-closed-canonical";
    const { plan, pda1, pda28 } = await createPlanWithPDAs(repo, source, planningId);

    // Complete evaluation lifecycle and close week
    plan.status = "APPROVED_FOR_EXECUTION";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    for (let i = 0; i < 5; i++) {
      plan.days[i]!.evaluation = `Evaluación día ${i + 1}`;
      plan.days[i]!.evaluationStatus = "APPROVED";
    }
    await repo.save(plan);

    // Close week via service
    await service.closeWeek(planningId, "DIRECTOR", "Ceci");
    const closedPlan = await repo.findById(planningId);
    expect(closedPlan!.status).toBe("CLOSED");

    // Mount PlanningDemoApp and switch to Tere
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Tere (Supervisora)"));
    });

    // Tere sees closed record in her consultation list
    await waitFor(() => {
      expect(screen.getByText("Registros semanales cerrados")).toBeDefined();
    });

    const closedItemBtn = screen.getByText("Guardería IMSS Demo (001)");
    expect(closedItemBtn).toBeDefined();

    // Click to open SupervisorReview
    await act(async () => {
      fireEvent.click(closedItemBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Contenido de la Planeación y Evaluaciones/i)).toBeDefined();
    });

    // Assert SAME planningId
    expect(closedPlan!.planningId).toBe(planningId);

    // Monday first activity: check stored PDA TUTORIA-PDA-0001
    const pda1Card = screen.getByTestId(`selected-pda-${pda1.id}`);
    expect(within(pda1Card).getByText(pda1.campoFormativo)).toBeDefined();
    expect(within(pda1Card).getByText(new RegExp(pda1.contenido.trim(), "i"))).toBeDefined();
    expect(within(pda1Card).getByText(pda1.pda)).toBeDefined();

    // Friday last activity: check stored PDA TUTORIA-PDA-0028 (De lo Humano y lo Comunitario)
    const pda28Card = screen.getByTestId(`selected-pda-${pda28.id}`);
    expect(within(pda28Card).getByText(pda28.campoFormativo)).toBeDefined();
    expect(within(pda28Card).getByText(pda28.pda)).toBeDefined();

    // Empty state on Tuesday first activity (no PDAs selected)
    const emptyStates = screen.getAllByText("Sin elementos curriculares seleccionados.");
    expect(emptyStates.length).toBeGreaterThan(0);

    // ABSOLUTE READ-ONLY: ZERO edit/picker/remove/clear controls
    expect(screen.queryByRole("button", { name: /Seleccionar del catálogo/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Limpiar todo/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Eliminar elemento curricular/i })).toBeNull();
  });
});
