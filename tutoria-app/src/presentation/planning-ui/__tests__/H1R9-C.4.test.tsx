import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-C.4: Director Daily Evaluation Review", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createApprovedPlanWithMondaySubmitted = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-c4"
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

    // Monday submitted as IN_REVIEW
    plan.days[0].evaluation = "El grupo respondió con gran entusiasmo sensorial.";
    plan.days[0].evaluationStatus = "IN_REVIEW";
    plan.days[0].evaluationSubmittedAt = new Date("2026-08-24T18:00:00Z");
    plan.days[0].evaluationSubmittedBy = "t1";

    await repo.save(plan);
    return plan;
  };

  it("01. Draft evaluation is NOT presented to Ceci as formal review", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlanWithMondaySubmitted(repo, source);
    // Tuesday is DRAFT
    plan.days[1].evaluation = "Borrador de martes en progreso";
    plan.days[1].evaluationStatus = "DRAFT";
    await repo.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-25" />);
    });
    // Switch to Ceci
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    // Open Tuesday tab
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });

    // Tuesday is draft -> NOT pending review for Ceci
    expect(screen.queryByText(/PENDIENTE DE MI REVISIÓN/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Aprobar evaluación/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Solicitar cambio/i })).toBeNull();
  });

  it("02-04. IN_REVIEW evaluation is visible to Ceci, displays Anita exact text, Ceci cannot edit it directly", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlanWithMondaySubmitted(repo, source);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    // Switch to Ceci
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    // Monday tab
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    // 02. Status is pending Ceci review
    expect(screen.getByText(/PENDIENTE DE MI REVISIÓN/i)).toBeDefined();

    // 03. Displays Anita exact text
    expect(screen.getByText("El grupo respondió con gran entusiasmo sensorial.")).toBeDefined();
    expect(screen.getByText(/Anita:/i)).toBeDefined();

    // 04. Ceci cannot directly edit Anita evaluation text (no editable textarea with this content)
    expect(screen.queryByPlaceholderText(/El grupo respondió favorablemente a la actividad/i)).toBeNull();

    // Review actions exist
    expect(screen.getByRole("button", { name: /Aprobar evaluación/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Solicitar cambio/i })).toBeDefined();
  });

  it("05-10. IN_REVIEW -> APPROVED succeeds, audit fields stored, submitted text/author preserved, read-only", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlanWithMondaySubmitted(repo, source);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    // Switch to Ceci
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    // Monday tab
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    // Click Aprobar evaluación
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Aprobar evaluación/i }));
    });

    // Verify domain persistence
    const updatedPlan = await repo.findById("plan-c4");
    const monday = updatedPlan!.days[0];
    expect(monday.evaluationStatus).toBe("APPROVED");
    expect(monday.evaluationReviewedBy).toBe("Ceci");
    expect(monday.evaluationReviewedAt).toBeDefined();
    expect(monday.evaluation).toBe("El grupo respondió con gran entusiasmo sensorial.");
    expect(monday.evaluationSubmittedBy).toBe("t1");
    expect(monday.evaluationSubmittedAt).toBeDefined();

    // UI shows approved
    expect(screen.getAllByText(/Evaluación aprobada/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Aprobar evaluación/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Solicitar cambio/i })).toBeNull();

    // Switch to Anita: sees "Aprobada por Ceci"
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    expect(screen.getAllByText(/Aprobada por Ceci/i).length).toBeGreaterThan(0);
    expect(screen.getByText("El grupo respondió con gran entusiasmo sensorial.")).toBeDefined();
    expect(screen.queryByRole("button", { name: /^💾? Guardar evaluación$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^🚀? Enviar evaluación a Ceci$/i })).toBeNull();
  });

  it("11-15. IN_REVIEW -> CHANGES_REQUESTED succeeds, empty comment rejected, comment persists, Anita sees change request", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlanWithMondaySubmitted(repo, source);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    // Switch to Ceci
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    // Monday tab
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    // Click Solicitar cambio
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Solicitar cambio/i }));
    });

    // 12. Empty comment button is disabled
    const sendChangeBtn = screen.getByRole("button", { name: /Enviar solicitud de cambio/i });
    expect(sendChangeBtn.hasAttribute("disabled")).toBe(true);

    // Type comment
    const commentInput = screen.getByPlaceholderText(/Escribe la observación o ajuste solicitado/i);
    await act(async () => {
      fireEvent.change(commentInput, { target: { value: "Favor de detallar el logro de los lactantes con el material textil." } });
    });
    expect(sendChangeBtn.hasAttribute("disabled")).toBe(false);

    // Send change request
    await act(async () => {
      fireEvent.click(sendChangeBtn);
    });

    // 13. Domain persistence
    const updatedPlan = await repo.findById("plan-c4");
    const monday = updatedPlan!.days[0];
    expect(monday.evaluationStatus).toBe("CHANGES_REQUESTED");
    expect(monday.evaluationDirectorComment).toBe("Favor de detallar el logro de los lactantes con el material textil.");
    expect(monday.evaluationReviewedBy).toBe("Ceci");
    expect(monday.evaluationReviewedAt).toBeDefined();
    expect(monday.evaluation).toBe("El grupo respondió con gran entusiasmo sensorial.");

    // Ceci view shows CAMBIO SOLICITADO
    expect(screen.getByText(/CAMBIO SOLICITADO/i)).toBeDefined();
    expect(screen.getByText("Favor de detallar el logro de los lactantes con el material textil.")).toBeDefined();

    // 14. Switch to Anita: sees "Cambio solicitado por Ceci" and observation
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    expect(screen.getAllByText(/Cambio solicitado por Ceci/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Favor de detallar el logro de los lactantes con el material textil.")).toBeDefined();

    // 15. Anita cannot silently overwrite CHANGES_REQUESTED in this bullet (no editor textarea or save button)
    expect(screen.queryByRole("button", { name: /^💾?\s*Guardar borrador$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^🚀?\s*Enviar evaluación a Ceci$/i })).toBeNull();
  });

  it("16-18. Domain guards: DRAFT -> APPROVED rejected, APPROVED -> CHANGES_REQUESTED rejected, reviewing Monday does not mutate other days", async () => {
    const { repo, source } = createTestDeps();
    const plan = await createApprovedPlanWithMondaySubmitted(repo, source);

    // 16. DRAFT -> APPROVED rejected
    plan.days[1].evaluation = "Martes borrador";
    plan.days[1].evaluationStatus = "DRAFT";
    expect(() => plan.approveDailyEvaluation("TUESDAY", "Ceci")).toThrow(/Cannot approve daily evaluation with status DRAFT/);

    // 17. APPROVED -> CHANGES_REQUESTED rejected
    plan.approveDailyEvaluation("MONDAY", "Ceci");
    expect(plan.days[0].evaluationStatus).toBe("APPROVED");
    expect(() => plan.requestDailyEvaluationChange("MONDAY", "Nuevo comentario", "Ceci")).toThrow(/Cannot request changes for daily evaluation with status APPROVED/);

    // 18. Other days immutability: Tuesday-Friday untouched
    expect(plan.days[1].activities.length).toBeGreaterThan(0);
    expect(plan.days[2].activities.length).toBeGreaterThan(0);
    expect(plan.days[3].activities.length).toBeGreaterThan(0);
    expect(plan.days[4].activities.length).toBeGreaterThan(0);
  });

  it("19. Monday IN_REVIEW still allows chronological Tuesday evaluation when Tuesday date has arrived", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlanWithMondaySubmitted(repo, source);

    // Render as Anita on Tuesday 25
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-25" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    // Open Tuesday tab
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });

    // Tuesday is eligible for evaluation because Monday was submitted (IN_REVIEW)
    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Enviar evaluación a Ceci/i })).toBeDefined();
  });
});
