import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-B.3: Director Review Persistence Across Rounds", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createSubmittedPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-multi-round"
  ) => {
    const plan = WeeklyPlanning.create(id, "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.observations = "Obs";
    plan.identifiedNeeds = "Needs";
    plan.specialSituations = "Sit";
    plan.availableMaterials = "Mat";
    plan.status = "IN_REVIEW";
    await repo.save(plan);
    return plan;
  };

  describe("1. Round 1 -> Correction -> Round 2 Persistence", () => {
    it("01-05. Preserves reviewed state for unchanged days (Monday, Tuesday, Thursday) and invalidates only corrected days (Wednesday, Friday)", async () => {
      const { repo, service, source } = createTestDeps();
      const plan = await createSubmittedPlan(repo, source, "plan-r1-r2");

      // ROUND 1: Ceci reviews Monday, Tuesday, Thursday, and adds observations to Wednesday, Friday
      await service.markDirectorDayReviewed(plan.planningId, "MONDAY", "DIRECTOR");
      await service.markDirectorDayReviewed(plan.planningId, "TUESDAY", "DIRECTOR");
      await service.markDirectorDayReviewed(plan.planningId, "THURSDAY", "DIRECTOR");

      const wedActId = plan.days[2]!.activities[0]!.activityId;
      const friActId = plan.days[4]!.activities[0]!.activityId;

      await service.reject("plan-r1-r2", "Ajustar miércoles y viernes", "Ceci", "DIRECTOR", [
        {
          targetId: wedActId,
          observation: "Favor de ajustar el material de miércoles",
          originalContent: plan.days[2]!.activities[0]!.description,
          currentContent: plan.days[2]!.activities[0]!.description,
          status: "PENDING_CORRECTION",
          reviewer: "Ceci",
          timestamp: new Date()
        },
        {
          targetId: friActId,
          observation: "Favor de simplificar la actividad de viernes",
          originalContent: plan.days[4]!.activities[0]!.description,
          currentContent: plan.days[4]!.activities[0]!.description,
          status: "PENDING_CORRECTION",
          reviewer: "Ceci",
          timestamp: new Date()
        }
      ]);

      // Anita edits ONLY Wednesday and Friday
      const updatedPlan = await repo.findById("plan-r1-r2");
      const modifiedDays = JSON.parse(JSON.stringify(updatedPlan!.days));
      modifiedDays[2]!.activities[0]!.description = "Descripción corregida de miércoles con nuevos materiales";
      modifiedDays[4]!.activities[0]!.description = "Descripción corregida de viernes simplificada";

      await service.resubmit(
        "plan-r1-r2",
        updatedPlan!.observations,
        updatedPlan!.identifiedNeeds,
        updatedPlan!.specialSituations,
        updatedPlan!.availableMaterials,
        updatedPlan!.curricularReferences,
        modifiedDays,
        "TEACHER"
      );

      // ROUND 2: Verify domain state
      const r2Plan = await repo.findById("plan-r1-r2");
      expect(r2Plan!.isDirectorDayReviewed("MONDAY")).toBe(true);
      expect(r2Plan!.isDirectorDayReviewed("TUESDAY")).toBe(true);
      expect(r2Plan!.isDirectorDayReviewed("WEDNESDAY")).toBe(false); // requires re-review
      expect(r2Plan!.isDirectorDayReviewed("THURSDAY")).toBe(true);
      expect(r2Plan!.isDirectorDayReviewed("FRIDAY")).toBe(false); // requires re-review
      expect(r2Plan!.getReviewedDirectorDaysCount()).toBe(3);

      // UI Verification in Round 2
      await act(async () => {
        render(<PlanningDemoApp service={service} source={source} />);
      });

      await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
      await act(async () => { fireEvent.click(screen.getByText("Lista para conversar")); });

      // Check progress shows 3/5 días revisados
      expect(screen.getByText(/3\/5 días revisados/i)).toBeDefined();

      // Check Wednesday shows observation / correction
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Miércoles/i })); });
      expect(screen.getByText(/CAMBIO SOLICITADO ANTERIORMENTE/i)).toBeDefined();

      // Ceci accepts Wednesday correction
      await act(async () => { fireEvent.click(screen.getAllByText("Revisar")[0]!); });
      await act(async () => { fireEvent.click(screen.getByText(/MARCAR COMO ATENDIDA/i)); });

      // Progress increases to 4/5
      expect(screen.getByText(/4\/5 días revisados/i)).toBeDefined();

      // Ceci accepts Friday correction
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Viernes/i })); });
      await act(async () => { fireEvent.click(screen.getAllByText("Revisar")[0]!); });
      await act(async () => { fireEvent.click(screen.getByText(/MARCAR COMO ATENDIDA/i)); });

      // Progress increases to 5/5
      expect(screen.getByText(/5\/5 días revisados/i)).toBeDefined();

      // Now approval button is enabled
      const approveBtn = screen.getByRole("button", { name: /APROBAR TODA LA PLANEACIÓN/i }) as HTMLButtonElement;
      expect(approveBtn.disabled).toBe(false);
    });
  });

  describe("2. Unchanged-Day Protection", () => {
    it("06. Editing Wednesday does not invalidate Monday, Tuesday, Thursday, Friday if unchanged", async () => {
      const { repo, service, source } = createTestDeps();
      const plan = await createSubmittedPlan(repo, source, "plan-single-edit");

      // Ceci marks all 5 days reviewed
      await service.markDirectorDayReviewed(plan.planningId, "MONDAY", "DIRECTOR");
      await service.markDirectorDayReviewed(plan.planningId, "TUESDAY", "DIRECTOR");
      await service.markDirectorDayReviewed(plan.planningId, "WEDNESDAY", "DIRECTOR");
      await service.markDirectorDayReviewed(plan.planningId, "THURSDAY", "DIRECTOR");
      await service.markDirectorDayReviewed(plan.planningId, "FRIDAY", "DIRECTOR");

      const wedActId = plan.days[2]!.activities[0]!.activityId;
      await service.reject("plan-single-edit", "Solo ajustar miércoles", "Ceci", "DIRECTOR", [
        {
          targetId: wedActId,
          observation: "Ajustar solo miércoles",
          originalContent: plan.days[2]!.activities[0]!.description,
          currentContent: plan.days[2]!.activities[0]!.description,
          status: "PENDING_CORRECTION",
          reviewer: "Ceci",
          timestamp: new Date()
        }
      ]);

      // Anita modifies ONLY Wednesday
      const p = await repo.findById("plan-single-edit");
      const modifiedDays = JSON.parse(JSON.stringify(p!.days));
      modifiedDays[2]!.activities[0]!.description = "Miércoles modificado";

      await service.resubmit(
        "plan-single-edit",
        p!.observations,
        p!.identifiedNeeds,
        p!.specialSituations,
        p!.availableMaterials,
        p!.curricularReferences,
        modifiedDays,
        "TEACHER"
      );

      const postPlan = await repo.findById("plan-single-edit");
      expect(postPlan!.isDirectorDayReviewed("MONDAY")).toBe(true);
      expect(postPlan!.isDirectorDayReviewed("TUESDAY")).toBe(true);
      expect(postPlan!.isDirectorDayReviewed("WEDNESDAY")).toBe(false); // only Wednesday invalidated
      expect(postPlan!.isDirectorDayReviewed("THURSDAY")).toBe(true);
      expect(postPlan!.isDirectorDayReviewed("FRIDAY")).toBe(true);
      expect(postPlan!.getReviewedDirectorDaysCount()).toBe(4);
    });
  });

  describe("3. Multi-Round Preservation (Round 3)", () => {
    it("07. In Round 3, previously accepted days remain green and only newly observed day requires re-review", async () => {
      const { repo, service, source } = createTestDeps();
      const plan = await createSubmittedPlan(repo, source, "plan-round3");

      // Round 1: All 5 marked reviewed, Wednesday had observation
      await service.markDirectorDayReviewed(plan.planningId, "MONDAY", "DIRECTOR");
      await service.markDirectorDayReviewed(plan.planningId, "TUESDAY", "DIRECTOR");
      await service.markDirectorDayReviewed(plan.planningId, "WEDNESDAY", "DIRECTOR");
      await service.markDirectorDayReviewed(plan.planningId, "THURSDAY", "DIRECTOR");
      await service.markDirectorDayReviewed(plan.planningId, "FRIDAY", "DIRECTOR");

      const wedActId = plan.days[2]!.activities[0]!.activityId;
      await service.reject("plan-round3", "Ajuste R1", "Ceci", "DIRECTOR", [
        {
          targetId: wedActId,
          observation: "Ajuste miércoles R1",
          originalContent: plan.days[2]!.activities[0]!.description,
          currentContent: plan.days[2]!.activities[0]!.description,
          status: "PENDING_CORRECTION",
          reviewer: "Ceci",
          timestamp: new Date()
        }
      ]);

      // Anita resolves Wednesday and resubmits
      let p = await repo.findById("plan-round3");
      let modDays = JSON.parse(JSON.stringify(p!.days));
      modDays[2]!.activities[0]!.description = "Miércoles corregido R1";
      await service.resubmit("plan-round3", p!.observations, p!.identifiedNeeds, p!.specialSituations, p!.availableMaterials, p!.curricularReferences, modDays, "TEACHER");

      // Round 2: Ceci resolves Wednesday, but adds a new observation to Friday
      await service.resolveGranularObservation("plan-round3", wedActId, "DIRECTOR", "Ceci");
      const friActId = p!.days[4]!.activities[0]!.activityId;

      await service.reject("plan-round3", "Nuevo ajuste en viernes R2", "Ceci", "DIRECTOR", [
        {
          targetId: friActId,
          observation: "Ajuste viernes R2",
          originalContent: p!.days[4]!.activities[0]!.description,
          currentContent: p!.days[4]!.activities[0]!.description,
          status: "PENDING_CORRECTION",
          reviewer: "Ceci",
          timestamp: new Date()
        }
      ]);

      // Anita corrects Friday and resubmits
      p = await repo.findById("plan-round3");
      modDays = JSON.parse(JSON.stringify(p!.days));
      modDays[4]!.activities[0]!.description = "Viernes corregido R2";
      await service.resubmit("plan-round3", p!.observations, p!.identifiedNeeds, p!.specialSituations, p!.availableMaterials, p!.curricularReferences, modDays, "TEACHER");

      // Round 3 begins: Mon, Tue, Wed, Thu must remain reviewed (GREEN), only Friday requires re-review (ORANGE)
      const r3Plan = await repo.findById("plan-round3");
      expect(r3Plan!.isDirectorDayReviewed("MONDAY")).toBe(true);
      expect(r3Plan!.isDirectorDayReviewed("TUESDAY")).toBe(true);
      expect(r3Plan!.isDirectorDayReviewed("WEDNESDAY")).toBe(true); // preserved from R2 resolution
      expect(r3Plan!.isDirectorDayReviewed("THURSDAY")).toBe(true);
      expect(r3Plan!.isDirectorDayReviewed("FRIDAY")).toBe(false); // requires re-review in R3
      expect(r3Plan!.getReviewedDirectorDaysCount()).toBe(4);
    });
  });
});
