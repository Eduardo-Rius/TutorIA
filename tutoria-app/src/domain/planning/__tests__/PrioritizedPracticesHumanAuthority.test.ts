import { describe, it, expect } from "vitest";
import {
  WeeklyPlanning,
  PlanningDay,
  PrioritizedPractice,
  InvalidPrioritizedPracticeError,
} from "../WeeklyPlanning";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { RoomCatalog } from "../RoomCatalog";

describe("Prioritized Practices — Human Instruction Authority (H1R9-F.7.1)", () => {
  const createTestPlan = (status: WeeklyPlanning["status"] = "DRAFT"): WeeklyPlanning => {
    const days: PlanningDay[] = [
      {
        date: "2026-08-24",
        dayOfWeek: "MONDAY",
        activities: [
          {
            activityId: "act-1",
            category: "C",
            objective: "Obj 1",
            description: "Desc 1",
            materials: [],
            durationMinutes: 20,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        prioritizedPractices: [],
        materials: ["Material 1"],
      },
      {
        date: "2026-08-25",
        dayOfWeek: "TUESDAY",
        activities: [],
        complementaryActivities: [],
        prioritizedPractices: [],
        materials: [],
      },
      {
        date: "2026-08-26",
        dayOfWeek: "WEDNESDAY",
        activities: [],
        complementaryActivities: [],
        prioritizedPractices: [],
        materials: [],
      },
      {
        date: "2026-08-27",
        dayOfWeek: "THURSDAY",
        activities: [],
        complementaryActivities: [],
        prioritizedPractices: [],
        materials: [],
      },
      {
        date: "2026-08-28",
        dayOfWeek: "FRIDAY",
        activities: [],
        complementaryActivities: [],
        prioritizedPractices: [],
        materials: [],
      },
    ];

    const plan = WeeklyPlanning.create(
      "plan-practice-test",
      "daycare-1",
      "lactantes-c",
      "teacher-1",
      "2026-08-24",
      "2026-08-28"
    );
    plan.days = days;
    plan.status = status;
    return plan;
  };

  it("20. TEST — EMPTY: [] is valid and planning can exist and proceed with zero prioritized practices", () => {
    const plan = createTestPlan("DRAFT");
    expect(plan.days[0].prioritizedPractices).toEqual([]);
    expect(plan.days.every((d) => Array.isArray(d.prioritizedPractices) && d.prioritizedPractices.length === 0)).toBe(true);
    expect(() => plan.assertValidPrioritizedPracticeInvariants()).not.toThrow();
  });

  it("21. TEST — SINGLE: stores one valid practice with practiceName preserved and trimmed", () => {
    const plan = createTestPlan("DRAFT");

    const practice: PrioritizedPractice = {
      practiceName: "   Acompañamiento en el desarrollo de la autonomía motriz   ",
    };

    plan.setDayPrioritizedPractices("MONDAY", [practice]);

    expect(plan.days[0].prioritizedPractices).toHaveLength(1);
    expect(plan.days[0].prioritizedPractices![0].practiceName).toBe(
      "Acompañamiento en el desarrollo de la autonomía motriz"
    );
    expect(plan.days[0].prioritizedPractices![0].sourceReference).toBeUndefined();
    // Other days untouched
    expect(plan.days[1].prioritizedPractices).toEqual([]);
  });

  it("22. TEST — OPTIONAL SOURCE: stores practiceName and sourceReference with both preserved and trimmed", () => {
    const plan = createTestPlan("DRAFT");

    const practice: PrioritizedPractice = {
      practiceName: "Interacción sensible y responsiva",
      sourceReference: "   Recomendación de Asesoría Técnico Pedagógica Zona 03   ",
    };

    plan.setDayPrioritizedPractices("MONDAY", [practice]);

    expect(plan.days[0].prioritizedPractices).toHaveLength(1);
    expect(plan.days[0].prioritizedPractices![0].practiceName).toBe("Interacción sensible y responsiva");
    expect(plan.days[0].prioritizedPractices![0].sourceReference).toBe(
      "Recomendación de Asesoría Técnico Pedagógica Zona 03"
    );
  });

  it("23. TEST — MULTIPLE: supports 0..N practices preserving order and properties without arbitrary limits", () => {
    const plan = createTestPlan("DRAFT");

    const p1: PrioritizedPractice = { practiceName: "Práctica Priorizada 1", sourceReference: "Ref 1" };
    const p2: PrioritizedPractice = { practiceName: "Práctica Priorizada 2" };
    const p3: PrioritizedPractice = { practiceName: "Práctica Priorizada 3", sourceReference: "Ref 3" };

    plan.setDayPrioritizedPractices("TUESDAY", [p1, p2, p3]);

    expect(plan.days[1].prioritizedPractices).toHaveLength(3);
    expect(plan.days[1].prioritizedPractices![0].practiceName).toBe("Práctica Priorizada 1");
    expect(plan.days[1].prioritizedPractices![1].practiceName).toBe("Práctica Priorizada 2");
    expect(plan.days[1].prioritizedPractices![2].practiceName).toBe("Práctica Priorizada 3");
  });

  it("24. TEST — INVALID: rejects empty and whitespace-only practiceName, keeping previous authoritative state unchanged", () => {
    const plan = createTestPlan("DRAFT");

    const original: PrioritizedPractice = {
      practiceName: "Práctica Original Autorizada",
    };
    plan.setDayPrioritizedPractices("MONDAY", [original]);

    // 1. Blank
    expect(() => {
      plan.setDayPrioritizedPractices("MONDAY", [{ practiceName: "" }]);
    }).toThrow(InvalidPrioritizedPracticeError);

    // 2. Whitespace-only
    expect(() => {
      plan.setDayPrioritizedPractices("MONDAY", [{ practiceName: "    \t \n  " }]);
    }).toThrow(InvalidPrioritizedPracticeError);

    // 3. Previous state untouched
    expect(plan.days[0].prioritizedPractices).toHaveLength(1);
    expect(plan.days[0].prioritizedPractices![0].practiceName).toBe("Práctica Original Autorizada");

    // 4. Atomic rejection on multiple items
    expect(() => {
      plan.setDayPrioritizedPractices("MONDAY", [
        { practiceName: "Práctica Valida" },
        { practiceName: "   " },
      ]);
    }).toThrow(InvalidPrioritizedPracticeError);

    // Still preserved
    expect(plan.days[0].prioritizedPractices).toHaveLength(1);
    expect(plan.days[0].prioritizedPractices![0].practiceName).toBe("Práctica Original Autorizada");
  });

  it("25. TEST — REPLACEMENT / CLEAR: replaces existing collection on new list, clears correctly with []", () => {
    const plan = createTestPlan("DRAFT");

    // Initial
    plan.setDayPrioritizedPractices("THURSDAY", [{ practiceName: "Práctica Anterior" }]);
    expect(plan.days[3].prioritizedPractices).toHaveLength(1);
    expect(plan.days[3].prioritizedPractices![0].practiceName).toBe("Práctica Anterior");

    // Replacement
    plan.setDayPrioritizedPractices("THURSDAY", [
      { practiceName: "Práctica Nueva 1" },
      { practiceName: "Práctica Nueva 2" },
    ]);
    expect(plan.days[3].prioritizedPractices).toHaveLength(2);
    expect(plan.days[3].prioritizedPractices![0].practiceName).toBe("Práctica Nueva 1");
    expect(plan.days[3].prioritizedPractices![1].practiceName).toBe("Práctica Nueva 2");

    // Clear with []
    plan.setDayPrioritizedPractices("THURSDAY", []);
    expect(plan.days[3].prioritizedPractices).toEqual([]);
    expect(plan.days[3].prioritizedPractices).toHaveLength(0);
  });

  it("26. TEST — LIFECYCLE: editable in DRAFT and REJECTED; strictly immutable in IN_REVIEW, APPROVED_FOR_EXECUTION, CLOSED", () => {
    const samplePractice = [{ practiceName: "Práctica Indicada" }];

    // 1. DRAFT: Allowed
    const draftPlan = createTestPlan("DRAFT");
    expect(() => draftPlan.setDayPrioritizedPractices("MONDAY", samplePractice)).not.toThrow();
    expect(draftPlan.days[0].prioritizedPractices).toHaveLength(1);

    // 2. REJECTED: Allowed
    const rejectedPlan = createTestPlan("REJECTED");
    expect(() => rejectedPlan.setDayPrioritizedPractices("MONDAY", samplePractice)).not.toThrow();
    expect(rejectedPlan.days[0].prioritizedPractices).toHaveLength(1);

    // 3. IN_REVIEW: Read-only
    const inReviewPlan = createTestPlan("IN_REVIEW");
    expect(() => inReviewPlan.setDayPrioritizedPractices("MONDAY", samplePractice)).toThrow(
      /Cannot edit prioritized practices in status: IN_REVIEW/
    );

    // 4. APPROVED_FOR_EXECUTION: Read-only
    const approvedPlan = createTestPlan("APPROVED_FOR_EXECUTION");
    expect(() => approvedPlan.setDayPrioritizedPractices("MONDAY", samplePractice)).toThrow(
      /Cannot edit prioritized practices in status: APPROVED_FOR_EXECUTION/
    );

    // 5. CLOSED: Read-only
    const closedPlan = createTestPlan("CLOSED");
    expect(() => closedPlan.setDayPrioritizedPractices("MONDAY", samplePractice)).toThrow(
      /Cannot edit prioritized practices in status: CLOSED/
    );
  });

  it("27. TEST — ISOLATION: Monday and Wednesday practices remain strictly isolated with no cross-day leakage", () => {
    const plan = createTestPlan("DRAFT");

    plan.setDayPrioritizedPractices("MONDAY", [{ practiceName: "Práctica Lunes" }]);
    plan.setDayPrioritizedPractices("WEDNESDAY", [{ practiceName: "Práctica Miércoles" }]);

    expect(plan.days[0].prioritizedPractices).toHaveLength(1);
    expect(plan.days[0].prioritizedPractices![0].practiceName).toBe("Práctica Lunes");

    expect(plan.days[1].prioritizedPractices).toEqual([]); // Tuesday

    expect(plan.days[2].prioritizedPractices).toHaveLength(1);
    expect(plan.days[2].prioritizedPractices![0].practiceName).toBe("Práctica Miércoles");

    expect(plan.days[3].prioritizedPractices).toEqual([]); // Thursday
    expect(plan.days[4].prioritizedPractices).toEqual([]); // Friday
  });

  it("28. TEST — GENERATOR: generates all 5 days with prioritizedPractices: [] and ZERO AI-invented practices", async () => {
    const source = new DeterministicPedagogicalRecommendationSource();
    const generatedDays = await source.generateRecommendation(
      RoomCatalog.getRoom("lactantes-c")!,
      "Los niños interactúan con juguetes de agarre",
      "Desarrollo motor y curiosidad",
      "Ninguna",
      "Sonajas y mordederas"
    );

    expect(generatedDays).toHaveLength(5);
    for (const d of generatedDays) {
      expect(d.prioritizedPractices).toEqual([]);
      expect(d.prioritizedPractices).toHaveLength(0);
    }
  });
});
