import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp, formatDayDateMessage } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-C.1.1: Calendar Sanitization & Generic Week Support", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createApprovedPlanForWeek = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id: string,
    weekStart: string,
    weekEnd: string
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

  describe("1. Generic Date Calculation & Domain Verification", () => {
    it("01. Correctly calculates November 9-13, 2026 week dates", () => {
      const plan = WeeklyPlanning.create("p-nov", "dc-1", "lactantes-c", "t1", "2026-11-09", "2026-11-13");
      const days = [
        { dayOfWeek: "MONDAY" as const, activities: [], complementaryActivities: [], materials: [], date: "" },
        { dayOfWeek: "TUESDAY" as const, activities: [], complementaryActivities: [], materials: [], date: "" },
        { dayOfWeek: "WEDNESDAY" as const, activities: [], complementaryActivities: [], materials: [], date: "" },
        { dayOfWeek: "THURSDAY" as const, activities: [], complementaryActivities: [], materials: [], date: "" },
        { dayOfWeek: "FRIDAY" as const, activities: [], complementaryActivities: [], materials: [], date: "" }
      ];

      expect(plan.getDayDate(days[0]!)).toBe("2026-11-09");
      expect(plan.getDayDate(days[1]!)).toBe("2026-11-10");
      expect(plan.getDayDate(days[2]!)).toBe("2026-11-11");
      expect(plan.getDayDate(days[3]!)).toBe("2026-11-12");
      expect(plan.getDayDate(days[4]!)).toBe("2026-11-13");
    });

    it("02. Correctly calculates Month Boundary Aug 31 - Sep 04, 2026 week dates", () => {
      const plan = WeeklyPlanning.create("p-month-cross", "dc-1", "lactantes-c", "t1", "2026-08-31", "2026-09-04");
      const days = [
        { dayOfWeek: "MONDAY" as const, activities: [], complementaryActivities: [], materials: [], date: "" },
        { dayOfWeek: "TUESDAY" as const, activities: [], complementaryActivities: [], materials: [], date: "" },
        { dayOfWeek: "WEDNESDAY" as const, activities: [], complementaryActivities: [], materials: [], date: "" },
        { dayOfWeek: "THURSDAY" as const, activities: [], complementaryActivities: [], materials: [], date: "" },
        { dayOfWeek: "FRIDAY" as const, activities: [], complementaryActivities: [], materials: [], date: "" }
      ];

      expect(plan.getDayDate(days[0]!)).toBe("2026-08-31");
      expect(plan.getDayDate(days[1]!)).toBe("2026-09-01");
      expect(plan.getDayDate(days[2]!)).toBe("2026-09-02");
      expect(plan.getDayDate(days[3]!)).toBe("2026-09-03");
      expect(plan.getDayDate(days[4]!)).toBe("2026-09-04");
    });

    it("03. Generic formatDayDateMessage formats different months and days accurately in UTC", () => {
      expect(formatDayDateMessage("2026-11-09")).toBe("lunes 9 de noviembre");
      expect(formatDayDateMessage("2026-11-10")).toBe("martes 10 de noviembre");
      expect(formatDayDateMessage("2026-08-31")).toBe("lunes 31 de agosto");
      expect(formatDayDateMessage("2026-09-01")).toBe("martes 1 de septiembre");
      expect(formatDayDateMessage("2026-09-02")).toBe("miércoles 2 de septiembre");
    });
  });

  describe("2. Generic Temporal Eligibility & Persistence (November 2026 Week)", () => {
    it("04. On November 10 (Tuesday), with Monday completed, Tuesday is eligible, Wed-Fri are blocked", async () => {
      const { repo, service, source } = createTestDeps();
      const plan = await createApprovedPlanForWeek(repo, source, "plan-nov", "2026-11-09", "2026-11-13");
      plan.days[0].evaluation = "Lunes 9 nov ok";
      await repo.save(plan);

      await act(async () => {
        render(<PlanningDemoApp service={service} source={source} currentDate="2026-11-10" />);
      });

      await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
      await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

      // Monday 9 Nov -> eligible
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes/i })); });
      expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();

      // Tuesday 10 Nov -> eligible
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes/i })); });
      expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();

      // Wednesday 11 Nov -> locked
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Miércoles/i })); });
      expect(screen.getByText(/Bloqueado/i)).toBeDefined();
      expect(screen.getByText(/Disponible el miércoles 11 de noviembre/i)).toBeDefined();
      expect(screen.queryByRole("button", { name: /Guardar evaluación/i })).toBeNull();

      // Thursday 12 Nov -> locked
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Jueves/i })); });
      expect(screen.getByText(/Bloqueado/i)).toBeDefined();
      expect(screen.getByText(/Disponible el jueves 12 de noviembre/i)).toBeDefined();
      expect(screen.queryByRole("button", { name: /Guardar evaluación/i })).toBeNull();

      // Friday 13 Nov -> locked
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Viernes/i })); });
      expect(screen.getByText(/Bloqueado/i)).toBeDefined();
      expect(screen.getByText(/Disponible el viernes 13 de noviembre/i)).toBeDefined();
      expect(screen.queryByRole("button", { name: /Guardar evaluación/i })).toBeNull();
    });

    it("05. Future-day evaluation on November week is rejected by domain boundary", async () => {
      const { repo, service, source } = createTestDeps();
      const plan = await createApprovedPlanForWeek(repo, source, "plan-nov-sec", "2026-11-09", "2026-11-13");
      plan.days[0].evaluation = "Lunes 9 nov ok";
      await repo.save(plan);

      // Attempting to evaluate Wednesday 11 Nov on Tuesday 10 Nov throws
      await expect(
        service.saveDailyEvaluation("plan-nov-sec", "WEDNESDAY", "Texto evaluacion", "TEACHER", "2026-11-10")
      ).rejects.toThrow("Cannot evaluate future day (2026-11-11) when current date is 2026-11-10");

      // Attempting to evaluate Friday 13 Nov on Tuesday 10 Nov throws
      await expect(
        service.saveDailyEvaluation("plan-nov-sec", "FRIDAY", "Texto evaluacion", "TEACHER", "2026-11-10")
      ).rejects.toThrow("Cannot evaluate future day (2026-11-13) when current date is 2026-11-10");

      // Saving Tuesday 10 Nov evaluation succeeds
      await expect(
        service.saveDailyEvaluation("plan-nov-sec", "TUESDAY", "Evaluación martes 10 nov", "TEACHER", "2026-11-10")
      ).resolves.toBeUndefined();

      const updatedPlan = await repo.findById("plan-nov-sec");
      expect(updatedPlan!.days[1]!.evaluation).toBe("Evaluación martes 10 nov");
    });
  });

  describe("3. Month-Boundary Week Verification (Aug 31 - Sep 04, 2026)", () => {
    it("06. On Sep 01 (Tuesday), with Monday (31 Aug) completed, Tuesday (1 Sep) is eligible, Wed-Fri (2-4 Sep) are blocked", async () => {
      const { repo, service, source } = createTestDeps();
      const plan = await createApprovedPlanForWeek(repo, source, "plan-sep", "2026-08-31", "2026-09-04");
      plan.days[0].evaluation = "31 ago ok";
      await repo.save(plan);

      await act(async () => {
        render(<PlanningDemoApp service={service} source={source} currentDate="2026-09-01" />);
      });

      await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
      await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

      // Monday 31 Aug -> eligible
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes/i })); });
      expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();

      // Tuesday 1 Sep -> eligible
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes/i })); });
      expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();

      // Wednesday 2 Sep -> locked with "Disponible el miércoles 2 de septiembre"
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Miércoles/i })); });
      expect(screen.getByText(/Bloqueado/i)).toBeDefined();
      expect(screen.getByText(/Disponible el miércoles 2 de septiembre/i)).toBeDefined();

      // Thursday 3 Sep -> locked with "Disponible el jueves 3 de septiembre"
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Jueves/i })); });
      expect(screen.getByText(/Bloqueado/i)).toBeDefined();
      expect(screen.getByText(/Disponible el jueves 3 de septiembre/i)).toBeDefined();

      // Friday 4 Sep -> locked with "Disponible el viernes 4 de septiembre"
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Viernes/i })); });
      expect(screen.getByText(/Bloqueado/i)).toBeDefined();
      expect(screen.getByText(/Disponible el viernes 4 de septiembre/i)).toBeDefined();
    });

    it("07. Future-day evaluation across month boundary is rejected by domain boundary", async () => {
      const { repo, service, source } = createTestDeps();
      await createApprovedPlanForWeek(repo, source, "plan-sep-sec", "2026-08-31", "2026-09-04");

      // Attempting to evaluate Wednesday 2 Sep on Tuesday 1 Sep throws
      await expect(
        service.saveDailyEvaluation("plan-sep-sec", "WEDNESDAY", "Eval 2 sep", "TEACHER", "2026-09-01")
      ).rejects.toThrow("Cannot evaluate future day (2026-09-02) when current date is 2026-09-01");

      // Saving Monday 31 Aug and Tuesday 1 Sep succeeds
      await expect(
        service.saveDailyEvaluation("plan-sep-sec", "MONDAY", "Eval 31 ago", "TEACHER", "2026-09-01")
      ).resolves.toBeUndefined();
      await expect(
        service.saveDailyEvaluation("plan-sep-sec", "TUESDAY", "Eval 1 sep", "TEACHER", "2026-09-01")
      ).resolves.toBeUndefined();

      const plan = await repo.findById("plan-sep-sec");
      expect(plan!.days[0]!.evaluation).toBe("Eval 31 ago");
      expect(plan!.days[1]!.evaluation).toBe("Eval 1 sep");
      expect(plan!.days[2]!.evaluation || "").toBe("");
    });
  });
});
