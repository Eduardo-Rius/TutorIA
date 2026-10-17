import { describe, it, expect, vi } from "vitest";
import { WeeklyPlanning } from "../WeeklyPlanning";
import { FirestoreWeeklyPlanningRepository } from "../../../infrastructure/repositories/FirestoreWeeklyPlanningRepository";

vi.mock("firebase/firestore", () => {
  class MockTimestamp {
    constructor(public seconds: number, public nanoseconds: number) {}
    static fromDate(d: Date) {
      return new MockTimestamp(Math.floor(d.getTime() / 1000), (d.getTime() % 1000) * 1000000);
    }
    toDate() {
      return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1000000));
    }
  }

  return {
    Timestamp: MockTimestamp,
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    collection: vi.fn((_db, name) => ({ collectionName: name })),
    query: vi.fn((coll, ...clauses) => ({ coll, clauses })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
    getDocs: vi.fn(),
  };
});

vi.mock("../../../infrastructure/firebase/firebaseConfig", () => ({
  db: { _dummy: "firestore-instance" },
  auth: { currentUser: { uid: "lab-teacher-anita" } },
}));

function createApprovedPlanning(): WeeklyPlanning {
  const plan = WeeklyPlanning.create(
    "plan-srmd21-history",
    "daycare-srmd21",
    "room-lactantes-b",
    "lab-teacher-anita",
    "2026-08-24",
    "2026-08-28"
  );
  plan.days = [
    {
      date: "2026-08-24",
      dayOfWeek: "MONDAY",
      activities: [
        {
          activityId: "act-mon-1",
          category: "EXPERIENCIAS ARTÍSTICAS",
          objective: "Exploración auditiva",
          description: "Sonajas y cascabeles",
          materials: ["Sonajas selladas"],
          durationMinutes: 20,
          curricularTraceability: [],
        },
      ],
      complementaryActivities: [],
      materials: ["Sonajas selladas"],
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
  plan.status = "APPROVED";
  return plan;
}

describe("SR-MD-21: Daily Evaluation Historical Integrity and Traceability", () => {
  // =========================================================================
  // 1. Envío original → solicitud de cambio → guardar borrador → reenvío → aprobación
  // =========================================================================
  it("1. full lifecycle: original submission remains immutable after change request, drafting, resubmission and approval", () => {
    const plan = createApprovedPlanning();
    const subDate1 = new Date("2026-08-24T10:00:00Z");

    // Paso 1: Envío original por Asistente Educativa
    plan.confirmAndSubmitDailyEvaluation(
      "MONDAY",
      "Evaluación original del lunes: exploración de texturas y sonidos suaves.",
      "lab-teacher-anita",
      "2026-08-24",
      subDate1
    );

    const mon = plan.days[0]!;
    expect(mon.evaluation).toBe("Evaluación original del lunes: exploración de texturas y sonidos suaves.");
    expect(mon.evaluationStatus).toBe("IN_REVIEW");
    expect(mon.evaluationSubmittedBy).toBe("lab-teacher-anita");
    expect(mon.evaluationSubmittedAt).toEqual(subDate1);
    expect(mon.evaluationHistory).toBeUndefined();

    // Paso 2: Solicitud de cambio por la Educadora
    plan.requestDailyEvaluationChange(
      "MONDAY",
      "Favor de detallar la respuesta motriz específica al estímulo de las sonajas.",
      "lab-director-ceci"
    );

    expect(mon.evaluationStatus).toBe("CHANGES_REQUESTED");
    expect(mon.evaluationDirectorComment).toBe("Favor de detallar la respuesta motriz específica al estímulo de las sonajas.");
    expect(mon.evaluationReviewedBy).toBe("lab-director-ceci");
    expect(mon.evaluationHistory).toHaveLength(1);

    const entry1 = mon.evaluationHistory![0]!;
    expect(entry1.evaluation).toBe("Evaluación original del lunes: exploración de texturas y sonidos suaves.");
    expect(entry1.directorComment).toBe("Favor de detallar la respuesta motriz específica al estímulo de las sonajas.");
    expect(entry1.submittedBy).toBe("lab-teacher-anita");
    expect(entry1.submittedAt).toEqual(subDate1);
    expect(entry1.reviewedBy).toBe("lab-director-ceci");
    expect(entry1.status).toBe("CHANGES_REQUESTED");

    // Paso 3: Asistente Educativa edita y guarda borrador intermedio
    plan.saveDailyEvaluationDraft(
      "MONDAY",
      "Borrador preliminar con respuestas motrices...",
      "2026-08-24",
      "lab-teacher-anita"
    );

    // CRITICAL: El texto de la evaluación original NO se sobrescribe en mon.evaluation mientras esté en borrador
    expect(mon.evaluation).toBe("Evaluación original del lunes: exploración de texturas y sonidos suaves.");
    // El borrador se guarda exclusivamente en evaluationDraft
    expect(mon.evaluationDraft).toBe("Borrador preliminar con respuestas motrices...");
    // El texto histórico guardado en evaluationHistory permanece intacto
    expect(mon.evaluationHistory![0]!.evaluation).toBe(
      "Evaluación original del lunes: exploración de texturas y sonidos suaves."
    );

    // Paso 4: Reenvío con texto definitivo corregido
    const resubDate1 = new Date("2026-08-24T14:00:00Z");
    const correctedText =
      "CONTROL SR-MD-21-LB-LUNES: Se incorporó la descripción motriz: apertura de manos y seguimiento visual ante sonajas.";
    plan.confirmAndResubmitDailyEvaluation(
      "MONDAY",
      correctedText,
      "lab-teacher-anita",
      "2026-08-24",
      resubDate1
    );

    expect(mon.evaluation).toBe(correctedText);
    expect(mon.evaluationDraft).toBeUndefined();
    expect(mon.evaluationStatus).toBe("IN_REVIEW");
    expect(mon.evaluationResubmitted).toBe(true);
    expect(mon.evaluationSubmittedAt).toEqual(resubDate1);
    expect(mon.evaluationSubmittedBy).toBe("lab-teacher-anita");

    // El historial sigue conservando exactamente la versión original (1 sola entrada archivada)
    expect(mon.evaluationHistory).toHaveLength(1);
    expect(mon.evaluationHistory![0]!.evaluation).toBe(
      "Evaluación original del lunes: exploración de texturas y sonidos suaves."
    );

    // Paso 5: Educadora aprueba la versión corregida
    plan.approveDailyEvaluation("MONDAY", "lab-director-ceci");

    expect(mon.evaluationStatus).toBe("APPROVED");
    expect(mon.evaluation).toBe(correctedText);
    expect(mon.evaluationReviewedBy).toBe("lab-director-ceci");
    expect(mon.evaluationHistory).toHaveLength(1);
    expect(mon.evaluationHistory![0]!.evaluation).toBe(
      "Evaluación original del lunes: exploración de texturas y sonidos suaves."
    );
  });

  // =========================================================================
  // 2. Recarga después de guardar el borrador
  // =========================================================================
  it("2. reload after saving draft preserves draft in progress while keeping immutable history", () => {
    const repo = new FirestoreWeeklyPlanningRepository();
    const plan = createApprovedPlanning();

    // Envío inicial y cambio solicitado
    plan.confirmAndSubmitDailyEvaluation(
      "MONDAY",
      "Versión inicial enviada por la Asistente",
      "lab-teacher-anita",
      "2026-08-24"
    );
    plan.requestDailyEvaluationChange(
      "MONDAY",
      "Añadir observaciones sobre el agarre de materiales",
      "lab-director-ceci"
    );

    // Guardado de borrador durante CHANGES_REQUESTED
    plan.saveDailyEvaluationDraft(
      "MONDAY",
      "Borrador en curso: los lactantes mostraron agarre palmar voluntario...",
      "2026-08-24",
      "lab-teacher-anita"
    );

    // Simular persistencia y recarga completa (roundtrip de serialización / deserialización)
    const serialized = repo.serialize(plan);
    const rehydrated = repo.deserialize(serialized);

    const rehydratedMonday = rehydrated.days[0]!;
    expect(rehydratedMonday.evaluationStatus).toBe("CHANGES_REQUESTED");
    expect(rehydratedMonday.evaluation).toBe("Versión inicial enviada por la Asistente");
    expect(rehydratedMonday.evaluationDraft).toBe("Borrador en curso: los lactantes mostraron agarre palmar voluntario...");
    expect(rehydratedMonday.evaluationDirectorComment).toBe("Añadir observaciones sobre el agarre de materiales");

    // Comprobar que en la planeación recargada, la versión histórica se conserva íntegra
    expect(rehydratedMonday.evaluationHistory).toHaveLength(1);
    const histEntry = rehydratedMonday.evaluationHistory![0]!;
    expect(histEntry.evaluation).toBe("Versión inicial enviada por la Asistente");
    expect(histEntry.directorComment).toBe("Añadir observaciones sobre el agarre de materiales");
    expect(histEntry.submittedBy).toBe("lab-teacher-anita");
    expect(histEntry.reviewedBy).toBe("lab-director-ceci");

    // Desde la planeación recargada, completar reenvío
    rehydrated.confirmAndResubmitDailyEvaluation(
      "MONDAY",
      "Versión 2 confirmada tras recarga: agarre palmar voluntario verificado.",
      "lab-teacher-anita",
      "2026-08-24"
    );

    expect(rehydratedMonday.evaluation).toBe("Versión 2 confirmada tras recarga: agarre palmar voluntario verificado.");
    expect(rehydratedMonday.evaluationHistory).toHaveLength(1);
    expect(rehydratedMonday.evaluationHistory![0]!.evaluation).toBe("Versión inicial enviada por la Asistente");
  });

  // =========================================================================
  // 3. Dos ciclos consecutivos de devolución y corrección
  // =========================================================================
  it("3. two consecutive return and correction cycles maintain all historical versions in order", () => {
    const plan = createApprovedPlanning();

    // --- CICLO 1 ---
    const date1 = new Date("2026-08-24T08:00:00Z");
    plan.confirmAndSubmitDailyEvaluation("MONDAY", "Versión 1: Primera propuesta pedagógica", "Anita", "2026-08-24", date1);

    plan.requestDailyEvaluationChange("MONDAY", "Observación 1: Faltan detalles de materiales", "Ceci");

    plan.saveDailyEvaluationDraft("MONDAY", "Borrador de V2...", "2026-08-24", "Anita");

    const date2 = new Date("2026-08-24T11:00:00Z");
    plan.confirmAndResubmitDailyEvaluation("MONDAY", "Versión 2: Propuesta con materiales detallados", "Anita", "2026-08-24", date2);

    expect(plan.days[0]!.evaluationHistory).toHaveLength(1);
    expect(plan.days[0]!.evaluationHistory![0]!.evaluation).toBe("Versión 1: Primera propuesta pedagógica");
    expect(plan.days[0]!.evaluationHistory![0]!.directorComment).toBe("Observación 1: Faltan detalles de materiales");

    // --- CICLO 2 ---
    // La Educadora vuelve a revisar y solicita otro cambio sobre Versión 2
    plan.requestDailyEvaluationChange("MONDAY", "Observación 2: Precisar tiempos de la actividad", "Ceci");

    expect(plan.days[0]!.evaluationStatus).toBe("CHANGES_REQUESTED");
    expect(plan.days[0]!.evaluationHistory).toHaveLength(2);

    // Entrada 0 corresponde a Ciclo 1
    expect(plan.days[0]!.evaluationHistory![0]!.evaluation).toBe("Versión 1: Primera propuesta pedagógica");
    expect(plan.days[0]!.evaluationHistory![0]!.directorComment).toBe("Observación 1: Faltan detalles de materiales");

    // Entrada 1 corresponde a Ciclo 2
    expect(plan.days[0]!.evaluationHistory![1]!.evaluation).toBe("Versión 2: Propuesta con materiales detallados");
    expect(plan.days[0]!.evaluationHistory![1]!.directorComment).toBe("Observación 2: Precisar tiempos de la actividad");

    // Guardado de borrador de V3
    plan.saveDailyEvaluationDraft("MONDAY", "Borrador de V3 con tiempos...", "2026-08-24", "Anita");

    // Verificar que ninguna de las dos entradas históricas previas fue alterada por el borrador
    expect(plan.days[0]!.evaluationHistory![0]!.evaluation).toBe("Versión 1: Primera propuesta pedagógica");
    expect(plan.days[0]!.evaluationHistory![1]!.evaluation).toBe("Versión 2: Propuesta con materiales detallados");

    // Reenvío de V3
    const date3 = new Date("2026-08-24T15:00:00Z");
    plan.confirmAndResubmitDailyEvaluation(
      "MONDAY",
      "Versión 3: Propuesta final con materiales y tiempos de 15 minutos",
      "Anita",
      "2026-08-24",
      date3
    );

    expect(plan.days[0]!.evaluation).toBe("Versión 3: Propuesta final con materiales y tiempos de 15 minutos");
    expect(plan.days[0]!.evaluationHistory).toHaveLength(2);
    expect(plan.days[0]!.evaluationHistory![0]!.evaluation).toBe("Versión 1: Primera propuesta pedagógica");
    expect(plan.days[0]!.evaluationHistory![1]!.evaluation).toBe("Versión 2: Propuesta con materiales detallados");

    // Aprobación final
    plan.approveDailyEvaluation("MONDAY", "Ceci");
    expect(plan.days[0]!.evaluationStatus).toBe("APPROVED");
    expect(plan.days[0]!.evaluationHistory).toHaveLength(2);
    expect(plan.days[0]!.evaluationHistory![0]!.evaluation).toBe("Versión 1: Primera propuesta pedagógica");
    expect(plan.days[0]!.evaluationHistory![1]!.evaluation).toBe("Versión 2: Propuesta con materiales detallados");
  });

  // =========================================================================
  // 4. Inmutabilidad estricta — ninguna versión histórica cambia al editar otra
  // =========================================================================
  it("4. strict immutability: historical entries cannot be mutated retrospectively or by reference", () => {
    const plan = createApprovedPlanning();
    plan.confirmAndSubmitDailyEvaluation("MONDAY", "Texto inmutable original", "Anita", "2026-08-24");
    plan.requestDailyEvaluationChange("MONDAY", "Observación para corrección", "Ceci");

    const historyEntry = plan.days[0]!.evaluationHistory![0]!;
    expect(historyEntry.evaluation).toBe("Texto inmutable original");

    // Verificar que la entrada está congelada
    expect(Object.isFrozen(historyEntry)).toBe(true);

    // Intentar modificar propiedades en modo estricto debe lanzar o no tener efecto
    expect(() => {
      (historyEntry as any).evaluation = "Texto modificado clandestinamente";
    }).toThrow();

    // Guardar múltiples borradores consecutivos
    plan.saveDailyEvaluationDraft("MONDAY", "Borrador 1", "2026-08-24", "Anita");
    plan.saveDailyEvaluationDraft("MONDAY", "Borrador 2", "2026-08-24", "Anita");
    plan.saveDailyEvaluationDraft("MONDAY", "Borrador 3", "2026-08-24", "Anita");

    expect(plan.days[0]!.evaluationHistory![0]!.evaluation).toBe("Texto inmutable original");
    expect(plan.days[0]!.evaluationHistory![0]!.directorComment).toBe("Observación para corrección");
  });
});
