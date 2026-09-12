import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";
import { DIRECT_PDA_CATALOG } from "../../../domain/planning/DirectCurricularCatalog";

describe("Direct Safe Print Pagination & Official Fidelity (H1R9-F.5.3.14.5)", () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let source: DeterministicPedagogicalRecommendationSource;

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
    source = new DeterministicPedagogicalRecommendationSource();
  });

  const createBaseApprovedPlan = async (planningId = "plan-safe-print-test") => {
    const plan = WeeklyPlanning.create(
      planningId,
      "d1",
      "lactantes-c",
      "t1",
      "2026-08-24",
      "2026-08-28"
    );
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.observations = "Obs";
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
    return { plan, pda1, pda28 };
  };

  it("1. Explicit physical page styles: @page margin 0, width 215.9mm, height 279.4mm, padding 15mm on all sheets", async () => {
    await createBaseApprovedPlan();

    const { container } = render(<PlanningDemoApp service={service} source={source} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Ceci (Directora)"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Anita"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Versión Oficial IMSS"));
    });

    // Inspect print <style>
    const styleTags = Array.from(container.querySelectorAll("style"));
    const printStyleTag = styleTags.find((st) => (st.textContent || "").includes("@page"));
    expect(printStyleTag).toBeDefined();
    const styleContent = printStyleTag!.textContent || "";

    // 1. @page has size: letter and margin: 0
    expect(styleContent).toMatch(/@page\s*\{\s*size:\s*letter;\s*margin:\s*0;\s*\}/);

    // 2. .direct-anverso-page, .direct-reverso-page have width: 215.9mm, min-height: 279.4mm, padding: 15mm
    expect(styleContent).toContain(".direct-anverso-page,");
    expect(styleContent).toContain(".direct-reverso-page");
    expect(styleContent).toContain("width: 215.9mm !important;");
    expect(styleContent).toContain("min-height: 279.4mm !important;");
    expect(styleContent).toContain("padding: 15mm !important;");
    expect(styleContent).toContain("break-after: page;");
  });

  it("2. Official Header Field Stack: Guardería, Sala, and Periodo exist vertically on their own lines, NOT in a shared flex/grid row", async () => {
    await createBaseApprovedPlan();

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

    const mondayAnverso = screen.getByTestId("direct-anverso-MONDAY-p1");

    // 1. Each field exists by its dedicated test id
    const fieldGuarderia = within(mondayAnverso).getByTestId("direct-ident-field-guarderia");
    const fieldSala = within(mondayAnverso).getByTestId("direct-ident-field-sala");
    const fieldPeriodo = within(mondayAnverso).getByTestId("direct-ident-field-periodo");

    expect(within(fieldGuarderia).getByText("Guardería No.:")).toBeDefined();
    expect(within(fieldGuarderia).getByText("Guardería IMSS Demo (001)")).toBeDefined();

    expect(within(fieldSala).getByText("Sala de atención o Grupo:")).toBeDefined();
    expect(within(fieldSala).getByText("Lactantes C")).toBeDefined();

    expect(within(fieldPeriodo).getByText("Periodo:")).toBeDefined();
    expect(within(fieldPeriodo).getByText(/24 al 28 de agosto de 2026/)).toBeDefined();

    // 2. Structural verification: The fields are direct children of a vertical stack container
    const stackContainer = fieldGuarderia.parentElement;
    expect(stackContainer).toBeDefined();
    expect(stackContainer).toBe(fieldSala.parentElement);
    expect(stackContainer).toBe(fieldPeriodo.parentElement);

    // 3. Prove they are NOT rendered in a shared horizontal flex or grid row
    const stackClass = stackContainer!.className;
    expect(stackClass).not.toContain("grid-cols-");
    expect(stackClass).not.toContain("flex-row");
    expect(stackClass).toContain("space-y-");

    // 4. Vertical stacking order in DOM
    expect(fieldGuarderia.compareDocumentPosition(fieldSala) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fieldSala.compareDocumentPosition(fieldPeriodo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("3. Authoritative Section Order & Normal Single-Page Anverso: renders on ONE .direct-anverso-page with ZERO continuation pages and all sections preserved", async () => {
    await createBaseApprovedPlan();

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

    // 1. For normal demo planning: Monday Anverso renders as ONE page
    const page1 = screen.getByTestId("direct-anverso-MONDAY-p1");
    expect(page1).toBeDefined();
    expect(page1.className).toContain("direct-anverso-page");

    // 2. Proves NO continuation page (-p2) is created for this normal case
    expect(screen.queryByTestId("direct-anverso-MONDAY-p2")).toBeNull();

    // 3. All official sections exist on this single page in exact authoritative order
    const secHeader = within(page1).getByTestId("section-header");
    const secObs = within(page1).getByTestId("section-observaciones");
    const secActHeading = within(page1).getByTestId("section-actividades-heading");
    const secEval = within(page1).getByTestId("section-evaluacion");
    const secComp = within(page1).getByTestId("section-complementarias");
    const secMat = within(page1).getByTestId("section-materiales");
    const secPrac = within(page1).getByTestId("section-practicas");
    const secSigs = within(page1).getByTestId("section-firmas");
    const secFoot = within(page1).getByTestId("section-footer-note");

    // Document position assertions proving exact sequential order:
    // Header -> Observaciones -> Actividades -> Evaluación -> Complementarias -> Materiales -> Prácticas -> Firmas -> Footer
    expect(secHeader.compareDocumentPosition(secObs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(secObs.compareDocumentPosition(secActHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(secActHeading.compareDocumentPosition(secEval) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(secEval.compareDocumentPosition(secComp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(secComp.compareDocumentPosition(secMat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(secMat.compareDocumentPosition(secPrac) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(secPrac.compareDocumentPosition(secSigs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(secSigs.compareDocumentPosition(secFoot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("4. DIRECT Reverso Canonical 19/21 Split preserved: exactly 19 PDA on Page 1, exactly 21 PDA on Page 2", async () => {
    const { pda1, pda28 } = await createBaseApprovedPlan();

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

    const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

    for (const d of weekdays) {
      const p1 = screen.getByTestId(`direct-reverso-${d}-p1`);
      const p2 = screen.getByTestId(`direct-reverso-${d}-p2`);
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();

      // Page 1 header has (Reverso)
      expect(within(p1).getByText(/\(Reverso\)/i)).toBeDefined();

      // Page 2 header has (Reverso — continuación)
      expect(within(p2).getByText(/\(Reverso — continuación\)/i)).toBeDefined();

      // Page 1 table has exactly 19 canonical rows (Lenguajes 11 + Saberes 8)
      const p1Rows = p1.querySelectorAll("tbody tr");
      expect(p1Rows.length).toBe(19);

      // Page 2 table has exactly 21 canonical rows (Ética 8 + De lo Humano 13)
      const p2Rows = p2.querySelectorAll("tbody tr");
      expect(p2Rows.length).toBe(21);
    }

    // Verify Monday marks on Page 1 and Page 2
    const monP1 = screen.getByTestId("direct-reverso-MONDAY-p1");
    const monP2 = screen.getByTestId("direct-reverso-MONDAY-p2");

    // PDA-0001 (Lenguajes) is marked on Page 1
    const pda1Mark = within(monP1).getByTestId(`pda-mark-${pda1.id}`);
    expect(pda1Mark.textContent).toBe("✓");

    // PDA-0028 (De lo Humano) is marked on Page 2
    const pda28Mark = within(monP2).getByTestId(`pda-mark-${pda28.id}`);
    expect(pda28Mark.textContent).toBe("✓");
  });

  it("5. Failure Safety Gate: measurement failure aborts print generation safely and displays exact error message without producing unsafe pages", async () => {
    await createBaseApprovedPlan();

    render(
      <PlanningDemoApp
        service={service}
        source={source}
        simulateMeasurementFailure={true}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Ceci (Directora)"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Anita"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Versión Oficial IMSS"));
    });

    // Error banner must be displayed with exact specified text
    const errorBanner = screen.getByTestId("print-measurement-error");
    expect(errorBanner).toBeDefined();
    expect(errorBanner.textContent).toContain(
      "No fue posible preparar la paginación segura del documento. Intenta generar nuevamente la versión de impresión."
    );

    // Unsafe printable document root must NOT be rendered
    expect(screen.queryByTestId("printable-document-root")).toBeNull();
    expect(screen.queryByTestId("direct-day-MONDAY")).toBeNull();
  });
});
