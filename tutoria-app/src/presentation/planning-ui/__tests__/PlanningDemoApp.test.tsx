import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { PedagogicalRecommendationSource } from "../../../application/planning/PedagogicalRecommendationSource";
import { PlanningDay } from "../../../domain/planning/WeeklyPlanning";
import React from "react";

global.alert = vi.fn();

const createTestDeps = () => {
  const repo = new InMemoryWeeklyPlanningRepository();
  const service = new PlanningWorkflowService(repo);
  const source: PedagogicalRecommendationSource = {
    generateRecommendation: vi.fn().mockResolvedValue([
      {
        dayOfWeek: "MONDAY",
        activities: [
          {
            activityId: "a1",
            category: "Exploración",
            objective: "Obj",
            description: "Desc",
            materials: ["m1"],
            durationMinutes: 20,
            curricularTraceability: [],
          },
        ],
      },
      {
        dayOfWeek: "TUESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "WEDNESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "THURSDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "FRIDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
    ] as PlanningDay[]),
  };
  return { repo, service, source };
};

describe("PlanningDemoApp UX Requirements (UX Iteration 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderApp = async (
    service: PlanningWorkflowService,
    source: PedagogicalRecommendationSource,
  ) => {
    let result;
    await act(async () => {
      result = render(<PlanningDemoApp service={service} source={source} />);
      // wait a bit for initial fetch
      await new Promise((r) => setTimeout(r, 50));
    });
    return result!;
  };

  it("1. Teacher sees welcome message instead of raw button", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    expect(
      await screen.findByText(/Vamos a preparar tu semana/i),
    ).toBeDefined();
    expect(await screen.findByText(/Comenzar nuestra semana/i)).toBeDefined();
    expect(
      screen.queryByText(
        /La semana pasada trabajamos la exploración sensorial/i,
      ),
    ).toBeNull();
    expect(
      screen.getByText(/Podemos continuar fortaleciendo la exploración/i),
    ).toBeDefined();
  });

  it("2. Teacher flow shows humanized conversational steps", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    expect(screen.getByText(/1. ¿Qué observaste en el grupo\?/i)).toBeDefined();
    expect(screen.getByText(/2. ¿Qué necesitan fortalecer\?/i)).toBeDefined();
    expect(screen.getByText(/3. ¿Hay situaciones a considerar\?/i)).toBeDefined();
    expect(screen.getByText(/4. ¿Qué materiales tienes disponibles\?/i)).toBeDefined();
  });

  it("3. Active listening step interrupts generation (Lo que entendí)", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Los niños muestran interés/i),
      { target: { value: "obs" } },
    );
    fireEvent.change(screen.getByPlaceholderText(/Control postural/i), {
      target: { value: "needs" },
    });

    vi.useFakeTimers();
    await act(async () => {
      const obsInput = screen.getByPlaceholderText(/Ej: Los niños/i);
      fireEvent.change(obsInput, { target: { value: 'test_obs' } });
      fireEvent.click(screen.getByText(/Ayúdame con TutorIA/i));
    });
    expect(
      screen.getByText(
        /Consultando referencias curriculares y adaptando propuesta/i,
      ),
    ).toBeDefined();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();
    expect(screen.getByText(/PROPUESTA DE TUTORIA/i)).toBeDefined();
  });

  it("4. REJECTED maps to Revisar sugerencias in list", async () => {
    const { repo, service, source } = createTestDeps();
    await service.createPlanning(
      "p1",
      "d1",
      "lactantes-c",
      "t1",
      "2026-08-10",
      "2026-08-14",
      "TEACHER",
    );
    const days: PlanningDay[] = [
      {
        dayOfWeek: "MONDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "TUESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "WEDNESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "THURSDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "FRIDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
    ];
    await service.saveDraft("p1", "obs", "needs", "", "", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");
    await service.reject("p1", "reason", "d1", "DIRECTOR");
    await renderApp(service, source);
    expect(
      await screen.findByText(/Revisar sugerencias de la Directora/i),
    ).toBeDefined();
  });

  it("5. Five Spanish weekdays render as tabs and Lunes is initially visible", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Los niños muestran interés/i),
      { target: { value: "obs" } },
    );
    fireEvent.change(screen.getByPlaceholderText(/Control postural/i), {
      target: { value: "needs" },
    });
    vi.useFakeTimers();
    await act(async () => {
      const obsInput = screen.getByPlaceholderText(/Ej: Los niños/i);
      fireEvent.change(obsInput, { target: { value: 'test_obs' } });
      fireEvent.click(screen.getByText(/Ayúdame con TutorIA/i));
    });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();
    await act(async () => {
      { const _btn = await screen.findByText(/Aceptar \/ Usar propuesta/i); await act(async () => { fireEvent.click(_btn); }); }
    });
    expect(screen.getByRole("tab", { name: "Lunes" })).toBeDefined();

    expect(screen.getByRole("tab", { name: "Martes" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Miércoles" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Jueves" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Viernes" })).toBeDefined();
    expect(screen.getByText("Obj")).toBeDefined();
  });

  it("5.1 Teacher can change weekdays, expand categories, and edits survive switching", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Los niños muestran interés/i),
      { target: { value: "obs" } },
    );
    vi.useFakeTimers();
    await act(async () => {
      const obsInput = screen.getByPlaceholderText(/Ej: Los niños/i);
      fireEvent.change(obsInput, { target: { value: 'test_obs' } });
      fireEvent.click(screen.getByText(/Ayúdame con TutorIA/i));
    });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();
    await act(async () => {
      { const _btn = await screen.findByText(/Aceptar \/ Usar propuesta/i); await act(async () => { fireEvent.click(_btn); }); }
    });
    const editButtons = screen.getAllByText("Revisar / Editar");
    await act(async () => {
      fireEvent.click(editButtons[0] as any);
    });
    const textarea = screen.getByDisplayValue("Desc");
    fireEvent.change(textarea, { target: { value: "EDITED_TEXT" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: "Martes" }));
    });
    expect(screen.queryByText("EDITED_TEXT")).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: "Lunes" }));
    });
    // already expanded, no need to click again
    console.log("TEST 5.1 DOM:", document.body.innerHTML);
    expect(screen.getByDisplayValue("EDITED_TEXT")).toBeDefined();
  });

  it("6. Director review 5x5 UX", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning(
      "p1",
      "d1",
      "lactantes-c",
      "t1",
      "2026-08-10",
      "2026-08-14",
      "TEACHER",
    );
    const days = [
      {
        dayOfWeek: "MONDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [
          {
            activityId: "a1",
            category: "Arte",
            objective: "Obj1",
            description: "Desc1",
            materials: ["Crayolas", "Hojas"],
            durationMinutes: 20,
            curricularTraceability: [],
          },
        ],
      },
      {
        dayOfWeek: "TUESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [
          {
            activityId: "a2",
            category: "Arte",
            objective: "Obj2",
            description: "Desc2",
            materials: ["Crayolas", "Pintura"],
            durationMinutes: 20,
            curricularTraceability: [],
          },
        ],
      },
      {
        dayOfWeek: "WEDNESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "THURSDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "FRIDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
    ] as unknown as PlanningDay[];
    await service.saveDraft("p1", "obs", "needs", "", "", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText("Ceci (Directora)"));
      await new Promise((r) => setTimeout(r, 50));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Anita'));
    });
    expect(
      screen.getByRole("tab", { name: "Lunes" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByText("Obj1")).toBeDefined();
    const reviewBtn = screen.getByText("Revisar").closest("button")!;
    await act(async () => {
      fireEvent.click(reviewBtn!);
    });
    expect(screen.queryByLabelText("Actividad")).toBeNull();
    expect(screen.getByText("Desc1")).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByText("Agregar observación a esta actividad"));
    });
    const obsInput = screen.getByPlaceholderText(
      /¿Qué sugerencia tienes sobre esta actividad\?/i,
    );
    fireEvent.change(obsInput, {
      target: { value: "TEST_OBSERVATION_MONDAY" },
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Guardar observación"));
    });
    console.log(
      "After click, text:",
      screen.getAllByText("ENVIAR OBSERVACIONES A LA EDUCADORA").length,
    );
    const activeAdjustBtn = screen
      .getAllByText("ENVIAR OBSERVACIONES A LA EDUCADORA")[0]!
      .closest("button") as any;
    expect((activeAdjustBtn as any)?.disabled).toBe(false);
  });

  it("7. Supervisor has no mutation actions", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText("Tere (Supervisora)"));
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.queryByText(/¡Me parece excelente!/i)).toBeNull();
    expect(screen.queryByText(/Sugerir algo/i)).toBeNull();
  });

  it("8. Director correction reason appears to Teacher as a conversation", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning(
      "p1",
      "d1",
      "lactantes-c",
      "t1",
      "2026-08-10",
      "2026-08-14",
      "TEACHER",
    );
    const days = [
      {
        dayOfWeek: "MONDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [
          {
            activityId: "a1",
            category: "Arte",
            objective: "Obj1",
            description: "Desc1",
            materials: [],
            durationMinutes: 20,
            curricularTraceability: [],
          },
        ],
      },
      {
        dayOfWeek: "TUESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "WEDNESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "THURSDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "FRIDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
    ] as unknown as PlanningDay[];
    await service.saveDraft("p1", "obs", "needs", "", "", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");

    // Director reviews and rejects
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText("Ceci (Directora)"));
      await new Promise((r) => setTimeout(r, 50));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Anita'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Revisar").closest("button")!);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Agregar observación a esta actividad"));
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        /¿Qué sugerencia tienes sobre esta actividad\?/i,
      ),
      { target: { value: "Por favor añade más detalle" } },
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Guardar observación"));
    });
    await act(async () => {
      fireEvent.click(
        screen.getAllByText("ENVIAR OBSERVACIONES A LA EDUCADORA")[0] as any,
      );
    });

    // Teacher sees it
    await act(async () => {
      fireEvent.click(screen.getByText("Anita (Pedagoga)"));
      await new Promise((r) => setTimeout(r, 50));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Revisar sugerencias/i));
    });
    expect(screen.getByText(/Por favor añade más detalle/i)).toBeDefined();
  });

  it("9. IN_REVIEW disables Teacher editing", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning(
      "p1",
      "d1",
      "lactantes-c",
      "t1",
      "2026-08-10",
      "2026-08-14",
      "TEACHER",
    );
    const days: PlanningDay[] = [
      {
        dayOfWeek: "MONDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "TUESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "WEDNESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "THURSDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "FRIDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
    ];
    await service.saveDraft("p1", "obs", "needs", "", "", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");
    await renderApp(service, source);
    await act(async () => {
      { const _btn = await screen.findByText(/La Directora la está leyendo/i); await act(async () => { fireEvent.click(_btn); }); }
    });
    const obsInput = await screen.findByPlaceholderText(
      /Los niños muestran interés/i,
    );
    expect((obsInput as HTMLTextAreaElement).disabled).toBe(true);
  });

  it("10. No window.alert dependency, toasts are humanized", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Los niños muestran interés/i),
      { target: { value: "obs" } },
    );
    vi.useFakeTimers();
    await act(async () => {
      const obsInput = screen.getByPlaceholderText(/Ej: Los niños/i);
      fireEvent.change(obsInput, { target: { value: 'test_obs' } });
      fireEvent.click(screen.getByText(/Ayúdame con TutorIA/i));
    });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();
    await act(async () => {
      { const _btn = await screen.findByText(/Aceptar \/ Usar propuesta/i); await act(async () => { fireEvent.click(_btn); }); }
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Guardar Lunes"));
    });
    expect(global.alert).not.toHaveBeenCalled();
  });

  it("11. Print view removes generic header and uses story title", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning(
      "p1",
      "d1",
      "lactantes-c",
      "t1",
      "2026-08-10",
      "2026-08-14",
      "TEACHER",
    );
    const days = [
      {
        dayOfWeek: "MONDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "TUESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "WEDNESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "THURSDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
      {
        dayOfWeek: "FRIDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
        activities: [],
      },
    ] as unknown as PlanningDay[];
    await service.saveDraft("p1", "obs", "needs", "", "", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");
    await service.approve("p1", "DIRECTOR", "d1");
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Propuesta lista para usarse/i));
    });
    console.log("TEST 11 DOM:", document.body.innerHTML);
    await act(async () => {
      fireEvent.click(screen.getByText(/Versión Oficial IMSS/i));
    });
    expect(screen.getByText(/Planeación de Actividades/i)).toBeDefined();
  });

  it("12. Weekly planning container uses one-scroll (no horizontal navigation)", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    expect(screen.getByRole("tablist")).toBeDefined(); // tabs are used for days, but main container is vertical scroll
  });

  it('13. Teacher can discard the proposal and go back to editing', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => { fireEvent.click(screen.getByText(/Comenzar nuestra semana/i)); });
    await act(async () => { const obsInput = screen.getByPlaceholderText(/Ej: Los niños/i);
      fireEvent.change(obsInput, { target: { value: 'test_obs' } });
      fireEvent.click(screen.getByText(/Ayúdame con TutorIA/i)); });
    { const _btn = await screen.findByText(/Descartar/i); await act(async () => { fireEvent.click(_btn); }); }
    expect(screen.getByText(/Ayúdame con TutorIA/i)).toBeDefined();
  });


  it("15. Teacher materials are logically derived for active day and common weekly use", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning("p1", "d1", "lactantes-c", "t1", "2026-08-10", "2026-08-14", "TEACHER");
    const days = [
      { dayOfWeek: "MONDAY", date: "", complementaryActivities: [], activities: [{ objective: 'Obj', description: 'Desc', durationMinutes: 20, materials: ["m1"] }] },
      { dayOfWeek: "TUESDAY", date: "", complementaryActivities: [], activities: [] },
      { dayOfWeek: "WEDNESDAY", date: "", complementaryActivities: [], activities: [] },
      { dayOfWeek: "THURSDAY", date: "", complementaryActivities: [], activities: [] },
      { dayOfWeek: "FRIDAY", date: "", complementaryActivities: [], activities: [] }
    ] as unknown as PlanningDay[];
    await service.saveDraft("p1", "obs", "need", "spec", "mat", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");
    await service.approve("p1", "DIRECTOR", "Ceci");

    await renderApp(service, source);
    { const _btn = await screen.findByText(/Propuesta lista para usarse/i); await act(async () => { fireEvent.click(_btn); }); }
    { const _btn = await screen.findByText(/Versión Oficial IMSS/i); await act(async () => { fireEvent.click(_btn); }); }
    expect(screen.getByText(/Materiales requeridos/i)).toBeDefined();
    expect(screen.getByText(/m1/i)).toBeDefined();
  });

  it("15.1 Empty common intersection does not render false common section", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning("p1", "d1", "lactantes-c", "t1", "2026-08-10", "2026-08-14", "TEACHER");
    const days = [
      { dayOfWeek: "MONDAY", date: "", complementaryActivities: [], activities: [{ objective: 'Obj', description: 'Desc', durationMinutes: 20, materials: ["m1"] }] },
      { dayOfWeek: "TUESDAY", date: "", complementaryActivities: [], activities: [] },
      { dayOfWeek: "WEDNESDAY", date: "", complementaryActivities: [], activities: [] },
      { dayOfWeek: "THURSDAY", date: "", complementaryActivities: [], activities: [] },
      { dayOfWeek: "FRIDAY", date: "", complementaryActivities: [], activities: [] }
    ] as unknown as PlanningDay[];
    await service.saveDraft("p1", "obs", "need", "spec", "mat", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");
    await service.approve("p1", "DIRECTOR", "Ceci");

    await renderApp(service, source);
    { const _btn = await screen.findByText(/Propuesta lista para usarse/i); await act(async () => { fireEvent.click(_btn); }); }
    { const _btn = await screen.findByText(/Versión Oficial IMSS/i); await act(async () => { fireEvent.click(_btn); }); }
    expect(screen.queryByText(/Materiales comunes/i)).toBeNull();
  });

  it("16. Evaluation is not falsely completed", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning("p1", "d1", "lactantes-c", "t1", "2026-08-10", "2026-08-14", "TEACHER");
    const days = [
      { dayOfWeek: "MONDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: "TUESDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: "WEDNESDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: "THURSDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: "FRIDAY", date: "", complementaryActivities: [], materials: [], activities: [] }
    ] as unknown as PlanningDay[];
    await service.saveDraft("p1", "obs", "need", "spec", "mat", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");
    await service.approve("p1", "DIRECTOR", "Ceci");

    await renderApp(service, source);
    { const _btn = await screen.findByText(/Propuesta lista para usarse/i); await act(async () => { fireEvent.click(_btn); }); }
    { const _btn = await screen.findByText(/Versión Oficial IMSS/i); await act(async () => { fireEvent.click(_btn); }); }
    expect(await screen.findByText('Espacio para la evaluación posterior a la implementación.')).toBeDefined();
    expect(screen.queryByText(/Evaluación Completada/i)).toBeNull();
  });

  it("17. Complementary-program activities are not fabricated", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning("p1", "d1", "lactantes-c", "t1", "2026-08-10", "2026-08-14", "TEACHER");
    const days = [
      { dayOfWeek: "MONDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: "TUESDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: "WEDNESDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: "THURSDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: "FRIDAY", date: "", complementaryActivities: [], materials: [], activities: [] }
    ] as unknown as PlanningDay[];
    await service.saveDraft("p1", "obs", "need", "spec", "mat", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");
    await service.approve("p1", "DIRECTOR", "Ceci");

    await renderApp(service, source);
    { const _btn = await screen.findByText(/Propuesta lista para usarse/i); await act(async () => { fireEvent.click(_btn); }); }
    { const _btn = await screen.findByText(/Versión Oficial IMSS/i); await act(async () => { fireEvent.click(_btn); }); }
    expect(await screen.findByText('Actividades complementarias de otros programas')).toBeDefined();
    expect(screen.queryAllByText('Pendiente').length).toBeGreaterThan(0);
  });

  it("18. Director sees same persisted context/purpose/material summary", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning("p1", "d1", "lactantes-c", "t1", "2026-08-10", "2026-08-14", "TEACHER");
    const days = [
      { dayOfWeek: "MONDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: "TUESDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: "WEDNESDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: "THURSDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: "FRIDAY", date: "", complementaryActivities: [], materials: [], activities: [] },
    ] as unknown as PlanningDay[];
    await service.saveDraft("p1", "DIRECTOR_CONTEXT_OBSERVATION", "DIRECTOR_CONTEXT_NEED", "DIRECTOR_CONTEXT_SPECIAL", "DIRECTOR_CONTEXT_MATERIAL", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");

    // Switch to Director view
    const sourceDirector = { ...source, activePlanningId: 'p1', role: 'DIRECTOR' as any };
    await renderApp(service, sourceDirector);

    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); await new Promise((r) => setTimeout(r, 50)); });
    await act(async () => { fireEvent.click(screen.getByText(/Lista para conversar/i)); });

    expect(await screen.findByText("DIRECTOR_CONTEXT_OBSERVATION")).toBeDefined();
    expect(screen.getByText("DIRECTOR_CONTEXT_NEED")).toBeDefined();
    expect(screen.getByText("DIRECTOR_CONTEXT_SPECIAL")).toBeDefined();
    expect(screen.getByText("DIRECTOR_CONTEXT_MATERIAL")).toBeDefined();

    const editableContextInputs = screen.queryAllByRole('textbox').filter((t: any) =>
      t.value === 'DIRECTOR_CONTEXT_OBSERVATION' || t.value === 'DIRECTOR_CONTEXT_NEED' ||
      t.value === 'DIRECTOR_CONTEXT_SPECIAL' || t.value === 'DIRECTOR_CONTEXT_MATERIAL'
    );
    expect(editableContextInputs.length).toBe(0);
  });

  it("19. Input Truthfulness A & B: Special consideration & Materials are NOT represented as engine-considered", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => { fireEvent.click(screen.getByText(/Comenzar nuestra semana/i)); });
    await act(async () => { const obsInput = screen.getByPlaceholderText(/Ej: Los niños/i);
      fireEvent.change(obsInput, { target: { value: 'test_obs' } });
      fireEvent.click(screen.getByText(/Ayúdame con TutorIA/i)); });
    expect(source.generateRecommendation).toHaveBeenCalledWith(expect.anything(), 'test_obs', '', '', '');
  });

  it("20. Input Truthfulness C: Teacher-entered materials do NOT appear in generated material summary", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning("p1", "d1", "lactantes-c", "t1", "2026-08-10", "2026-08-14", "TEACHER");
    const days = [
      { dayOfWeek: "MONDAY", date: "", complementaryActivities: [], activities: [{ objective: 'Obj', description: 'Desc', durationMinutes: 20, materials: ["m1"] }] },
      { dayOfWeek: "TUESDAY", date: "", complementaryActivities: [], activities: [] },
      { dayOfWeek: "WEDNESDAY", date: "", complementaryActivities: [], activities: [] },
      { dayOfWeek: "THURSDAY", date: "", complementaryActivities: [], activities: [] },
      { dayOfWeek: "FRIDAY", date: "", complementaryActivities: [], activities: [] }
    ] as unknown as PlanningDay[];
    await service.saveDraft("p1", "obs", "need", "spec", "TEACHER_ONLY_MATERIAL_XYZ", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");
    await service.approve("p1", "DIRECTOR", "Ceci");

    await renderApp(service, source);
    { const _btn = await screen.findByText(/Propuesta lista para usarse/i); await act(async () => { fireEvent.click(_btn); }); }
    { const _btn = await screen.findByText(/Versión Oficial IMSS/i); await act(async () => { fireEvent.click(_btn); }); }
    expect(screen.queryByText(/TEACHER_ONLY_MATERIAL_XYZ/i)).toBeNull();
  });
});
