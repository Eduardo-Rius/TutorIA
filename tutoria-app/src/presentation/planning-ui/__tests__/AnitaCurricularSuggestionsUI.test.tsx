import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { CurricularSelectionControl } from "../CurricularSelectionControl";
import {
  DIRECT_PDA_CATALOG,
  DIRECT_PDA_CATALOG_BY_ID,
  TUTORIA_DIRECT_PDA_CATALOG_REVISION,
} from "../../../domain/planning/DirectCurricularCatalog";
import { WeeklyPlanning, PlanningDay, PlanningActivity } from "../../../domain/planning/WeeklyPlanning";
import { DeterministicCurricularRecommendationSource } from "../../../application/planning/DeterministicCurricularRecommendationSource";
import {
  CurricularRecommendationSource,
  CurricularRecommendationRequest,
  CurricularRecommendation,
} from "../../../application/planning/CurricularRecommendationSource";

const createTestPlan = (
  status: "DRAFT" | "IN_REVIEW" | "APPROVED_FOR_EXECUTION" | "REJECTED" | "CLOSED" = "DRAFT"
): WeeklyPlanning => {
  const activity: PlanningActivity = {
    activityId: "act-test-1",
    category: "EXPERIENCIAS ARTÍSTICAS",
    objective: "Exploración sonora y corporal",
    description: "Cantar nanas y producir sonidos con sonajas suaves.",
    materials: ["Sonajas", "Cojines"],
    durationMinutes: 20,
    curricularTraceability: [],
  };

  const days: PlanningDay[] = [
    {
      date: "2026-08-24",
      dayOfWeek: "MONDAY",
      activities: [activity],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ["Sonajas"],
    },
  ];

  return new WeeklyPlanning(
    "plan-test-suggestions",
    "dc-01",
    "room-01",
    "teacher-01",
    "2026-08-24",
    "2026-08-28",
    status,
    "Obs",
    "Needs",
    "Sit",
    "Mat",
    [],
    [],
    days,
    1
  );
};

