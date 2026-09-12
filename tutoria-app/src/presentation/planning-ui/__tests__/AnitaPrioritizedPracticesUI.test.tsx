import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning, PlanningDay } from "../../../domain/planning/WeeklyPlanning";
import { PrioritizedPractice } from "../../../domain/planning/PrioritizedPractice";

describe("Anita Daily Prioritized Practices UI (H1R9-F.7.2)", () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let source: DeterministicPedagogicalRecommendationSource;

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
    source = new DeterministicPedagogicalRecommendationSource();
  });

  const createTestPlan = async (
    planningId = "plan-anita-prio-test",
    status: "DRAFT" | "IN_REVIEW" | "APPROVED_FOR_EXECUTION" | "REJECTED" | "CLOSED" = "DRAFT",
    initialPractices: Record<string, PrioritizedPractice[]> = {}
  ) => {
    const plan = WeeklyPlanning.create(
      planningId,
      "d1",
      "lactantes-c",
      "t1",
      "2026-08-24",
      "2026-08-28"
    );

    const days: PlanningDay[] = [
      {
        dayOfWeek: "MONDAY",
        date: "2026-08-24",
        activities: [
          {
            activityId: "act-1",
            category: "C",
            objective: "Obj 1",
            description: "Desc 1",
            durationMinutes: 20,
            materials: ["Mat 1"],
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        prioritizedPractices: initialPractices["MONDAY"] || [],
        materials: ["Mat 1"],
        executionNotes: "",
        evaluation: "",
      },
      {
        dayOfWeek: "TUESDAY",
        date: "2026-08-25",
        activities: [
          {
            activityId: "act-2",
            category: "C",
            objective: "Obj 2",
            description: "Desc 2",
            durationMinutes: 20,
            materials: ["Mat 2"],
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        prioritizedPractices: initialPractices["TUESDAY"] || [],
        materials: ["Mat 2"],
        executionNotes: "",
        evaluation: "",
      },
      {
        dayOfWeek: "WEDNESDAY",
        date: "2026-08-26",
        activities: [
          {
            activityId: "act-3",
            category: "C",
            objective: "Obj 3",
            description: "Desc 3",
            durationMinutes: 20,
            materials: ["Mat 3"],
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        prioritizedPractices: initialPractices["WEDNESDAY"] || [],
        materials: ["Mat 3"],
        executionNotes: "",
        evaluation: "",
      },
      {
        dayOfWeek: "THURSDAY",
        date: "2026-08-27",
        activities: [
          {
            activityId: "act-4",
            category: "C",
            objective: "Obj 4",
            description: "Desc 4",
            durationMinutes: 20,
            materials: ["Mat 4"],
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        prioritizedPractices: initialPractices["THURSDAY"] || [],
        materials: ["Mat 4"],
        executionNotes: "",
        evaluation: "",
      },
      {
        dayOfWeek: "FRIDAY",
        date: "2026-08-28",
        activities: [
          {
            activityId: "act-5",
            category: "C",
            objective: "Obj 5",
            description: "Desc 5",
            durationMinutes: 20,
            materials: ["Mat 5"],
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        prioritizedPractices: initialPractices["FRIDAY"] || [],
        materials: ["Mat 5"],
        executionNotes: "",
        evaluation: "",
      },
    ];

    plan.editPedagogicalContent("Obs", "Needs", "Sit", "Mat", [], days);
    plan.status = status;
    if (status === "APPROVED_FOR_EXECUTION") {
      plan.approvedBy = "Ceci";
      plan.approvedAt = new Date();
    }
    await repository.save(plan);
    return plan;
  };

  const enterAnitaPlanning = async () => {
    const planCard = await screen.findByText("Continuar donde nos quedamos");
    await act(async () => {
      fireEvent.click(planCard);
    });
  };

  it("25. TEST — EMPTY: Anita sees title, guidance, empty text, and add button in editable state", async () => {
    await createTestPlan();

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    // Section title
    expect(screen.getByText("Prácticas priorizadas")).toBeDefined();

    // Guidance text
    expect(
      screen.getByText(
        "Registra este apartado únicamente cuando exista una práctica indicada mediante acompañamiento, asesoría o instrucción institucional."
      )
    ).toBeDefined();

    // Empty state notice
    expect(
      screen.getByText("Sin práctica priorizada registrada para este día.")
    ).toBeDefined();

    // Add button
    expect(
      screen.getByRole("button", { name: /Agregar práctica priorizada/i })
    ).toBeDefined();
  });

  it("26. TEST — REQUIRED FIELD: attempts save with blank practiceName, displays validation, does not call service", async () => {
    await createTestPlan("plan-prio-req-test");
    const setDaySpy = vi.spyOn(service, "setDayPrioritizedPractices");

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    // Click Agregar práctica priorizada
    const addBtn = screen.getByRole("button", { name: /Agregar práctica priorizada/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    // Form opens
    expect(screen.getByTestId("prioritized-practice-form")).toBeDefined();

    // Submit with blank practiceName
    const saveBtn = screen.getByRole("button", { name: /Guardar práctica/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Validation error visible
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText(/La práctica indicada es obligatoria/i)).toBeDefined();

    // Service NOT called
    expect(setDaySpy).not.toHaveBeenCalled();

    // No saved entry rendered
    expect(screen.queryByTestId("prioritized-practice-entry-0")).toBeNull();
  });

  it("27. TEST — ADD SUCCESS: enters practiceName and sourceReference, saves through authoritative service", async () => {
    await createTestPlan("plan-prio-add-test");

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    const addBtn = screen.getByRole("button", { name: /Agregar práctica priorizada/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    const nameInput = screen.getByLabelText(/Práctica indicada/i);
    const refInput = screen.getByLabelText(/Referencia de la instrucción/i);

    await act(async () => {
      fireEvent.change(nameInput, {
        target: { value: "Acompañamiento durante momentos de lectura" },
      });
      fireEvent.change(refInput, {
        target: { value: "Seguimiento de Asesoría Pedagógica" },
      });
    });

    const saveBtn = screen.getByRole("button", { name: /Guardar práctica/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Form closed, practice visible on Monday
    expect(screen.getByText("Acompañamiento durante momentos de lectura")).toBeDefined();
    expect(screen.getByText("Referencia: Seguimiento de Asesoría Pedagógica")).toBeDefined();

    // Domain persistence verified
    const savedPlan = await service.getPlanning("plan-prio-add-test");
    expect(savedPlan!.days[0].prioritizedPractices).toHaveLength(1);
    expect(savedPlan!.days[0].prioritizedPractices![0].practiceName).toBe(
      "Acompañamiento durante momentos de lectura"
    );
    expect(savedPlan!.days[0].prioritizedPractices![0].sourceReference).toBe(
      "Seguimiento de Asesoría Pedagógica"
    );
  });

  it("28. TEST — OPTIONAL REFERENCE: saves with practiceName only, renders no empty reference row", async () => {
    await createTestPlan("plan-prio-opt-ref");

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    const addBtn = screen.getByRole("button", { name: /Agregar práctica priorizada/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    const nameInput = screen.getByLabelText(/Práctica indicada/i);
    await act(async () => {
      fireEvent.change(nameInput, {
        target: { value: "Interacción sensible y responsiva" },
      });
    });

    const saveBtn = screen.getByRole("button", { name: /Guardar práctica/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(screen.getByText("Interacción sensible y responsiva")).toBeDefined();
    expect(screen.queryByText(/Referencia:/i)).toBeNull();

    const savedPlan = await service.getPlanning("plan-prio-opt-ref");
    expect(savedPlan!.days[0].prioritizedPractices![0].sourceReference).toBeUndefined();
  });

  it("29. TEST — MULTIPLE: adds multiple practices, preserves order, and supports 'Agregar otra práctica priorizada'", async () => {
    await createTestPlan("plan-prio-multi");

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    // 1st practice
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Agregar práctica priorizada/i }));
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Práctica indicada/i), {
        target: { value: "Práctica A" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Guardar práctica/i }));
    });

    // 2nd practice button is 'Agregar otra práctica priorizada'
    const addAnotherBtn = screen.getByRole("button", { name: /Agregar otra práctica priorizada/i });
    expect(addAnotherBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(addAnotherBtn);
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Práctica indicada/i), {
        target: { value: "Práctica B" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Guardar práctica/i }));
    });

    expect(screen.getByText("Práctica A")).toBeDefined();
    expect(screen.getByText("Práctica B")).toBeDefined();

    const savedPlan = await service.getPlanning("plan-prio-multi");
    expect(savedPlan!.days[0].prioritizedPractices).toHaveLength(2);
    expect(savedPlan!.days[0].prioritizedPractices![0].practiceName).toBe("Práctica A");
    expect(savedPlan!.days[0].prioritizedPractices![1].practiceName).toBe("Práctica B");
  });

  it("30. TEST — EDIT: edits existing practice, replaces only target, preserves siblings", async () => {
    await createTestPlan("plan-prio-edit", "DRAFT", {
      MONDAY: [
        { practiceName: "Práctica A" },
        { practiceName: "Práctica B" },
      ],
    });

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    expect(screen.getByText("Práctica A")).toBeDefined();
    expect(screen.getByText("Práctica B")).toBeDefined();

    // Click edit on Practice A
    const editBtn = screen.getByRole("button", { name: /Editar Práctica A/i });
    await act(async () => {
      fireEvent.click(editBtn);
    });

    // Form opens with value pre-populated
    const nameInput = screen.getByLabelText(/Práctica indicada/i);
    expect((nameInput as HTMLInputElement).value).toBe("Práctica A");

    // Update to Practice A2
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Práctica A2" } });
    });

    const saveChangesBtn = screen.getByRole("button", { name: /Guardar cambios/i });
    await act(async () => {
      fireEvent.click(saveChangesBtn);
    });

    expect(screen.getByText("Práctica A2")).toBeDefined();
    expect(screen.queryByText("Práctica A")).toBeNull();
    expect(screen.getByText("Práctica B")).toBeDefined();

    const savedPlan = await service.getPlanning("plan-prio-edit");
    expect(savedPlan!.days[0].prioritizedPractices![0].practiceName).toBe("Práctica A2");
    expect(savedPlan!.days[0].prioritizedPractices![1].practiceName).toBe("Práctica B");
  });

  it("31. TEST — REMOVE: removes entries sequentially until exact empty state returns", async () => {
    await createTestPlan("plan-prio-remove", "DRAFT", {
      MONDAY: [
        { practiceName: "Práctica A" },
        { practiceName: "Práctica B" },
      ],
    });

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    // Remove Practice A
    const removeABtn = screen.getByRole("button", { name: /Eliminar Práctica A/i });
    await act(async () => {
      fireEvent.click(removeABtn);
    });

    expect(screen.queryByText("Práctica A")).toBeNull();
    expect(screen.getByText("Práctica B")).toBeDefined();

    let savedPlan = await service.getPlanning("plan-prio-remove");
    expect(savedPlan!.days[0].prioritizedPractices).toHaveLength(1);
    expect(savedPlan!.days[0].prioritizedPractices![0].practiceName).toBe("Práctica B");

    // Remove Practice B
    const removeBBtn = screen.getByRole("button", { name: /Eliminar Práctica B/i });
    await act(async () => {
      fireEvent.click(removeBBtn);
    });

    expect(screen.queryByText("Práctica B")).toBeNull();
    expect(
      screen.getByText("Sin práctica priorizada registrada para este día.")
    ).toBeDefined();

    savedPlan = await service.getPlanning("plan-prio-remove");
    expect(savedPlan!.days[0].prioritizedPractices).toEqual([]);
  });

  it("32. TEST — FAILURE ATOMICITY: ADD, EDIT, REMOVE persistence failures do not corrupt UI and keep input", async () => {
    await createTestPlan("plan-prio-failure", "DRAFT", {
      MONDAY: [{ practiceName: "Práctica Existente" }],
    });

    const setDaySpy = vi.spyOn(service, "setDayPrioritizedPractices");

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    // 1. ADD failure
    setDaySpy.mockRejectedValueOnce(new Error("Database persistence failed"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Agregar otra práctica priorizada/i }));
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Práctica indicada/i), {
        target: { value: "Práctica Fallida" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Guardar práctica/i }));
    });

    // Error alert visible
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText(/Database persistence failed/i)).toBeDefined();
    // Form remains open and input preserved
    expect(screen.getByTestId("prioritized-practice-form")).toBeDefined();
    expect((screen.getByLabelText(/Práctica indicada/i) as HTMLInputElement).value).toBe("Práctica Fallida");
    // False saved entry NOT shown
    expect(screen.queryByText("Práctica Fallida")).toBeNull();
    // Previous entry still there
    expect(screen.getByText("Práctica Existente")).toBeDefined();

    // Cancel form
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    });

    // 2. EDIT failure
    setDaySpy.mockRejectedValueOnce(new Error("Database update rejected"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Editar Práctica Existente/i }));
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Práctica indicada/i), {
        target: { value: "Práctica Modificada Que Falla" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/i }));
    });

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText(/Database update rejected/i)).toBeDefined();
    expect(screen.getByText("Práctica Existente")).toBeDefined();
    expect(screen.queryByText("Práctica Modificada Que Falla")).toBeNull();

    // Cancel form
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    });

    // 3. REMOVE failure
    setDaySpy.mockRejectedValueOnce(new Error("Database delete failed"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Eliminar Práctica Existente/i }));
    });

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText(/Database delete failed/i)).toBeDefined();
    // Entry remains visible
    expect(screen.getByText("Práctica Existente")).toBeDefined();

    setDaySpy.mockRestore();
  });

  it("33. TEST — DAY ISOLATION: Monday data belongs only to Monday and Wednesday data to Wednesday", async () => {
    await createTestPlan("plan-prio-isolation", "DRAFT", {
      MONDAY: [{ practiceName: "Práctica Lunes" }],
      WEDNESDAY: [{ practiceName: "Práctica Miércoles" }],
    });

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    // Monday tab (default)
    expect(screen.getByText("Práctica Lunes")).toBeDefined();
    expect(screen.queryByText("Práctica Miércoles")).toBeNull();

    // Switch to Tuesday
    const tuesdayTab = screen.getByRole("tab", { name: /Martes/i });
    await act(async () => {
      fireEvent.click(tuesdayTab);
    });
    expect(screen.getByText("Sin práctica priorizada registrada para este día.")).toBeDefined();
    expect(screen.queryByText("Práctica Lunes")).toBeNull();
    expect(screen.queryByText("Práctica Miércoles")).toBeNull();

    // Switch to Wednesday
    const wednesdayTab = screen.getByRole("tab", { name: /Miércoles/i });
    await act(async () => {
      fireEvent.click(wednesdayTab);
    });
    expect(screen.getByText("Práctica Miércoles")).toBeDefined();
    expect(screen.queryByText("Práctica Lunes")).toBeNull();
  });

  it("34. TEST — READ ONLY: hides mutation controls in IN_REVIEW, APPROVED_FOR_EXECUTION, and CLOSED", async () => {
    // 1. IN_REVIEW
    await createTestPlan("plan-prio-review", "IN_REVIEW", {
      MONDAY: [{ practiceName: "Práctica Solo Lectura" }],
    });
    const { unmount: unmountReview } = render(<PlanningDemoApp service={service} source={source} />);
    const reviewCard = await screen.findByText("La Directora la está leyendo");
    await act(async () => {
      fireEvent.click(reviewCard);
    });

    const controlReview = screen.getByTestId("prioritized-practices-control-MONDAY");
    expect(within(controlReview).getByText("Práctica Solo Lectura")).toBeDefined();
    expect(within(controlReview).queryByRole("button", { name: /Agregar/i })).toBeNull();
    expect(within(controlReview).queryByRole("button", { name: /Editar/i })).toBeNull();
    expect(within(controlReview).queryByRole("button", { name: /Eliminar/i })).toBeNull();
    unmountReview();

    // 2. APPROVED_FOR_EXECUTION
    await createTestPlan("plan-prio-approved", "APPROVED_FOR_EXECUTION", {
      MONDAY: [{ practiceName: "Práctica Aprobada" }],
    });
    const { unmount: unmountApproved } = render(<PlanningDemoApp service={service} source={source} />);
    const appCard = await screen.findByText("Propuesta lista para usarse 🌟 (Aprobada para ejecución)");
    await act(async () => {
      fireEvent.click(appCard);
    });

    const controlApproved = screen.getByTestId("prioritized-practices-control-MONDAY");
    expect(within(controlApproved).getByText("Práctica Aprobada")).toBeDefined();
    expect(within(controlApproved).queryByRole("button", { name: /Agregar/i })).toBeNull();
    expect(within(controlApproved).queryByRole("button", { name: /Editar/i })).toBeNull();
    expect(within(controlApproved).queryByRole("button", { name: /Eliminar/i })).toBeNull();
    unmountApproved();

    // 3. CLOSED
    await createTestPlan("plan-prio-closed", "CLOSED", {
      MONDAY: [{ practiceName: "Práctica Cerrada" }],
    });
    const { unmount: unmountClosed } = render(<PlanningDemoApp service={service} source={source} />);
    const closedCard = await screen.findByText("Semana concluida y archivada");
    await act(async () => {
      fireEvent.click(closedCard);
    });

    const controlClosed = screen.getByTestId("prioritized-practices-control-MONDAY");
    expect(within(controlClosed).getByText("Práctica Cerrada")).toBeDefined();
    expect(within(controlClosed).queryByRole("button", { name: /Agregar/i })).toBeNull();
    expect(within(controlClosed).queryByRole("button", { name: /Editar/i })).toBeNull();
    expect(within(controlClosed).queryByRole("button", { name: /Eliminar/i })).toBeNull();
    unmountClosed();
  });

  it("35. TEST — REJECTED: remains editable in REJECTED state", async () => {
    await createTestPlan("plan-prio-rejected", "REJECTED", {
      MONDAY: [{ practiceName: "Práctica Rechazada" }],
    });

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    expect(screen.getByText("Práctica Rechazada")).toBeDefined();
    expect(screen.getByRole("button", { name: /Agregar otra práctica priorizada/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Editar Práctica Rechazada/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Eliminar Práctica Rechazada/i })).toBeDefined();
  });
});
