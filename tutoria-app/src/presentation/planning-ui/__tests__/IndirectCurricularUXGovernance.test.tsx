import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";
import { CurricularPDAReference } from "../../../domain/planning/CurricularPDAReference";

describe("INDIRECT Curricular UX Governance (H1R9-F.5.4.4)", () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let source: DeterministicPedagogicalRecommendationSource;

  const validPdaReference: CurricularPDAReference = {
    pdaId: "TUTORIA-PDA-0001",
    catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1",
  };

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
    source = new DeterministicPedagogicalRecommendationSource();
  });

  const createDraftPlanWithPda = async (planningId = "plan-curricular-gov-test") => {
    const plan = WeeklyPlanning.create(
      planningId,
      "d1",
      "lactantes-c",
      "t1",
      "2026-08-24",
      "2026-08-28"
    );
    plan.editPedagogicalContent(
      "Observaciones de prueba",
      "Necesidades",
      "Situaciones",
      "Materiales generales",
      ["ref1"],
      [
        {
          dayOfWeek: "MONDAY",
          date: "2026-08-24",
          activities: [
            {
              activityId: "act-test-1",
              category: "C",
              objective: "Obj Actividad 1",
              description: "Descripcion Actividad 1",
              durationMinutes: 30,
              materials: ["Material 1"],
              curricularTraceability: [validPdaReference],
            },
          ],
          complementaryActivities: [],
          materials: ["Material 1"],
          executionNotes: "",
          evaluation: "",
        },
        {
          dayOfWeek: "TUESDAY",
          date: "2026-08-25",
          activities: [],
          complementaryActivities: [],
          materials: [],
          executionNotes: "",
          evaluation: "",
        },
        {
          dayOfWeek: "WEDNESDAY",
          date: "2026-08-26",
          activities: [],
          complementaryActivities: [],
          materials: [],
          executionNotes: "",
          evaluation: "",
        },
        {
          dayOfWeek: "THURSDAY",
          date: "2026-08-27",
          activities: [],
          complementaryActivities: [],
          materials: [],
          executionNotes: "",
          evaluation: "",
        },
        {
          dayOfWeek: "FRIDAY",
          date: "2026-08-28",
          activities: [],
          complementaryActivities: [],
          materials: [],
          executionNotes: "",
          evaluation: "",
        },
      ] as any
    );
    await repository.save(plan);
    return plan;
  };

  const enterPlanningAndExpandActivity = async () => {
    const planCard = await screen.findByText("Continuar donde nos quedamos");
    await act(async () => {
      fireEvent.click(planCard);
    });
    const revBtn = await screen.findByText("Revisar / Editar");
    await act(async () => {
      fireEvent.click(revBtn);
    });
  };

  it("1. DIRECT Modality: renders Elementos curriculares, Seleccionar del catálogo, canonical selector, and NO indirect card", async () => {
    await createDraftPlanWithPda();

    render(<PlanningDemoApp service={service} source={source} />);

    // By default modality is DIRECT. Anita enters planning
    await enterPlanningAndExpandActivity();

    // Curricular selection control is visible
    expect(await screen.findByText("Elementos curriculares")).toBeDefined();
    expect(screen.getByText(/Seleccionar del catálogo/i)).toBeDefined();

    // Already selected PDA item is rendered
    expect(screen.getByTestId("selected-pda-TUTORIA-PDA-0001")).toBeDefined();

    // Indirect info card is strictly absent
    expect(screen.queryByTestId("indirect-curricular-info-card")).toBeNull();
    expect(screen.queryByText("Referentes curriculares de la modalidad")).toBeNull();
  });

  it("2. INDIRECT Modality: hides selector & catalog, renders exact informational card, and does NOT duplicate the 8 Referentes in Anita UI", async () => {
    await createDraftPlanWithPda();

    render(<PlanningDemoApp service={service} source={source} />);

    // Switch modality to INDIRECT
    const modalitySelect = screen.getByRole("combobox");
    fireEvent.change(modalitySelect, { target: { value: "INDIRECT" } });

    // Anita enters planning
    await enterPlanningAndExpandActivity();

    // 1. Selector controls are strictly absent
    expect(screen.queryByText(/Seleccionar del catálogo/i)).toBeNull();
    expect(screen.queryByTestId("selected-pda-TUTORIA-PDA-0001")).toBeNull();

    // 2. Information card is rendered with exact required copy
    const card = await screen.findByTestId("indirect-curricular-info-card");
    expect(card).toBeDefined();

    expect(within(card).getByText("Referentes curriculares de la modalidad")).toBeDefined();
    expect(
      within(card).getByText(
        "Para Prestación Indirecta no es necesario seleccionar elementos curriculares. El formato institucional incorpora automáticamente los referentes curriculares correspondientes."
      )
    ).toBeDefined();
    expect(within(card).getByText("No se requiere ninguna acción de tu parte.")).toBeDefined();

    // 3. Does NOT list all 8 individual Referentes inside Anita's card
    expect(within(card).queryByText(/Establecer vínculos afectivos y apegos seguros/i)).toBeNull();
    expect(within(card).queryByText(/Convivir con otros y compartir el aprendizaje/i)).toBeNull();
  });

  it("3. Non-Destructive Modality Switch: viewing in INDIRECT does NOT mutate domain curricularTraceability", async () => {
    const plan = await createDraftPlanWithPda("plan-non-destructive");

    // Verify initial domain state
    expect(plan.days[0].activities[0].curricularTraceability.length).toBe(1);
    expect(plan.days[0].activities[0].curricularTraceability[0].pdaId).toBe("TUTORIA-PDA-0001");

    render(<PlanningDemoApp service={service} source={source} />);

    // Switch to INDIRECT and view the activity
    const modalitySelect = screen.getByRole("combobox");
    fireEvent.change(modalitySelect, { target: { value: "INDIRECT" } });

    await enterPlanningAndExpandActivity();

    // Assert card is rendered
    expect(await screen.findByTestId("indirect-curricular-info-card")).toBeDefined();

    // Verify domain record in repository remains completely untouched
    const storedPlan = await service.getPlanning("plan-non-destructive");
    expect(storedPlan).toBeDefined();
    expect(storedPlan!.days[0].activities[0].curricularTraceability.length).toBe(1);
    expect(storedPlan!.days[0].activities[0].curricularTraceability[0].pdaId).toBe("TUTORIA-PDA-0001");
  });

  it("4. Round-Trip Preservation: DIRECT -> INDIRECT -> DIRECT restores full selector and previous selections", async () => {
    await createDraftPlanWithPda("plan-round-trip");

    render(<PlanningDemoApp service={service} source={source} />);

    const modalitySelect = screen.getByRole("combobox");

    // 1. Start in DIRECT: see selector and tag
    await enterPlanningAndExpandActivity();
    expect(await screen.findByText(/Seleccionar del catálogo/i)).toBeDefined();
    expect(screen.getByTestId("selected-pda-TUTORIA-PDA-0001")).toBeDefined();

    // 2. Switch to INDIRECT: see info card, selector hidden
    fireEvent.change(modalitySelect, { target: { value: "INDIRECT" } });
    expect(await screen.findByTestId("indirect-curricular-info-card")).toBeDefined();
    expect(screen.queryByText(/Seleccionar del catálogo/i)).toBeNull();

    // 3. Switch back to DIRECT: selector and tag fully restored
    fireEvent.change(modalitySelect, { target: { value: "DIRECT" } });
    expect(screen.queryByTestId("indirect-curricular-info-card")).toBeNull();
    expect(await screen.findByText(/Seleccionar del catálogo/i)).toBeDefined();
    expect(screen.getByTestId("selected-pda-TUTORIA-PDA-0001")).toBeDefined();

    // Verify domain state is intact
    const storedPlan = await service.getPlanning("plan-round-trip");
    expect(storedPlan!.days[0].activities[0].curricularTraceability.length).toBe(1);
    expect(storedPlan!.days[0].activities[0].curricularTraceability[0].pdaId).toBe("TUTORIA-PDA-0001");
  });

  it("5. Workflow States: INDIRECT shows info card in all states (DRAFT, APPROVED, CLOSED)", async () => {
    const plan = await createDraftPlanWithPda("plan-approved-indirect");
    plan.status = "APPROVED_FOR_EXECUTION";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repository.save(plan);

    render(<PlanningDemoApp service={service} source={source} />);

    // Switch to INDIRECT
    const modalitySelect = screen.getByRole("combobox");
    fireEvent.change(modalitySelect, { target: { value: "INDIRECT" } });

    // Anita views planning
    await enterPlanningAndExpandActivity();

    // Information card is visible, selector is absent
    expect(await screen.findByTestId("indirect-curricular-info-card")).toBeDefined();
    expect(screen.queryByText(/Seleccionar del catálogo/i)).toBeNull();
  });
});
