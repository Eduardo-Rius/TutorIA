import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";

describe("H1R9-G.3.3: Anita Explicit Day-by-Day Human Review UI", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const renderApp = async (service: PlanningWorkflowService, source: DeterministicPedagogicalRecommendationSource) => {
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Anita"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("✨ Comenzar nuestra semana"));
    });
  };

  it("1-4. Proposal starts 0/5 PENDIENTE; opening and navigating does NOT review; no Guardar Día", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);

    // Enter context and generate week
    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    fireEvent.change(obsInput, { target: { value: "Interés de grupo" } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Generar Semana/i));
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // 1. Review progress is 0/5
    expect(screen.getByText(/0\/5 días revisados/i)).toBeDefined();

    // 2. No fake Guardar Día button
    expect(screen.queryByText("Guardar Día")).toBeNull();

    // 3. Status badge on day card shows Pendiente
    expect(screen.getByText("Pendiente de revisión")).toBeDefined();

    // 4. Free navigation across weekdays does NOT increment review progress
    const days = ["Lunes 24", "Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28"];
    for (const d of days) {
      await act(async () => {
        fireEvent.click(screen.getByRole("tab", { name: d }));
      });
      expect(screen.getByText(/0\/5 días revisados/i)).toBeDefined();
    }

    // Submit button is disabled at 0/5
    const submitBtn = screen.getByText("Enviar a Revisión").closest("button");
    expect(submitBtn).toHaveProperty("disabled", true);
  });

  it("5-8. Explicit ✓ Marcar día como revisado marks day, increments progress, enables submit only at 5/5", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);

    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    fireEvent.change(obsInput, { target: { value: "Interés de grupo" } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Generar Semana/i));
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // Navigate to Monday and mark reviewed
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i }));
    });

    const reviewBtn = screen.getByText("✓ Marcar día como revisado");
    expect(reviewBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(reviewBtn);
    });

    // Monday is now REVISADO, progress is 1/5
    expect(screen.getByText(/1\/5 días revisados/i)).toBeDefined();
    expect(screen.getByText(/Día revisado por Anita/i)).toBeDefined();

    // Submit is still disabled at 1/5
    expect(screen.getByText("Enviar a Revisión").closest("button")).toHaveProperty("disabled", true);

    // Review Tuesday, Wednesday, Thursday -> reaches 4/5
    const remainingToFour = ["Martes 25", "Miércoles 26", "Jueves 27"];
    for (const d of remainingToFour) {
      await act(async () => {
        fireEvent.click(screen.getByRole("tab", { name: d }));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("✓ Marcar día como revisado"));
      });
    }

    expect(screen.getByText(/4\/5 días revisados/i)).toBeDefined();
    expect(screen.getByText("Enviar a Revisión").closest("button")).toHaveProperty("disabled", true);

    // Review Friday -> reaches 5/5
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /Viernes 28/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("✓ Marcar día como revisado"));
    });

    expect(screen.getByText(/5\/5 días revisados/i)).toBeDefined();
    const finalSubmitBtn = screen.getByText("Enviar a Revisión").closest("button");
    expect(finalSubmitBtn).not.toHaveProperty("disabled", true);
  });

  it("9-11. Material edit drops progress from 5/5 to 4/5; submit becomes disabled; re-review restores 5/5 and allows submit", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);

    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    fireEvent.change(obsInput, { target: { value: "Interés de grupo" } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Generar Semana/i));
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // Review all 5 days
    const days = ["Lunes 24", "Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28"];
    for (const d of days) {
      await act(async () => {
        fireEvent.click(screen.getByRole("tab", { name: d }));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("✓ Marcar día como revisado"));
      });
    }

    expect(screen.getByText(/5\/5 días revisados/i)).toBeDefined();
    expect(screen.getByText("Enviar a Revisión").closest("button")).not.toHaveProperty("disabled", true);

    // Return to Monday and materially modify an activity
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i }));
    });

    const expandBtns = screen.getAllByText("Revisar / Editar");
    await act(async () => {
      fireEvent.click(expandBtns[0]!);
    });

    const actTextarea = screen.getByDisplayValue(/sonajas y cascabeles/i);
    await act(async () => {
      fireEvent.change(actTextarea, { target: { value: "Nueva descripción modificada por Anita" } });
    });

    // Monday drops to PENDIENTE, progress drops to 4/5
    expect(screen.getByText(/4\/5 días revisados/i)).toBeDefined();
    expect(screen.getByText("Pendiente de revisión")).toBeDefined();
    expect(screen.getByText("Enviar a Revisión").closest("button")).toHaveProperty("disabled", true);

    // Re-review Monday
    await act(async () => {
      fireEvent.click(screen.getByText("✓ Marcar día como revisado"));
    });

    // Progress returns to 5/5, submit enabled
    expect(screen.getByText(/5\/5 días revisados/i)).toBeDefined();
    const readySubmitBtn = screen.getByText("Enviar a Revisión").closest("button");
    expect(readySubmitBtn).not.toHaveProperty("disabled", true);

    // Final submit succeeds
    await act(async () => {
      fireEvent.click(readySubmitBtn!);
    });
    expect(screen.queryByText("En revisión por la Directora")).toBeDefined();
  });
});
