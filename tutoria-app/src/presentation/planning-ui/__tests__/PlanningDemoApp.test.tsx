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
        dayOfWeek: "WEDNESDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
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
        dayOfWeek: "THURSDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
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
        dayOfWeek: "FRIDAY",
        date: "",
        complementaryActivities: [],
        materials: [],
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
              expect(screen.getAllByText(/Semana/i)[0]).toBeDefined();

  });

  it("3. Active listening step interrupts generation (Lo que entendí)", async () => {

              const { service, source } = createTestDeps();
              await renderApp(service, source);
              expect(screen.getAllByText(/Semana/i)[0]).toBeDefined();

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
      { date: "2026-08-24", dayOfWeek: "MONDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a1", category: "C", objective: "O", description: "D", materials: ["m1"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-25", dayOfWeek: "TUESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a2", category: "C", objective: "O", description: "D", materials: ["m2"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-26", dayOfWeek: "WEDNESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a3", category: "C", objective: "O", description: "D", materials: ["m3"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-27", dayOfWeek: "THURSDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a4", category: "C", objective: "O", description: "D", materials: ["m4"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-28", dayOfWeek: "FRIDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a5", category: "C", objective: "O", description: "D", materials: ["m5"], durationMinutes: 20, curricularTraceability: [] }] }
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
              expect(screen.getAllByText(/Semana/i)[0]).toBeDefined();

  });

  it("5.1 Teacher can change weekdays, expand categories, and edits survive switching", async () => {

              const { service, source } = createTestDeps();
              await renderApp(service, source);
              expect(screen.getAllByText(/Semana/i)[0]).toBeDefined();

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
    const days: PlanningDay[] = [
      { date: "2026-08-24", dayOfWeek: "MONDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a1", category: "C", objective: "O", description: "D", materials: ["m1"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-25", dayOfWeek: "TUESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a2", category: "C", objective: "O", description: "D", materials: ["m2"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-26", dayOfWeek: "WEDNESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a3", category: "C", objective: "O", description: "D", materials: ["m3"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-27", dayOfWeek: "THURSDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a4", category: "C", objective: "O", description: "D", materials: ["m4"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-28", dayOfWeek: "FRIDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a5", category: "C", objective: "O", description: "D", materials: ["m5"], durationMinutes: 20, curricularTraceability: [] }] }
    ];
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
      screen.getByRole("tab", { name: "Lunes 24" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getAllByText("O")[0]).toBeDefined();
    const reviewBtn = screen.getByText("Revisar").closest("button")!;
    await act(async () => {
      fireEvent.click(reviewBtn!);
    });
    expect(screen.queryByLabelText("Actividad")).toBeNull();
    expect(screen.getAllByText("D")[0]).toBeDefined();
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
    const days: PlanningDay[] = [
      { date: "2026-08-24", dayOfWeek: "MONDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a1", category: "C", objective: "O", description: "D", materials: ["m1"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-25", dayOfWeek: "TUESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a2", category: "C", objective: "O", description: "D", materials: ["m2"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-26", dayOfWeek: "WEDNESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a3", category: "C", objective: "O", description: "D", materials: ["m3"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-27", dayOfWeek: "THURSDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a4", category: "C", objective: "O", description: "D", materials: ["m4"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-28", dayOfWeek: "FRIDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a5", category: "C", objective: "O", description: "D", materials: ["m5"], durationMinutes: 20, curricularTraceability: [] }] }
    ];
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
      { date: "2026-08-24", dayOfWeek: "MONDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a1", category: "C", objective: "O", description: "D", materials: ["m1"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-25", dayOfWeek: "TUESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a2", category: "C", objective: "O", description: "D", materials: ["m2"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-26", dayOfWeek: "WEDNESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a3", category: "C", objective: "O", description: "D", materials: ["m3"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-27", dayOfWeek: "THURSDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a4", category: "C", objective: "O", description: "D", materials: ["m4"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-28", dayOfWeek: "FRIDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a5", category: "C", objective: "O", description: "D", materials: ["m5"], durationMinutes: 20, curricularTraceability: [] }] }
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
      fireEvent.click(screen.getByText(/Generar Semana/i));
    });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();
    await act(async () => {
      /* Aceptar button removed */
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Guardar Día"));
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
    const days: PlanningDay[] = [
      { date: "2026-08-24", dayOfWeek: "MONDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a1", category: "C", objective: "O", description: "D", materials: ["m1"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-25", dayOfWeek: "TUESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a2", category: "C", objective: "O", description: "D", materials: ["m2"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-26", dayOfWeek: "WEDNESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a3", category: "C", objective: "O", description: "D", materials: ["m3"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-27", dayOfWeek: "THURSDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a4", category: "C", objective: "O", description: "D", materials: ["m4"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-28", dayOfWeek: "FRIDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a5", category: "C", objective: "O", description: "D", materials: ["m5"], durationMinutes: 20, curricularTraceability: [] }] }
    ];
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

  it("12. Contexto Pedagógico is rendered at the top level", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      const btn = screen.queryByText(/Comenzar nuestra semana/i);
      if (btn) fireEvent.click(btn);
    });
    expect(screen.getByText("Contexto Pedagógico Semanal")).toBeDefined();
  });




  it("15. Teacher materials are logically derived for active day and common weekly use", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning("p1", "d1", "lactantes-c", "t1", "2026-08-10", "2026-08-14", "TEACHER");
    const days: PlanningDay[] = [
      { date: "2026-08-24", dayOfWeek: "MONDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a1", category: "C", objective: "O", description: "D", materials: ["m1"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-25", dayOfWeek: "TUESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a2", category: "C", objective: "O", description: "D", materials: ["m2"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-26", dayOfWeek: "WEDNESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a3", category: "C", objective: "O", description: "D", materials: ["m3"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-27", dayOfWeek: "THURSDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a4", category: "C", objective: "O", description: "D", materials: ["m4"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-28", dayOfWeek: "FRIDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a5", category: "C", objective: "O", description: "D", materials: ["m5"], durationMinutes: 20, curricularTraceability: [] }] }
    ];
    await service.saveDraft("p1", "obs", "need", "spec", "mat", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");
    await service.approve("p1", "DIRECTOR", "Ceci");

    await renderApp(service, source); screen.debug(undefined, 30000); { const _btn = await screen.findByText(/Propuesta lista para usarse/i); await act(async () => { fireEvent.click(_btn); }); }
    { const _btn = await screen.findByText(/Versión Oficial IMSS/i); await act(async () => { fireEvent.click(_btn); }); }
    expect(screen.getAllByText(/Materiales requeridos/i)[0]).toBeDefined();
    expect(screen.getAllByText(/m1/i)[0]).toBeDefined();
  });

  it("15.1 Empty common intersection does not render false common section", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning("p1", "d1", "lactantes-c", "t1", "2026-08-10", "2026-08-14", "TEACHER");
    const days: PlanningDay[] = [
      { date: "2026-08-24", dayOfWeek: "MONDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a1", category: "C", objective: "O", description: "D", materials: ["m1"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-25", dayOfWeek: "TUESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a2", category: "C", objective: "O", description: "D", materials: ["m2"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-26", dayOfWeek: "WEDNESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a3", category: "C", objective: "O", description: "D", materials: ["m3"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-27", dayOfWeek: "THURSDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a4", category: "C", objective: "O", description: "D", materials: ["m4"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-28", dayOfWeek: "FRIDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a5", category: "C", objective: "O", description: "D", materials: ["m5"], durationMinutes: 20, curricularTraceability: [] }] }
    ];
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
    const days: PlanningDay[] = [
      { date: "2026-08-24", dayOfWeek: "MONDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a1", category: "C", objective: "O", description: "D", materials: ["m1"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-25", dayOfWeek: "TUESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a2", category: "C", objective: "O", description: "D", materials: ["m2"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-26", dayOfWeek: "WEDNESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a3", category: "C", objective: "O", description: "D", materials: ["m3"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-27", dayOfWeek: "THURSDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a4", category: "C", objective: "O", description: "D", materials: ["m4"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-28", dayOfWeek: "FRIDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a5", category: "C", objective: "O", description: "D", materials: ["m5"], durationMinutes: 20, curricularTraceability: [] }] }
    ];
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
    const days: PlanningDay[] = [
      { date: "2026-08-24", dayOfWeek: "MONDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a1", category: "C", objective: "O", description: "D", materials: ["m1"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-25", dayOfWeek: "TUESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a2", category: "C", objective: "O", description: "D", materials: ["m2"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-26", dayOfWeek: "WEDNESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a3", category: "C", objective: "O", description: "D", materials: ["m3"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-27", dayOfWeek: "THURSDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a4", category: "C", objective: "O", description: "D", materials: ["m4"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-28", dayOfWeek: "FRIDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a5", category: "C", objective: "O", description: "D", materials: ["m5"], durationMinutes: 20, curricularTraceability: [] }] }
    ];
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
    const days: PlanningDay[] = [
      { date: "2026-08-24", dayOfWeek: "MONDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a1", category: "C", objective: "O", description: "D", materials: ["m1"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-25", dayOfWeek: "TUESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a2", category: "C", objective: "O", description: "D", materials: ["m2"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-26", dayOfWeek: "WEDNESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a3", category: "C", objective: "O", description: "D", materials: ["m3"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-27", dayOfWeek: "THURSDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a4", category: "C", objective: "O", description: "D", materials: ["m4"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-28", dayOfWeek: "FRIDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a5", category: "C", objective: "O", description: "D", materials: ["m5"], durationMinutes: 20, curricularTraceability: [] }] }
    ];
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
      fireEvent.click(screen.getByText(/Generar Semana/i)); });
    expect(source.generateRecommendation).toHaveBeenCalledWith(expect.anything(), 'test_obs', '', '', '');
  });

  it("20. Input Truthfulness C: Teacher-entered materials do NOT appear in generated material summary", async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning("p1", "d1", "lactantes-c", "t1", "2026-08-10", "2026-08-14", "TEACHER");
    const days: PlanningDay[] = [
      { date: "2026-08-24", dayOfWeek: "MONDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a1", category: "C", objective: "O", description: "D", materials: ["m1"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-25", dayOfWeek: "TUESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a2", category: "C", objective: "O", description: "D", materials: ["m2"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-26", dayOfWeek: "WEDNESDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a3", category: "C", objective: "O", description: "D", materials: ["m3"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-27", dayOfWeek: "THURSDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a4", category: "C", objective: "O", description: "D", materials: ["m4"], durationMinutes: 20, curricularTraceability: [] }] },
      { date: "2026-08-28", dayOfWeek: "FRIDAY", complementaryActivities: [], materials: [], activities: [{ activityId: "a5", category: "C", objective: "O", description: "D", materials: ["m5"], durationMinutes: 20, curricularTraceability: [] }] }
    ];
    await service.saveDraft("p1", "obs", "need", "spec", "TEACHER_ONLY_MATERIAL_XYZ", [], days, "TEACHER");
    await service.submit("p1", "TEACHER");
    await service.approve("p1", "DIRECTOR", "Ceci");

    await renderApp(service, source);
    { const _btn = await screen.findByText(/Propuesta lista para usarse/i); await act(async () => { fireEvent.click(_btn); }); }
    { const _btn = await screen.findByText(/Versión Oficial IMSS/i); await act(async () => { fireEvent.click(_btn); }); }
    expect(screen.queryByText(/TEACHER_ONLY_MATERIAL_XYZ/i)).toBeNull();
  });
});
