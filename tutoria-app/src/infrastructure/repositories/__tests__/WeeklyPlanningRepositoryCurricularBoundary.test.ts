import { describe, it, expect, vi } from "vitest";
import { WeeklyPlanning, PlanningDay } from "../../../domain/planning/WeeklyPlanning";
import { TUTORIA_DIRECT_PDA_CATALOG_REVISION } from "../../../domain/planning/DirectCurricularCatalog";
import { InvalidCurricularReferenceError } from "../../../domain/planning/CurricularPDAReference";
import { InMemoryWeeklyPlanningRepository } from "../InMemoryWeeklyPlanningRepository";
import { FirestoreWeeklyPlanningRepository } from "../FirestoreWeeklyPlanningRepository";

vi.mock("../../firebase/firebaseConfig", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d }),
  },
}));

describe("WeeklyPlanning Persistence Curricular Invariant Boundary", () => {
  const createValidDays = (): PlanningDay[] => [
    {
      date: "2026-08-24",
      dayOfWeek: "MONDAY",
      activities: [
        {
          activityId: "act-1",
          category: "EXPERIENCIAS ARTÍSTICAS",
          objective: "Obj 1",
          description: "Desc 1",
          materials: ["Mat1"],
          durationMinutes: 20,
          curricularTraceability: [
            { pdaId: "TUTORIA-PDA-0001", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
            { pdaId: "TUTORIA-PDA-0040", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
          ],
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
          activityId: "act-2",
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
          activityId: "act-3",
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
          activityId: "act-4",
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
          activityId: "act-5",
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

  describe("InMemoryWeeklyPlanningRepository Boundary", () => {
    it("should successfully save and find a valid aggregate with canonical PDA references", async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const plan = new WeeklyPlanning(
        "plan-mem-1",
        "dc-1",
        "room-1",
        "teacher-1",
        "2026-08-24",
        "2026-08-28",
        "DRAFT",
        "Obs",
        "Needs",
        "Sit",
        "Mat",
        [],
        [],
        createValidDays(),
        1
      );

      await repo.save(plan);
      const retrieved = await repo.findById("plan-mem-1");

      expect(retrieved).not.toBeNull();
      expect(retrieved!.planningId).toBe("plan-mem-1");
      expect(retrieved!.days[0]!.activities[0]!.curricularTraceability).toEqual([
        { pdaId: "TUTORIA-PDA-0001", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: "TUTORIA-PDA-0040", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ]);
    });

    it("should reject saving an aggregate if corrupted days with invalid PDA ID were injected", async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const plan = new WeeklyPlanning(
        "plan-mem-bad",
        "dc-1",
        "room-1",
        "teacher-1",
        "2026-08-24",
        "2026-08-28",
        "DRAFT",
        "Obs",
        "Needs",
        "Sit",
        "Mat",
        [],
        [],
        createValidDays(),
        1
      );

      // Simulate bypass modification
      (plan.days[0]!.activities[0]!.curricularTraceability as any) = [
        { pdaId: "INVALID-PDA-ID", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ];

      await expect(repo.save(plan)).rejects.toThrow(InvalidCurricularReferenceError);
    });

    it("should reject rehydration from raw in-memory storage if storage payload is corrupted", async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const rawCorrupted = JSON.stringify({
        planningId: "plan-corrupted",
        daycareId: "dc-1",
        roomId: "room-1",
        teacherId: "teacher-1",
        weekStart: "2026-08-24",
        weekEnd: "2026-08-28",
        status: "DRAFT",
        days: [
          {
            date: "2026-08-24",
            dayOfWeek: "MONDAY",
            activities: [
              {
                activityId: "act-1",
                curricularTraceability: [
                  { pdaId: "TUTORIA-PDA-0001", catalogRevision: "CORRUPTED_REV" },
                ],
              },
            ],
          },
        ],
      });

      // Ingest directly into private map to simulate external raw corruption
      (repo as any).data.set("plan-corrupted", JSON.parse(rawCorrupted));

      await expect(repo.findById("plan-corrupted")).rejects.toThrow(InvalidCurricularReferenceError);
    });
  });

  describe("FirestoreWeeklyPlanningRepository Boundary (Local / Mocked)", () => {
    const repo = new FirestoreWeeklyPlanningRepository();

    it("should round-trip serialize and deserialize valid canonical references cleanly", () => {
      const plan = new WeeklyPlanning(
        "plan-fs-1",
        "dc-1",
        "room-1",
        "teacher-1",
        "2026-08-24",
        "2026-08-28",
        "DRAFT",
        "Obs",
        "Needs",
        "Sit",
        "Mat",
        [],
        [],
        createValidDays(),
        1
      );

      const serialized = repo.serialize(plan);
      expect(serialized.days[0].activities[0].curricularTraceability).toEqual([
        { pdaId: "TUTORIA-PDA-0001", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: "TUTORIA-PDA-0040", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ]);

      const deserialized = repo.deserialize(serialized);
      expect(deserialized.planningId).toBe("plan-fs-1");
      expect(deserialized.days[0]!.activities[0]!.curricularTraceability).toEqual([
        { pdaId: "TUTORIA-PDA-0001", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
        { pdaId: "TUTORIA-PDA-0040", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ]);
    });

    it("should reject deserialization of raw Firestore payload containing unknown PDA ID", () => {
      const rawPayload = {
        planningId: "plan-bad-pda",
        daycareId: "dc-1",
        roomId: "room-1",
        teacherId: "teacher-1",
        weekStart: "2026-08-24",
        weekEnd: "2026-08-28",
        status: "DRAFT",
        days: [
          {
            date: "2026-08-24",
            dayOfWeek: "MONDAY",
            activities: [
              {
                activityId: "act-1",
                curricularTraceability: [
                  { pdaId: "UNKNOWN-PDA-0099", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
                ],
              },
            ],
          },
        ],
      };

      expect(() => repo.deserialize(rawPayload)).toThrow(InvalidCurricularReferenceError);
    });

    it("should reject deserialization of raw Firestore payload containing unknown catalog revision", () => {
      const rawPayload = {
        planningId: "plan-bad-rev",
        daycareId: "dc-1",
        roomId: "room-1",
        teacherId: "teacher-1",
        weekStart: "2026-08-24",
        weekEnd: "2026-08-28",
        status: "DRAFT",
        days: [
          {
            date: "2026-08-24",
            dayOfWeek: "MONDAY",
            activities: [
              {
                activityId: "act-1",
                curricularTraceability: [
                  { pdaId: "TUTORIA-PDA-0001", catalogRevision: "IMSS-2024-OFFICIAL" },
                ],
              },
            ],
          },
        ],
      };

      expect(() => repo.deserialize(rawPayload)).toThrow(InvalidCurricularReferenceError);
    });

    it("should reject deserialization of raw Firestore payload containing duplicate PDA IDs", () => {
      const rawPayload = {
        planningId: "plan-duplicate",
        daycareId: "dc-1",
        roomId: "room-1",
        teacherId: "teacher-1",
        weekStart: "2026-08-24",
        weekEnd: "2026-08-28",
        status: "DRAFT",
        days: [
          {
            date: "2026-08-24",
            dayOfWeek: "MONDAY",
            activities: [
              {
                activityId: "act-1",
                curricularTraceability: [
                  { pdaId: "TUTORIA-PDA-0003", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
                  { pdaId: "TUTORIA-PDA-0003", catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
                ],
              },
            ],
          },
        ],
      };

      expect(() => repo.deserialize(rawPayload)).toThrow(InvalidCurricularReferenceError);
    });

    it("should reject deserialization of raw legacy Firestore payload containing synthetic IMSS-LA-* strings", () => {
      const rawPayload = {
        planningId: "plan-legacy-imss",
        daycareId: "dc-1",
        roomId: "room-1",
        teacherId: "teacher-1",
        weekStart: "2026-08-24",
        weekEnd: "2026-08-28",
        status: "DRAFT",
        days: [
          {
            date: "2026-08-24",
            dayOfWeek: "MONDAY",
            activities: [
              {
                activityId: "act-1",
                curricularTraceability: ["IMSS-LA-EA-01"],
              },
            ],
          },
        ],
      };

      expect(() => repo.deserialize(rawPayload)).toThrow(InvalidCurricularReferenceError);
    });
  });
});
