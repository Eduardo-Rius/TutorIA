import { describe, it, expect } from "vitest";
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';

describe("H1R9-A: Weekly Context & 5-Day Review Gate", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const renderApp = async (service: PlanningWorkflowService, source: DeterministicPedagogicalRecommendationSource, role: 'TEACHER'|'DIRECTOR' = 'TEACHER') => {
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} role={role} />);
    });
    await act(async () => {
      const anita = screen.getByText('Anita');
      fireEvent.click(anita);
    });
    await act(async () => {
      fireEvent.click(screen.getByText('✨ Comenzar nuestra semana'));
    });
  };

  it("1. Weekly context renders exactly once and does not repeat per weekday", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);

    const qs = screen.queryAllByText("1. ¿Qué observaste en el grupo?");
    expect(qs.length).toBe(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: "Martes 25" }));
    });
    const qsAfter = screen.queryAllByText("1. ¿Qué observaste en el grupo?");
    expect(qsAfter.length).toBe(1);
  });

  it("2. Single TutorIA generation populates 5 distinct days", async () => {
    const { service, source } = createTestDeps();
    const genSpy = vi.spyOn(source, 'generateRecommendation');
    await renderApp(service, source);

    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    fireEvent.change(obsInput, { target: { value: 'Interés en la música' } });

    await act(async () => {
      const genBtn = screen.getByText(/Generar Semana/i);
      fireEvent.click(genBtn);
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(genSpy).toHaveBeenCalledTimes(1);
    
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: "Lunes 24" }));
    });
    expect(screen.getByText("Explorar sonidos con instrumentos de percusión simples")).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: "Martes 25" }));
    });
    expect(screen.getByText("Experimentar texturas mediante la manipulación guiada")).toBeDefined();
    
    const tuesObj = screen.queryByText("Explorar sonidos con instrumentos de percusión simples");
    expect(tuesObj).toBeNull();
  });

  it("3. Review gating (0/5 to 5/5) and submission logic", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);

    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    fireEvent.change(obsInput, { target: { value: 'Interés' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Generar Semana/i));
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(screen.getByText("0/5 días revisados")).toBeDefined();
    expect(screen.getByText("Enviar a Revisión").closest('button')).toHaveProperty('disabled', true);

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: "Lunes 24" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Guardar Día"));
    });
    expect(screen.getByText("1/5 días revisados")).toBeDefined();
    expect(screen.getByText("Enviar a Revisión").closest('button')).toHaveProperty('disabled', true);

    const days = ["Martes 25", "Miércoles 26", "Jueves 27"];
    for (const d of days) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: d })); });
      await act(async () => { fireEvent.click(screen.getByText("Guardar Día")); });
    }

    expect(screen.getByText("4/5 días revisados")).toBeDefined();
    expect(screen.getByText("Enviar a Revisión").closest('button')).toHaveProperty('disabled', true);

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Viernes 28" })); });
    await act(async () => { fireEvent.click(screen.getByText("Guardar Día")); });

    expect(screen.getByText("5/5 días revisados")).toBeDefined();
    expect(screen.getByText("Enviar a Revisión").closest('button')).not.toHaveProperty('disabled', true);
    
    await act(async () => { fireEvent.click(screen.getByText("Enviar a Revisión")); });
    expect(screen.queryByText("En revisión por la Directora")).toBeDefined();
  });

  it("4. Domain submission rejects incomplete week", async () => {
    const { service } = createTestDeps();
    
    const plan = await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28', 'TEACHER');
    
    plan.days = [
      { date: '2026-08-24', dayOfWeek: 'MONDAY', activities: [{ activityId: '1', category: 'C', objective: 'O', description: 'D', materials: [], durationMinutes: 10, curricularTraceability: [] }], complementaryActivities: [], materials: [] },
      { date: '2026-08-25', dayOfWeek: 'TUESDAY', activities: [{ activityId: '2', category: 'C', objective: 'O', description: 'D', materials: [], durationMinutes: 10, curricularTraceability: [] }], complementaryActivities: [], materials: [] },
      { date: '2026-08-26', dayOfWeek: 'WEDNESDAY', activities: [{ activityId: '3', category: 'C', objective: 'O', description: 'D', materials: [], durationMinutes: 10, curricularTraceability: [] }], complementaryActivities: [], materials: [] },
      { date: '2026-08-27', dayOfWeek: 'THURSDAY', activities: [{ activityId: '4', category: 'C', objective: 'O', description: 'D', materials: [], durationMinutes: 10, curricularTraceability: [] }], complementaryActivities: [], materials: [] },
      { date: '2026-08-28', dayOfWeek: 'FRIDAY', activities: [], complementaryActivities: [], materials: [] }
    ];
    
    let errorMsg = '';
    try {
      plan.submit();
    } catch (e: any) {
      errorMsg = e.message;
    }
    expect(errorMsg).toContain("All 5 days must contain activities");
  });
});
