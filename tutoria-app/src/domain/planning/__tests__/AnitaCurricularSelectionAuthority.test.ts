import { describe, it, expect } from "vitest";
import { WeeklyPlanning, PlanningDay } from "../WeeklyPlanning";
import { TUTORIA_DIRECT_PDA_CATALOG_REVISION } from "../DirectCurricularCatalog";
import { InvalidCurricularReferenceError } from "../CurricularPDAReference";

describe("Anita Curricular Selection Domain Authority (setActivityCurricularTraceability)", () => {
  const createTestPlan = (status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CLOSED" = "DRAFT") => {
    const days: PlanningDay[] = [
      {
        date: "2026-08-24",
        dayOfWeek: "MONDAY",
        activities: [
          {
            activityId: "act-mon-1",
            category: "EXPERIENCIAS ARTÍSTICAS",
            objective: "Obj 1",
            description: "Desc 1",
            materials: ["Mat1"],
            durationMinutes: 20,
            curricularTraceability: [
              { pdaId: "TUTORIA-PDA-0001", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
            ],
          },
        ],
        complementaryActivities: [],
        materials: ["Mat1"],
        evaluationStatus: status === "CLOSED" ? "APPROVED" : undefined,
      },
      {
        date: "2026-08-25",
        dayOfWeek: "TUESDAY",
        activities: [
          {
            activityId: "act-tue-1",
            category: "AMBIENTES DE APRENDIZAJE",
            objective: "Obj 2",
            description: "Desc 2",
            materials: ["Mat2"],
            durationMinutes: 25,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        materials: ["Mat2"],
        evaluationStatus: status === "CLOSED" ? "APPROVED" : undefined,
      },
      {
        date: "2026-08-26",
        dayOfWeek: "WEDNESDAY",
        activities: [
          {
            activityId: "act-wed-1",
            category: "ACTIVACIÓN FÍSICA",
            objective: "Obj 3",
            description: "Desc 3",
            materials: ["Mat3"],
            durationMinutes: 20,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        materials: ["Mat3"],
        evaluationStatus: status === "CLOSED" ? "APPROVED" : undefined,
      },
      {
        date: "2026-08-27",
        dayOfWeek: "THURSDAY",
        activities: [
          {
            activityId: "act-thu-1",
            category: "LECTURA EN VOZ ALTA",
            objective: "Obj 4",
            description: "Desc 4",
            materials: ["Mat4"],
            durationMinutes: 15,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        materials: ["Mat4"],
        evaluationStatus: status === "CLOSED" ? "APPROVED" : undefined,
      },
      {
        date: "2026-08-28",
        dayOfWeek: "FRIDAY",
        activities: [
          {
            activityId: "act-fri-1",
            category: "PENSAMIENTO MATEMÁTICO",
            objective: "Obj 5",
            description: "Desc 5",
            materials: ["Mat5"],
            durationMinutes: 20,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        materials: ["Mat5"],
        evaluationStatus: status === "CLOSED" ? "APPROVED" : undefined,
      },
    ];

    return new WeeklyPlanning(
      "plan-anita-1",
      "dc-01",
      "room-01",
      "teacher-01",
      "2026-08-24",
      "2026-08-28",
      status === "APPROVED" ? "APPROVED_FOR_EXECUTION" : status,
      "Observations",
      "Needs",
      "Situations",
      "Materials",
      [],
      [],
      days,
      1
    );
  };

  describe("DRAFT Status: Legitimate Human Edit & Replacement Semantics", () => {
    it("should allow replacing [] with one valid canonical PDA reference", () => {
      const plan = createTestPlan("DRAFT");
      expect(plan.days[1]!.activities[0]!.curricularTraceability).toEqual([]);

      plan.setActivityCurricularTraceability("TUESDAY", "act-tue-1", [
        { pdaId: "TUTORIA-PDA-0005", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ]);

      expect(plan.days[1]!.activities[0]!.curricularTraceability).toEqual([
        { pdaId: "TUTORIA-PDA-0005", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ]);
    });

    it("should allow replacing one PDA with multiple valid distinct PDA references", () => {
      const plan = createTestPlan("DRAFT");
      expect(plan.days[0]!.activities[0]!.curricularTraceability).toHaveLength(1);

      plan.setActivityCurricularTraceability("MONDAY", "act-mon-1", [
        { pdaId: "TUTORIA-PDA-0010", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: "TUTORIA-PDA-0020", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: "TUTORIA-PDA-0040", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ]);

      expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual([
        { pdaId: "TUTORIA-PDA-0010", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: "TUTORIA-PDA-0020", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: "TUTORIA-PDA-0040", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ]);
    });

    it("should allow clearing a populated selection to [] (clear-all)", () => {
      const plan = createTestPlan("DRAFT");
      expect(plan.days[0]!.activities[0]!.curricularTraceability).toHaveLength(1);

      plan.setActivityCurricularTraceability("MONDAY", "act-mon-1", []);

      expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual([]);
    });

    it("should allow targeting by date string as well as dayOfWeek string", () => {
      const plan = createTestPlan("DRAFT");
      plan.setActivityCurricularTraceability("2026-08-25", "act-tue-1", [
        { pdaId: "TUTORIA-PDA-0007", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ]);

      expect(plan.days[1]!.activities[0]!.curricularTraceability).toEqual([
        { pdaId: "TUTORIA-PDA-0007", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ]);
    });
  });

  describe("Atomic Rejections on Invalid Data", () => {
    it("should reject unknown PDA ID and keep original selection intact", () => {
      const plan = createTestPlan("DRAFT");
      const original = [...plan.days[0]!.activities[0]!.curricularTraceability];

      expect(() => {
        plan.setActivityCurricularTraceability("MONDAY", "act-mon-1", [
          { pdaId: "IMSS-LA-EA-01", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        ]);
      }).toThrow(InvalidCurricularReferenceError);

      expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual(original);
    });

    it("should reject unknown catalog revision and keep original selection intact", () => {
      const plan = createTestPlan("DRAFT");
      const original = [...plan.days[0]!.activities[0]!.curricularTraceability];

      expect(() => {
        plan.setActivityCurricularTraceability("MONDAY", "act-mon-1", [
          { pdaId: "TUTORIA-PDA-0001", catalogRevision: "UNKNOWN-REVISION" },
        ]);
      }).toThrow(InvalidCurricularReferenceError);

      expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual(original);
    });

    it("should reject duplicate PDA IDs and keep original selection intact", () => {
      const plan = createTestPlan("DRAFT");
      const original = [...plan.days[0]!.activities[0]!.curricularTraceability];

      expect(() => {
        plan.setActivityCurricularTraceability("MONDAY", "act-mon-1", [
          { pdaId: "TUTORIA-PDA-0002", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
          { pdaId: "TUTORIA-PDA-0002", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        ]);
      }).toThrow(InvalidCurricularReferenceError);

      expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual(original);
    });

    it("should reject unknown day and keep aggregate unchanged", () => {
      const plan = createTestPlan("DRAFT");

      expect(() => {
        plan.setActivityCurricularTraceability("SUNDAY", "act-mon-1", []);
      }).toThrow(/Day not found/);
    });

    it("should reject unknown activity and keep aggregate unchanged", () => {
      const plan = createTestPlan("DRAFT");

      expect(() => {
        plan.setActivityCurricularTraceability("MONDAY", "non-existent-activity", []);
      }).toThrow(/Activity .non-existent-activity. not found/);
    });
  });

  describe("Lifecycle Authority Windows & Freeze Points", () => {
    it("should allow editing curricular selection when status is REJECTED (correction round)", () => {
      const plan = createTestPlan("REJECTED");
      plan.setActivityCurricularTraceability("MONDAY", "act-mon-1", [
        { pdaId: "TUTORIA-PDA-0012", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ]);

      expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual([
        { pdaId: "TUTORIA-PDA-0012", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ]);
    });

    it("should strictly block editing curricular selection when status is IN_REVIEW", () => {
      const plan = createTestPlan("IN_REVIEW");
      expect(() => {
        plan.setActivityCurricularTraceability("MONDAY", "act-mon-1", []);
      }).toThrow(/Cannot edit curricular traceability in status: IN_REVIEW/);
    });

    it("should strictly block editing curricular selection when status is APPROVED_FOR_EXECUTION", () => {
      const plan = createTestPlan("APPROVED");
      expect(() => {
        plan.setActivityCurricularTraceability("MONDAY", "act-mon-1", []);
      }).toThrow(/Cannot edit curricular traceability in status: APPROVED_FOR_EXECUTION/);
    });

    it("should strictly block editing curricular selection when status is CLOSED", () => {
      const plan = createTestPlan("CLOSED");
      expect(() => {
        plan.setActivityCurricularTraceability("MONDAY", "act-mon-1", []);
      }).toThrow(/Cannot edit curricular traceability in status: CLOSED/);
    });
  });
});
