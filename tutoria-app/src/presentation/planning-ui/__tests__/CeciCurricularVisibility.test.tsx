import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent, act, waitFor, within } from "@testing-library/react";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { DIRECT_PDA_CATALOG } from "../../../domain/planning/DirectCurricularCatalog";

describe("Ceci Curricular Visibility (H1R9-F.5.3.10)", () => {
  const createDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  it("proves complete real-path workflow: Anita creates, selects PDAs, submits -> Ceci opens same planningId -> sees reviewed PDAs read-only with zero edit controls", async () => {
    const { repo, service, source } = createDeps();

    // 1. Mount full PlanningDemoApp
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    // 2. Anita starts planning and generates week
    await act(async () => {
      fireEvent.click(screen.getByText("Anita"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Los niños muestran interés/i), {
        target: { value: "Contexto semanal para revisión institucional" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/✨ Ayúdame con TutorIA/i));
    });

    await waitFor(() => {
      expect(screen.getAllByText("Revisar / Editar").length).toBeGreaterThan(0);
    });

    // 3. Anita selects PDA on Monday
    const mondayRevBtns = screen.getAllByText("Revisar / Editar");
    await act(async () => {
      fireEvent.click(mondayRevBtns[0]!); // Monday first activity
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Seleccionar del catálogo/i }));
    });

    const pda1 = DIRECT_PDA_CATALOG[0]!;
    await act(async () => {
      fireEvent.click(screen.getByLabelText(new RegExp(`Seleccionar PDA: ${pda1.pda}`, "i")));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Listo"));
    });

    // 4. Anita reviews each of the 5 days to enable submit
    for (let i = 0; i < 5; i++) {
      const saveBtn = screen.getByText("Guardar Día");
      await act(async () => {
        fireEvent.click(saveBtn);
      });
    }

    // 5. Submit planning to Director (Ceci)
    const submitBtn = screen.getByRole("button", { name: /Enviar a Revisión/i });
    expect(submitBtn).not.toHaveProperty("disabled", true);

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // 6. Verify in repo that planning status is IN_REVIEW
    const plansInReview = await service.listDirectorReviewQueue("DIRECTOR");
    expect(plansInReview.length).toBe(1);
    const planId = plansInReview[0]!.planningId;
    expect(plansInReview[0]!.status).toBe("IN_REVIEW");
    expect(plansInReview[0]!.days[0]!.activities[0]!.curricularTraceability).toEqual([
      { pdaId: pda1.id, catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" },
    ]);

    // 7. Switch persona to Ceci
    await act(async () => {
      const ceciBtn = screen.getByText("Ceci (Directora)");
      fireEvent.click(ceciBtn);
    });

    // 8. Ceci sees the plan in her review list and clicks it
    await waitFor(() => {
      expect(screen.getByText("Lista para conversar")).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Lista para conversar"));
    });

    // 9. Ceci is in DirectorReview for the SAME planId
    await waitFor(() => {
      expect(screen.getByText("Lactantes C")).toBeDefined();
    });

    // 10. Ceci reviews Monday activity
    const ceciRevBtns = screen.getAllByText("Revisar");
    expect(ceciRevBtns.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(ceciRevBtns[0]!); // Expand Monday first activity
    });

    // 11. Assertions on Ceci view:
    // a) Elementos curriculares heading is visible
    expect(screen.getByRole("heading", { name: /Elementos curriculares/i })).toBeDefined();

    // b) Stored PDA is visible with institutional details
    const selectedPdaCard = screen.getByTestId(`selected-pda-${pda1.id}`);
    expect(within(selectedPdaCard).getByText(pda1.campoFormativo)).toBeDefined();
    expect(within(selectedPdaCard).getByText(new RegExp(pda1.contenido.trim(), "i"))).toBeDefined();
    expect(within(selectedPdaCard).getByText(pda1.pda)).toBeDefined();

    // c) NO edit/add/remove/clear controls are visible to Ceci
    expect(screen.queryByRole("button", { name: /Seleccionar del catálogo/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Limpiar todo/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Eliminar elemento curricular/i })).toBeNull();
  });

  it("shows empty state 'Sin elementos curriculares seleccionados.' to Ceci when activity has no PDAs", async () => {
    const { service, source } = createDeps();

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    // Anita generates week without adding PDAs and submits
    await act(async () => {
      fireEvent.click(screen.getByText("Anita"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Los niños muestran interés/i), {
        target: { value: "Contexto vacío" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/✨ Ayúdame con TutorIA/i));
    });

    await waitFor(() => {
      expect(screen.getAllByText("Revisar / Editar").length).toBeGreaterThan(0);
    });

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        fireEvent.click(screen.getByText("Guardar Día"));
      });
    }

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enviar a Revisión/i }));
    });

    // Switch to Ceci
    await act(async () => {
      fireEvent.click(screen.getByText("Ceci (Directora)"));
    });

    await waitFor(() => {
      expect(screen.getByText("Lista para conversar")).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Lista para conversar"));
    });

    const ceciRevBtns = screen.getAllByText("Revisar");
    await act(async () => {
      fireEvent.click(ceciRevBtns[0]!);
    });

    expect(screen.getByRole("heading", { name: /Elementos curriculares/i })).toBeDefined();
    expect(screen.getByText("Sin elementos curriculares seleccionados.")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Seleccionar del catálogo/i })).toBeNull();
  });

  it("proves multiple distinct PDAs are all visible to Ceci in read-only mode", async () => {
    const { repo, service, source } = createDeps();

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Anita"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Los niños muestran interés/i), {
        target: { value: "Multi-PDA test" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/✨ Ayúdame con TutorIA/i));
    });

    await waitFor(() => {
      expect(screen.getAllByText("Revisar / Editar").length).toBeGreaterThan(0);
    });

    // Select 2 PDAs on Monday first activity
    const mondayRevBtns = screen.getAllByText("Revisar / Editar");
    await act(async () => {
      fireEvent.click(mondayRevBtns[0]!);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Seleccionar del catálogo/i }));
    });

    const pda1 = DIRECT_PDA_CATALOG[0]!;
    const pda2 = DIRECT_PDA_CATALOG[1]!;

    await act(async () => {
      fireEvent.click(screen.getByLabelText(new RegExp(`Seleccionar PDA: ${pda1.pda}`, "i")));
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText(new RegExp(`Seleccionar PDA: ${pda2.pda}`, "i")));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Listo"));
    });

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        fireEvent.click(screen.getByText("Guardar Día"));
      });
    }

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enviar a Revisión/i }));
    });

    // Switch to Ceci
    await act(async () => {
      fireEvent.click(screen.getByText("Ceci (Directora)"));
    });

    await waitFor(() => {
      expect(screen.getByText("Lista para conversar")).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Lista para conversar"));
    });

    const ceciRevBtns = screen.getAllByText("Revisar");
    await act(async () => {
      fireEvent.click(ceciRevBtns[0]!);
    });

    expect(screen.getByTestId(`selected-pda-${pda1.id}`)).toBeDefined();
    expect(screen.getByTestId(`selected-pda-${pda2.id}`)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Seleccionar del catálogo/i })).toBeNull();
  });
});
