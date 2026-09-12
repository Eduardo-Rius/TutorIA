import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { DIRECT_PDA_CATALOG } from "../../../domain/planning/DirectCurricularCatalog";

describe("Anita Curricular UI Real-Path Integration (H1R9-F.5.3.9.2.4)", () => {
  const createDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  it("exercises Friday last activity selecting a PDA under De lo Humano y lo Comunitario with ZERO red errors", async () => {
    const { repo, service, source } = createDeps();

    // 1. Mount full PlanningDemoApp
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });

    // 2. Click Anita persona
    await act(async () => {
      const anitaBtn = screen.getByText("Anita");
      fireEvent.click(anitaBtn);
    });

    // 3. Click Comenzar nuestra semana
    await act(async () => {
      const startBtn = screen.getByText(/Comenzar nuestra semana/i);
      fireEvent.click(startBtn);
    });

    // 4. Fill observation context
    await act(async () => {
      const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
      fireEvent.change(obsInput, { target: { value: "Observaciones reales del grupo" } });
    });

    // 5. Click Ayúdame con TutorIA (Generar Semana)
    await act(async () => {
      const generateBtn = screen.getByText(/✨ Ayúdame con TutorIA/i);
      fireEvent.click(generateBtn);
    });

    // Wait for generation
    await waitFor(() => {
      expect(screen.getAllByText("Revisar / Editar").length).toBeGreaterThan(0);
    });

    // 6. Navigate to Friday tab (Viernes 28)
    await act(async () => {
      const fridayTab = screen.getByRole("tab", { name: /Viernes 28/i });
      fireEvent.click(fridayTab);
    });

    // 7. Click Revisar / Editar on the LAST activity of Friday (Pensamiento Matemático)
    const revBtns = screen.getAllByText("Revisar / Editar");
    expect(revBtns.length).toBe(5);

    await act(async () => {
      fireEvent.click(revBtns[4]!); // 5th activity on Friday
    });

    // 8. Open catalog picker
    const openCatalogBtn = screen.getByRole("button", { name: /Seleccionar del catálogo/i });
    await act(async () => {
      fireEvent.click(openCatalogBtn);
    });

    // 9. Switch to tab: "De lo Humano y lo Comunitario"
    const humanoTab = screen.getByRole("tab", { name: /De lo Humano y lo Comunitario/i });
    await act(async () => {
      fireEvent.click(humanoTab);
    });

    // 10. Select PDA TUTORIA-PDA-0028 under De lo Humano y lo Comunitario
    const pda28 = DIRECT_PDA_CATALOG.find((e) => e.id === "TUTORIA-PDA-0028")!;
    expect(pda28).toBeDefined();

    const checkbox = screen.getByLabelText(new RegExp(`Seleccionar PDA: ${pda28.pda}`, "i"));
    await act(async () => {
      fireEvent.click(checkbox);
    });

    // 11. Click Listo
    await act(async () => {
      fireEvent.click(screen.getByText("Listo"));
    });

    // 12. Assertions:
    // a) Selected card is visible
    expect(screen.getByText("De lo Humano y lo Comunitario")).toBeDefined();
    expect(screen.getByText(pda28.pda)).toBeDefined();

    // b) ZERO red error box
    expect(screen.queryByText(/repo is not defined/i)).toBeNull();
    expect(screen.queryByText(/Error al actualizar/i)).toBeNull();

    // c) Underlying repository state check
    const teacherPlans = await service.listTeacherPlanning("t1");
    expect(teacherPlans.length).toBe(1);
    const savedFriday = teacherPlans[0]!.days.find((d) => d.dayOfWeek === "FRIDAY");
    expect(savedFriday).toBeDefined();
    expect(savedFriday!.activities[4]!.curricularTraceability).toEqual([
      { pdaId: "TUTORIA-PDA-0028", catalogRevision: "TUTORIA-DIRECT-PDA-CATALOG-R1" },
    ]);
  });

  it("exercises Monday activity selection to verify multi-day safety", async () => {
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
        target: { value: "Observaciones del grupo" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/✨ Ayúdame con TutorIA/i));
    });

    await waitFor(() => {
      expect(screen.getAllByText("Revisar / Editar").length).toBeGreaterThan(0);
    });

    // Monday first activity
    const revBtns = screen.getAllByText("Revisar / Editar");
    await act(async () => {
      fireEvent.click(revBtns[0]!);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Seleccionar del catálogo/i }));
    });

    const firstEntry = DIRECT_PDA_CATALOG[0]!;
    const checkbox = screen.getByLabelText(new RegExp(`Seleccionar PDA: ${firstEntry.pda}`, "i"));

    await act(async () => {
      fireEvent.click(checkbox);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Listo"));
    });

    expect(screen.getByText(firstEntry.campoFormativo)).toBeDefined();
    expect(screen.getByText(firstEntry.pda)).toBeDefined();
    expect(screen.queryByText(/repo is not defined/i)).toBeNull();
    expect(screen.queryByText(/Error al actualizar/i)).toBeNull();
  });
});