describe("H1R9-F.8.2 — Anita Curricular Suggestions UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // GATE A: DIRECT editable activity shows "Sugerir elementos curriculares"
  it("Gate A: DIRECT editable activity shows 'Sugerir elementos curriculares' action button", () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
      />
    );

    const suggestBtn = screen.getByRole("button", {
      name: /Sugerir elementos curriculares/i,
    });
    expect(suggestBtn).toBeDefined();
  });

  // GATE B: INDIRECT does NOT show suggestion action
  it("Gate B: INDIRECT does NOT show suggestion action", () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="INDIRECT"
      />
    );

    const suggestBtn = screen.queryByRole("button", {
      name: /Sugerir elementos curriculares/i,
    });
    expect(suggestBtn).toBeNull();
  });

  // GATE C: Requesting suggestions renders "Sugerencias de TutorIA"
  it("Gate C: Requesting suggestions renders block titled exactly 'Sugerencias de TutorIA'", async () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    const title = await screen.findByText(/Sugerencias de TutorIA/i);
    expect(title).toBeDefined();
  });

  // GATE D: Canonical PDA human-readable text is shown
  it("Gate D: Canonical PDA human-readable text is shown", async () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    // TUTORIA-PDA-0001 expected for EXPERIENCIAS ARTÍSTICAS
    const expectedEntry = DIRECT_PDA_CATALOG_BY_ID.get("TUTORIA-PDA-0001")!;
    expect(await screen.findByText(expectedEntry.pda)).toBeDefined();
    expect(screen.getByText(expectedEntry.campoFormativo)).toBeDefined();
    expect(screen.getByText(expectedEntry.contenido.trim())).toBeDefined();
  });

  // GATE E: Rationale is shown
  it("Gate E: Transient rationale from F.8.1 is shown", async () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    expect(
      await screen.findByText(
        /Fortalece la expresión de necesidades, emociones y afectos mediante experiencias sonoras y lúdicas\./i
      )
    ).toBeDefined();
  });

  // GATE F: Internal TUTORIA-PDA-* ID is NOT exposed in normal user UI
  it("Gate F: Internal TUTORIA-PDA-* ID is NOT exposed in normal user UI", async () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    const panel = await screen.findByTestId(`suggestions-panel-${activity.activityId}`);
    expect(panel.textContent).not.toContain("TUTORIA-PDA-");
  });

  // GATE G: No confidence score is shown
  it("Gate G: No confidence percentages or scores are shown", async () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    const panel = await screen.findByTestId(`suggestions-panel-${activity.activityId}`);
    expect(panel.textContent).not.toMatch(/%|confidence|confianza|score/i);
  });

  // GATE H: Anita accepts ONE recommendation: only that PDA enters curricularTraceability
  it("Gate H: Anita accepts ONE recommendation: only that PDA enters curricularTraceability", async () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;
    const domainSpy = vi.spyOn(plan, "setActivityCurricularTraceability");
    const onUpdateSpy = vi.fn();

    const { rerender } = render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
        onUpdate={onUpdateSpy}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    const acceptBtn = await screen.findByRole("button", {
      name: /Aceptar sugerencia/i,
    });
    fireEvent.click(acceptBtn);

    expect(domainSpy).toHaveBeenCalledWith("MONDAY", "act-test-1", [
      {
        pdaId: "TUTORIA-PDA-0001",
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    ]);
    expect(onUpdateSpy).toHaveBeenCalledWith([
      {
        pdaId: "TUTORIA-PDA-0001",
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    ]);
    expect(plan.days[0]!.activities[0]!.curricularTraceability).toHaveLength(1);
    expect(plan.days[0]!.activities[0]!.curricularTraceability[0]!.pdaId).toBe("TUTORIA-PDA-0001");

    // Rerender with updated activity to reflect domain state in parent
    rerender(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
        onUpdate={onUpdateSpy}
      />
    );

    // Button transitions to "✓ Agregada"
    expect(screen.getByText(/✓ Agregada/i)).toBeDefined();
  });

  // GATE I: Anita accepts MULTIPLE recommendations
  it("Gate I: Anita accepts MULTIPLE recommendations: all accepted canonical refs are persisted in human-governed selection", async () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    // Custom deterministic source returning 2 recommendations
    const multiSource: CurricularRecommendationSource = {
      async recommend(_req: CurricularRecommendationRequest): Promise<readonly CurricularRecommendation[]> {
        return [
          {
            reference: {
              pdaId: "TUTORIA-PDA-0001",
              catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
            },
            rationale: "Primera recomendación.",
          },
          {
            reference: {
              pdaId: "TUTORIA-PDA-0002",
              catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
            },
            rationale: "Segunda recomendación.",
          },
        ];
      },
    };

    const onUpdateSpy = vi.fn();
    const { rerender } = render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={multiSource}
        onUpdate={onUpdateSpy}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    const acceptButtons = await screen.findAllByRole("button", {
      name: /Aceptar sugerencia/i,
    });
    expect(acceptButtons).toHaveLength(2);

    // Accept first recommendation
    fireEvent.click(acceptButtons[0]!);

    rerender(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={multiSource}
        onUpdate={onUpdateSpy}
      />
    );

    // Accept second recommendation
    const secondAcceptBtn = screen.getByRole("button", {
      name: /Aceptar sugerencia/i,
    });
    fireEvent.click(secondAcceptBtn);

    expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual([
      {
        pdaId: "TUTORIA-PDA-0001",
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
      {
        pdaId: "TUTORIA-PDA-0002",
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    ]);
  });

  // GATE J: Anita ignores all: curricularTraceability remains unchanged
  it("Gate J: Anita ignores all: curricularTraceability remains unchanged", async () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;
    const domainSpy = vi.spyOn(plan, "setActivityCurricularTraceability");

    render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    await screen.findByText(/Sugerencias de TutorIA/i);

    // Anita does not click accept
    expect(domainSpy).not.toHaveBeenCalled();
    expect(plan.days[0]!.activities[0]!.curricularTraceability).toHaveLength(0);
  });

  // GATE K: Already-selected recommendation does NOT duplicate
  it("Gate K: Already-selected recommendation does NOT duplicate and shows 'Agregada'", async () => {
    const plan = createTestPlan("DRAFT");
    // Pre-populate with PDA-0001
    plan.days[0]!.activities[0]!.curricularTraceability = [
      {
        pdaId: "TUTORIA-PDA-0001",
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    ];

    render(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    await screen.findByText(/Sugerencias de TutorIA/i);

    // Already shows "✓ Agregada", no "Aceptar sugerencia" button
    expect(screen.getByText(/✓ Agregada/i)).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /Aceptar sugerencia/i })
    ).toBeNull();
    expect(plan.days[0]!.activities[0]!.curricularTraceability).toHaveLength(1);
  });

  // GATE L: Anita can manually remove an accepted recommendation afterward
  it("Gate L: Anita can manually remove an accepted recommendation afterward; human state wins", async () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    const { rerender } = render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    const acceptBtn = await screen.findByRole("button", {
      name: /Aceptar sugerencia/i,
    });
    fireEvent.click(acceptBtn);

    expect(plan.days[0]!.activities[0]!.curricularTraceability).toHaveLength(1);

    rerender(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
      />
    );

    // Remove it using manual remove button
    const removeBtn = screen.getByRole("button", {
      name: /Eliminar elemento curricular:/i,
    });
    fireEvent.click(removeBtn);

    expect(plan.days[0]!.activities[0]!.curricularTraceability).toHaveLength(0);

    rerender(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
      />
    );

    // Recommendation is now unaccepted again (shows "Aceptar sugerencia")
    expect(
      screen.getByRole("button", { name: /Aceptar sugerencia/i })
    ).toBeDefined();
  });

  // GATE M: Persistence failure: atomic rollback, no false "Agregada" state
  it("Gate M: Persistence failure rolls back domain state and shows error without false 'Agregada'", async () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    const failingOnUpdate = vi.fn().mockRejectedValue(new Error("Database connection lost"));

    render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
        onUpdate={failingOnUpdate}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    const acceptBtn = await screen.findByRole("button", {
      name: /Aceptar sugerencia/i,
    });
    fireEvent.click(acceptBtn);

    // Error is displayed
    await waitFor(() => {
      expect(screen.getByTestId("curricular-error-message")).toBeDefined();
    });
    expect(screen.getByText(/Database connection lost/i)).toBeDefined();

    // No false "Agregada" state
    expect(screen.queryByText(/✓ Agregada/i)).toBeNull();

    // Authoritative domain state rolled back to empty
    expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual([]);
  });

  // GATE N: DRAFT editable
  it("Gate N: DRAFT status is editable and shows suggestion button", () => {
    const plan = createTestPlan("DRAFT");
    render(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
      />
    );

    expect(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    ).toBeDefined();
  });

  // GATE O: REJECTED editable
  it("Gate O: REJECTED status is editable and shows suggestion button", () => {
    const plan = createTestPlan("REJECTED");
    render(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
      />
    );

    expect(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    ).toBeDefined();
  });

  // GATE P: IN_REVIEW suggestion controls absent/read-only
  it("Gate P: IN_REVIEW suggestion controls are absent (readOnly=true)", () => {
    const plan = createTestPlan("IN_REVIEW");
    render(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={true}
        modality="DIRECT"
      />
    );

    expect(
      screen.queryByRole("button", { name: /Sugerir elementos curriculares/i })
    ).toBeNull();
  });

  // GATE Q: APPROVED_FOR_EXECUTION suggestion controls absent/read-only
  it("Gate Q: APPROVED_FOR_EXECUTION suggestion controls are absent (readOnly=true)", () => {
    const plan = createTestPlan("APPROVED_FOR_EXECUTION");
    render(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={true}
        modality="DIRECT"
      />
    );

    expect(
      screen.queryByRole("button", { name: /Sugerir elementos curriculares/i })
    ).toBeNull();
  });

  // GATE R: CLOSED suggestion controls absent/read-only
  it("Gate R: CLOSED suggestion controls are absent (readOnly=true)", () => {
    const plan = createTestPlan("CLOSED");
    render(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={true}
        modality="DIRECT"
      />
    );

    expect(
      screen.queryByRole("button", { name: /Sugerir elementos curriculares/i })
    ).toBeNull();
  });

  // GATE S: 0 recommendations message is correct and manual selector still works
  it("Gate S: 0 recommendations message is shown and manual selector remains functional", async () => {
    const plan = createTestPlan("DRAFT");
    const emptySource: CurricularRecommendationSource = {
      async recommend(): Promise<readonly CurricularRecommendation[]> {
        return [];
      },
    };

    render(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={emptySource}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    const emptyMsg = await screen.findByTestId("zero-suggestions-message");
    expect(emptyMsg.textContent).toBe(
      "No se encontraron sugerencias curriculares para esta actividad."
    );

    // Manual selector still functional
    const pickerBtn = screen.getByRole("button", {
      name: /Seleccionar del catálogo/i,
    });
    fireEvent.click(pickerBtn);
    expect(screen.getByTestId("curricular-picker-panel")).toBeDefined();
  });

  // GATE T: recommendation-service error message is non-blocking and manual selector still works
  it("Gate T: recommendation-service error is non-blocking and manual selector remains functional", async () => {
    const plan = createTestPlan("DRAFT");
    const failingSource: CurricularRecommendationSource = {
      async recommend(): Promise<readonly CurricularRecommendation[]> {
        throw new Error("Temporary service timeout");
      },
    };

    render(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={failingSource}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );

    const errorMsg = await screen.findByTestId("suggestion-service-error");
    expect(errorMsg.textContent).toBe(
      "No fue posible obtener sugerencias curriculares. Puedes continuar con la selección manual."
    );

    // Manual selector still functional
    const pickerBtn = screen.getByRole("button", {
      name: /Seleccionar del catálogo/i,
    });
    fireEvent.click(pickerBtn);
    expect(screen.getByTestId("curricular-picker-panel")).toBeDefined();
  });

  // GATE U: DIRECT → INDIRECT → DIRECT preserves existing human curricular selections and does not persist transient suggestions
  it("Gate U: DIRECT → INDIRECT → DIRECT preserves human curricular selections and does not persist transient suggestions", async () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    const { rerender } = render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
        recommendationSource={new DeterministicCurricularRecommendationSource()}
      />
    );

    // Request suggestions and accept PDA-0001
    fireEvent.click(
      screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
    );
    const acceptBtn = await screen.findByRole("button", {
      name: /Aceptar sugerencia/i,
    });
    fireEvent.click(acceptBtn);

    expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual([
      {
        pdaId: "TUTORIA-PDA-0001",
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    ]);

    // Switch to INDIRECT modality
    rerender(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="INDIRECT"
      />
    );

    // Suggestion button must be absent in INDIRECT
    expect(
      screen.queryByRole("button", { name: /Sugerir elementos curriculares/i })
    ).toBeNull();

    // Switch back to DIRECT modality
    rerender(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        modality="DIRECT"
      />
    );

    // Preserved human selection
    expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual([
      {
        pdaId: "TUTORIA-PDA-0001",
        catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION,
      },
    ]);
    expect(screen.getByTestId("selected-pda-TUTORIA-PDA-0001")).toBeDefined();
  });

  // GATE V: No network calls
  it("Gate V: Operates strictly local with ZERO network calls", async () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy;

    try {
      const plan = createTestPlan("DRAFT");
      const activity = plan.days[0]!.activities[0]!;

      render(
        <CurricularSelectionControl
          activity={activity}
          dayIdentifier="MONDAY"
          planning={plan}
          readOnly={false}
          modality="DIRECT"
          recommendationSource={new DeterministicCurricularRecommendationSource()}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Sugerir elementos curriculares/i })
      );

      const acceptBtn = await screen.findByRole("button", {
        name: /Aceptar sugerencia/i,
      });
      fireEvent.click(acceptBtn);

      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
