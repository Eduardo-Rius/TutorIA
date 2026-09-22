import { describe, it, expect } from "vitest";
import { WeeklyPlanning, PlanningDay } from "../WeeklyPlanning";

describe("H1R9-G.2: Daily Evaluation Human-Confirmation Domain Contract", () => {
  const createApprovedPlanning = (): WeeklyPlanning => {
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
            category: "JUEGO LIBRE",
            objective: "Obj 4",
            description: "Desc 4",
            materials: ["Mat4"],
            durationMinutes: 30,
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
            category: "LITERATURA",
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

    const plan = new WeeklyPlanning(
      "plan-g2-test",
      "daycare-01",
      "room-01",
      "teacher-anita",
      "2026-08-24",
      "2026-08-28",
      "APPROVED",
      "Obs",
      "Needs",
      "Sit",
      "Mat",
      [],
      [],
      days,
      1
    );
    return plan;
  };

  // ============================================================
  // A. CONFIRMATION
  // ============================================================
  describe("A. Explicit Confirmation", () => {
    it("1. Draft with non-empty evaluation can be explicitly confirmed", () => {
      const plan = createApprovedPlanning();
      const confirmedDate = new Date("2026-08-24T15:00:00Z");

      plan.saveDailyEvaluationDraft("MONDAY", "Los lactantes respondieron muy bien al estímulo.", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", confirmedDate, "2026-08-24");

      const monday = plan.days[0]!;
      expect(monday.evaluationConfirmedBy).toBe("Anita");
      expect(monday.evaluationConfirmedAt).toEqual(confirmedDate);
    });

    it("2. Confirmation does NOT change evaluationStatus to IN_REVIEW", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Observación de lunes.", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");

      const monday = plan.days[0]!;
      expect(monday.evaluationStatus).toBe("DRAFT");
      expect(monday.evaluationStatus).not.toBe("IN_REVIEW");
    });

    it("3. Empty or whitespace evaluation cannot be confirmed", () => {
      const plan = createApprovedPlanning();

      // No evaluation saved yet
      expect(() => plan.confirmDailyEvaluation("MONDAY", "Anita")).toThrow(/Cannot confirm empty daily evaluation/);

      // Whitespace evaluation
      plan.saveDailyEvaluationDraft("MONDAY", "   ", "2026-08-24");
      expect(() => plan.confirmDailyEvaluation("MONDAY", "Anita")).toThrow(/Cannot confirm empty daily evaluation/);
    });

    it("4. IN_REVIEW evaluation cannot be confirmed", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto de lunes", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");
      plan.submitDailyEvaluation("MONDAY", "Texto de lunes", "2026-08-24", "Anita");

      expect(plan.days[0]!.evaluationStatus).toBe("IN_REVIEW");
      expect(() => plan.confirmDailyEvaluation("MONDAY", "Anita")).toThrow(/already IN_REVIEW/);
    });

    it("5. APPROVED evaluation cannot be confirmed", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto de lunes", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");
      plan.submitDailyEvaluation("MONDAY", "Texto de lunes", "2026-08-24", "Anita");
      plan.approveDailyEvaluation("MONDAY", "Ceci");

      expect(plan.days[0]!.evaluationStatus).toBe("APPROVED");
      expect(() => plan.confirmDailyEvaluation("MONDAY", "Anita")).toThrow(/already APPROVED/);
    });
  });

  // ============================================================
  // B. SUBMISSION GATE
  // ============================================================
  describe("B. Submission Gate", () => {
    it("6. DRAFT evaluation without confirmation cannot be submitted", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto sin confirmar", "2026-08-24");

      expect(() =>
        plan.submitDailyEvaluation("MONDAY", "Texto sin confirmar", "2026-08-24", "Anita")
      ).toThrow(/Daily evaluation must be explicitly confirmed before submission/);
    });

    it("7. Confirmed DRAFT evaluation can be submitted", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto listo y confirmado", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");

      plan.submitDailyEvaluation("MONDAY", "Texto listo y confirmado", "2026-08-24", "Anita");

      const monday = plan.days[0]!;
      expect(monday.evaluationStatus).toBe("IN_REVIEW");
      expect(monday.evaluationConfirmedBy).toBe("Anita");
      expect(monday.evaluationConfirmedAt).toBeDefined();
    });

    it("8. submitDailyEvaluation does NOT create confirmation implicitly", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto borrador", "2026-08-24");

      // Verify unconfirmed
      expect(plan.days[0]!.evaluationConfirmedAt).toBeUndefined();

      // Submit attempt fails without setting confirmation
      expect(() =>
        plan.submitDailyEvaluation("MONDAY", "Texto borrador", "2026-08-24", "Anita")
      ).toThrow(/Daily evaluation must be explicitly confirmed before submission/);

      expect(plan.days[0]!.evaluationConfirmedAt).toBeUndefined();
      expect(plan.days[0]!.evaluationConfirmedBy).toBeUndefined();
    });
  });

  // ============================================================
  // C. INVALIDATION
  // ============================================================
  describe("C. Material Edit Invalidation", () => {
    it("9. Saving materially changed evaluation text after confirmation clears confirmation", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto original", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");

      expect(plan.days[0]!.evaluationConfirmedAt).toBeDefined();

      // Anita edits the text to something different
      plan.saveDailyEvaluationDraft("MONDAY", "Texto editado con cambios", "2026-08-24");

      expect(plan.days[0]!.evaluationConfirmedAt).toBeUndefined();
      expect(plan.days[0]!.evaluationConfirmedBy).toBeUndefined();

      // Submission is now blocked again until reconfirmation
      expect(() =>
        plan.submitDailyEvaluation("MONDAY", "Texto editado con cambios", "2026-08-24", "Anita")
      ).toThrow(/Daily evaluation must be explicitly confirmed before submission/);
    });

    it("10. Saving identical evaluation text after confirmation preserves confirmation", () => {
      const plan = createApprovedPlanning();
      const confirmedDate = new Date("2026-08-24T16:00:00Z");
      plan.saveDailyEvaluationDraft("MONDAY", "Texto idéntico", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", confirmedDate, "2026-08-24");

      // Save again with same text
      plan.saveDailyEvaluationDraft("MONDAY", "Texto idéntico", "2026-08-24");

      expect(plan.days[0]!.evaluationConfirmedAt).toEqual(confirmedDate);
      expect(plan.days[0]!.evaluationConfirmedBy).toBe("Anita");
    });
  });

  // ============================================================
  // D. CECI CORRECTION CYCLE
  // ============================================================
  describe("D. Ceci Correction Cycle", () => {
    it("11. Ceci request-change clears prior Anita confirmation", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto inicial", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");
      plan.submitDailyEvaluation("MONDAY", "Texto inicial", "2026-08-24", "Anita");

      expect(plan.days[0]!.evaluationStatus).toBe("IN_REVIEW");

      // Ceci requests changes
      plan.requestDailyEvaluationChange("MONDAY", "Profundizar en la respuesta de los niños", "Ceci");

      const monday = plan.days[0]!;
      expect(monday.evaluationStatus).toBe("CHANGES_REQUESTED");
      expect(monday.evaluationConfirmedAt).toBeUndefined();
      expect(monday.evaluationConfirmedBy).toBeUndefined();
    });

    it("12. Corrected evaluation cannot be resubmitted without reconfirmation", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto inicial", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");
      plan.submitDailyEvaluation("MONDAY", "Texto inicial", "2026-08-24", "Anita");

      plan.requestDailyEvaluationChange("MONDAY", "Ajustar observación", "Ceci");

      // Anita edits the draft
      plan.saveDailyEvaluationDraft("MONDAY", "Texto con ajustes solicitados", "2026-08-24");

      // Resubmission without reconfirmation must fail
      expect(() =>
        plan.resubmitDailyEvaluation("MONDAY", "Texto con ajustes solicitados", "2026-08-24", "Anita")
      ).toThrow(/Daily evaluation must be explicitly confirmed before submission/);
    });

    it("13. Corrected evaluation can be reconfirmed and then resubmitted", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto inicial", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");
      plan.submitDailyEvaluation("MONDAY", "Texto inicial", "2026-08-24", "Anita");

      plan.requestDailyEvaluationChange("MONDAY", "Ajustar observación", "Ceci");

      plan.saveDailyEvaluationDraft("MONDAY", "Texto corregido y ampliado", "2026-08-24");
      const reconfirmDate = new Date("2026-08-24T18:00:00Z");
      plan.confirmDailyEvaluation("MONDAY", "Anita", reconfirmDate, "2026-08-24");

      plan.resubmitDailyEvaluation("MONDAY", "Texto corregido y ampliado", "2026-08-24", "Anita");

      const monday = plan.days[0]!;
      expect(monday.evaluationStatus).toBe("IN_REVIEW");
      expect(monday.evaluationResubmitted).toBe(true);
      expect(monday.evaluationConfirmedAt).toEqual(reconfirmDate);
      expect(monday.evaluationConfirmedBy).toBe("Anita");
    });
  });

  // ============================================================
  // E. LEGACY BYPASS PROTECTION
  // ============================================================
  describe("E. Legacy Bypass Protection", () => {
    it("14. saveDailyEvaluation legacy alias cannot bypass confirmation", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto no confirmado", "2026-08-24");

      // Legacy alias directly calls submitDailyEvaluation, must enforce confirmation
      expect(() =>
        plan.saveDailyEvaluation("MONDAY", "Texto no confirmado", "2026-08-24", "Anita")
      ).toThrow(/Daily evaluation must be explicitly confirmed before submission/);
    });
  });

  // ============================================================
  // F. HUMAN-SEPARATION INVARIANT
  // ============================================================
  describe("F. Human-Separation Invariant", () => {
    it("15. Anita confirmation does not write evaluationReviewedBy or evaluationReviewedAt", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto pedagógico", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");

      const monday = plan.days[0]!;
      expect(monday.evaluationReviewedBy).toBeUndefined();
      expect(monday.evaluationReviewedAt).toBeUndefined();
      expect(monday.evaluationConfirmedBy).toBe("Anita");
    });

    it("16. Ceci approval remains a distinct subsequent action", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto pedagógico completo", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");
      plan.submitDailyEvaluation("MONDAY", "Texto pedagógico completo", "2026-08-24", "Anita");

      const monday = plan.days[0]!;
      expect(monday.evaluationStatus).toBe("IN_REVIEW");

      // Ceci performs distinct approval
      plan.approveDailyEvaluation("MONDAY", "Ceci");

      expect(monday.evaluationStatus).toBe("APPROVED");
      expect(monday.evaluationReviewedBy).toBe("Ceci");
      expect(monday.evaluationReviewedAt).toBeDefined();
      expect(monday.evaluationConfirmedBy).toBe("Anita");
      expect(monday.evaluationConfirmedAt).toBeDefined();
    });
  });

  // ============================================================
  // G. HUMAN CONFIRMATION IDENTITY HARDENING (H1R9-G.2.1)
  // ============================================================
  describe("G. Human Confirmation Identity Hardening", () => {
    it("17. confirmation with empty educator identity fails", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto válido", "2026-08-24");

      expect(() =>
        plan.confirmDailyEvaluation("MONDAY", "", new Date(), "2026-08-24")
      ).toThrow(/Daily evaluation confirmation requires an educator identity/);
    });

    it("18. confirmation with whitespace educator identity fails", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto válido", "2026-08-24");

      expect(() =>
        plan.confirmDailyEvaluation("MONDAY", "    ", new Date(), "2026-08-24")
      ).toThrow(/Daily evaluation confirmation requires an educator identity/);
    });

    it("19. failed anonymous confirmation writes neither confirmedAt nor confirmedBy", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto válido", "2026-08-24");

      expect(() =>
        plan.confirmDailyEvaluation("MONDAY", "", new Date(), "2026-08-24")
      ).toThrow();

      const monday = plan.days[0]!;
      expect(monday.evaluationConfirmedAt).toBeUndefined();
      expect(monday.evaluationConfirmedBy).toBeUndefined();

      expect(() =>
        plan.confirmDailyEvaluation("MONDAY", "  \t  ", new Date(), "2026-08-24")
      ).toThrow();

      expect(monday.evaluationConfirmedAt).toBeUndefined();
      expect(monday.evaluationConfirmedBy).toBeUndefined();
    });
  });

  // ============================================================
  // H. CONTENT IDENTITY & SUBMISSION PROTECTION (H1R9-G.2.1)
  // ============================================================
  describe("H. Content Identity & Submission Protection", () => {
    it("20. confirmed evaluation text A cannot be submitted as materially different text B while retaining confirmation", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto A confirmado", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");

      expect(plan.days[0]!.evaluationConfirmedAt).toBeDefined();
      expect(plan.days[0]!.evaluationConfirmedBy).toBe("Anita");

      // Attempt submit with different text B
      expect(() =>
        plan.submitDailyEvaluation("MONDAY", "Texto B no confirmado", "2026-08-24", "Anita")
      ).toThrow(/Daily evaluation must be explicitly confirmed before submission/);

      // Confirmation must be invalidated, not preserved
      expect(plan.days[0]!.evaluationConfirmedAt).toBeUndefined();
      expect(plan.days[0]!.evaluationConfirmedBy).toBeUndefined();
      expect(plan.days[0]!.evaluationStatus).toBe("DRAFT");
    });

    it("21. confirmed evaluation text A can be submitted as text A", () => {
      const plan = createApprovedPlanning();
      const confirmedDate = new Date("2026-08-24T14:30:00Z");
      plan.saveDailyEvaluationDraft("MONDAY", "Texto A confirmado", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", confirmedDate, "2026-08-24");

      plan.submitDailyEvaluation("MONDAY", "Texto A confirmado", "2026-08-24", "Anita");

      const monday = plan.days[0]!;
      expect(monday.evaluationStatus).toBe("IN_REVIEW");
      expect(monday.evaluation).toBe("Texto A confirmado");
      expect(monday.evaluationConfirmedBy).toBe("Anita");
      expect(monday.evaluationConfirmedAt).toEqual(confirmedDate);
    });

    it("22. after Ceci request-change and reconfirmation of corrected text B, resubmission of different text C is rejected", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Texto inicial", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");
      plan.submitDailyEvaluation("MONDAY", "Texto inicial", "2026-08-24", "Anita");

      // Ceci requests change
      plan.requestDailyEvaluationChange("MONDAY", "Agregar detalles", "Ceci");
      expect(plan.days[0]!.evaluationConfirmedAt).toBeUndefined();

      // Anita drafts and confirms corrected text B
      plan.saveDailyEvaluationDraft("MONDAY", "Texto B corregido", "2026-08-24");
      plan.confirmDailyEvaluation("MONDAY", "Anita", new Date(), "2026-08-24");
      expect(plan.days[0]!.evaluationConfirmedAt).toBeDefined();

      // Resubmit attempting to slip in different text C
      expect(() =>
        plan.resubmitDailyEvaluation("MONDAY", "Texto C clandestino", "2026-08-24", "Anita")
      ).toThrow(/Daily evaluation must be explicitly confirmed before submission/);

      // Reconfirmation must be cleared
      expect(plan.days[0]!.evaluationConfirmedAt).toBeUndefined();
      expect(plan.days[0]!.evaluationConfirmedBy).toBeUndefined();
      expect(plan.days[0]!.evaluationStatus).toBe("CHANGES_REQUESTED");
    });
  });

  // ============================================================
  // I. APPLICATION SERVICE IDENTITY VALIDATION (H1R9-G.2.1)
  // ============================================================
  describe("I. Application Service Identity Validation", () => {
    it("23. PlanningWorkflowService rejects confirmation with empty or whitespace teacherId", async () => {
      const { InMemoryWeeklyPlanningRepository } = await import(
        "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository"
      );
      const { PlanningWorkflowService } = await import(
        "../../../application/planning/PlanningWorkflowService"
      );

      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const plan = createApprovedPlanning();
      await repo.save(plan);

      await service.saveDailyEvaluationDraft(plan.planningId, "MONDAY", "Texto borrador", "TEACHER", "2026-08-24");

      // Empty teacherId
      await expect(
        service.confirmDailyEvaluation(plan.planningId, "MONDAY", "TEACHER", "", new Date(), "2026-08-24")
      ).rejects.toThrow(/Daily evaluation confirmation requires an educator identity/);

      // Whitespace teacherId
      await expect(
        service.confirmDailyEvaluation(plan.planningId, "MONDAY", "TEACHER", "   ", new Date(), "2026-08-24")
      ).rejects.toThrow(/Daily evaluation confirmation requires an educator identity/);

      // Valid teacherId succeeds
      await expect(
        service.confirmDailyEvaluation(plan.planningId, "MONDAY", "TEACHER", "Anita", new Date(), "2026-08-24")
      ).resolves.toBeUndefined();

      const saved = await repo.findById(plan.planningId);
      expect(saved!.days[0]!.evaluationConfirmedBy).toBe("Anita");
      expect(saved!.days[0]!.evaluationConfirmedAt).toBeDefined();
    });
  });

  // ============================================================
  // J. ATOMIC CONFIRM + SUBMIT / RESUBMIT CONTRACT (H1R9-G.3.2)
  // ============================================================
  describe("J. Atomic Confirm + Submit / Resubmit Contract", () => {
    it("24. confirmAndSubmitDailyEvaluation atomically establishes confirmation, submission, and IN_REVIEW status", () => {
      const plan = createApprovedPlanning();
      const confirmedAt = new Date("2026-08-24T14:30:00Z");

      plan.confirmAndSubmitDailyEvaluation("MONDAY", "Evaluación directa del lunes", "Anita", "2026-08-24", confirmedAt);

      const mon = plan.days[0]!;
      expect(mon.evaluation).toBe("Evaluación directa del lunes");
      expect(mon.evaluationConfirmedBy).toBe("Anita");
      expect(mon.evaluationConfirmedAt).toEqual(confirmedAt);
      expect(mon.evaluationSubmittedBy).toBe("Anita");
      expect(mon.evaluationSubmittedAt).toEqual(confirmedAt);
      expect(mon.evaluationStatus).toBe("IN_REVIEW");
      expect(mon.evaluationReviewedBy).toBeUndefined();
      expect(mon.evaluationReviewedAt).toBeUndefined();
    });

    it("25. confirmAndSubmitDailyEvaluation rejects empty or whitespace evaluation and does NOT mutate state", () => {
      const plan = createApprovedPlanning();

      expect(() =>
        plan.confirmAndSubmitDailyEvaluation("MONDAY", "", "Anita", "2026-08-24")
      ).toThrow(/Cannot submit empty daily evaluation/);

      expect(() =>
        plan.confirmAndSubmitDailyEvaluation("MONDAY", "   \t\n  ", "Anita", "2026-08-24")
      ).toThrow(/Cannot submit empty daily evaluation/);

      const mon = plan.days[0]!;
      expect(mon.evaluationConfirmedAt).toBeUndefined();
      expect(mon.evaluationConfirmedBy).toBeUndefined();
      expect(mon.evaluationSubmittedAt).toBeUndefined();
      expect(mon.evaluationSubmittedBy).toBeUndefined();
      expect(mon.evaluationStatus).toBeUndefined();
    });

    it("26. confirmAndSubmitDailyEvaluation rejects empty or whitespace educatorId and does NOT mutate state", () => {
      const plan = createApprovedPlanning();

      expect(() =>
        plan.confirmAndSubmitDailyEvaluation("MONDAY", "Evaluación válida", "", "2026-08-24")
      ).toThrow(/Daily evaluation confirmation requires an educator identity/);

      expect(() =>
        plan.confirmAndSubmitDailyEvaluation("MONDAY", "Evaluación válida", "   ", "2026-08-24")
      ).toThrow(/Daily evaluation confirmation requires an educator identity/);

      const mon = plan.days[0]!;
      expect(mon.evaluationConfirmedAt).toBeUndefined();
      expect(mon.evaluationConfirmedBy).toBeUndefined();
      expect(mon.evaluationStatus).toBeUndefined();
    });

    it("27. confirmAndSubmitDailyEvaluation with prior draft A and current text B confirms and submits B, not A", () => {
      const plan = createApprovedPlanning();
      plan.saveDailyEvaluationDraft("MONDAY", "Borrador preliminar A", "2026-08-24", "Anita");

      plan.confirmAndSubmitDailyEvaluation("MONDAY", "Texto finalizado B", "Anita", "2026-08-24");

      const mon = plan.days[0]!;
      expect(mon.evaluation).toBe("Texto finalizado B");
      expect(mon.evaluationConfirmedBy).toBe("Anita");
      expect(mon.evaluationStatus).toBe("IN_REVIEW");
    });

    it("28. confirmAndResubmitDailyEvaluation atomically establishes confirmation, history, and IN_REVIEW status", () => {
      const plan = createApprovedPlanning();
      plan.confirmAndSubmitDailyEvaluation("MONDAY", "Primera versión", "Anita", "2026-08-24");
      plan.requestDailyEvaluationChange("MONDAY", "Ampliar detalles de la interacción", "Ceci");

      expect(plan.days[0]!.evaluationStatus).toBe("CHANGES_REQUESTED");
      expect(plan.days[0]!.evaluationConfirmedAt).toBeUndefined();

      const resubmitDate = new Date("2026-08-24T16:00:00Z");
      plan.confirmAndResubmitDailyEvaluation("MONDAY", "Versión corregida y ampliada", "Anita", "2026-08-24", resubmitDate);

      const mon = plan.days[0]!;
      expect(mon.evaluation).toBe("Versión corregida y ampliada");
      expect(mon.evaluationConfirmedBy).toBe("Anita");
      expect(mon.evaluationConfirmedAt).toEqual(resubmitDate);
      expect(mon.evaluationSubmittedBy).toBe("Anita");
      expect(mon.evaluationSubmittedAt).toEqual(resubmitDate);
      expect(mon.evaluationStatus).toBe("IN_REVIEW");
      expect(mon.evaluationResubmitted).toBe(true);
      expect(mon.evaluationHistory).toHaveLength(1);
      expect(mon.evaluationHistory![0]!.evaluation).toBe("Primera versión");
      expect(mon.evaluationHistory![0]!.directorComment).toBe("Ampliar detalles de la interacción");
    });

    it("29. PlanningWorkflowService atomicity: failing submit or resubmit does NOT persist partial confirmation", async () => {
      const { InMemoryWeeklyPlanningRepository } = await import(
        "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository"
      );
      const { PlanningWorkflowService } = await import(
        "../../../application/planning/PlanningWorkflowService"
      );

      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const plan = createApprovedPlanning();
      await repo.save(plan);

      // Failing atomic submit (empty text)
      await expect(
        service.confirmAndSubmitDailyEvaluation(plan.planningId, "MONDAY", "", "TEACHER", "2026-08-24", "Anita")
      ).rejects.toThrow(/Cannot submit empty daily evaluation/);

      const planAfterFail = await repo.findById(plan.planningId);
      expect(planAfterFail!.days[0]!.evaluationConfirmedAt).toBeUndefined();
      expect(planAfterFail!.days[0]!.evaluationSubmittedAt).toBeUndefined();
      expect(planAfterFail!.days[0]!.evaluationStatus).toBeUndefined();

      // Failing atomic submit (empty teacherId)
      await expect(
        service.confirmAndSubmitDailyEvaluation(plan.planningId, "MONDAY", "Texto válido", "TEACHER", "2026-08-24", "   ")
      ).rejects.toThrow(/Daily evaluation confirmation requires an educator identity/);

      const planAfterFail2 = await repo.findById(plan.planningId);
      expect(planAfterFail2!.days[0]!.evaluationConfirmedAt).toBeUndefined();
      expect(planAfterFail2!.days[0]!.evaluationSubmittedAt).toBeUndefined();
    });
    it("30. PlanningWorkflowService atomicity: failing resubmit does NOT persist partial confirmation", async () => {
      const { InMemoryWeeklyPlanningRepository } = await import(
        "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository"
      );
      const { PlanningWorkflowService } = await import(
        "../../../application/planning/PlanningWorkflowService"
      );

      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const plan = createApprovedPlanning();
      const mon = plan.days[0]!;
      mon.evaluation = "Versión original";
      mon.evaluationStatus = "CHANGES_REQUESTED";
      mon.evaluationFeedback = "Detallar observaciones";
      mon.evaluationConfirmedAt = undefined;
      mon.evaluationConfirmedBy = undefined;
      await repo.save(plan);

      // Failing atomic resubmit (empty text)
      await expect(
        service.confirmAndResubmitDailyEvaluation(plan.planningId, "MONDAY", "", "TEACHER", "2026-08-24", "Anita")
      ).rejects.toThrow(/Cannot resubmit empty daily evaluation/);

      const planAfterFail = await repo.findById(plan.planningId);
      expect(planAfterFail!.days[0]!.evaluationConfirmedAt).toBeUndefined();
      expect(planAfterFail!.days[0]!.evaluationConfirmedBy).toBeUndefined();
      expect(planAfterFail!.days[0]!.evaluationStatus).toBe("CHANGES_REQUESTED");
      expect(planAfterFail!.days[0]!.evaluationHistory).toBeUndefined();

      // Failing atomic resubmit (empty teacherId)
      await expect(
        service.confirmAndResubmitDailyEvaluation(plan.planningId, "MONDAY", "Texto corregido", "TEACHER", "2026-08-24", "  ")
      ).rejects.toThrow(/Daily evaluation confirmation requires an educator identity/);

      const planAfterFail2 = await repo.findById(plan.planningId);
      expect(planAfterFail2!.days[0]!.evaluationConfirmedAt).toBeUndefined();
      expect(planAfterFail2!.days[0]!.evaluationConfirmedBy).toBeUndefined();
      expect(planAfterFail2!.days[0]!.evaluationStatus).toBe("CHANGES_REQUESTED");
    });
  });
});
