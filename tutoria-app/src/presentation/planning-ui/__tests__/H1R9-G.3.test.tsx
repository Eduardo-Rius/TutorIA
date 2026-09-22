import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-G.3.2: Simplified Human Governance for Daily Evaluation", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createApprovedPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-g3"
  ) => {
    const plan = WeeklyPlanning.create(id, "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.observations = "Obs G3";
    plan.identifiedNeeds = "Needs G3";
    plan.specialSituations = "Sit G3";
    plan.availableMaterials = "Mat G3";
    plan.status = "APPROVED";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repo.save(plan);
    return plan;
  };

  it("08-11, 21. Typing and saving draft do not submit; no separate confirm button or PENDIENTE DE CONFIRMACIÓN ceremony; empty send rejected", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source, "plan-g3-init");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    // Initial state
    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
    expect(screen.queryByText(/^✓?\s*CONFIRMADA$/i)).toBeNull();
    expect(screen.queryByText(/PENDIENTE DE CONFIRMACIÓN/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Confirmar evaluación del día/i })).toBeNull();

    // 21. Empty text cannot be submitted
    const submitBtn = screen.getByRole("button", { name: /Enviar evaluación a Ceci/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    // 8. Typing evaluation does not submit automatically
    const textarea = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "   " } });
    });
    expect(submitBtn.disabled).toBe(true);

    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Evaluación preliminar redactada por Anita" } });
    });
    expect(submitBtn.disabled).toBe(false);

    // No intermediate confirmation ceremony appeared
    expect(screen.queryByText(/^✓?\s*CONFIRMADA$/i)).toBeNull();
    expect(screen.queryByText(/PENDIENTE DE CONFIRMACIÓN/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Confirmar evaluación del día/i })).toBeNull();

    // Still in DRAFT before send
    const planBeforeSave = await repo.findById("plan-g3-init");
    expect(planBeforeSave!.days[0].evaluationStatus).toBeUndefined();

    // 9. Saving draft preserves draft without submitting
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Guardar borrador/i }));
    });
    const planAfterDraft = await repo.findById("plan-g3-init");
    expect(planAfterDraft!.days[0].evaluation).toBe("Evaluación preliminar redactada por Anita");
    expect(planAfterDraft!.days[0].evaluationStatus).toBe("DRAFT");
    expect(planAfterDraft!.days[0].evaluationSubmittedAt).toBeUndefined();
    expect(screen.queryByText(/En revisión por Ceci/i)).toBeNull();
  });

  it("12-13. Direct send works without prior Save Draft and atomically confirms, submits, and transitions to IN_REVIEW", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source, "plan-g3-direct");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    const textarea = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Los lactantes respondieron activamente a los sonidos." } });
    });

    // 13. Direct send without clicking "Guardar borrador"
    const submitBtn = screen.getByRole("button", { name: /Enviar evaluación a Ceci/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // 12. Atomically records confirmation and submission, exact text, and IN_REVIEW status
    const plan = await repo.findById("plan-g3-direct");
    const mon = plan!.days[0];
    expect(mon.evaluation).toBe("Los lactantes respondieron activamente a los sonidos.");
    expect(mon.evaluationConfirmedBy).toBe("t1");
    expect(mon.evaluationConfirmedAt).toBeDefined();
    expect(mon.evaluationSubmittedBy).toBe("t1");
    expect(mon.evaluationSubmittedAt).toBeDefined();
    expect(mon.evaluationStatus).toBe("IN_REVIEW");

    // UI transitions to IN_REVIEW freeze
    expect(screen.getAllByText(/En revisión por Ceci/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Guardar borrador/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Enviar evaluación a Ceci/i })).toBeNull();
    expect(screen.getByText(/Enviada por Anita/i)).toBeDefined();
  });

  it("14. If draft A exists and textarea contains B, SEND submits/confirms B, not A", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-g3-unsaved");

    // Pre-seed Draft A
    plan.days[0].evaluation = "Borrador previo A";
    plan.days[0].evaluationStatus = "DRAFT";
    await repo.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    const textarea = screen.getByDisplayValue("Borrador previo A");
    // Type B
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Texto definitivo modificado B" } });
    });

    // Directly click Send (without clicking Guardar borrador)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enviar evaluación a Ceci/i }));
    });

    const updatedPlan = await repo.findById("plan-g3-unsaved");
    expect(updatedPlan!.days[0].evaluation).toBe("Texto definitivo modificado B");
    expect(updatedPlan!.days[0].evaluationConfirmedBy).toBe("t1");
    expect(updatedPlan!.days[0].evaluationStatus).toBe("IN_REVIEW");
  });

  it("15-17. Ceci request-change cycle: corrected text can be directly re-sent without separate confirmation click", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-g3-resubmit");

    // Monday submitted
    plan.days[0].evaluation = "Lunes validado";
    plan.days[0].evaluationStatus = "IN_REVIEW";
    plan.days[0].evaluationSubmittedAt = new Date();
    plan.days[0].evaluationSubmittedBy = "t1";
    plan.days[0].evaluationConfirmedAt = new Date();
    plan.days[0].evaluationConfirmedBy = "t1";

    // Tuesday CHANGES_REQUESTED
    plan.days[1].evaluation = "Martes texto inicial";
    plan.days[1].evaluationStatus = "CHANGES_REQUESTED";
    plan.days[1].evaluationDirectorComment = "Favor de detallar los materiales.";
    plan.days[1].evaluationReviewedBy = "Ceci";
    plan.days[1].evaluationReviewedAt = new Date();
    plan.days[1].evaluationConfirmedAt = undefined;
    plan.days[1].evaluationConfirmedBy = undefined;
    await repo.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-25" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });

    expect(screen.getByText(/Cambio solicitado por Ceci/i)).toBeDefined();
    expect(screen.getByText("Favor de detallar los materiales.")).toBeDefined();
    // 10, 11. No separate confirmation ceremony
    expect(screen.queryByRole("button", { name: /Confirmar evaluación del día/i })).toBeNull();
    expect(screen.queryByText(/PENDIENTE DE CONFIRMACIÓN/i)).toBeNull();

    // 16. Corrected text can be directly re-sent
    const textarea = screen.getByDisplayValue("Martes texto inicial");
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Martes corregido con detalle de materiales." } });
    });

    const resubmitBtn = screen.getByRole("button", { name: /Reenviar evaluación a Ceci/i }) as HTMLButtonElement;
    expect(resubmitBtn.disabled).toBe(false);

    // 17. RESEND atomically confirms and submits exact corrected text
    await act(async () => {
      fireEvent.click(resubmitBtn);
    });

    const planAfterResubmit = await repo.findById("plan-g3-resubmit");
    const tue = planAfterResubmit!.days[1];
    expect(tue.evaluation).toBe("Martes corregido con detalle de materiales.");
    expect(tue.evaluationConfirmedBy).toBe("t1");
    expect(tue.evaluationConfirmedAt).toBeDefined();
    expect(tue.evaluationSubmittedBy).toBe("t1");
    expect(tue.evaluationSubmittedAt).toBeDefined();
    expect(tue.evaluationStatus).toBe("IN_REVIEW");
    expect(tue.evaluationResubmitted).toBe(true);
    expect(tue.evaluationHistory).toHaveLength(1);
    expect(tue.evaluationHistory![0].evaluation).toBe("Martes texto inicial");
  });

  it("18-20. Institutional separation: Ceci approval remains distinct; approved is read-only; anonymous send rejected", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-g3-inst");

    // Monday APPROVED
    plan.days[0].evaluation = "Lunes plenamente aprobado";
    plan.days[0].evaluationStatus = "APPROVED";
    plan.days[0].evaluationConfirmedAt = new Date();
    plan.days[0].evaluationConfirmedBy = "t1";
    plan.days[0].evaluationSubmittedAt = new Date();
    plan.days[0].evaluationSubmittedBy = "t1";
    plan.days[0].evaluationReviewedBy = "Ceci";
    plan.days[0].evaluationReviewedAt = new Date();

    // Tuesday IN_REVIEW
    plan.days[1].evaluation = "Martes en revisión";
    plan.days[1].evaluationStatus = "IN_REVIEW";
    plan.days[1].evaluationConfirmedAt = new Date();
    plan.days[1].evaluationConfirmedBy = "t1";
    plan.days[1].evaluationSubmittedAt = new Date();
    plan.days[1].evaluationSubmittedBy = "t1";
    await repo.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-25" />);
    });

    // --- Anita view on Monday (APPROVED) ---
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    // 19. APPROVED evaluation remains read-only
    expect(screen.getAllByText(/Aprobada por Ceci/i).length).toBeGreaterThan(0);
    expect(screen.queryByPlaceholderText(/El grupo respondió favorablemente a la actividad/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Guardar borrador/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Enviar evaluación a Ceci/i })).toBeNull();

    // 18. Ceci review workflow remains distinct
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });

    expect(screen.getByText(/Enviada por Anita/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Aprobar evaluación/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Solicitar cambio/i })).toBeDefined();

    // 20. Anonymous actor cannot send via service
    await expect(
      service.confirmAndSubmitDailyEvaluation(plan.planningId, "WEDNESDAY", "Texto", "TEACHER", "2026-08-26", "")
    ).rejects.toThrow(/Daily evaluation confirmation requires an educator identity/);
  });
});
