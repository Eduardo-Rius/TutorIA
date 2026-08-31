import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-C.1.2: Pre-Week Evaluation Lock & Strict Fail-Closed Temporal Authorization", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createApprovedPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-approved-c12",
    weekStart = "2026-08-24",
    weekEnd = "2026-08-28"
  ) => {
    const plan = WeeklyPlanning.create(id, "dc-1", "lactantes-c", "t1", weekStart, weekEnd);
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.status = "APPROVED";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repo.save(plan);
    return plan;
  };

  describe("1. Pre-Week Lock (2026-08-23 < 2026-08-24)", () => {
    it("01. UI strictly blocks all 5 days when currentDate (2026-08-23) is before weekStart (2026-08-24)", async () => {
      const { repo, service, source } = createTestDeps();
      await createApprovedPlan(repo, source, "plan-preweek");

      await act(async () => {
        render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-23" />);
      });

      await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
      await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

      const weekdays = ["Lunes 24", "Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28"];
      for (const day of weekdays) {
        await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(day, "i") })); });
        expect(screen.getByText(/Bloqueado/i)).toBeDefined();
        expect(screen.getByText(/Esta evaluación aún no está disponible/i)).toBeDefined();
        expect(screen.queryByRole("button", { name: /Guardar evaluación/i })).toBeNull();
      }
    });

    it("02. Direct domain/service attempts for all 5 days reject on 2026-08-23", async () => {
      const { repo, service, source } = createTestDeps();
      const plan = await createApprovedPlan(repo, source, "plan-preweek-sec");

      const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
      for (const d of days) {
        expect(plan.canEvaluateDay(d, "2026-08-23")).toBe(false);
        await expect(
          service.saveDailyEvaluation("plan-preweek-sec", d, "Intento invalido", "TEACHER", "2026-08-23")
        ).rejects.toThrow(/Cannot evaluate future day/i);
      }
    });
  });

  describe("2. Boundary & Progressive Temporal Verification", () => {
    it("03. On Monday 24 (2026-08-24): Monday is eligible, Tue-Fri are blocked", async () => {
      const { repo, service, source } = createTestDeps();
      const plan = await createApprovedPlan(repo, source, "plan-boundary");

      expect(plan.canEvaluateDay("MONDAY", "2026-08-24")).toBe(true);
      expect(plan.canEvaluateDay("TUESDAY", "2026-08-24")).toBe(false);
      expect(plan.canEvaluateDay("WEDNESDAY", "2026-08-24")).toBe(false);
      expect(plan.canEvaluateDay("THURSDAY", "2026-08-24")).toBe(false);
      expect(plan.canEvaluateDay("FRIDAY", "2026-08-24")).toBe(false);

      await expect(
        service.saveDailyEvaluation("plan-boundary", "MONDAY", "Eval lunes ok", "TEACHER", "2026-08-24")
      ).resolves.toBeUndefined();

      await expect(
        service.saveDailyEvaluation("plan-boundary", "TUESDAY", "Eval martes no", "TEACHER", "2026-08-24")
      ).rejects.toThrow(/Cannot evaluate future day/i);
    });

    it("04. On Wednesday 26 (2026-08-26): Mon-Wed are eligible, Thu-Fri are blocked", async () => {
      const { repo, service, source } = createTestDeps();
      const plan = await createApprovedPlan(repo, source, "plan-progressive");
      plan.days[0].evaluation = "Lunes ok";
      plan.days[1].evaluation = "Martes ok";

      expect(plan.canEvaluateDay("MONDAY", "2026-08-26")).toBe(true);
      expect(plan.canEvaluateDay("TUESDAY", "2026-08-26")).toBe(true);
      expect(plan.canEvaluateDay("WEDNESDAY", "2026-08-26")).toBe(true);
      expect(plan.canEvaluateDay("THURSDAY", "2026-08-26")).toBe(false);
      expect(plan.canEvaluateDay("FRIDAY", "2026-08-26")).toBe(false);
    });

    it("05. Post-week (2026-08-29): All five days are temporally eligible", async () => {
      const { repo, service, source } = createTestDeps();
      const plan = await createApprovedPlan(repo, source, "plan-postweek");
      plan.days[0].evaluation = "Lunes ok";
      plan.days[1].evaluation = "Martes ok";
      plan.days[2].evaluation = "Miercoles ok";
      plan.days[3].evaluation = "Jueves ok";

      expect(plan.canEvaluateDay("MONDAY", "2026-08-29")).toBe(true);
      expect(plan.canEvaluateDay("TUESDAY", "2026-08-29")).toBe(true);
      expect(plan.canEvaluateDay("WEDNESDAY", "2026-08-29")).toBe(true);
      expect(plan.canEvaluateDay("THURSDAY", "2026-08-29")).toBe(true);
      expect(plan.canEvaluateDay("FRIDAY", "2026-08-29")).toBe(true);
    });
  });

  describe("3. Fail-Closed Boundary Guarantees", () => {
    it("06. Missing or undefined currentDate always resolves to blocked (fail closed)", async () => {
      const { repo, service, source } = createTestDeps();
      const plan = await createApprovedPlan(repo, source, "plan-failclosed");

      expect(plan.canEvaluateDay("MONDAY", undefined)).toBe(false);
      expect(plan.canEvaluateDay("MONDAY", "")).toBe(false);

      await expect(
        service.saveDailyEvaluation("plan-failclosed", "MONDAY", "Eval", "TEACHER", undefined)
      ).rejects.toThrow(/Current date is required/i);
    });
  });
});
