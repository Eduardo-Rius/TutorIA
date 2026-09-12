import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";
import { DIRECT_PDA_CATALOG } from "../../../domain/planning/DirectCurricularCatalog";
import { PrioritizedPractice } from "../../../domain/planning/PrioritizedPractice";

describe("Daily Prioritized Practices → Official Print Binding (H1R9-F.7.3)", () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let source: DeterministicPedagogicalRecommendationSource;

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
    source = new DeterministicPedagogicalRecommendationSource();
  });

  const createApprovedPlanWithPractices = async (
    planningId = "plan-prio-print-test",
    practicesByDay: Record<string, PrioritizedPractice[]> = {}
  ) => {
    const plan = WeeklyPlanning.create(
      planningId,
      "d1",
      "lactantes-c",
      "t1",
      "2026-08-24",
      "2026-08-28"
    );

    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs.map((d) => ({
      ...d,
      prioritizedPractices: practicesByDay[d.dayOfWeek] || [],
      complementaryActivities: [
        {
          programArea: "Lectura",
          activityName: `Actividad Complementaria ${d.dayOfWeek}`,
          purpose: "Propósito",
          description: "Descripción",
        },
      ],
    }));

    plan.observations = "Obs Semanal";
    plan.identifiedNeeds = "Needs";
    plan.specialSituations = "Sit";
    plan.availableMaterials = "Mat";

    // Mark PDA-0001 (Lenguajes, Page 1) and PDA-0028 (De lo Humano, Page 2) on Monday
    const pda1 = DIRECT_PDA_CATALOG[0]!;
    const pda28 = DIRECT_PDA_CATALOG.find((e) => e.id === "TUTORIA-PDA-0028")!;
    plan.setActivityCurricularTraceability("MONDAY", plan.days[0]!.activities[0]!.activityId, [
      { pdaId: pda1.id, catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" },
      { pdaId: pda28.id, catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" },
    ]);

    plan.status = "APPROVED_FOR_EXECUTION";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repository.save(plan);
    return plan;
  };

  const openDirectOfficialPrintView = async () => {
    render(<PlanningDemoApp service={service} source={source} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Ceci (Directora)"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Anita"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Versión Oficial IMSS"));
    });
  };

  const openIndirectOfficialPrintView = async () => {
    render(<PlanningDemoApp service={service} source={source} />);

    const modalitySelect = screen.getByRole("combobox");
    fireEvent.change(modalitySelect, { target: { value: "INDIRECT" } });

    await act(async () => {
      fireEvent.click(screen.getByText("Ceci (Directora)"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Anita"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Versión Oficial IMSS"));
    });
  };

  it("Gate A & Gate B: DIRECT day isolation and zero state without invented text", async () => {
    await createApprovedPlanWithPractices("plan-gate-a-b", {
      MONDAY: [{ practiceName: "Interacción sensible y responsiva Lunes" }],
      TUESDAY: [], // Zero state
    });

    await openDirectOfficialPrintView();

    // Monday document contains Monday's prioritized practice
    const mondayAnverso = screen.getByTestId("direct-anverso-MONDAY-p1");
    const mondayPracticesSec = within(mondayAnverso).getByTestId("section-practicas");
    expect(within(mondayPracticesSec).getByText("Práctica(s) Priorizada(s) a implementar")).toBeDefined();
    expect(within(mondayPracticesSec).getByText("Interacción sensible y responsiva Lunes")).toBeDefined();

    // Tuesday document: zero state
    const tuesdayAnverso = screen.getByTestId("direct-anverso-TUESDAY-p1");
    const tuesdayPracticesSec = within(tuesdayAnverso).getByTestId("section-practicas");
    // Section header remains
    expect(within(tuesdayPracticesSec).getByText("Práctica(s) Priorizada(s) a implementar")).toBeDefined();
    // Monday's practice does NOT appear in Tuesday (day isolation)
    expect(within(tuesdayPracticesSec).queryByText("Interacción sensible y responsiva Lunes")).toBeNull();

    // Zero-state produces NO invented text
    expect(within(tuesdayPracticesSec).queryByText("Sin práctica priorizada registrada para este día.")).toBeNull();
    expect(within(tuesdayPracticesSec).queryByText("N/A")).toBeNull();
    expect(within(tuesdayPracticesSec).queryByText("No aplica")).toBeNull();
    expect(within(tuesdayPracticesSec).queryByText("Sin prácticas")).toBeNull();
  });

  it("Gate C: DIRECT multiple practices render once each in exact stored order", async () => {
    await createApprovedPlanWithPractices("plan-gate-c", {
      WEDNESDAY: [
        { practiceName: "Práctica Primera Ordenada", sourceReference: "Asesoría 1" },
        { practiceName: "Práctica Segunda Ordenada", sourceReference: "Asesoría 2" },
      ],
    });

    await openDirectOfficialPrintView();

    const wednesdayAnverso = screen.getByTestId("direct-anverso-WEDNESDAY-p1");
    const wednesdayPracticesSec = within(wednesdayAnverso).getByTestId("section-practicas");

    const p1 = within(wednesdayPracticesSec).getByText("Práctica Primera Ordenada");
    const p2 = within(wednesdayPracticesSec).getByText("Práctica Segunda Ordenada");

    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    // Stored order preserved (p1 precedes p2 in document)
    expect(p1.compareDocumentPosition(p2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // sourceReference is NOT printed as extra official field
    expect(within(wednesdayPracticesSec).queryByText("Asesoría 1")).toBeNull();
    expect(within(wednesdayPracticesSec).queryByText("Asesoría 2")).toBeNull();
  });

  it("Gate D: No UI governance copy leaks into official print output", async () => {
    await createApprovedPlanWithPractices("plan-gate-d", {
      MONDAY: [{ practiceName: "Práctica Lunes" }],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
    });

    await openDirectOfficialPrintView();

    // Verify across the entire print container that NO UI governance text leaked
    expect(screen.queryByText("Sin práctica priorizada registrada para este día.")).toBeNull();
    expect(screen.queryByText("INSTRUCCIÓN INSTITUCIONAL")).toBeNull();
    expect(screen.queryByText(/Registra este apartado únicamente cuando exista/i)).toBeNull();
    expect(screen.queryByText("Agregar práctica priorizada")).toBeNull();
    expect(screen.queryByText("Agregar otra práctica priorizada")).toBeNull();
  });

  it("Gate E: Existing complementary-activity print binding remains intact", async () => {
    await createApprovedPlanWithPractices("plan-gate-e", {
      MONDAY: [{ practiceName: "Práctica Lunes" }],
    });

    await openDirectOfficialPrintView();

    const mondayAnverso = screen.getByTestId("direct-anverso-MONDAY-p1");
    const compSec = within(mondayAnverso).getByTestId("section-complementarias");
    expect(within(compSec).getByText("Actividades complementarias de otros programas")).toBeDefined();
    expect(within(compSec).getByText(/Actividad Complementaria MONDAY/)).toBeDefined();
    expect(within(compSec).getByText(/\[Lectura\]/)).toBeDefined();
  });

  it("Gate F: Existing curricular print behavior remains intact", async () => {
    await createApprovedPlanWithPractices("plan-gate-f", {
      MONDAY: [{ practiceName: "Práctica Lunes" }],
    });

    await openDirectOfficialPrintView();

    // Monday Reverso 19/21 PDA split intact
    const reversoP1 = screen.getByTestId("direct-reverso-MONDAY-p1");
    const reversoP2 = screen.getByTestId("direct-reverso-MONDAY-p2");
    expect(reversoP1).toBeDefined();
    expect(reversoP2).toBeDefined();

    // Check that PDA-0001 is marked with checkmark on Page 1
    const rowPda1 = within(reversoP1).getByText("Construye vínculos afectivos a través de los diferentes lenguajes, verbales y no verbales.").closest("tr")!;
    expect(within(rowPda1).getByText("✓")).toBeDefined();
  });

  it("Gate G: INDIRECT behavior matches ONLY what its institutional Excel supports (field NOT PRESENT)", async () => {
    await createApprovedPlanWithPractices("plan-gate-g", {
      MONDAY: [{ practiceName: "Práctica Lunes" }],
    });

    await openIndirectOfficialPrintView();

    // In INDIRECT official print, there is NO section-practicas
    expect(screen.queryByTestId("section-practicas")).toBeNull();
    expect(screen.queryByText("Práctica(s) Priorizada(s) a implementar")).toBeNull();
    expect(screen.queryByText("Prácticas priorizadas")).toBeNull();

    // But official INDIRECT sections remain intact
    const mondayDoc = screen.getByTestId("indirect-day-MONDAY");
    expect(mondayDoc).toBeDefined();
    expect(within(mondayDoc).getByTestId("indirect-section-evaluacion")).toBeDefined();
    expect(within(mondayDoc).getByTestId("indirect-section-complementarias")).toBeDefined();
  });
});
