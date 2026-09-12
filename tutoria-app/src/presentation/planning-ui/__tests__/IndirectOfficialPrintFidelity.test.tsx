import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("INDIRECT Daily Official Print Fidelity (H1R9-F.5.4.3)", () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let source: DeterministicPedagogicalRecommendationSource;

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
    source = new DeterministicPedagogicalRecommendationSource();
  });

  const createApprovedIndirectPlan = async (planningId = "plan-indirect-official-daily-test") => {
    const plan = WeeklyPlanning.create(
      planningId,
      "d1",
      "lactantes-c",
      "t1",
      "2026-08-24",
      "2026-08-28"
    );
    plan.editPedagogicalContent(
      "Observaciones semanales para INDIRECT",
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
              activityId: "act-ind-mon",
              category: "C",
              objective: "Obj Lunes Actividad",
              description: "Descripcion Lunes Exclusiva",
              durationMinutes: 30,
              materials: ["Pelotas de esponja Lunes"],
              curricularTraceability: [],
            },
          ],
          complementaryActivities: [
            {
              programArea: "Lectura",
              activityName: "Cuentos Lunes",
              purpose: "Lenguaje Lunes",
              description: "Lectura Lunes",
              sourceReference: "Programa Lectura Lunes",
            },
          ],
          materials: ["Pelotas de esponja Lunes"],
          executionNotes: "",
          evaluation: "Evaluacion Lunes Exclusiva",
        },
        {
          dayOfWeek: "TUESDAY",
          date: "2026-08-25",
          activities: [
            {
              activityId: "act-ind-tue",
              category: "C",
              objective: "Obj Martes Actividad",
              description: "Descripcion Martes Exclusiva",
              durationMinutes: 35,
              materials: ["Cajas de carton Martes"],
              curricularTraceability: [],
            },
          ],
          complementaryActivities: [
            {
              programArea: "Musica",
              activityName: "Canciones Martes",
              purpose: "Ritmo Martes",
              description: "Canto Martes",
              sourceReference: "Programa Musica Martes",
            },
          ],
          materials: ["Cajas de carton Martes"],
          executionNotes: "",
          evaluation: "Evaluacion Martes Exclusiva",
        },
        {
          dayOfWeek: "WEDNESDAY",
          date: "2026-08-26",
          activities: [
            {
              activityId: "act-ind-wed",
              category: "C",
              objective: "Obj Miercoles Actividad",
              description: "Descripcion Miercoles Exclusiva",
              durationMinutes: 25,
              materials: ["Telas Miercoles"],
              curricularTraceability: [],
            },
          ],
          complementaryActivities: [],
          materials: ["Telas Miercoles"],
          executionNotes: "",
          evaluation: "Evaluacion Miercoles Exclusiva",
        },
        {
          dayOfWeek: "THURSDAY",
          date: "2026-08-27",
          activities: [
            {
              activityId: "act-ind-thu",
              category: "C",
              objective: "Obj Jueves Actividad",
              description: "Descripcion Jueves Exclusiva",
              durationMinutes: 40,
              materials: ["Instrumentos Jueves"],
              curricularTraceability: [],
            },
          ],
          complementaryActivities: [],
          materials: ["Instrumentos Jueves"],
          executionNotes: "",
          evaluation: "Evaluacion Jueves Exclusiva",
        },
        {
          dayOfWeek: "FRIDAY",
          date: "2026-08-28",
          activities: [
            {
              activityId: "act-ind-fri",
              category: "C",
              objective: "Obj Viernes Actividad",
              description: "Descripcion Viernes Exclusiva",
              durationMinutes: 30,
              materials: ["Aros Viernes"],
              curricularTraceability: [],
            },
          ],
          complementaryActivities: [
            {
              programArea: "Movimiento",
              activityName: "Circuitos Viernes",
              purpose: "Motricidad Viernes",
              description: "Juego Viernes",
              sourceReference: "Programa Motricidad Viernes",
            },
          ],
          materials: ["Aros Viernes"],
          executionNotes: "",
          evaluation: "Evaluacion Viernes Exclusiva",
        },
      ] as any
    );
    plan.status = "APPROVED_FOR_EXECUTION";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repository.save(plan);
    return plan;
  };

  const openIndirectOfficialView = async () => {
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

  it("1. Page Count & Geometry Contract: exactly 5 daily pairs = 10 physical Letter pages (5 Anversos + 5 Reversos) with 15mm padding and @page margin 0", async () => {
    await createApprovedIndirectPlan();
    await openIndirectOfficialView();

    const anversoPages = screen.getAllByTestId("indirect-anverso-page");
    const reversoPages = screen.getAllByTestId("indirect-reverso-page");

    // Exactly 5 Anversos and 5 Reversos = 10 pages
    expect(anversoPages.length).toBe(5);
    expect(reversoPages.length).toBe(5);

    // CSS print contract
    const styleTags = Array.from(document.querySelectorAll("style"));
    const printStyleTag = styleTags.find((st) => (st.textContent || "").includes("@page"));
    expect(printStyleTag).toBeDefined();
    const styleContent = printStyleTag!.textContent || "";

    expect(styleContent).toMatch(/@page\s*\{\s*size:\s*letter;\s*margin:\s*0;\s*\}/);
    expect(styleContent).toContain(".indirect-anverso-page,");
    expect(styleContent).toContain(".indirect-reverso-page");
    expect(styleContent).toContain("width: 215.9mm !important;");
    expect(styleContent).toContain("min-height: 279.4mm !important;");
    expect(styleContent).toContain("height: 279.4mm !important;");
    expect(styleContent).toContain("padding: 15mm !important;");
    expect(styleContent).toContain("break-after: page;");
  });

  it("2. Pair Order Contract: DOM order strictly alternates Monday Anverso -> Monday Reverso -> ... -> Friday Reverso", async () => {
    await createApprovedIndirectPlan();
    await openIndirectOfficialView();

    const dailyDocs = [
      screen.getByTestId("indirect-day-MONDAY"),
      screen.getByTestId("indirect-day-TUESDAY"),
      screen.getByTestId("indirect-day-WEDNESDAY"),
      screen.getByTestId("indirect-day-THURSDAY"),
      screen.getByTestId("indirect-day-FRIDAY"),
    ];

    // Verify day progression in DOM
    for (let i = 0; i < dailyDocs.length - 1; i++) {
      expect(dailyDocs[i].compareDocumentPosition(dailyDocs[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    // Inside each day, Anverso strictly precedes Reverso
    for (const doc of dailyDocs) {
      const anv = within(doc).getByTestId("indirect-anverso-page");
      const rev = within(doc).getByTestId("indirect-reverso-page");
      expect(anv.compareDocumentPosition(rev) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("3. Day & Reverso Content Isolation: each day's Anverso & Reverso contains ONLY that day's activities, evaluations, materials, and complementaries", async () => {
    await createApprovedIndirectPlan();
    await openIndirectOfficialView();

    // Monday
    const monDoc = screen.getByTestId("indirect-day-MONDAY");
    const monAnv = within(monDoc).getByTestId("indirect-anverso-page");
    const monRev = within(monDoc).getByTestId("indirect-reverso-page");

    expect(within(monAnv).getByText("Obj Lunes Actividad")).toBeDefined();
    expect(within(monAnv).getByText("Descripcion Lunes Exclusiva")).toBeDefined();
    expect(within(monAnv).queryByText("Descripcion Martes Exclusiva")).toBeNull();
    expect(within(monRev).getByText("Evaluacion Lunes Exclusiva")).toBeDefined();
    expect(within(monRev).queryByText("Evaluacion Martes Exclusiva")).toBeNull();
    expect(within(monRev).getByText("Pelotas de esponja Lunes")).toBeDefined();
    expect(within(monRev).queryByText("Cajas de carton Martes")).toBeNull();
    expect(within(monRev).getByText(/Cuentos Lunes/i)).toBeDefined();
    expect(within(monRev).queryByText(/Canciones Martes/i)).toBeNull();

    // Tuesday
    const tueDoc = screen.getByTestId("indirect-day-TUESDAY");
    const tueAnv = within(tueDoc).getByTestId("indirect-anverso-page");
    const tueRev = within(tueDoc).getByTestId("indirect-reverso-page");

    expect(within(tueAnv).getByText("Obj Martes Actividad")).toBeDefined();
    expect(within(tueAnv).getByText("Descripcion Martes Exclusiva")).toBeDefined();
    expect(within(tueAnv).queryByText("Descripcion Lunes Exclusiva")).toBeNull();
    expect(within(tueRev).getByText("Evaluacion Martes Exclusiva")).toBeDefined();
    expect(within(tueRev).queryByText("Evaluacion Lunes Exclusiva")).toBeNull();
    expect(within(tueRev).getByText("Cajas de carton Martes")).toBeDefined();
    expect(within(tueRev).queryByText("Pelotas de esponja Lunes")).toBeNull();

    // Wednesday (empty complementary test)
    const wedDoc = screen.getByTestId("indirect-day-WEDNESDAY");
    const wedRev = within(wedDoc).getByTestId("indirect-reverso-page");
    expect(within(wedRev).getByText("Sin actividad complementaria registrada para este día.")).toBeDefined();

    // Friday
    const friDoc = screen.getByTestId("indirect-day-FRIDAY");
    const friAnv = within(friDoc).getByTestId("indirect-anverso-page");
    const friRev = within(friDoc).getByTestId("indirect-reverso-page");

    expect(within(friAnv).getByText("Obj Viernes Actividad")).toBeDefined();
    expect(within(friAnv).getByText("Descripcion Viernes Exclusiva")).toBeDefined();
    expect(within(friRev).getByText("Evaluacion Viernes Exclusiva")).toBeDefined();
    expect(within(friRev).getByText("Aros Viernes")).toBeDefined();
    expect(within(friRev).getByText(/Circuitos Viernes/i)).toBeDefined();
  });

  it("4. Visual Structure Preservation: every daily Anverso & Reverso preserves official layout, 8 Referentes, section bars, and signatures", async () => {
    await createApprovedIndirectPlan();
    await openIndirectOfficialView();

    const anversoPages = screen.getAllByTestId("indirect-anverso-page");
    const reversoPages = screen.getAllByTestId("indirect-reverso-page");

    for (const anv of anversoPages) {
      expect(within(anv).getByText("Planeación de Acciones Pedagógicas")).toBeDefined();
      expect(within(anv).getByText("(Anverso)")).toBeDefined();
      expect(within(anv).getByTestId("indirect-ident-field-guarderia")).toBeDefined();
      expect(within(anv).getByTestId("indirect-ident-field-sala")).toBeDefined();
      expect(within(anv).getByTestId("indirect-ident-field-periodo")).toBeDefined();
      expect(within(anv).getByText("24 al 28 de agosto de 2026")).toBeDefined();

      // 8 Referentes present on every Anverso
      const refBox = within(anv).getByTestId("indirect-referentes-curriculares");
      expect(within(refBox).getByText(/Establecer vínculos afectivos y apegos seguros/i)).toBeDefined();
      expect(within(refBox).getByText(/Construir una base de seguridad y confianza/i)).toBeDefined();
      expect(within(refBox).getByText(/Desarrollar autonomía y autorregulación/i)).toBeDefined();
      expect(within(refBox).getByText(/Desarrollar la curiosidad, la exploración/i)).toBeDefined();
      expect(within(refBox).getByText(/Acceder al lenguaje en un sentido pleno/i)).toBeDefined();
      expect(within(refBox).getByText(/Descubrir en los libros y la lectura/i)).toBeDefined();
      expect(within(refBox).getByText(/Descubrir el propio cuerpo desde la libertad/i)).toBeDefined();
      expect(within(refBox).getByText(/Convivir con otros y compartir el aprendizaje/i)).toBeDefined();

      expect(within(anv).getByTestId("indirect-planeacion-bar")).toBeDefined();
      expect(within(anv).getByTestId("indirect-formatting-notice")).toBeDefined();
      expect(within(anv).getByTestId("indirect-anverso-code")).toBeDefined();
      expect(within(anv).getByTestId("indirect-legal-note")).toBeDefined();
    }

    for (const rev of reversoPages) {
      expect(within(rev).getByText("Planeación de Acciones Pedagógicas")).toBeDefined();
      expect(within(rev).getByText("(Reverso)")).toBeDefined();
      expect(within(rev).getByTestId("indirect-reverso-planeacion-continua")).toBeDefined();
      expect(within(rev).getByTestId("indirect-section-evaluacion")).toBeDefined();
      expect(within(rev).getByTestId("indirect-section-complementarias")).toBeDefined();
      expect(within(rev).getByTestId("indirect-section-materiales")).toBeDefined();
      expect(within(rev).getByTestId("indirect-section-firmas")).toBeDefined();
      expect(within(rev).getByText("Educadora/Coordinadora del área para apoyo terapéutico")).toBeDefined();
      expect(within(rev).getByText("Asistente educativa")).toBeDefined();
    }
  });

  it("5. Negative Invariant Gates: NO status badges, NO DIRECT PDA matrix, NO Oficial de Puericultura", async () => {
    await createApprovedIndirectPlan();
    await openIndirectOfficialView();

    const root = document.getElementById("printable-document-root")!;

    expect(within(root).queryByText("Aprobada")).toBeNull();
    expect(within(root).queryByText("Borrador")).toBeNull();
    expect(within(root).queryByText(/Campo Formativo/i)).toBeNull();
    expect(within(root).queryByText(/Procesos de Desarrollo de Aprendizaje/i)).toBeNull();
    expect(within(root).queryByText(/En la Planeación/i)).toBeNull();
    expect(within(root).queryByText(/TUTORIA-PDA-/i)).toBeNull();
    expect(within(root).queryByText(/Oficial de Puericultura/i)).toBeNull();
    expect(within(root).queryByText(/Materiales requeridos para las Actividades Pedagógicas/i)).toBeNull();
  });
});
