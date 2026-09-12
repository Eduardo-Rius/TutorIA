import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";
import { DIRECT_PDA_CATALOG } from "../../../domain/planning/DirectCurricularCatalog";

describe("Direct Reverso Dynamic Curricular Projection (H1R9-F.5.3.12)", () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let source: DeterministicPedagogicalRecommendationSource;

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
    source = new DeterministicPedagogicalRecommendationSource();
  });

  const createBaseDraftPlan = async (planningId = "plan-direct-print-test") => {
    const plan = WeeklyPlanning.create(
      planningId,
      "d1",
      "lactantes-c",
      "t1",
      "2026-08-24",
      "2026-08-28"
    );
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.observations = "Obs";
    plan.identifiedNeeds = "Needs";
    plan.specialSituations = "Sit";
    plan.availableMaterials = "Mat";
    return plan;
  };

  it("A & H. EMPTY & ANTI-HARDCODE: A day with zero curricular refs has ZERO marks across all 40 official rows", async () => {
    const plan = await createBaseDraftPlan("plan-empty-test");
    // Ensure all 5 days have 0 curricular references
    for (const d of plan.days) {
      for (const a of d.activities) {
        a.curricularTraceability = [];
      }
    }
    plan.status = "APPROVED_FOR_EXECUTION";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repository.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    // Switch to Ceci to access print view
    await act(async () => {
      fireEvent.click(screen.getByText("Ceci (Directora)"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Anita"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Versión Oficial IMSS"));
    });

    // For each of the 5 days, verify all 40 rows are UNMARKED
    const dayNames = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    for (const day of dayNames) {
      const reverso = screen.getByTestId(`direct-reverso-${day}`);
      expect(reverso).toBeDefined();

      // Verify each of the 40 canonical PDA entries is unmarked on this day
      for (const entry of DIRECT_PDA_CATALOG) {
        expect(within(reverso).getByTestId(`pda-unmarked-${entry.id}`)).toBeDefined();
        expect(within(reverso).queryByTestId(`pda-mark-${entry.id}`)).toBeNull();
      }
    }
  });

  it("B, C, D, E, F. SINGLE, MULTI, DEDUP, CROSS-DAY ISOLATION in real print view", async () => {
    const plan = await createBaseDraftPlan("plan-multi-print-test");

    const pda1 = DIRECT_PDA_CATALOG[0]!; // Lenguajes (TUTORIA-PDA-0001)
    const pda2 = DIRECT_PDA_CATALOG[1]!; // Lenguajes (TUTORIA-PDA-0002)
    const pda28 = DIRECT_PDA_CATALOG.find((e) => e.id === "TUTORIA-PDA-0028")!; // De lo Humano (TUTORIA-PDA-0028)

    // Monday: Activity 0 has pda1 & pda2, Activity 1 also has pda1 (to test DEDUP)
    plan.setActivityCurricularTraceability("MONDAY", plan.days[0]!.activities[0]!.activityId, [
      { pdaId: pda1.id, catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" },
      { pdaId: pda2.id, catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" },
    ]);
    plan.setActivityCurricularTraceability("MONDAY", plan.days[0]!.activities[1]!.activityId, [
      { pdaId: pda1.id, catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" },
    ]);

    // Friday: Activity 0 has pda28
    plan.setActivityCurricularTraceability("FRIDAY", plan.days[4]!.activities[0]!.activityId, [
      { pdaId: pda28.id, catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" },
    ]);

    // Approve plan for execution
    plan.status = "APPROVED_FOR_EXECUTION";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repository.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Ceci (Directora)"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Anita"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Versión Oficial IMSS"));
    });

    // 1. Monday Reverso Assertions:
    const mondayReverso = screen.getByTestId("direct-reverso-MONDAY");
    // pda1 marked (deduped to 1 checkmark)
    const monMark1 = within(mondayReverso).getByTestId(`pda-mark-${pda1.id}`);
    expect(monMark1.textContent).toBe("✓");

    // pda2 marked
    const monMark2 = within(mondayReverso).getByTestId(`pda-mark-${pda2.id}`);
    expect(monMark2.textContent).toBe("✓");

    // pda28 UNMARKED on Monday
    expect(within(mondayReverso).getByTestId(`pda-unmarked-${pda28.id}`)).toBeDefined();
    expect(within(mondayReverso).queryByTestId(`pda-mark-${pda28.id}`)).toBeNull();

    // 2. Friday Reverso Assertions:
    const fridayReverso = screen.getByTestId("direct-reverso-FRIDAY");
    // pda28 marked on Friday
    const friMark28 = within(fridayReverso).getByTestId(`pda-mark-${pda28.id}`);
    expect(friMark28.textContent).toBe("✓");

    // pda1 & pda2 UNMARKED on Friday
    expect(within(fridayReverso).getByTestId(`pda-unmarked-${pda1.id}`)).toBeDefined();
    expect(within(fridayReverso).queryByTestId(`pda-mark-${pda1.id}`)).toBeNull();
    expect(within(fridayReverso).getByTestId(`pda-unmarked-${pda2.id}`)).toBeDefined();
    expect(within(fridayReverso).queryByTestId(`pda-mark-${pda2.id}`)).toBeNull();

    // 3. Tuesday, Wednesday, Thursday: All unmarked
    for (const day of ["TUESDAY", "WEDNESDAY", "THURSDAY"]) {
      const dayReverso = screen.getByTestId(`direct-reverso-${day}`);
      expect(within(dayReverso).queryByTestId(`pda-mark-${pda1.id}`)).toBeNull();
      expect(within(dayReverso).queryByTestId(`pda-mark-${pda28.id}`)).toBeNull();
    }
  });

  it("G. FULL CATALOG: All 40 canonical entries resolve correctly to printable official rows without internal IDs in document text", async () => {
    const plan = await createBaseDraftPlan("plan-full-catalog-test");

    // Distribute all 40 PDAs across Monday activities
    const allRefs = DIRECT_PDA_CATALOG.map((entry) => ({
      pdaId: entry.id,
      catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" as const,
    }));

    plan.setActivityCurricularTraceability("MONDAY", plan.days[0]!.activities[0]!.activityId, allRefs);

    plan.status = "APPROVED_FOR_EXECUTION";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repository.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Ceci (Directora)"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Anita"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Versión Oficial IMSS"));
    });

    const mondayReverso = screen.getByTestId("direct-reverso-MONDAY");

    // All 40 must have a mark on their row
    for (const entry of DIRECT_PDA_CATALOG) {
      const row = within(mondayReverso).getByTestId(`pda-row-${entry.id}`);
      expect(row).toBeDefined();
      const mark = within(row).getByTestId(`pda-mark-${entry.id}`);
      expect(mark.textContent).toBe("✓");
    }

    // Verify TutorIA technical IDs (e.g. TUTORIA-PDA-0001) are NOT printed as document visible text
    expect(within(mondayReverso).queryByText("TUTORIA-PDA-0001")).toBeNull();
    expect(within(mondayReverso).queryByText("TUTORIA-PDA-0040")).toBeNull();
  });
});
