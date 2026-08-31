import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-D.2: Daily Evaluation Correction Return Visibility", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createApprovedPlanWithMondayTuesdayApproved = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-d2"
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

    // Tuesday: APPROVED
    plan.days[1].evaluation = "Martes aprobado";
    plan.days[1].evaluationStatus = "APPROVED";
    plan.days[1].evaluationReviewedBy = "Ceci";
    plan.days[1].evaluationReviewedAt = new Date();

    // Wednesday: initial submission by Anita
    plan.days[2].evaluation = "Miércoles texto inicial con falta de detalle";
    plan.days[2].evaluationStatus = "IN_REVIEW";
    plan.days[2].evaluationSubmittedAt = new Date("2026-08-26T16:00:00Z");
    plan.days[2].evaluationSubmittedBy = "t1";

    await repo.save(plan);
    return plan;
  };

  it("A-J. Complete round-trip: Ceci requests change -> Anita corrects & resubmits -> Wednesday becomes ORANGE for Ceci -> Ceci approves -> GREEN; Monday & Tuesday remain GREEN", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlanWithMondayTuesdayApproved(repo, source);

    // A. Ceci requests correction for Wednesday
    await service.requestDailyEvaluationChange(
      plan.planningId,
      "WEDNESDAY",
      "Favor de detallar la interacción con materiales rugosos.",
      "DIRECTOR",
      "Ceci"
    );

    // Verify Wednesday is CHANGES_REQUESTED
    const planAfterRequest = await repo.findById(plan.planningId);
    expect(planAfterRequest!.days[2].evaluationStatus).toBe("CHANGES_REQUESTED");

    // B, C, D. Anita opens Wednesday, edits, and resubmits
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-26" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    // Anita sees Wednesday tab is ORANGE
    const wedTabAnita = screen.getByRole("tab", { name: /Miércoles 26/i });
    expect(wedTabAnita.className).toContain("orange");

    await act(async () => { fireEvent.click(wedTabAnita); });
    expect(screen.getByText(/Favor de detallar la interacción con materiales rugosos./i)).toBeDefined();

    // C. Anita modifies Wednesday evaluation
    const textarea = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);
    const correctedText = "Los lactantes manipularon texturas rugosas con notable curiosidad y atención sostenida.";
    await act(async () => {
      fireEvent.change(textarea, { target: { value: correctedText } });
    });

    // D. Anita resubmits Wednesday
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Reenviar evaluación a Ceci/i }));
    });

    // Anita view post-submit freeze (Section 6)
    expect(screen.queryByPlaceholderText(/El grupo respondió favorablemente a la actividad/i)).toBeNull();
    // Wednesday is BLUE in Anita view
    expect(screen.getByRole("tab", { name: /Miércoles 26/i }).className).toContain("blue");

    // J. Repository persistence check
    const planAfterResubmit = await repo.findById(plan.planningId);
    expect(planAfterResubmit!.days[2].evaluation).toBe(correctedText);
    expect(planAfterResubmit!.days[2].evaluationStatus).toBe("IN_REVIEW");
    expect(planAfterResubmit!.days[2].evaluationResubmitted).toBe(true);

    // E, F. Switch to Ceci (Directora)
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    // G, H. Monday and Tuesday remain GREEN and do NOT require re-review
    const mondayTab = screen.getByRole("tab", { name: /Lunes 24/i });
    const tuesdayTab = screen.getByRole("tab", { name: /Martes 25/i });
    expect(mondayTab.className).toContain("green");
    expect(tuesdayTab.className).toContain("green");

    // E. Wednesday is ORANGE in Ceci view!
    const wedTabCeci = screen.getByRole("tab", { name: /Miércoles 26/i });
    expect(wedTabCeci.className).toContain("orange");

    // F. Ceci clicks Wednesday: sees explicit corrected indicator + previous observation + corrected text
    await act(async () => { fireEvent.click(wedTabCeci); });
    expect(screen.getByText(/Evaluación corregida por Anita — requiere revisión/i)).toBeDefined();
    expect(screen.getByText(/Favor de detallar la interacción con materiales rugosos./i)).toBeDefined();
    expect(screen.getByText(correctedText)).toBeDefined();

    // I. Ceci approves Wednesday -> turns GREEN
    const approveBtn = screen.getByRole("button", { name: /Aprobar evaluación/i });
    await act(async () => { fireEvent.click(approveBtn); });

    const finalPlan = await repo.findById(plan.planningId);
    expect(finalPlan!.days[2].evaluationStatus).toBe("APPROVED");
    expect(finalPlan!.days[2].evaluationResubmitted).toBe(false);

    // Wednesday is now GREEN for Ceci
    expect(screen.getByRole("tab", { name: /Miércoles 26/i }).className).toContain("green");
    // Monday and Tuesday remain GREEN
    expect(screen.getByRole("tab", { name: /Lunes 24/i }).className).toContain("green");
    expect(screen.getByRole("tab", { name: /Martes 25/i }).className).toContain("green");
  });
});
