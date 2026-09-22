import { describe, it, expect, beforeEach } from "vitest";
import { WeeklyPlanning, PlanningDay } from "../WeeklyPlanning";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";

describe("WeeklyPlanningTeacherReview: Domain-Backed Day-by-Day Human Review Contract (H1R9-G.3.3)", () => {
  let planning: WeeklyPlanning;
  let repo: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let recSource: DeterministicPedagogicalRecommendationSource;

  const createValid5DayPlanning = async (id = "plan-review-test"): Promise<WeeklyPlanning> => {
    const plan = WeeklyPlanning.create(id, "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await recSource.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.observations = "Obs";
    plan.identifiedNeeds = "Needs";
    plan.specialSituations = "Sit";
    plan.availableMaterials = "Mat";
    await repo.save(plan);
    return plan;
  };

  beforeEach(() => {
    repo = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repo);
    recSource = new DeterministicPedagogicalRecommendationSource();
  });

  // 1. Generated/opened Monday starts PENDIENTE
  it("1. Generated/opened Monday starts PENDIENTE (teacherReviewedAt is undefined)", async () => {
    planning = await createValid5DayPlanning();
    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(false);
    expect(planning.days[0].teacherReviewedAt).toBeUndefined();
    expect(planning.days[0].teacherReviewedBy).toBeUndefined();
    expect(planning.teacherReviewedDaysCount).toBe(0);
  });

  // 2. Merely opening Monday does not review it
  it("2. Merely opening or accessing Monday does not review it", async () => {
    planning = await createValid5DayPlanning();
    const monday = planning.days.find(d => d.dayOfWeek === "MONDAY");
    expect(monday).toBeDefined();
    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(false);
    expect(planning.teacherReviewedDaysCount).toBe(0);
  });

  // 3. Navigating Monday-Friday does not review any day
  it("3. Navigating Monday-Friday does not review any day", async () => {
    planning = await createValid5DayPlanning();
    const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    for (const d of weekdays) {
      const day = planning.days.find(day => day.dayOfWeek === d);
      expect(day).toBeDefined();
      expect(planning.isDayTeacherReviewed(d)).toBe(false);
    }
    expect(planning.teacherReviewedDaysCount).toBe(0);
  });

  // 4. Verification that no Guardar Dia domain method exists
  it("4. No fake Guardar Dia domain method exists on WeeklyPlanning", async () => {
    planning = await createValid5DayPlanning();
    expect((planning as any).saveDay).toBeUndefined();
    expect((planning as any).guardarDia).toBeUndefined();
  });

  // 5. Explicit markTeacherDayReviewed marks exactly current day
  it("5. Explicit markTeacherDayReviewed marks exactly current day", async () => {
    planning = await createValid5DayPlanning();
    const reviewDate = new Date("2026-08-24T10:00:00Z");
    planning.markTeacherDayReviewed("MONDAY", "anita-id", reviewDate);

    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(true);
    expect(planning.days[0].teacherReviewedBy).toBe("anita-id");
    expect(planning.days[0].teacherReviewedAt).toEqual(reviewDate);

    // Other days remain unreviewed
    expect(planning.isDayTeacherReviewed("TUESDAY")).toBe(false);
    expect(planning.isDayTeacherReviewed("WEDNESDAY")).toBe(false);
    expect(planning.isDayTeacherReviewed("THURSDAY")).toBe(false);
    expect(planning.isDayTeacherReviewed("FRIDAY")).toBe(false);
  });

  // 6. Progress becomes 1/5 after Monday review
  it("6. Progress becomes 1/5 after Monday review", async () => {
    planning = await createValid5DayPlanning();
    planning.markTeacherDayReviewed("MONDAY", "anita-id", new Date());
    expect(planning.teacherReviewedDaysCount).toBe(1);
  });

  // 7. Repeated action cannot double-count Monday
  it("7. Repeated action cannot double-count Monday", async () => {
    planning = await createValid5DayPlanning();
    planning.markTeacherDayReviewed("MONDAY", "anita-id", new Date());
    planning.markTeacherDayReviewed("MONDAY", "anita-id", new Date());
    expect(planning.teacherReviewedDaysCount).toBe(1);
  });

  // 8. Reviewing all five yields 5/5
  it("8. Reviewing all five yields 5/5 and areAllDaysTeacherReviewed() === true", async () => {
    planning = await createValid5DayPlanning();
    const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    for (const d of weekdays) {
      planning.markTeacherDayReviewed(d, "anita-id", new Date());
    }
    expect(planning.teacherReviewedDaysCount).toBe(5);
    expect(planning.areAllDaysTeacherReviewed()).toBe(true);
  });

  // 9. Weekly submit unavailable/rejected at 4/5
  it("9. Weekly submit rejected at 4/5 reviewed days", async () => {
    planning = await createValid5DayPlanning();
    const fourDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"];
    for (const d of fourDays) {
      planning.markTeacherDayReviewed(d, "anita-id", new Date());
    }
    expect(planning.teacherReviewedDaysCount).toBe(4);
    expect(planning.areAllDaysTeacherReviewed()).toBe(false);
    expect(() => planning.submit()).toThrow(/all 5 days must be reviewed by teacher \(4\/5 reviewed\)/);
  });

  // 10. Weekly submit allowed at 5/5 if other domain invariants valid
  it("10. Weekly submit allowed at 5/5 when all domain invariants are valid", async () => {
    planning = await createValid5DayPlanning();
    const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    for (const d of weekdays) {
      planning.markTeacherDayReviewed(d, "anita-id", new Date());
    }
    expect(() => planning.submit()).not.toThrow();
    expect(planning.status).toBe("IN_REVIEW");
  });

  // 11. Teacher review metadata has non-empty actor and Date timestamp
  it("11. Teacher review metadata preserves non-empty actor and Date timestamp", async () => {
    planning = await createValid5DayPlanning();
    const ts = new Date("2026-08-24T12:30:00Z");
    planning.markTeacherDayReviewed("MONDAY", "teacher-user-123", ts);

    const monday = planning.days.find(d => d.dayOfWeek === "MONDAY")!;
    expect(monday.teacherReviewedBy).toBe("teacher-user-123");
    expect(monday.teacherReviewedAt).toBeInstanceOf(Date);
    expect(monday.teacherReviewedAt!.getTime()).toBe(ts.getTime());
  });

  // 12. Anonymous/blank teacher identity rejected atomically
  it("12. Anonymous or blank teacher identity is rejected atomically", async () => {
    planning = await createValid5DayPlanning();
    expect(() => planning.markTeacherDayReviewed("MONDAY", "", new Date())).toThrow(/educator identity/i);
    expect(() => planning.markTeacherDayReviewed("MONDAY", "   ", new Date())).toThrow(/educator identity/i);
    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(false);
  });

  // 13. Material activity edit invalidates reviewed state
  it("13. Material activity edit invalidates reviewed state", async () => {
    planning = await createValid5DayPlanning();
    planning.markTeacherDayReviewed("MONDAY", "anita-id", new Date());
    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(true);

    const modifiedDays = JSON.parse(JSON.stringify(planning.days));
    modifiedDays[0].activities[0].description = "New material pedagogical activity description";

    planning.editPedagogicalContent(planning.observations, planning.identifiedNeeds, planning.specialSituations, planning.availableMaterials, planning.curricularReferences, modifiedDays);

    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(false);
    expect(planning.days[0].teacherReviewedAt).toBeUndefined();
    expect(planning.days[0].teacherReviewedBy).toBeUndefined();
  });

  // 14. Material curricular selection edit invalidates reviewed state
  it("14. Material curricular selection edit invalidates reviewed state", async () => {
    planning = await createValid5DayPlanning();
    planning.markTeacherDayReviewed("MONDAY", "anita-id", new Date());
    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(true);

    const targetActivityId = planning.days[0].activities[0].activityId;
    planning.setActivityCurricularTraceability("MONDAY", targetActivityId, [
      { pdaId: "TUTORIA-PDA-0001", catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" }
    ]);

    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(false);
  });

  // 15. Complementary activity material edit invalidates reviewed state
  it("15. Complementary activity material edit invalidates reviewed state", async () => {
    planning = await createValid5DayPlanning();
    planning.markTeacherDayReviewed("MONDAY", "anita-id", new Date());
    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(true);

    planning.setDayComplementaryActivities("MONDAY", [
      {
        programArea: "INGLES",
        activityName: "Story Time",
        purpose: "English exposure",
        description: "Listening to short rhymes",
        sourceReference: "Institutional manual"
      }
    ]);

    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(false);
  });

  // 16. DIRECT prioritized-practice material edit invalidates reviewed state
  it("16. DIRECT prioritized-practice material edit invalidates reviewed state", async () => {
    planning = await createValid5DayPlanning();
    planning.markTeacherDayReviewed("MONDAY", "anita-id", new Date());
    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(true);

    planning.setDayPrioritizedPractices("MONDAY", [
      {
        practiceId: "EXP-1",
        practiceName: "Exploración",
        description: "Exploración de texturas seguras",
        pdaReference: "TUTORIA-PDA-0001"
      }
    ]);

    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(false);
  });

  // 17. After invalidation, progress decreases
  it("17. After invalidation of one day, progress decreases from 5/5 to 4/5", async () => {
    planning = await createValid5DayPlanning();
    const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    for (const d of weekdays) {
      planning.markTeacherDayReviewed(d, "anita-id", new Date());
    }
    expect(planning.teacherReviewedDaysCount).toBe(5);

    // Invalidate Wednesday
    const modifiedDays = JSON.parse(JSON.stringify(planning.days));
    modifiedDays[2].activities[0].description = "Changed Wednesday activity";
    planning.editPedagogicalContent(planning.observations, planning.identifiedNeeds, planning.specialSituations, planning.availableMaterials, planning.curricularReferences, modifiedDays);

    expect(planning.teacherReviewedDaysCount).toBe(4);
    expect(planning.isDayTeacherReviewed("WEDNESDAY")).toBe(false);
    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(true);
    expect(planning.isDayTeacherReviewed("TUESDAY")).toBe(true);
    expect(planning.isDayTeacherReviewed("THURSDAY")).toBe(true);
    expect(planning.isDayTeacherReviewed("FRIDAY")).toBe(true);
  });

  // 18. Re-review restores progress
  it("18. Re-reviewing the invalidated day restores progress to 5/5", async () => {
    planning = await createValid5DayPlanning();
    const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    for (const d of weekdays) {
      planning.markTeacherDayReviewed(d, "anita-id", new Date());
    }

    // Invalidate Wednesday
    const modifiedDays = JSON.parse(JSON.stringify(planning.days));
    modifiedDays[2].activities[0].description = "Changed Wednesday activity";
    planning.editPedagogicalContent(planning.observations, planning.identifiedNeeds, planning.specialSituations, planning.availableMaterials, planning.curricularReferences, modifiedDays);
    expect(planning.teacherReviewedDaysCount).toBe(4);

    // Re-review Wednesday
    planning.markTeacherDayReviewed("WEDNESDAY", "anita-id", new Date());
    expect(planning.teacherReviewedDaysCount).toBe(5);
    expect(planning.areAllDaysTeacherReviewed()).toBe(true);
  });

  // 19. Submission after stale review is rejected
  it("19. Submission after stale review is rejected until re-reviewed", async () => {
    planning = await createValid5DayPlanning();
    const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    for (const d of weekdays) {
      planning.markTeacherDayReviewed(d, "anita-id", new Date());
    }

    // Material change to Thursday
    const modifiedDays = JSON.parse(JSON.stringify(planning.days));
    modifiedDays[3].activities[0].description = "Changed Thursday activity";
    planning.editPedagogicalContent(planning.observations, planning.identifiedNeeds, planning.specialSituations, planning.availableMaterials, planning.curricularReferences, modifiedDays);

    expect(() => planning.submit()).toThrow(/all 5 days must be reviewed by teacher/);

    // Re-review restores submit
    planning.markTeacherDayReviewed("THURSDAY", "anita-id", new Date());
    expect(() => planning.submit()).not.toThrow();
    expect(planning.status).toBe("IN_REVIEW");
  });

  // 20. Ceci review remains separate from Anita review
  it("20. Ceci director review remains completely separate from Anita teacher review", async () => {
    planning = await createValid5DayPlanning();
    planning.markTeacherDayReviewed("MONDAY", "anita-id", new Date());

    expect(planning.isDayTeacherReviewed("MONDAY")).toBe(true);
    expect(planning.days[0].directorReviewed).toBeFalsy();

    // Ceci reviews Monday after submission
    const weekdays = ["TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    for (const d of weekdays) {
      planning.markTeacherDayReviewed(d, "anita-id", new Date());
    }
    planning.submit();

    planning.markDirectorDayReviewed("MONDAY", "Ceci");
    expect(planning.days[0].directorReviewed).toBe(true);
    expect(planning.days[0].teacherReviewedBy).toBe("anita-id");
  });

  // 21. DIRECT flow works
  it("21. DIRECT flow enforces teacher review contract", async () => {
    planning = await createValid5DayPlanning("plan-direct-review");
    expect(planning.teacherReviewedDaysCount).toBe(0);
    ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].forEach(d => {
      planning.markTeacherDayReviewed(d, "anita-id", new Date());
    });
    expect(planning.teacherReviewedDaysCount).toBe(5);
    planning.submit();
    expect(planning.status).toBe("IN_REVIEW");
  });

  // 22. INDIRECT flow works without DIRECT curricular semantics
  it("22. INDIRECT flow enforces teacher review contract without DIRECT 40-PDA semantics", async () => {
    planning = await createValid5DayPlanning("plan-indirect-review");
    // Indirect planning does not have DIRECT PDAs
    for (const day of planning.days) {
      day.activities.forEach(a => {
        a.curricularTraceability = [];
      });
      day.prioritizedPractices = [];
    }

    expect(planning.teacherReviewedDaysCount).toBe(0);
    ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].forEach(d => {
      planning.markTeacherDayReviewed(d, "anita-id", new Date());
    });
    expect(planning.teacherReviewedDaysCount).toBe(5);
    planning.submit();
    expect(planning.status).toBe("IN_REVIEW");
  });
});
