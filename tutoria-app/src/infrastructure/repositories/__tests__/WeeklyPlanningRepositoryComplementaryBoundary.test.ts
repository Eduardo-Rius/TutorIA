import { describe, it, expect, vi } from "vitest";
import { WeeklyPlanning, PlanningDay } from "../../../domain/planning/WeeklyPlanning";
import { InvalidComplementaryActivityError } from "../../../domain/planning/ComplementaryProgramActivity";
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

describe("WeeklyPlanningRepository Complementary Boundary (H1R9-F.6.1)", () => {
  const createValidDays = (): PlanningDay[] => [
    {
      date: "2026-08-24",
      dayOfWeek: "MONDAY",
      activities: [],
      complementaryActivities: [
        {
          programArea: "Programa de Estimulación Oportuna",
          activityName: "Seguimiento motor",
          purpose: "Reforzar gateo",
          description: "Colchoneta guiada",
          sourceReference: "Oficio IMSS-2026",
        },
      ],
      materials: ["Colchoneta"],
    },
    {
      date: "2026-08-25",
      dayOfWeek: "TUESDAY",
      activities: [],
      complementaryActivities: [],
      materials: [],
    },
    {
      date: "2026-08-26",
      dayOfWeek: "WEDNESDAY",
      activities: [],
      complementaryActivities: [],
      materials: [],
    },
    {
      date: "2026-08-27",
      dayOfWeek: "THURSDAY",
      activities: [],
      complementaryActivities: [],
      materials: [],
    },
    {
      date: "2026-08-28",
      dayOfWeek: "FRIDAY",
      activities: [],
      complementaryActivities: [],
      materials: [],
    },
  ];

  describe("InMemoryWeeklyPlanningRepository Boundary", () => {
    it("should successfully save and round-trip retrieve valid structured complementary activities", async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const plan = WeeklyPlanning.create(
        "plan-mem-comp-1",
        "dc-1",
        "room-1",
        "teacher-1",
        "2026-08-24",
        "2026-08-28"
      );
      plan.days = createValidDays();

      await repo.save(plan);
      const retrieved = await repo.findById("plan-mem-comp-1");

      expect(retrieved).not.toBeNull();
      expect(retrieved!.planningId).toBe("plan-mem-comp-1");
      expect(retrieved!.days[0].complementaryActivities).toHaveLength(1);
      expect(retrieved!.days[0].complementaryActivities[0]).toEqual({
        programArea: "Programa de Estimulación Oportuna",
        activityName: "Seguimiento motor",
        purpose: "Reforzar gateo",
        description: "Colchoneta guiada",
        sourceReference: "Oficio IMSS-2026",
      });
      expect(retrieved!.days[1].complementaryActivities).toEqual([]);
    });

    it("should reject saving an aggregate if corrupted days with blank programArea were injected", async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const plan = WeeklyPlanning.create(
        "plan-mem-comp-bad",
        "dc-1",
        "room-1",
        "teacher-1",
        "2026-08-24",
        "2026-08-28"
      );
      plan.days = createValidDays();

      // Simulate bypass injection of blank programArea
      (plan.days[0].complementaryActivities as any) = [
        { programArea: "   ", activityName: "Actividad sin programa" },
      ];

      await expect(repo.save(plan)).rejects.toThrow(InvalidComplementaryActivityError);
    });

    it("should reject rehydration from raw in-memory storage if storage payload has blank activityName", async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const rawCorrupted = JSON.stringify({
        planningId: "plan-comp-corrupted",
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
            activities: [],
            complementaryActivities: [
              { programArea: "Programa Valido", activityName: "" },
            ],
            materials: [],
          },
        ],
      });

      (repo as any).data.set("plan-comp-corrupted", JSON.parse(rawCorrupted));

      await expect(repo.findById("plan-comp-corrupted")).rejects.toThrow(
        InvalidComplementaryActivityError
      );
    });
  });

  describe("FirestoreWeeklyPlanningRepository Boundary (Local / Mocked)", () => {
    const repo = new FirestoreWeeklyPlanningRepository();

    it("should round-trip serialize and deserialize valid complementary activities cleanly", () => {
      const plan = WeeklyPlanning.create(
        "plan-fs-comp-1",
        "dc-1",
        "room-1",
        "teacher-1",
        "2026-08-24",
        "2026-08-28"
      );
      plan.days = createValidDays();

      const serialized = repo.serialize(plan);
      expect(serialized.days[0].complementaryActivities).toHaveLength(1);
      expect(serialized.days[0].complementaryActivities[0].programArea).toBe(
        "Programa de Estimulación Oportuna"
      );

      const deserialized = repo.deserialize(serialized);
      expect(deserialized.planningId).toBe("plan-fs-comp-1");
      expect(deserialized.days[0].complementaryActivities).toHaveLength(1);
      expect(deserialized.days[0].complementaryActivities[0].activityName).toBe("Seguimiento motor");
    });

    it("should reject deserialization of raw Firestore payload containing blank programArea", () => {
      const rawPayload = {
        planningId: "plan-bad-comp-prog",
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
            activities: [],
            complementaryActivities: [
              { programArea: "   ", activityName: "Actividad valida" },
            ],
            materials: [],
          },
        ],
      };

      expect(() => repo.deserialize(rawPayload)).toThrow(InvalidComplementaryActivityError);
    });

    it("should reject deserialization of raw Firestore payload containing blank activityName", () => {
      const rawPayload = {
        planningId: "plan-bad-comp-act",
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
            activities: [],
            complementaryActivities: [
              { programArea: "Programa Nutrición", activityName: "  \t " },
            ],
            materials: [],
          },
        ],
      };

      expect(() => repo.deserialize(rawPayload)).toThrow(InvalidComplementaryActivityError);
    });
  });
});
