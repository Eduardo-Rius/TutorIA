import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-C.4.1: Daily Evaluation Day Status Navigation", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createApprovedPlanWithVariedStatuses = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-c41"
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

    // Monday: APPROVED
    plan.days[0].evaluation = "Lunes aprobado";
    plan.days[0].evaluationStatus = "APPROVED";
    plan.days[0].evaluationReviewedBy = "Ceci";
    plan.days[0].evaluationReviewedAt = new Date();

    // Tuesday: CHANGES_REQUESTED
    plan.days[1].evaluation = "Martes con cambio solicitado";
    plan.days[1].evaluationStatus = "CHANGES_REQUESTED";
    plan.days[1].evaluationDirectorComment = "Favor de detallar el material.";
    plan.days[1].evaluationReviewedBy = "Ceci";
    plan.days[1].evaluationReviewedAt = new Date();

    // Wednesday: IN_REVIEW
    plan.days[2].evaluation = "Miércoles enviado a Ceci";
    plan.days[2].evaluationStatus = "IN_REVIEW";
    plan.days[2].evaluationSubmittedAt = new Date();
    plan.days[2].evaluationSubmittedBy = "t1";

    // Thursday & Friday: default/neutral
    await repo.save(plan);
    return plan;
  };

  it("01, 03, 05, 07. Anita view: Monday is GREEN, Tuesday is ORANGE, Wednesday is BLUE, Thursday/Friday are neutral", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlanWithVariedStatuses(repo, source);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-26" />);
    });
    // Open Anita approved planning
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    const mondayTab = screen.getByRole("tab", { name: /Lunes 24/i });
    const tuesdayTab = screen.getByRole("tab", { name: /Martes 25/i });
    const wednesdayTab = screen.getByRole("tab", { name: /Miércoles 26/i });
    const thursdayTab = screen.getByRole("tab", { name: /Jueves 27/i });
    const fridayTab = screen.getByRole("tab", { name: /Viernes 28/i });

    // 03. Monday APPROVED is GREEN
    expect(mondayTab.className).toContain("green");

    // 01. Tuesday CHANGES_REQUESTED is ORANGE
    expect(tuesdayTab.className).toContain("orange");

    // 05. Wednesday IN_REVIEW is BLUE
    expect(wednesdayTab.className).toContain("blue");

    // 07. Thursday and Friday are neutral/uncolored
    expect(thursdayTab.className).not.toContain("green");
    expect(thursdayTab.className).not.toContain("orange");
    expect(thursdayTab.className).not.toContain("blue");
    expect(fridayTab.className).not.toContain("green");
    expect(fridayTab.className).not.toContain("orange");
    expect(fridayTab.className).not.toContain("blue");
  });

  it("02, 04, 06, 09. Ceci view: Monday is GREEN, Tuesday is ORANGE, Wednesday is BLUE, role parity across switching", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlanWithVariedStatuses(repo, source);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-26" />);
    });
    // Open Ceci approved planning
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    const mondayTab = screen.getByRole("tab", { name: /Lunes 24/i });
    const tuesdayTab = screen.getByRole("tab", { name: /Martes 25/i });
    const wednesdayTab = screen.getByRole("tab", { name: /Miércoles 26/i });
    const thursdayTab = screen.getByRole("tab", { name: /Jueves 27/i });

    // 04. Monday APPROVED is GREEN for Ceci
    expect(mondayTab.className).toContain("green");

    // 02. Tuesday CHANGES_REQUESTED is ORANGE for Ceci
    expect(tuesdayTab.className).toContain("orange");

    // 06. Wednesday IN_REVIEW is BLUE for Ceci
    expect(wednesdayTab.className).toContain("blue");

    // Thursday neutral
    expect(thursdayTab.className).not.toContain("green");
    expect(thursdayTab.className).not.toContain("orange");
    expect(thursdayTab.className).not.toContain("blue");

    // 09. Role switching parity: Switch back to Anita and verify exact same styling persists
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    expect(screen.getByRole("tab", { name: /Lunes 24/i }).className).toContain("green");
    expect(screen.getByRole("tab", { name: /Martes 25/i }).className).toContain("orange");
    expect(screen.getByRole("tab", { name: /Miércoles 26/i }).className).toContain("blue");
  });

  it("08. Day independence: Mutating one day does not alter other days visual status", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlanWithVariedStatuses(repo, source);

    // Approve Wednesday via service
    await service.approveDailyEvaluation(plan.planningId, "WEDNESDAY", "DIRECTOR", "Ceci");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-26" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    // Monday remains GREEN
    expect(screen.getByRole("tab", { name: /Lunes 24/i }).className).toContain("green");
    // Tuesday remains ORANGE
    expect(screen.getByRole("tab", { name: /Martes 25/i }).className).toContain("orange");
    // Wednesday is now GREEN
    expect(screen.getByRole("tab", { name: /Miércoles 26/i }).className).toContain("green");
  });

  it("10. Planning review day colors remain unchanged when planning is IN_REVIEW (before approval)", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = WeeklyPlanning.create("plan-in-review", "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    plan.markDirectorDayReviewed("MONDAY");
    await repo.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    // In director review of non-approved plan:
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    // Monday was marked reviewed during planning review -> GREEN with check
    expect(screen.getByRole("tab", { name: /Lunes 24/i }).className).toContain("green");
    // Tuesday not reviewed yet -> neutral
    expect(screen.getByRole("tab", { name: /Martes 25/i }).className).not.toContain("green");
  });
});
