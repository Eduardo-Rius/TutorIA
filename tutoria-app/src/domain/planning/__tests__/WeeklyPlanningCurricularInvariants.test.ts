import { describe, it, expect } from "vitest";
import { WeeklyPlanning, PlanningDay } from "../WeeklyPlanning";
import { TUTORIA_DIRECT_PDA_CATALOG_REVISION } from "../DirectCurricularCatalog";
import { InvalidCurricularReferenceError } from "../CurricularPDAReference";

describe("WeeklyPlanning Aggregate Curricular Invariant Enforcement", () => {
  const createValidDays = (): PlanningDay[] => [
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
          curricularTraceability: [],
        },
      ],
      complementaryActivities: [],
      materials: ["Mat1"],
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
    },
  ];

  describe("Creation / Constructor Boundary", () => {
    it("should accept aggregate creation with empty curricular traceability", () => {
      const days = createValidDays();
      expect(() => {
        new WeeklyPlanning(
          "plan-001",
          "daycare-01",
          "room-01",
          "teacher-01",
          "2026-08-24",
          "2026-08-28",
          "DRAFT",
          "Obs",
          "Needs",
          "Sit",
          "Mat",
          [],
          [],
          days,
          1
        );
      }).not.toThrow();
    });

    it("should accept aggregate creation with valid canonical PDA references", () => {
      const days = createValidDays();
      days[0]!.activities[0]!.curricularTraceability = [
        { pdaId: "TUTORIA-PDA-0001", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: "TUTORIA-PDA-0040", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ];

      expect(() => {
        new WeeklyPlanning(
          "plan-002",
          "daycare-01",
          "room-01",
          "teacher-01",
          "2026-08-24",
          "2026-08-28",
          "DRAFT",
          "Obs",
          "Needs",
          "Sit",
          "Mat",
          [],
          [],
          days,
          1
        );
      }).not.toThrow();
    });

    it("should reject aggregate creation with unknown PDA ID", () => {
      const days = createValidDays();
      days[0]!.activities[0]!.curricularTraceability = [
        { pdaId: "UNKNOWN-PDA-9999", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ];

      expect(() => {
        new WeeklyPlanning(
          "plan-bad-1",
          "daycare-01",
          "room-01",
          "teacher-01",
          "2026-08-24",
          "2026-08-28",
          "DRAFT",
          "Obs",
          "Needs",
          "Sit",
          "Mat",
          [],
          [],
          days,
          1
        );
      }).toThrow(InvalidCurricularReferenceError);
    });

    it("should reject aggregate creation with unknown catalog revision", () => {
      const days = createValidDays();
      days[0]!.activities[0]!.curricularTraceability = [
        { pdaId: "TUTORIA-PDA-0001", catalogRevision: "INVALID-REVISION-2024" },
      ];

      expect(() => {
        new WeeklyPlanning(
          "plan-bad-2",
          "daycare-01",
          "room-01",
          "teacher-01",
          "2026-08-24",
          "2026-08-28",
          "DRAFT",
          "Obs",
          "Needs",
          "Sit",
          "Mat",
          [],
          [],
          days,
          1
        );
      }).toThrow(InvalidCurricularReferenceError);
    });

    it("should reject aggregate creation with duplicate PDA IDs in same activity", () => {
      const days = createValidDays();
      days[0]!.activities[0]!.curricularTraceability = [
        { pdaId: "TUTORIA-PDA-0007", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: "TUTORIA-PDA-0007", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ];

      expect(() => {
        new WeeklyPlanning(
          "plan-bad-3",
          "daycare-01",
          "room-01",
          "teacher-01",
          "2026-08-24",
          "2026-08-28",
          "DRAFT",
          "Obs",
          "Needs",
          "Sit",
          "Mat",
          [],
          [],
          days,
          1
        );
      }).toThrow(InvalidCurricularReferenceError);
    });
  });

  describe("Mutation Boundary (editPedagogicalContent)", () => {
    it("should accept editing pedagogical content with valid canonical PDA references", () => {
      const plan = WeeklyPlanning.create("plan-mut-1", "dc1", "r1", "t1", "2026-08-24", "2026-08-28");
      const days = createValidDays();
      days[1]!.activities[0]!.curricularTraceability = [
        { pdaId: "TUTORIA-PDA-0015", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ];

      expect(() => {
        plan.editPedagogicalContent("Obs New", "Needs New", "Sit New", "Mat New", [], days);
      }).not.toThrow();

      expect(plan.days[1]!.activities[0]!.curricularTraceability[0]!.pdaId).toBe("TUTORIA-PDA-0015");
    });

    it("should reject editing pedagogical content with invalid PDA reference and maintain atomicity", () => {
      const plan = WeeklyPlanning.create("plan-mut-2", "dc1", "r1", "t1", "2026-08-24", "2026-08-28");
      const initialDays = createValidDays();
      plan.editPedagogicalContent("Original Obs", "Original Needs", "Original Sit", "Original Mat", [], initialDays);

      const invalidDays = createValidDays();
      invalidDays[2]!.activities[0]!.curricularTraceability = [
        { pdaId: "IMSS-LA-AF-01", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ];

      expect(() => {
        plan.editPedagogicalContent("Corrupted Obs", "Corrupted Needs", "Corrupted Sit", "Corrupted Mat", [], invalidDays);
      }).toThrow(InvalidCurricularReferenceError);

      // Verify atomic preservation: state was NOT modified
      expect(plan.observations).toBe("Original Obs");
      expect(plan.identifiedNeeds).toBe("Original Needs");
      expect(plan.specialSituations).toBe("Original Sit");
      expect(plan.availableMaterials).toBe("Original Mat");
      expect(plan.days[2]!.activities[0]!.curricularTraceability).toEqual([]);
    });

    it("should reject editing pedagogical content with duplicate PDA references and maintain atomicity", () => {
      const plan = WeeklyPlanning.create("plan-mut-3", "dc1", "r1", "t1", "2026-08-24", "2026-08-28");
      const initialDays = createValidDays();
      plan.editPedagogicalContent("Original Obs", "Original Needs", "Original Sit", "Original Mat", [], initialDays);

      const duplicateDays = createValidDays();
      duplicateDays[0]!.activities[0]!.curricularTraceability = [
        { pdaId: "TUTORIA-PDA-0020", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: "TUTORIA-PDA-0020", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ];

      expect(() => {
        plan.editPedagogicalContent("Mutated Obs", "Mutated Needs", "Mutated Sit", "Mutated Mat", [], duplicateDays);
      }).toThrow(InvalidCurricularReferenceError);

      expect(plan.observations).toBe("Original Obs");
      expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual([]);
    });
  });
});
