import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-D.1: Planning Approval ≠ Weekly Closure", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createPlanReadyForDirectorApproval = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-d1"
  ) => {
    const plan = WeeklyPlanning.create(id, "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.observations = "Obs Original";
    plan.identifiedNeeds = "Needs Original";
    plan.specialSituations = "Sit Original";
    plan.availableMaterials = "Mat Original";
    plan.status = "IN_REVIEW";
    // Mark 5 days as reviewed by director
    plan.markDirectorDayReviewed("MONDAY");
    plan.markDirectorDayReviewed("TUESDAY");
    plan.markDirectorDayReviewed("WEDNESDAY");
    plan.markDirectorDayReviewed("THURSDAY");
    plan.markDirectorDayReviewed("FRIDAY");
    await repo.save(plan);
    return plan;
  };

  it("A, B, C. Pre-execution approval transitions to APPROVED_FOR_EXECUTION semantic state and is NOT weekly closed", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlanReadyForDirectorApproval(repo, source);

    // Pre-approval
    expect(plan.semanticStatus).toBe("IN_REVIEW");
    expect(plan.isApprovedForExecution()).toBe(false);
    expect(plan.isClosed()).toBe(false);

    // Ceci approves planning for execution
    await service.approve(plan.planningId, "DIRECTOR", "Ceci");
    const approvedPlan = await repo.findById(plan.planningId);

    // A: Semantic status is APPROVED_FOR_EXECUTION
    expect(approvedPlan!.semanticStatus).toBe("APPROVED_FOR_EXECUTION");
    expect(approvedPlan!.isApprovedForExecution()).toBe(true);

    // B & C: Does NOT represent weekly closure
    expect(approvedPlan!.isClosed()).toBe(false);
    expect((approvedPlan!.status as string)).not.toBe("CLOSED");
  });

  it("A, E. UI clearly displays Aprobada para ejecución and allows daily evaluation lifecycle", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlanReadyForDirectorApproval(repo, source);
    await service.approve(plan.planningId, "DIRECTOR", "Ceci");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });

    // Anita view
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });

    // Proposal list clearly communicates approved for execution
    expect(screen.getByText(/Aprobada para ejecución/i)).toBeDefined();
    await act(async () => { fireEvent.click(screen.getByText(/Aprobada para ejecución/i)); });

    // Teacher header badge
    expect(screen.getAllByText(/Aprobada para ejecución/i).length).toBeGreaterThan(0);

    // Does NOT claim to be closed or finished week
    expect(screen.queryByText(/Semana cerrada/i)).toBeNull();
    expect(screen.queryByText(/Expediente cerrado/i)).toBeNull();

    // Monday daily evaluation area is available for execution
    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
  });

  it("D, F. Director view displays Para Ejecución and official IMSS views remain intact", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlanReadyForDirectorApproval(repo, source);
    await service.approve(plan.planningId, "DIRECTOR", "Ceci");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });

    // Ceci view
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    // Header badge
    expect(screen.getAllByText(/Aprobada para ejecución/i).length).toBeGreaterThan(0);

    // Official IMSS view access
    const officialBtn = screen.getByRole("button", { name: /Versión Oficial IMSS/i });
    expect(officialBtn).toBeDefined();

    await act(async () => { fireEvent.click(officialBtn); });
    expect(screen.getByText(/Planeación de Actividades Pedagógicas/i)).toBeDefined();
  });
});
