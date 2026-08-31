import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-D.3: Ready for Closure after 5/5 Daily Evaluations Approved", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createBaseApprovedPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-d3"
  ) => {
    const plan = WeeklyPlanning.create(id, "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.observations = "Obs Original";
    plan.identifiedNeeds = "Needs Original";
    plan.specialSituations = "Sit Original";
    plan.availableMaterials = "Mat Original";
    plan.status = "APPROVED";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repo.save(plan);
    return plan;
  };

  it("A-G. Domain and UI progression from 0/5 to 5/5 approved evaluations and closure readiness", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createBaseApprovedPlan(repo, source);

    // A. 0/5 approved -> NOT ready
    expect(plan.approvedDailyEvaluationCount).toBe(0);
    expect(plan.isReadyForClosure).toBe(false);

    // B. 1/5 approved (Monday) -> NOT ready
    plan.days[0].evaluation = "Lunes evaluado";
    plan.days[0].evaluationStatus = "APPROVED";
    expect(plan.approvedDailyEvaluationCount).toBe(1);
    expect(plan.isReadyForClosure).toBe(false);

    // C. 4/5 approved (Mon, Tue, Wed, Thu) -> NOT ready
    plan.days[1].evaluation = "Martes evaluado";
    plan.days[1].evaluationStatus = "APPROVED";
    plan.days[2].evaluation = "Miércoles evaluado";
    plan.days[2].evaluationStatus = "APPROVED";
    plan.days[3].evaluation = "Jueves evaluado";
    plan.days[3].evaluationStatus = "APPROVED";
    expect(plan.approvedDailyEvaluationCount).toBe(4);
    expect(plan.isReadyForClosure).toBe(false);

    // D. Friday IN_REVIEW -> NOT ready
    plan.days[4].evaluation = "Viernes en revisión inicial";
    plan.days[4].evaluationStatus = "IN_REVIEW";
    expect(plan.approvedDailyEvaluationCount).toBe(4);
    expect(plan.isReadyForClosure).toBe(false);

    // E. Friday CHANGES_REQUESTED -> NOT ready
    plan.days[4].evaluationStatus = "CHANGES_REQUESTED";
    plan.days[4].evaluationDirectorComment = "Ajustar cierre de semana";
    expect(plan.approvedDailyEvaluationCount).toBe(4);
    expect(plan.isReadyForClosure).toBe(false);

    // F. Friday corrected & resubmitted (IN_REVIEW) -> NOT ready
    plan.days[4].evaluation = "Viernes corregido";
    plan.days[4].evaluationStatus = "IN_REVIEW";
    plan.days[4].evaluationResubmitted = true;
    await repo.save(plan);
    expect(plan.approvedDailyEvaluationCount).toBe(4);
    expect(plan.isReadyForClosure).toBe(false);

    // Render Director review in UI with 4/5 approved
    const { unmount } = render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    // Verify progress indicator is 4/5 and "Semana lista para cierre" is NOT present
    expect(screen.getByText(/Evaluaciones aprobadas: 4\/5/i)).toBeDefined();
    expect(screen.queryByText(/Semana lista para cierre/i)).toBeNull();

    // Friday tab is ORANGE for Ceci (H1R9-D.2)
    const friTab = screen.getByRole("tab", { name: /Viernes 28/i });
    expect(friTab.className).toContain("orange");

    // G. Ceci approves Friday -> 5/5 -> READY
    await act(async () => { fireEvent.click(friTab); });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Aprobar evaluación/i }));
    });

    // UI immediately updates to 5/5 and displays "Semana lista para cierre"
    expect(screen.getByText(/Evaluaciones aprobadas: 5\/5/i)).toBeDefined();
    expect(screen.getByText(/Semana lista para cierre/i)).toBeDefined();

    // H. Verify domain state on persisted plan
    const updatedPlan = await repo.findById(plan.planningId);
    expect(updatedPlan!.approvedDailyEvaluationCount).toBe(5);
    expect(updatedPlan!.isReadyForClosure).toBe(true);

    unmount();

    // I. Remount / reload preserves 5/5 and closure readiness
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    expect(screen.getByText(/Evaluaciones aprobadas: 5\/5/i)).toBeDefined();
    expect(screen.getByText(/Semana lista para cierre/i)).toBeDefined();

    // J. All 5 tabs are green
    expect(screen.getByRole("tab", { name: /Lunes 24/i }).className).toContain("green");
    expect(screen.getByRole("tab", { name: /Martes 25/i }).className).toContain("green");
    expect(screen.getByRole("tab", { name: /Miércoles 26/i }).className).toContain("green");
    expect(screen.getByRole("tab", { name: /Jueves 27/i }).className).toContain("green");
    expect(screen.getByRole("tab", { name: /Viernes 28/i }).className).toContain("green");
  });

  it("K-N. Preserves semanticStatus APPROVED_FOR_EXECUTION and chronological protection", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createBaseApprovedPlan(repo, source);

    // N. Planning remains APPROVED_FOR_EXECUTION throughout daily evaluation progress
    expect(plan.semanticStatus).toBe("APPROVED_FOR_EXECUTION");
    expect(plan.isApprovedForExecution()).toBe(true);

    // M. Cannot submit future day
    expect(() => {
      plan.submitDailyEvaluation("TUESDAY", "Eval martes", "2026-08-24", "t1");
    }).toThrow(/Cannot evaluate future day/i);

    // L. Cannot submit out of chronological order
    plan.submitDailyEvaluation("MONDAY", "Eval lunes", "2026-08-24", "t1");
    expect(() => {
      plan.submitDailyEvaluation("WEDNESDAY", "Eval miercoles", "2026-08-26", "t1");
    }).toThrow(/before completing evaluation for earlier day TUESDAY/i);
  });
});
