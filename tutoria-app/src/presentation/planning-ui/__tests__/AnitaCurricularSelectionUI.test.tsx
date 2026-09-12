import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CurricularSelectionControl } from "../CurricularSelectionControl";
import { WeeklyPlanning, PlanningDay } from "../../../domain/planning/WeeklyPlanning";
import {
  DIRECT_PDA_CATALOG,
  TUTORIA_DIRECT_PDA_CATALOG_REVISION,
} from "../../../domain/planning/DirectCurricularCatalog";

describe("Anita Curricular Selection UI (CurricularSelectionControl)", () => {
  const createTestPlan = (status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CLOSED" = "DRAFT") => {
    const days: PlanningDay[] = [
      {
        date: "2026-08-24",
        dayOfWeek: "MONDAY",
        activities: [
          {
            activityId: "act-1",
            category: "EXPERIENCIAS ARTÍSTICAS",
            objective: "Explorar texturas y colores",
            description: "Actividad sensorial con pintura dactilar.",
            materials: ["Pintura", "Papel"],
            durationMinutes: 20,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        materials: ["Pintura"],
      },
      {
        date: "2026-08-25",
        dayOfWeek: "TUESDAY",
        activities: [
          {
            activityId: "act-2",
            category: "AMBIENTES DE APRENDIZAJE",
            objective: "Construcción con bloques",
            description: "Torres y estructuras.",
            materials: ["Bloques"],
            durationMinutes: 25,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        materials: ["Bloques"],
      },
      {
        date: "2026-08-26",
        dayOfWeek: "WEDNESDAY",
        activities: [
          {
            activityId: "act-3",
            category: "ACTIVACIÓN FÍSICA",
            objective: "Gateo y obstáculos",
            description: "Circuito motor.",
            materials: ["Colchonetas"],
            durationMinutes: 20,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        materials: ["Colchonetas"],
      },
      {
        date: "2026-08-27",
        dayOfWeek: "THURSDAY",
        activities: [
          {
            activityId: "act-4",
            category: "LECTURA EN VOZ ALTA",
            objective: "Cuentos ilustrados",
            description: "Narración de cuento.",
            materials: ["Libro"],
            durationMinutes: 15,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        materials: ["Libro"],
      },
      {
        date: "2026-08-28",
        dayOfWeek: "FRIDAY",
        activities: [
          {
            activityId: "act-5",
            category: "PENSAMIENTO MATEMÁTICO",
            objective: "Clasificación por color",
            description: "Agrupar objetos.",
            materials: ["Fichas"],
            durationMinutes: 20,
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        materials: ["Fichas"],
      },
    ];

    return new WeeklyPlanning(
      "plan-ui-1",
      "dc-01",
      "room-01",
      "teacher-01",
      "2026-08-24",
      "2026-08-28",
      status === "APPROVED" ? "APPROVED_FOR_EXECUTION" : status,
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

  it("renders the section heading and empty state wording when no PDA is selected", () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
      />
    );

    expect(screen.getByRole('heading', { name: /Elementos curriculares/i })).toBeDefined();
    expect(
      screen.getByText("Sin elementos curriculares seleccionados.")
    ).toBeDefined();
  });

  it("allows opening the grouped catalog picker and displays Campos and Contenidos from DIRECT_PDA_CATALOG", () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;

    render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
      />
    );

    const openButton = screen.getByRole("button", {
      name: /Seleccionar del catálogo/i,
    });
    fireEvent.click(openButton);

    expect(
      screen.getByText(
        /Catálogo Oficial de Procesos de Desarrollo de Aprendizaje/i
      )
    ).toBeDefined();

    // Check that Campos are rendered as tabs
    expect(screen.getByRole("tab", { name: /Lenguajes/i })).toBeDefined();
    expect(
      screen.getByRole("tab", { name: /Saberes y Pensamiento Científico/i })
    ).toBeDefined();
    expect(
      screen.getByRole("tab", { name: /Ética, Naturaleza y Sociedades/i })
    ).toBeDefined();
    expect(
      screen.getByRole("tab", { name: /De lo Humano y lo Comunitario/i })
    ).toBeDefined();

    // Check first Contenido in Lenguajes
    const firstEntry = DIRECT_PDA_CATALOG[0]!;
    expect(screen.getByText(new RegExp(firstEntry.contenido.trim(), "i"))).toBeDefined();
  });

  it("allows selecting a PDA via checkbox, which calls domain operation and updates activity selection", () => {
    const plan = createTestPlan("DRAFT");
    const activity = plan.days[0]!.activities[0]!;
    const domainSpy = vi.spyOn(plan, "setActivityCurricularTraceability");
    const updateSpy = vi.fn();

    const { rerender } = render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        onUpdate={updateSpy}
      />
    );

    // Open catalog picker
    fireEvent.click(screen.getByRole("button", { name: /Seleccionar del catálogo/i }));

    const firstEntry = DIRECT_PDA_CATALOG[0]!;
    const checkbox = screen.getByLabelText(new RegExp(`Seleccionar PDA: ${firstEntry.pda}`, "i"));

    fireEvent.click(checkbox);

    expect(domainSpy).toHaveBeenCalledWith("MONDAY", "act-1", [
      { pdaId: firstEntry.id, catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
    ]);
    expect(updateSpy).toHaveBeenCalled();
    expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual([
      { pdaId: firstEntry.id, catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
    ]);

    // Rerender with updated activity to verify human readable display
    rerender(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        onUpdate={updateSpy}
      />
    );

    const selectedItem = screen.getByTestId(`selected-pda-${firstEntry.id}`);
    expect(within(selectedItem).getByText(firstEntry.campoFormativo)).toBeDefined();
    expect(within(selectedItem).getByText(new RegExp(firstEntry.contenido.trim(), 'i'))).toBeDefined();
    expect(within(selectedItem).getByText(firstEntry.pda)).toBeDefined();
  });

  it("allows selecting multiple distinct PDAs and removing one via the remove button", () => {
    const plan = createTestPlan("DRAFT");
    const firstEntry = DIRECT_PDA_CATALOG[0]!;
    const secondEntry = DIRECT_PDA_CATALOG[1]!;

    plan.days[0]!.activities[0]!.curricularTraceability = [
      { pdaId: firstEntry.id, catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      { pdaId: secondEntry.id, catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
    ];

    const updateSpy = vi.fn();
    render(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
        onUpdate={updateSpy}
      />
    );

    const item1 = screen.getByTestId(`selected-pda-${firstEntry.id}`);
    const item2 = screen.getByTestId(`selected-pda-${secondEntry.id}`);
    expect(within(item1).getByText(firstEntry.pda)).toBeDefined();
    expect(within(item2).getByText(secondEntry.pda)).toBeDefined();

    const removeBtn = within(item1).getByRole("button", {
      name: new RegExp(`Eliminar elemento curricular: ${firstEntry.pda}`, "i"),
    });
    fireEvent.click(removeBtn);

    expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual([
      { pdaId: secondEntry.id, catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
    ]);
  });

  it("allows clearing all selected PDAs with Limpiar todo button", () => {
    const plan = createTestPlan("DRAFT");
    const firstEntry = DIRECT_PDA_CATALOG[0]!;

    plan.days[0]!.activities[0]!.curricularTraceability = [
      { pdaId: firstEntry.id, catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
    ];

    render(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
      />
    );

    const clearBtn = screen.getByRole("button", {
      name: /Limpiar todos los elementos curriculares/i,
    });
    fireEvent.click(clearBtn);

    expect(plan.days[0]!.activities[0]!.curricularTraceability).toEqual([]);
  });

  it("renders read-only view without add/remove controls when readOnly is true (IN_REVIEW, APPROVED, CLOSED)", () => {
    const plan = createTestPlan("APPROVED");
    const firstEntry = DIRECT_PDA_CATALOG[0]!;
    plan.days[0]!.activities[0]!.curricularTraceability = [
      { pdaId: firstEntry.id, catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
    ];

    render(
      <CurricularSelectionControl
        activity={plan.days[0]!.activities[0]!}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={true}
      />
    );

    const item = screen.getByTestId(`selected-pda-${firstEntry.id}`);
    expect(within(item).getByText(firstEntry.pda)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Seleccionar del catálogo/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Eliminar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Limpiar todo/i })).toBeNull();
  });

  it("allows editing when status is REJECTED (correction round)", () => {
    const plan = createTestPlan("REJECTED");
    const activity = plan.days[0]!.activities[0]!;

    render(
      <CurricularSelectionControl
        activity={activity}
        dayIdentifier="MONDAY"
        planning={plan}
        readOnly={false}
      />
    );

    expect(screen.getByRole("button", { name: /Seleccionar del catálogo/i })).toBeDefined();
  });
});
