import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-C.2: Strict Chronological Daily Evaluation Gate", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createApprovedPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-c2-approved"
  ) => {
    const plan = WeeklyPlanning.create(id, "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.observations = "Obs";
    plan.identifiedNeeds = "Needs";
    plan.specialSituations = "Sit";
    plan.availableMaterials = "Mat";
    plan.status = "APPROVED";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repo.save(plan);
    return plan;
  };

  // TEST 1
  it("01. Today before week start (2026-08-23): 0 eligible evaluations, all 5 locked", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-pre-week");

    expect(plan.canEvaluateDay("MONDAY", "2026-08-23")).toBe(false);
    expect(plan.canEvaluateDay("TUESDAY", "2026-08-23")).toBe(false);
    expect(plan.canEvaluateDay("WEDNESDAY", "2026-08-23")).toBe(false);
    expect(plan.canEvaluateDay("THURSDAY", "2026-08-23")).toBe(false);
    expect(plan.canEvaluateDay("FRIDAY", "2026-08-23")).toBe(false);
    expect(plan.getNextEvaluableDay("2026-08-23")).toBeNull();

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-23" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    for (const d of ["Lunes 24", "Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28"]) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") })); });
      expect(screen.getByText(/Bloqueado/i)).toBeDefined();
      expect(screen.getByText(/Esta evaluación aún no está disponible/i)).toBeDefined();
      expect(screen.queryByRole("button", { name: /Guardar evaluación/i })).toBeNull();
    }
  });

  // TEST 2
  it("02. Today Monday (2026-08-24): Monday eligible, Tuesday-Friday future locked", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-mon");

    expect(plan.canEvaluateDay("MONDAY", "2026-08-24")).toBe(true);
    expect(plan.canEvaluateDay("TUESDAY", "2026-08-24")).toBe(false);
    expect(plan.getNextEvaluableDay("2026-08-24")?.dayOfWeek).toBe("MONDAY");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    // Monday
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();

    // Tuesday-Friday future locked
    for (const d of ["Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28"]) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") })); });
      expect(screen.getByText(/Bloqueado/i)).toBeDefined();
      expect(screen.getByText(/Esta evaluación aún no está disponible/i)).toBeDefined();
      expect(screen.queryByRole("button", { name: /Guardar evaluación/i })).toBeNull();
    }
  });

  // TEST 3
  it("03. Today Wednesday (2026-08-26) with no evaluations: Monday is only next evaluable, Tue/Wed chronologically blocked, Thu/Fri future locked", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-wed-empty");

    expect(plan.canEvaluateDay("MONDAY", "2026-08-26")).toBe(true);
    expect(plan.canEvaluateDay("TUESDAY", "2026-08-26")).toBe(false);
    expect(plan.canEvaluateDay("WEDNESDAY", "2026-08-26")).toBe(false);
    expect(plan.canEvaluateDay("THURSDAY", "2026-08-26")).toBe(false);
    expect(plan.canEvaluateDay("FRIDAY", "2026-08-26")).toBe(false);
    expect(plan.getNextEvaluableDay("2026-08-26")?.dayOfWeek).toBe("MONDAY");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-26" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    // Monday is eligible
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();

    // Tuesday is chronologically blocked (Monday pending)
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    expect(screen.getByText(/Bloqueado/i)).toBeDefined();
    expect(screen.getByText(/Evaluación bloqueada por orden cronológico/i)).toBeDefined();
    expect(screen.getByText(/Completa primero la evaluación de Lunes/i)).toBeDefined();

    // Wednesday is chronologically blocked (Monday pending)
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Miércoles 26/i })); });
    expect(screen.getByText(/Bloqueado/i)).toBeDefined();
    expect(screen.getByText(/Evaluación bloqueada por orden cronológico/i)).toBeDefined();
    expect(screen.getByText(/Completa primero la evaluación de Lunes/i)).toBeDefined();

    // Thursday & Friday are future locked
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Jueves 27/i })); });
    expect(screen.getByText(/Esta evaluación aún no está disponible/i)).toBeDefined();
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Viernes 28/i })); });
    expect(screen.getByText(/Esta evaluación aún no está disponible/i)).toBeDefined();
  });

  // TEST 4
  it("04. Today Wednesday (2026-08-26) with Monday completed: Tuesday becomes eligible, Wednesday blocked by Tuesday", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-wed-mon-done");
    plan.days[0]!.evaluation = "Evaluación Lunes completada";
    await repo.save(plan);

    expect(plan.canEvaluateDay("MONDAY", "2026-08-26")).toBe(true);
    expect(plan.canEvaluateDay("TUESDAY", "2026-08-26")).toBe(true);
    expect(plan.canEvaluateDay("WEDNESDAY", "2026-08-26")).toBe(false);
    expect(plan.getNextEvaluableDay("2026-08-26")?.dayOfWeek).toBe("TUESDAY");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-26" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    // Tuesday is eligible
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();

    // Wednesday is blocked by Tuesday
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Miércoles 26/i })); });
    expect(screen.getByText(/Completa primero la evaluación de Martes/i)).toBeDefined();
  });

  // TEST 5
  it("05. Today Wednesday (2026-08-26) with Monday + Tuesday completed: Wednesday becomes eligible", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-wed-all-prior-done");
    plan.days[0]!.evaluation = "Lunes ok";
    plan.days[1]!.evaluation = "Martes ok";
    await repo.save(plan);

    expect(plan.canEvaluateDay("MONDAY", "2026-08-26")).toBe(true);
    expect(plan.canEvaluateDay("TUESDAY", "2026-08-26")).toBe(true);
    expect(plan.canEvaluateDay("WEDNESDAY", "2026-08-26")).toBe(true);
    expect(plan.canEvaluateDay("THURSDAY", "2026-08-26")).toBe(false);
    expect(plan.getNextEvaluableDay("2026-08-26")?.dayOfWeek).toBe("WEDNESDAY");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-26" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Miércoles 26/i })); });
    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();
  });

  // TEST 6
  it("06. Attempt to evaluate Thursday while today is Wednesday: DOMAIN/APPLICATION REJECTS", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source, "plan-sec-thu");

    await expect(
      service.saveDailyEvaluation("plan-sec-thu", "THURSDAY", "Eval jueves", "TEACHER", "2026-08-26")
    ).rejects.toThrow(/Cannot evaluate future day/i);
  });

  // TEST 7
  it("07. Today Friday with Monday incomplete: Friday cannot be evaluated (DOMAIN/APPLICATION REJECTS)", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-sec-fri-incomp");
    plan.days[1]!.evaluation = "Martes ok";
    plan.days[2]!.evaluation = "Miercoles ok";
    plan.days[3]!.evaluation = "Jueves ok";
    // Monday is intentionally left empty
    await repo.save(plan);

    expect(plan.canEvaluateDay("FRIDAY", "2026-08-28")).toBe(false);

    await expect(
      service.saveDailyEvaluation("plan-sec-fri-incomp", "FRIDAY", "Eval viernes", "TEACHER", "2026-08-28")
    ).rejects.toThrow(/Cannot evaluate FRIDAY before completing evaluation for earlier day MONDAY/i);
  });

  // TEST 8
  it("08. Today Friday with Mon-Thu completed: Friday eligible", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-fri-ready");
    plan.days[0]!.evaluation = "Lunes ok";
    plan.days[1]!.evaluation = "Martes ok";
    plan.days[2]!.evaluation = "Miércoles ok";
    plan.days[3]!.evaluation = "Jueves ok";
    await repo.save(plan);

    expect(plan.canEvaluateDay("FRIDAY", "2026-08-28")).toBe(true);
    expect(plan.getNextEvaluableDay("2026-08-28")?.dayOfWeek).toBe("FRIDAY");

    await expect(
      service.saveDailyEvaluation("plan-fri-ready", "FRIDAY", "Eval viernes completada", "TEACHER", "2026-08-28")
    ).resolves.toBeUndefined();

    const updated = await repo.findById("plan-fri-ready");
    expect(updated!.days[4]!.evaluation).toBe("Eval viernes completada");
  });

  // TEST 9
  it("09. Today after week (2026-08-29): earliest remaining unevaluated weekday becomes eligible sequentially", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-post-week");
    plan.days[0]!.evaluation = "Lunes ok";
    plan.days[1]!.evaluation = "Martes ok";
    // Wednesday, Thursday, Friday empty
    await repo.save(plan);

    expect(plan.canEvaluateDay("WEDNESDAY", "2026-08-29")).toBe(true);
    expect(plan.canEvaluateDay("THURSDAY", "2026-08-29")).toBe(false); // blocked by Wed
    expect(plan.canEvaluateDay("FRIDAY", "2026-08-29")).toBe(false); // blocked by Wed
    expect(plan.getNextEvaluableDay("2026-08-29")?.dayOfWeek).toBe("WEDNESDAY");

    // Complete Wednesday
    await service.saveDailyEvaluation("plan-post-week", "WEDNESDAY", "Miércoles post-semana", "TEACHER", "2026-08-29");
    const pAfterWed = await repo.findById("plan-post-week");
    expect(pAfterWed!.canEvaluateDay("THURSDAY", "2026-08-29")).toBe(true);
    expect(pAfterWed!.canEvaluateDay("FRIDAY", "2026-08-29")).toBe(false);
    expect(pAfterWed!.getNextEvaluableDay("2026-08-29")?.dayOfWeek).toBe("THURSDAY");
  });

  // TEST 10
  it("10. Completed evaluations remain preserved and are not overwritten by tab navigation", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source, "plan-preservation");
    plan.days[0]!.evaluation = "Evaluación Lunes Intacta";
    await repo.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-25" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    // Navigate across all tabs
    for (const d of ["Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28", "Lunes 24"]) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") })); });
    }

    // Verify Monday evaluation remains intact
    expect(screen.getByDisplayValue("Evaluación Lunes Intacta")).toBeDefined();
    const p = await repo.findById("plan-preservation");
    expect(p!.days[0]!.evaluation).toBe("Evaluación Lunes Intacta");
  });

  // TEST 11
  it("11. Existing H1R9-C.1.x evaluation lifecycle remains functional", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source, "plan-lifecycle");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    const input = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: "Evaluación del lunes guardada" } });
    });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Enviar evaluación a Ceci/i })); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    const p = await repo.findById("plan-lifecycle");
    expect(p!.days[0]!.evaluation).toBe("Evaluación del lunes guardada");
  });

  // TEST 12
  it("12. H1R9-B.3 Director review persistence remains fully functional alongside chronological evaluation", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = WeeklyPlanning.create("plan-director-pres", "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    await service.markDirectorDayReviewed("plan-director-pres", "MONDAY", "DIRECTOR");
    await service.markDirectorDayReviewed("plan-director-pres", "TUESDAY", "DIRECTOR");
    await service.markDirectorDayReviewed("plan-director-pres", "THURSDAY", "DIRECTOR");

    const p = await repo.findById("plan-director-pres");
    expect(p!.isDirectorDayReviewed("MONDAY")).toBe(true);
    expect(p!.isDirectorDayReviewed("TUESDAY")).toBe(true);
    expect(p!.isDirectorDayReviewed("THURSDAY")).toBe(true);
    expect(p!.isDirectorDayReviewed("WEDNESDAY")).toBe(false);
    expect(p!.getReviewedDirectorDaysCount()).toBe(3);
  });
});
