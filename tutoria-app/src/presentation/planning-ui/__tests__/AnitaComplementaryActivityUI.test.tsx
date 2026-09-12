import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning, PlanningDay } from "../../../domain/planning/WeeklyPlanning";
import { ComplementaryProgramActivity } from "../../../domain/planning/ComplementaryProgramActivity";

describe("Anita Daily Complementary Activity Entry UI (H1R9-F.6.2)", () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let source: DeterministicPedagogicalRecommendationSource;

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
    source = new DeterministicPedagogicalRecommendationSource();
  });

  const createTestPlan = async (
    planningId = "plan-anita-comp-test",
    status: "DRAFT" | "IN_REVIEW" | "APPROVED_FOR_EXECUTION" | "REJECTED" | "CLOSED" = "DRAFT",
    initialComplementaries: Record<string, ComplementaryProgramActivity[]> = {}
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
        complementaryActivities: initialComplementaries["MONDAY"] || [],
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
        complementaryActivities: initialComplementaries["TUESDAY"] || [],
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
        complementaryActivities: initialComplementaries["WEDNESDAY"] || [],
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
        complementaryActivities: initialComplementaries["THURSDAY"] || [],
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
        complementaryActivities: initialComplementaries["FRIDAY"] || [],
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

  it("26. TEST — EMPTY STATE: displays title, helper, empty state text, and add button on editable day", async () => {
    await createTestPlan();

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    // Section title
    expect(
      screen.getByText("Actividades complementarias de otros programas")
    ).toBeDefined();

    // Governance helper
    expect(
      screen.getByText(
        "Registra este apartado únicamente cuando exista una actividad indicada por otro programa o instrucción institucional."
      )
    ).toBeDefined();

    // Empty state notice
    expect(
      screen.getByText("Sin actividad complementaria registrada para este día.")
    ).toBeDefined();

    // Add button
    expect(
      screen.getByRole("button", { name: /Agregar actividad complementaria/i })
    ).toBeDefined();
  });

  it("27. TEST — ADD SINGLE: enters program and activity, saves, and updates Monday UI and domain", async () => {
    await createTestPlan("plan-add-single");

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    // Click Agregar actividad complementaria
    const addBtn = screen.getByRole("button", {
      name: /Agregar actividad complementaria/i,
    });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    // Form inputs are visible
    const programInput = screen.getByPlaceholderText(/Programa de estimulación específico/i);
    const activityInput = screen.getByPlaceholderText(/Ejercicio de seguimiento motor/i);

    await act(async () => {
      fireEvent.change(programInput, {
        target: { value: "Programa de estimulación específico" },
      });
      fireEvent.change(activityInput, {
        target: { value: "Ejercicio de seguimiento motor" },
      });
    });

    // Submit form
    const saveBtn = screen.getByRole("button", { name: /Guardar actividad/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Form is closed, entry is rendered
    expect(screen.getByText("Programa de estimulación específico")).toBeDefined();
    expect(screen.getByText("Ejercicio de seguimiento motor")).toBeDefined();

    // Verify domain persistence
    const savedPlan = await service.getPlanning("plan-add-single");
    expect(savedPlan!.days[0].complementaryActivities).toHaveLength(1);
    expect(savedPlan!.days[0].complementaryActivities[0].programArea).toBe(
      "Programa de estimulación específico"
    );
    expect(savedPlan!.days[0].complementaryActivities[0].activityName).toBe(
      "Ejercicio de seguimiento motor"
    );

    // Tuesday - Friday remain unchanged
    expect(savedPlan!.days[1].complementaryActivities).toHaveLength(0);
    expect(savedPlan!.days[2].complementaryActivities).toHaveLength(0);
    expect(savedPlan!.days[3].complementaryActivities).toHaveLength(0);
    expect(savedPlan!.days[4].complementaryActivities).toHaveLength(0);
  });

  it("28. TEST — OPTIONAL FIELDS: preserves and displays purpose, description, and sourceReference when provided", async () => {
    await createTestPlan("plan-optional-fields");

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    const addBtn = screen.getByRole("button", {
      name: /Agregar actividad complementaria/i,
    });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText(/Programa de estimulación específico/i),
        { target: { value: "Seguimiento de Salud Integral" } }
      );
      fireEvent.change(
        screen.getByPlaceholderText(/Ejercicio de seguimiento motor/i),
        { target: { value: "Monitoreo de deglución" } }
      );
      fireEvent.change(
        screen.getByPlaceholderText(/Fortalecer motricidad fina/i),
        { target: { value: "Evaluar tolerancia a sólidos" } }
      );
      fireEvent.change(
        screen.getByPlaceholderText(/Detalles sobre el procedimiento/i),
        { target: { value: "Observar masticación guiada con puré con grumos" } }
      );
      fireEvent.change(
        screen.getByPlaceholderText(/Oficio No. 34\/2026/i),
        { target: { value: "Oficio IMSS/2026/DG-04" } }
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Guardar actividad/i }));
    });

    // Check all fields visible in UI
    expect(screen.getByText("Seguimiento de Salud Integral")).toBeDefined();
    expect(screen.getByText("Monitoreo de deglución")).toBeDefined();
    expect(screen.getByText(/Evaluar tolerancia a sólidos/i)).toBeDefined();
    expect(screen.getByText(/Observar masticación guiada con puré con grumos/i)).toBeDefined();
    expect(screen.getByText(/Fuente: Oficio IMSS\/2026\/DG-04/i)).toBeDefined();

    // Verify in domain
    const savedPlan = await service.getPlanning("plan-optional-fields");
    const ca = savedPlan!.days[0].complementaryActivities[0];
    expect(ca.purpose).toBe("Evaluar tolerancia a sólidos");
    expect(ca.description).toBe("Observar masticación guiada con puré con grumos");
    expect(ca.sourceReference).toBe("Oficio IMSS/2026/DG-04");
  });

  it("29. TEST — MULTIPLE: allows adding multiple activities to the same day", async () => {
    await createTestPlan("plan-multiple", "DRAFT", {
      MONDAY: [
        {
          programArea: "Programa Inicial",
          activityName: "Actividad Inicial",
        },
      ],
    });

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    // First entry already visible
    expect(screen.getByText("Actividad Inicial")).toBeDefined();

    // Button says 'Agregar otra actividad complementaria'
    const addAnotherBtn = screen.getByRole("button", {
      name: /Agregar otra actividad complementaria/i,
    });
    await act(async () => {
      fireEvent.click(addAnotherBtn);
    });

    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText(/Programa de estimulación específico/i),
        { target: { value: "Segundo Programa" } }
      );
      fireEvent.change(
        screen.getByPlaceholderText(/Ejercicio de seguimiento motor/i),
        { target: { value: "Segunda Actividad" } }
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Guardar actividad/i }));
    });

    // Both entries visible
    expect(screen.getByText("Actividad Inicial")).toBeDefined();
    expect(screen.getByText("Segunda Actividad")).toBeDefined();

    const savedPlan = await service.getPlanning("plan-multiple");
    expect(savedPlan!.days[0].complementaryActivities).toHaveLength(2);
  });

  it("30. TEST — EDIT: edits an existing complementary activity without creating duplicates", async () => {
    await createTestPlan("plan-edit", "DRAFT", {
      MONDAY: [
        {
          programArea: "Programa Uno",
          activityName: "Actividad Original Uno",
        },
        {
          programArea: "Programa Dos",
          activityName: "Actividad Hermana Dos",
        },
      ],
    });

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    // Click Editar on the first activity
    const mondayControl = screen.getByTestId("complementary-control-MONDAY");
    const editBtns = within(mondayControl).getAllByRole("button", { name: /Editar/i });
    expect(editBtns.length).toBe(2);

    await act(async () => {
      fireEvent.click(editBtns[0]);
    });

    // Edit form opens pre-filled
    const activityInput = screen.getByDisplayValue("Actividad Original Uno");
    await act(async () => {
      fireEvent.change(activityInput, {
        target: { value: "Actividad Modificada Uno" },
      });
    });

    // Save changes
    const saveChangesBtn = screen.getByRole("button", { name: /Guardar cambios/i });
    await act(async () => {
      fireEvent.click(saveChangesBtn);
    });

    // Verify UI updates
    expect(screen.getByText("Actividad Modificada Uno")).toBeDefined();
    expect(screen.getByText("Actividad Hermana Dos")).toBeDefined();
    expect(screen.queryByText("Actividad Original Uno")).toBeNull();

    // Verify domain: exactly 2 items, sibling untouched
    const savedPlan = await service.getPlanning("plan-edit");
    expect(savedPlan!.days[0].complementaryActivities).toHaveLength(2);
    expect(savedPlan!.days[0].complementaryActivities[0].activityName).toBe(
      "Actividad Modificada Uno"
    );
    expect(savedPlan!.days[0].complementaryActivities[1].activityName).toBe(
      "Actividad Hermana Dos"
    );
  });

  it("31. TEST — REMOVE: removes an entry and returns to empty state when the last entry is deleted", async () => {
    await createTestPlan("plan-remove", "DRAFT", {
      MONDAY: [
        {
          programArea: "Programa A",
          activityName: "Actividad A",
        },
        {
          programArea: "Programa B",
          activityName: "Actividad B",
        },
      ],
    });

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    // 1. Remove first item
    const deleteBtns = screen.getAllByRole("button", { name: /Eliminar/i });
    await act(async () => {
      fireEvent.click(deleteBtns[0]);
    });

    // Sibling preserved
    expect(screen.queryByText("Actividad A")).toBeNull();
    expect(screen.getByText("Actividad B")).toBeDefined();

    // 2. Remove remaining item
    const remainingDeleteBtn = screen.getByRole("button", { name: /Eliminar/i });
    await act(async () => {
      fireEvent.click(remainingDeleteBtn);
    });

    // UI returns to empty state
    expect(
      screen.getByText("Sin actividad complementaria registrada para este día.")
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Agregar actividad complementaria/i })
    ).toBeDefined();

    // Domain has []
    const savedPlan = await service.getPlanning("plan-remove");
    expect(savedPlan!.days[0].complementaryActivities).toEqual([]);
  });

  it("32. TEST — DAY ISOLATION: Monday entry and Wednesday entry remain strictly isolated", async () => {
    await createTestPlan("plan-isolation", "DRAFT", {
      MONDAY: [{ programArea: "Prog Lunes", activityName: "Act Lunes" }],
      WEDNESDAY: [{ programArea: "Prog Miercoles", activityName: "Act Miercoles" }],
    });

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    // On Monday (tab 0)
    expect(screen.getByText("Act Lunes")).toBeDefined();
    expect(screen.queryByText("Act Miercoles")).toBeNull();

    // Switch to Wednesday tab
    const wednesdayTab = screen.getByRole("tab", { name: /Miércoles 26/i });
    await act(async () => {
      fireEvent.click(wednesdayTab);
    });

    // On Wednesday (tab 2)
    expect(screen.getByText("Act Miercoles")).toBeDefined();
    expect(screen.queryByText("Act Lunes")).toBeNull();

    // Switch to Tuesday tab
    const tuesdayTab = screen.getByRole("tab", { name: /Martes 25/i });
    await act(async () => {
      fireEvent.click(tuesdayTab);
    });

    // Tuesday is empty
    expect(
      screen.getByText("Sin actividad complementaria registrada para este día.")
    ).toBeDefined();
  });

  it("33. TEST — INVALID: rejects blank or whitespace required values with validation message and zero domain mutation", async () => {
    await createTestPlan("plan-invalid", "DRAFT", {
      MONDAY: [{ programArea: "Programa Original", activityName: "Actividad Original" }],
    });

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    const addAnotherBtn = screen.getByRole("button", {
      name: /Agregar otra actividad complementaria/i,
    });
    await act(async () => {
      fireEvent.click(addAnotherBtn);
    });

    // Fill only whitespace
    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText(/Programa de estimulación específico/i),
        { target: { value: "   " } }
      );
      fireEvent.change(
        screen.getByPlaceholderText(/Ejercicio de seguimiento motor/i),
        { target: { value: "Actividad con programa blanco" } }
      );
    });

    // Attempt save
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Guardar actividad/i }));
    });

    // Validation alert is shown
    expect(
      screen.getByText("El programa o instrucción y la actividad indicada son obligatorios.")
    ).toBeDefined();

    // Domain remains 100% untouched
    const savedPlan = await service.getPlanning("plan-invalid");
    expect(savedPlan!.days[0].complementaryActivities).toHaveLength(1);
    expect(savedPlan!.days[0].complementaryActivities[0].activityName).toBe("Actividad Original");
  });

  it("34. TEST — LIFECYCLE: editable in DRAFT/REJECTED; read-only in IN_REVIEW, APPROVED_FOR_EXECUTION, CLOSED", async () => {
    // 1. REJECTED: mutation controls are available
    await createTestPlan("plan-rejected", "REJECTED", {
      MONDAY: [{ programArea: "Prog R", activityName: "Act R" }],
    });

    const { unmount } = render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    const mondayControl1 = screen.getByTestId("complementary-control-MONDAY");
    expect(within(mondayControl1).getByRole("button", { name: /Editar/i })).toBeDefined();
    expect(within(mondayControl1).getByRole("button", { name: /Eliminar/i })).toBeDefined();
    unmount();

    // 2. IN_REVIEW: read-only, buttons hidden
    await createTestPlan("plan-in-review", "IN_REVIEW", {
      MONDAY: [{ programArea: "Prog Rev", activityName: "Act Rev" }],
    });

    const { unmount: unmount2 } = render(<PlanningDemoApp service={service} source={source} />);
    // Select IN_REVIEW plan
    const reviewCard = await screen.findByText("La Directora la está leyendo");
    await act(async () => {
      fireEvent.click(reviewCard);
    });

    const mondayControl2 = screen.getByTestId("complementary-control-MONDAY");
    expect(within(mondayControl2).getByText("Act Rev")).toBeDefined();
    expect(within(mondayControl2).queryByRole("button", { name: /Editar/i })).toBeNull();
    expect(within(mondayControl2).queryByRole("button", { name: /Eliminar/i })).toBeNull();
    expect(within(mondayControl2).queryByRole("button", { name: /Agregar/i })).toBeNull();
    unmount2();

    // 3. APPROVED_FOR_EXECUTION: read-only
    await createTestPlan("plan-approved-exec", "APPROVED_FOR_EXECUTION", {
      MONDAY: [{ programArea: "Prog App", activityName: "Act App" }],
    });

    const { unmount: unmount3 } = render(<PlanningDemoApp service={service} source={source} />);
    const appCard = await screen.findByText("Propuesta lista para usarse 🌟 (Aprobada para ejecución)");
    await act(async () => {
      fireEvent.click(appCard);
    });

    const mondayControl3 = screen.getByTestId("complementary-control-MONDAY");
    expect(within(mondayControl3).getByText("Act App")).toBeDefined();
    expect(within(mondayControl3).queryByRole("button", { name: /Editar/i })).toBeNull();
    expect(within(mondayControl3).queryByRole("button", { name: /Eliminar/i })).toBeNull();
    expect(within(mondayControl3).queryByRole("button", { name: /Agregar/i })).toBeNull();
    unmount3();

    // 4. CLOSED: read-only
    await createTestPlan("plan-closed", "CLOSED", {
      MONDAY: [{ programArea: "Prog Closed", activityName: "Act Closed" }],
    });

    const { unmount: unmount4 } = render(<PlanningDemoApp service={service} source={source} />);
    const closedCard = await screen.findByText("Semana concluida y archivada");
    await act(async () => {
      fireEvent.click(closedCard);
    });

    const mondayControl4 = screen.getByTestId("complementary-control-MONDAY");
    expect(within(mondayControl4).getByText("Act Closed")).toBeDefined();
    expect(within(mondayControl4).queryByRole("button", { name: /Editar/i })).toBeNull();
    expect(within(mondayControl4).queryByRole("button", { name: /Eliminar/i })).toBeNull();
    expect(within(mondayControl4).queryByRole("button", { name: /Agregar/i })).toBeNull();
    unmount4();
  });

  it("35. TEST — MODALITIES: works under DIRECT and INDIRECT without altering either modality's curricular behavior", async () => {
    await createTestPlan("plan-modalities-test");

    render(<PlanningDemoApp service={service} source={source} />);

    // 1. In DIRECT: Curricular selector is available AND complementary section is available
    await enterAnitaPlanning();
    expect(screen.getByText("Actividades complementarias de otros programas")).toBeDefined();
    expect(screen.getByRole("button", { name: /Agregar actividad complementaria/i })).toBeDefined();

    // Expand Monday activity to verify DIRECT selector is preserved
    await act(async () => {
      fireEvent.click(screen.getByText("Revisar / Editar"));
    });
    expect(screen.getByText("Elementos curriculares")).toBeDefined();
    expect(screen.getByText(/Seleccionar del catálogo/i)).toBeDefined();

    // 2. Switch to INDIRECT
    const modalitySelect = screen.getByRole("combobox");
    fireEvent.change(modalitySelect, { target: { value: "INDIRECT" } });

    // Curricular shows institutional card (NO selector)
    expect(screen.getByTestId("indirect-curricular-info-card")).toBeDefined();
    expect(screen.queryByText(/Seleccionar del catálogo/i)).toBeNull();

    // Complementary section remains fully functional
    expect(screen.getByText("Actividades complementarias de otros programas")).toBeDefined();
    expect(screen.getByRole("button", { name: /Agregar actividad complementaria/i })).toBeDefined();
  });


  // =========================================================================
  // H1R9-F.6.2.1: COMPLEMENTARY ACTIVITY SAVE-PATH ATOMICITY
  // =========================================================================

  it("7. TEST — SAVE FAILURE: mock service failure blocks ADD, keeps previous state, and shows error", async () => {
    await createTestPlan("plan-save-failure", "DRAFT", {
      MONDAY: [],
    });

    const spy = vi.spyOn(service, "setDayComplementaryActivities").mockRejectedValue(
      new Error("Error de persistencia en servicio institucional")
    );

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    const addBtn = screen.getByRole("button", {
      name: /Agregar actividad complementaria/i,
    });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    const programInput = screen.getByPlaceholderText(/Programa de estimulación específico/i);
    const activityInput = screen.getByPlaceholderText(/Ejercicio de seguimiento motor/i);

    await act(async () => {
      fireEvent.change(programInput, {
        target: { value: "Programa Fallido" },
      });
      fireEvent.change(activityInput, {
        target: { value: "Actividad No Guardada" },
      });
    });

    const saveBtn = screen.getByRole("button", { name: /Guardar actividad/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // 1. Error is visible
    expect(screen.getByText("Error de persistencia en servicio institucional")).toBeDefined();

    // 2. Form remains open so teacher does not lose transcription
    expect(screen.getByTestId("complementary-activity-form")).toBeDefined();

    // 3. Entry is NOT displayed as a saved item in the list
    expect(screen.queryByTestId("complementary-entry-0")).toBeNull();

    // 4. Previous activities unchanged in domain repository
    const stored = await service.getPlanning("plan-save-failure");
    expect(stored!.days[0].complementaryActivities).toEqual([]);

    spy.mockRestore();
  });

  it("8. TEST — EDIT FAILURE: mock service failure blocks EDIT, keeps original entry, and shows error", async () => {
    await createTestPlan("plan-edit-failure", "DRAFT", {
      MONDAY: [
        {
          programArea: "Programa A",
          activityName: "Actividad A",
        },
      ],
    });

    const spy = vi.spyOn(service, "setDayComplementaryActivities").mockRejectedValue(
      new Error("Fallo de red al actualizar actividad")
    );

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    const mondayControl = screen.getByTestId("complementary-control-MONDAY");
    const editBtn = within(mondayControl).getByRole("button", { name: /Editar/i });

    await act(async () => {
      fireEvent.click(editBtn);
    });

    // Form opens pre-filled
    const activityInput = screen.getByDisplayValue("Actividad A");
    await act(async () => {
      fireEvent.change(activityInput, {
        target: { value: "Actividad B Modificada" },
      });
    });

    const saveChangesBtn = screen.getByRole("button", { name: /Guardar cambios/i });
    await act(async () => {
      fireEvent.click(saveChangesBtn);
    });

    // 1. Error is visible
    expect(screen.getByText("Fallo de red al actualizar actividad")).toBeDefined();

    // 2. Form remains open
    expect(screen.getByTestId("complementary-activity-form")).toBeDefined();

    // 3. Entry A remains in domain repository
    const stored = await service.getPlanning("plan-edit-failure");
    expect(stored!.days[0].complementaryActivities).toHaveLength(1);
    expect(stored!.days[0].complementaryActivities[0].activityName).toBe("Actividad A");

    // 4. Entry A remains displayed in UI list
    expect(within(mondayControl).getByTestId("complementary-entry-0").textContent).toContain("Actividad A");

    spy.mockRestore();
  });

  it("9. TEST — REMOVE FAILURE: mock service failure blocks REMOVE, keeps entry authoritative, and shows error", async () => {
    await createTestPlan("plan-remove-failure", "DRAFT", {
      MONDAY: [
        {
          programArea: "Programa A",
          activityName: "Actividad A",
        },
      ],
    });

    const spy = vi.spyOn(service, "setDayComplementaryActivities").mockRejectedValue(
      new Error("Fallo en base de datos al eliminar")
    );

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    const mondayControl = screen.getByTestId("complementary-control-MONDAY");
    const deleteBtn = within(mondayControl).getByRole("button", { name: /Eliminar/i });

    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    // 1. Error is visible
    expect(screen.getByText("Fallo en base de datos al eliminar")).toBeDefined();

    // 2. Entry A remains visible in UI
    expect(within(mondayControl).getByText("Actividad A")).toBeDefined();

    // 3. Empty state is NOT displayed
    expect(
      screen.queryByText("Sin actividad complementaria registrada para este día.")
    ).toBeNull();

    // 4. Domain in repository remains unchanged
    const stored = await service.getPlanning("plan-remove-failure");
    expect(stored!.days[0].complementaryActivities).toHaveLength(1);
    expect(stored!.days[0].complementaryActivities[0].activityName).toBe("Actividad A");

    spy.mockRestore();
  });

  it("10. TEST — SUCCESS: successful add, edit, and remove sequence behaves with full atomicity and UI fidelity", async () => {
    await createTestPlan("plan-success-atomicity", "DRAFT", {
      MONDAY: [],
    });

    render(<PlanningDemoApp service={service} source={source} />);
    await enterAnitaPlanning();

    const mondayControl = screen.getByTestId("complementary-control-MONDAY");

    // 1. ADD
    const addBtn = screen.getByRole("button", {
      name: /Agregar actividad complementaria/i,
    });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText(/Programa de estimulación específico/i),
        { target: { value: "Programa Exitoso" } }
      );
      fireEvent.change(
        screen.getByPlaceholderText(/Ejercicio de seguimiento motor/i),
        { target: { value: "Actividad Exitosa" } }
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Guardar actividad/i }));
    });

    expect(within(mondayControl).getByText("Programa Exitoso")).toBeDefined();
    expect(within(mondayControl).getByText("Actividad Exitosa")).toBeDefined();

    let stored = await service.getPlanning("plan-success-atomicity");
    expect(stored!.days[0].complementaryActivities).toHaveLength(1);
    expect(stored!.days[0].complementaryActivities[0].activityName).toBe("Actividad Exitosa");

    // 2. EDIT
    const editBtn = within(mondayControl).getByRole("button", { name: /Editar/i });
    await act(async () => {
      fireEvent.click(editBtn);
    });

    const editInput = screen.getByDisplayValue("Actividad Exitosa");
    await act(async () => {
      fireEvent.change(editInput, {
        target: { value: "Actividad Exitosa Editada" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/i }));
    });

    expect(within(mondayControl).getByText("Actividad Exitosa Editada")).toBeDefined();
    stored = await service.getPlanning("plan-success-atomicity");
    expect(stored!.days[0].complementaryActivities[0].activityName).toBe("Actividad Exitosa Editada");

    // 3. REMOVE
    const removeBtn = within(mondayControl).getByRole("button", { name: /Eliminar/i });
    await act(async () => {
      fireEvent.click(removeBtn);
    });

    expect(
      within(mondayControl).getByText("Sin actividad complementaria registrada para este día.")
    ).toBeDefined();
    stored = await service.getPlanning("plan-success-atomicity");
    expect(stored!.days[0].complementaryActivities).toEqual([]);
  });
});
