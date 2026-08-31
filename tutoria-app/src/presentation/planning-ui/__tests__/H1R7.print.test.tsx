import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";

describe("H1R7.1: PRINT WINDOW INJECTION VERIFICATION", () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let originalOpen: any;

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
    originalOpen = window.open;
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it("Proves the native print window DOM is populated BEFORE print is called", async () => {
    const plan = WeeklyPlanning.create("plan-indirect", "dc-1", "rm-1", "t1", "2026-08-10", "2026-08-14");
    plan.editPedagogicalContent("Obs INDIRECT", "needs", "sit", "mat", ["ref1"], [
        { dayOfWeek: "MONDAY", date: "2026-08-10", activities: [{ activityId: "act1", category: "C", objective: "Obj INDIRECT MONDAY", description: "Desc", durationMinutes: 30, materials: ["Mat"], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: "", evaluation: "" },
        { dayOfWeek: "TUESDAY", date: "2026-08-11", activities: [{ activityId: 'dummy', description: 'dummy', evaluation: '', materials: [] }], complementaryActivities: [], materials: [], executionNotes: "", evaluation: "" },
        { dayOfWeek: "WEDNESDAY", date: "2026-08-12", activities: [{ activityId: 'dummy', description: 'dummy', evaluation: '', materials: [] }], complementaryActivities: [], materials: [], executionNotes: "", evaluation: "" },
        { dayOfWeek: "THURSDAY", date: "2026-08-13", activities: [{ activityId: 'dummy', description: 'dummy', evaluation: '', materials: [] }], complementaryActivities: [], materials: [], executionNotes: "", evaluation: "" },
        { dayOfWeek: "FRIDAY", date: "2026-08-14", activities: [{ activityId: 'dummy', description: 'dummy', evaluation: '', materials: [] }], complementaryActivities: [], materials: [], executionNotes: "", evaluation: "" }
    ] as any);
    plan.submit();
    await repository.save(plan);

    render(<PlanningDemoApp service={service} source={new DeterministicPedagogicalRecommendationSource()} />);

    // Switch to INDIRECT Modality
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "INDIRECT" } });

    // Director login -> Approve -> Open Official
    fireEvent.click(screen.getByText("Ceci (Directora)"));
    await waitFor(() => expect(screen.getByText("Lista para conversar")).toBeTruthy());
    fireEvent.click(screen.getByText("Lista para conversar"));
    await waitFor(() => expect(screen.getByRole("tab", { name: /Lunes 24/i })).toBeTruthy());
    const daysToReview = ["Lunes 24", "Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28"];
    for (const d of daysToReview) {
      fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") }));
      if (screen.queryByText("Marcar día revisado")) {
        fireEvent.click(screen.getByText("Marcar día revisado"));
      }
    }


    await waitFor(() => expect(screen.getByText("✓ APROBAR TODA LA PLANEACIÓN")).toBeTruthy());
    fireEvent.click(screen.getByText("✓ APROBAR TODA LA PLANEACIÓN"));
    await waitFor(() => expect(screen.getByText("Versión Oficial IMSS")).toBeTruthy());
    fireEvent.click(screen.getByText("Versión Oficial IMSS"));
    await waitFor(() => expect(screen.queryAllByText(/Planeación de Acciones Pedagógicas/i).length).toBeGreaterThan(0));

    // MOCK window.open and its returned window
    let writtenHTML = "";
    let printCalled = false;
    let closeCalled = false;

    const mockPrintWindow = {
        document: {
            write: vi.fn((content) => { writtenHTML += content; }),
            close: vi.fn()
        },
        focus: vi.fn(),
        print: vi.fn(() => { printCalled = true; }),
        close: vi.fn(() => { closeCalled = true; })
    };

    window.open = vi.fn(() => mockPrintWindow as any);

    // CLICK PRINT
    const printButtons = screen.getAllByText("Imprimir PDF");
    fireEvent.click(printButtons[0]!);

    // Fast-forward setTimeout manually or just wait
    await new Promise(r => setTimeout(r, 1100));

    expect(window.open).toHaveBeenCalled();
    expect(mockPrintWindow.document.write).toHaveBeenCalled();

    // Assert HTML was populated BEFORE print
    expect(writtenHTML).toContain("Planeación de Acciones Pedagógicas");
    expect(writtenHTML).toContain("DPES/CG/2020/PDG/04");
    expect(writtenHTML).toContain("(Anverso)");
    expect(writtenHTML).toContain("(Reverso)");
    expect(writtenHTML.includes("body class=\"bg-white\"")).toBe(true);

    // Assert print was called AFTER injection
    expect(printCalled).toBe(true);

    // Assert onafterprint exists and handles closing safely
    expect(closeCalled).toBe(false);
    if ((mockPrintWindow as any).onafterprint) {
       (mockPrintWindow as any).onafterprint();
       expect(closeCalled).toBe(true);
    }
  });
});