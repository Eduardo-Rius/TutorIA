import { describe, it, expect, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import React from "react";

describe("H1R7.4: TRUE WEEKLY TUTORIA GENERATION", () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;
  let source: DeterministicPedagogicalRecommendationSource;

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
    source = new DeterministicPedagogicalRecommendationSource();
  });

  const renderApp = () => render(
    <PlanningDemoApp
      service={service}
      source={source}
    />
  );

  it("generates distinct daily plans and preserves weekly context", async () => {
    renderApp();

    // 1. A. weekly context survives weekday navigation
    await waitFor(() => screen.getByText(/Comenzar nuestra semana/i));
    fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    
    await screen.findByText(/1. ¿Qué observaste en el grupo\?/i);
    const obsInputs = screen.getAllByRole("textbox");
    fireEvent.change(obsInputs[0]!, { target: { value: "Test context observation" } });

    // Navigate to Martes
    fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i }));
    const obsInputsTuesday = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
    expect(obsInputsTuesday[0]!.value).toBe("Test context observation");

    // 2. Generate FULL WEEK
        await act(async () => { fireEvent.click(screen.getByText("✨ Ayúdame con TutorIA (Generar Semana)")); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    await waitFor(() => {
      expect(screen.getByText(/Explorar sonidos/i)).toBeDefined();
    });

    // Save MONDAY
    fireEvent.click(screen.getByText("Guardar Día"));

    // Save TUESDAY
    fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i }));
    await waitFor(() => expect(screen.getByText(/Experimentar texturas/i)).toBeDefined());
    fireEvent.click(screen.getByText("Guardar Día"));

    // Save WEDNESDAY
    fireEvent.click(screen.getByRole("tab", { name: /Miércoles 26/i }));
    await waitFor(() => expect(screen.getByText(/Fomentar la expresión corporal/i)).toBeDefined());
    fireEvent.click(screen.getByText("Guardar Día"));

    // Save THURSDAY
    fireEvent.click(screen.getByRole("tab", { name: /Jueves 27/i }));
    await waitFor(() => expect(screen.getByText(/Favorecer la coordinación fina/i)).toBeDefined());
    fireEvent.click(screen.getByText("Guardar Día"));

    // Save FRIDAY
    fireEvent.click(screen.getByRole("tab", { name: /Viernes 28/i }));
    await waitFor(() => expect(screen.getByText(/Sensibilización visual/i)).toBeDefined());
    fireEvent.click(screen.getByText("Guardar Día"));

    // 7. Verify no overwriting happened
    fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i }));
    expect(screen.getByText(/Explorar sonidos/i)).toBeDefined();
    fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i }));
    expect(screen.getByText(/Experimentar texturas/i)).toBeDefined();
    
    // 8. Submit and Approve to view Official
    fireEvent.click(screen.getByText("Enviar a Revisión"));
    
    // Switch to Director
    fireEvent.click(screen.getByText("Ceci (Directora)"));
    await waitFor(() => expect(screen.getByText("Lista para conversar")).toBeDefined());
    fireEvent.click(screen.getByText("Lista para conversar"));
    await waitFor(() => expect(screen.getByRole("tab", { name: /Lunes 24/i })).toBeTruthy());
    const daysToReview = ["Lunes 24", "Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28"];
    for (const d of daysToReview) {
      fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") }));
      if (screen.queryByText("Marcar día revisado")) {
        fireEvent.click(screen.getByText("Marcar día revisado"));
      }
    }


    await waitFor(() => expect(screen.getByText("✓ APROBAR TODA LA PLANEACIÓN")).toBeDefined());
    fireEvent.click(screen.getByText("✓ APROBAR TODA LA PLANEACIÓN"));
    
    // Official view gets 5 distinct days

    await waitFor(() => {
      // console.log(document.body.innerHTML); 
      expect(screen.getByText(/Versión Oficial IMSS/i)).toBeDefined(); 
    }, { timeout: 3000 });
    fireEvent.click(screen.getByText(/Versión Oficial IMSS/i));
    await waitFor(() => {
      // console.log(document.body.innerHTML);
      const period = screen.getAllByText("24 al 28 de agosto de 2026");
      expect(period.length).toBeGreaterThan(0);
    });

    const m = screen.getAllByText(/LUNES/i);
    const t = screen.getAllByText(/MARTES/i);
    const w = screen.getAllByText(/MIÉRCOLES/i);
    const th = screen.getAllByText(/JUEVES/i);
    const f = screen.getAllByText(/VIERNES/i);

    expect(m.length).toBeGreaterThan(0);
    expect(t.length).toBeGreaterThan(0);
    expect(w.length).toBeGreaterThan(0);
    expect(th.length).toBeGreaterThan(0);
    expect(f.length).toBeGreaterThan(0);

    expect(screen.getByText(/Explorar sonidos con instrumentos/i)).toBeDefined();
    expect(screen.getByText(/Sensibilización visual con luces/i)).toBeDefined();
  });
});
