import React from "react";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-C.3: Daily Evaluation Submit & Freeze", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createApprovedPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-1"
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

  // 1 & 2. Eligible day starts editable & empty evaluation cannot be submitted
  it("01-02. Eligible day starts editable and empty evaluation cannot be submitted", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source, "plan-start-editable");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
    const textarea = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);
    expect(textarea).toBeDefined();

    const submitBtn = screen.getByRole("button", { name: /Enviar evaluación a Ceci/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    await expect(
      service.submitDailyEvaluation("plan-start-editable", "MONDAY", "", "TEACHER", "2026-08-24", "t1")
    ).rejects.toThrow(/Cannot submit empty daily evaluation/i);
  });

  // 3, 4, 5, 6. Draft save, persistence, editing, and multiple saves
  it("03-06. Anita can save draft, draft persists, remains editable, and multiple saves preserve latest", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source, "plan-draft-persist");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    const textarea = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);

    // Save initial draft
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Borrador inicial lunes" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Guardar borrador/i }));
    });

    let plan = await repo.findById("plan-draft-persist");
    expect(plan!.days[0]!.evaluation).toBe("Borrador inicial lunes");
    expect(plan!.days[0]!.evaluationStatus).toBe("DRAFT");

    // Edit and save updated draft
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Borrador segundo lunes con más detalle" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Guardar borrador/i }));
    });

    plan = await repo.findById("plan-draft-persist");
    expect(plan!.days[0]!.evaluation).toBe("Borrador segundo lunes con más detalle");
    expect(plan!.days[0]!.evaluationStatus).toBe("DRAFT");

    // Navigate away and back, verify persistence and editable state
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    expect(screen.getByDisplayValue("Borrador segundo lunes con más detalle")).toBeDefined();
    expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Enviar evaluación a Ceci/i })).toBeDefined();
  });

  // 7. Draft Monday does NOT unlock Tuesday
  it("07. Draft Monday does NOT unlock Tuesday (Tuesday remains chronologically blocked)", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-draft-block");
    plan.days[0]!.evaluation = "Borrador Lunes";
    plan.days[0]!.evaluationStatus = "DRAFT";
    await repo.save(plan);

    // Simulated currentDate = Tuesday 25 Aug
    expect(plan.canEvaluateDay("MONDAY", "2026-08-25")).toBe(true);
    expect(plan.canEvaluateDay("TUESDAY", "2026-08-25")).toBe(false); // blocked by draft Monday
    expect(plan.getNextEvaluableDay("2026-08-25")?.dayOfWeek).toBe("MONDAY");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-25" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    expect(screen.getByText(/Evaluación bloqueada por orden cronológico/i)).toBeDefined();
    expect(screen.getByText(/Completa primero la evaluación de Lunes/i)).toBeDefined();
  });

  // 8, 9, 10, 11, 12. Submit Monday: IN_REVIEW, audit fields, read-only freeze, survives reload
  it("08-12. Submitting Monday sets IN_REVIEW, stores audit fields, freezes evaluation for Anita, and survives reload", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source, "plan-1");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    const textarea = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);

    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Evaluación definitiva del lunes para Ceci" } });
    });

    const submitBtn = screen.getByRole("button", { name: /Enviar evaluación a Ceci/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // 8, 9, 10. Verify domain persistence & audit fields
    const plan = await repo.findById("plan-1");
    expect(plan!.days[0]!.evaluation).toBe("Evaluación definitiva del lunes para Ceci");
    expect(plan!.days[0]!.evaluationStatus).toBe("IN_REVIEW");
    expect(plan!.days[0]!.evaluationSubmittedAt).toBeDefined();
    expect(plan!.days[0]!.evaluationSubmittedBy).toBe("t1");

    // 11. Verify UI displays "En revisión por Ceci" and is frozen (no submit/draft buttons)
    expect(screen.getAllByText(/En revisión por Ceci/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Evaluación enviada a Dirección/i)).toBeDefined();
    expect(screen.getByText(/Evaluación definitiva del lunes para Ceci/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Guardar borrador/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Enviar evaluación a Ceci/i })).toBeNull();

    // 12. Re-render / reload and verify it remains frozen
    cleanup();
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    expect(screen.getAllByText(/En revisión por Ceci/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Guardar borrador/i })).toBeNull();
  });

  // 13 & 14. Submitted Monday unlocks Tuesday only if Tuesday arrived; does NOT unlock future Tuesday
  it("13-14. Submitted Monday unlocks Tuesday on Aug 25, but does NOT unlock Tuesday on Aug 24", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-mon-submitted");
    plan.days[0]!.evaluation = "Lunes enviado";
    plan.days[0]!.evaluationStatus = "IN_REVIEW";
    plan.days[0]!.evaluationSubmittedAt = new Date();
    plan.days[0]!.evaluationSubmittedBy = "t1";
    await repo.save(plan);

    // On Monday 24: Monday is submitted, but Tuesday date has NOT arrived -> Tuesday is future locked
    expect(plan.canEvaluateDay("TUESDAY", "2026-08-24")).toBe(false);

    // On Tuesday 25: Monday is submitted and Tuesday date HAS arrived -> Tuesday is eligible!
    expect(plan.canEvaluateDay("TUESDAY", "2026-08-25")).toBe(true);
    expect(plan.getNextEvaluableDay("2026-08-25")?.dayOfWeek).toBe("TUESDAY");
  });

  // 15. Direct attempt to overwrite IN_REVIEW evaluation is rejected at domain boundary
  it("15. Direct attempt to overwrite IN_REVIEW evaluation is rejected at domain/application boundary", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-overwrite-sec");
    plan.days[0]!.evaluation = "Lunes enviado";
    plan.days[0]!.evaluationStatus = "IN_REVIEW";
    await repo.save(plan);

    // Attempt draft overwrite
    await expect(
      service.saveDailyEvaluationDraft("plan-overwrite-sec", "MONDAY", "Nuevo texto ilegal", "TEACHER", "2026-08-24")
    ).rejects.toThrow(/Cannot edit evaluation once submitted/i);

    // Attempt submit overwrite
    await expect(
      service.submitDailyEvaluation("plan-overwrite-sec", "MONDAY", "Nuevo texto ilegal", "TEACHER", "2026-08-24")
    ).rejects.toThrow(/Cannot submit already submitted evaluation/i);

    const reloaded = await repo.findById("plan-overwrite-sec");
    expect(reloaded!.days[0]!.evaluation).toBe("Lunes enviado");
  });

  // 16 & 17. Immutability of other weekdays and approved planning context
  it("16-17. Submitting an evaluation does NOT mutate other weekdays or approved weekly context", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-immutability");
    const originalTueActivities = JSON.stringify(plan.days[1]!.activities);
    const originalObservations = plan.observations;
    const originalNeeds = plan.identifiedNeeds;

    await service.submitDailyEvaluation("plan-immutability", "MONDAY", "Eval lunes", "TEACHER", "2026-08-24", "t1");

    const reloaded = await repo.findById("plan-immutability");
    expect(reloaded!.observations).toBe(originalObservations);
    expect(reloaded!.identifiedNeeds).toBe(originalNeeds);
    expect(JSON.stringify(reloaded!.days[1]!.activities)).toBe(originalTueActivities);
    expect(reloaded!.days[1]!.evaluation || "").toBe("");
    expect(reloaded!.days[1]!.evaluationStatus).toBeUndefined();
  });

  // 18. H1R9-C.2 chronological regression
  it("18. H1R9-C.2 chronological gate behaves accurately with multi-day submit progression", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-c2-progression");

    // On Wednesday 26:
    // With Mon submitted and Tue in draft: Tue is evaluable, Wed is blocked
    plan.days[0]!.evaluation = "Mon submitted";
    plan.days[0]!.evaluationStatus = "IN_REVIEW";
    plan.days[1]!.evaluation = "Tue draft";
    plan.days[1]!.evaluationStatus = "DRAFT";
    await repo.save(plan);

    expect(plan.canEvaluateDay("TUESDAY", "2026-08-26")).toBe(true);
    expect(plan.canEvaluateDay("WEDNESDAY", "2026-08-26")).toBe(false);

    // Submit Tuesday
    await service.submitDailyEvaluation("plan-c2-progression", "TUESDAY", "Tue final", "TEACHER", "2026-08-26", "t1");
    const pUpdated = await repo.findById("plan-c2-progression");
    expect(pUpdated!.canEvaluateDay("WEDNESDAY", "2026-08-26")).toBe(true);
    expect(pUpdated!.canEvaluateDay("THURSDAY", "2026-08-26")).toBe(false); // future
  });

  // 19. H1R9-B.3 Director review persistence regression
  it("19. H1R9-B.3 Director review persistence remains intact", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = WeeklyPlanning.create("plan-b3-reg", "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    await service.markDirectorDayReviewed("plan-b3-reg", "MONDAY", "DIRECTOR");
    await service.markDirectorDayReviewed("plan-b3-reg", "WEDNESDAY", "DIRECTOR");

    const p = await repo.findById("plan-b3-reg");
    expect(p!.isDirectorDayReviewed("MONDAY")).toBe(true);
    expect(p!.isDirectorDayReviewed("TUESDAY")).toBe(false);
    expect(p!.isDirectorDayReviewed("WEDNESDAY")).toBe(true);
    expect(p!.getReviewedDirectorDaysCount()).toBe(2);
  });

  // 20. H1R6/H1R7 print & view regressions
  it("20. Approved planning remains printable and viewable in Direct and Indirect modalities", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source, "plan-print-reg");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    expect(screen.getAllByText(/Prestación Directa/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: /Lunes 24/i })).toBeDefined();
  });
});
