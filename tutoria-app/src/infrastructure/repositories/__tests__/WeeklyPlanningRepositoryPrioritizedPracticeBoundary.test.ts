import { describe, it, expect, vi } from "vitest";
import { WeeklyPlanning, PlanningDay } from "../../../domain/planning/WeeklyPlanning";
import { InvalidPrioritizedPracticeError } from "../../../domain/planning/PrioritizedPractice";
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

describe("WeeklyPlanningRepository Prioritized Practice Boundary (H1R9-F.7.1)", () => {
  const createValidDays = (): PlanningDay[] => [
    {
      date: "2026-08-24",
      dayOfWeek: "MONDAY",
      activities: [],
      complementaryActivities: [],
      prioritizedPractices: [
        {
          practiceName: "Acompañamiento en el gateo guiado",
          sourceReference: "Asesoría Técnica IMSS-2026",
        },
      ],
      materials: ["Colchoneta"],
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

  describe("InMemoryWeeklyPlanningRepository Boundary", () => {
    it("should successfully save and round-trip retrieve valid structured prioritized practices", async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const plan = WeeklyPlanning.create(
        "plan-mem-pp-1",
        "dc-1",
        "room-1",
        "teacher-1",
        "2026-08-24",
        "2026-08-28"
      );
      plan.days = createValidDays();

      await repo.save(plan);
      const retrieved = await repo.findById("plan-mem-pp-1");

      expect(retrieved).not.toBeNull();
      expect(retrieved!.planningId).toBe("plan-mem-pp-1");
      expect(retrieved!.days[0].prioritizedPractices).toHaveLength(1);
      expect(retrieved!.days[0].prioritizedPractices![0]).toEqual({
        practiceName: "Acompañamiento en el gateo guiado",
        sourceReference: "Asesoría Técnica IMSS-2026",
      });
      expect(retrieved!.days[1].prioritizedPractices).toEqual([]);
    });

    it("should reject saving an aggregate if corrupted days with blank practiceName were injected", async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const plan = WeeklyPlanning.create(
        "plan-mem-pp-bad",
        "dc-1",
        "room-1",
        "teacher-1",
        "2026-08-24",
        "2026-08-28"
      );
      plan.days = createValidDays();

      // Inject corrupted practice with whitespace name
      (plan.days[0].prioritizedPractices as any) = [
        { practiceName: "   " },
      ];

      await expect(repo.save(plan)).rejects.toThrow(InvalidPrioritizedPracticeError);
    });

    it("should reject rehydration from raw storage if storage payload has blank practiceName", async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const rawCorrupted = JSON.stringify({
        planningId: "plan-pp-corrupted",
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
            complementaryActivities: [],
            prioritizedPractices: [
              { practiceName: "" },
            ],
            materials: [],
          },
        ],
      });

      (repo as any).data.set("plan-pp-corrupted", JSON.parse(rawCorrupted));

      await expect(repo.findById("plan-pp-corrupted")).rejects.toThrow(
        InvalidPrioritizedPracticeError
      );
    });
  });

  describe("FirestoreWeeklyPlanningRepository Boundary (Local / Mocked)", () => {
    const repo = new FirestoreWeeklyPlanningRepository();

    it("should round-trip serialize and deserialize valid prioritized practices cleanly", () => {
      const plan = WeeklyPlanning.create(
        "plan-fs-pp-1",
        "dc-1",
        "room-1",
        "teacher-1",
        "2026-08-24",
        "2026-08-28"
      );
      plan.days = createValidDays();

      const serialized = repo.serialize(plan);
      expect(serialized.days[0].prioritizedPractices).toHaveLength(1);
      expect(serialized.days[0].prioritizedPractices[0].practiceName).toBe(
        "Acompañamiento en el gateo guiado"
      );

      const deserialized = repo.deserialize(serialized);
      expect(deserialized.planningId).toBe("plan-fs-pp-1");
      expect(deserialized.days[0].prioritizedPractices).toHaveLength(1);
      expect(deserialized.days[0].prioritizedPractices![0].practiceName).toBe("Acompañamiento en el gateo guiado");
    });

    it("should reject deserialization of raw Firestore payload containing blank practiceName", () => {
      const rawPayload = {
        planningId: "plan-bad-pp",
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
            complementaryActivities: [],
            prioritizedPractices: [
              { practiceName: "   " },
            ],
            materials: [],
          },
        ],
      };

      expect(() => repo.deserialize(rawPayload)).toThrow(InvalidPrioritizedPracticeError);
    });
  });
});
