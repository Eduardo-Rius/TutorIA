import { describe, it, expect } from "vitest";
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';

describe("H1R9-B: Day-Level Review States & Context Lock", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const renderApp = async (service: PlanningWorkflowService, source: DeterministicPedagogicalRecommendationSource, role: 'TEACHER'|'DIRECTOR' = 'TEACHER', startNew: boolean = true) => {
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });
    await act(async () => {
      const anita = screen.getByText('Anita (Pedagoga)');
      if (role === 'TEACHER') {
         fireEvent.click(anita);
         if (startNew) fireEvent.click(screen.getByText('✨ Comenzar nuestra semana'));
      } else {
         const ceci = screen.getByText('Ceci (Directora)');
         fireEvent.click(ceci);
      }
    });
  };

  it("01-06. Weekly Context single instance, Auto-Lock, Unlock, No Regeneration", async () => {
    const { service, source } = createTestDeps();
    const genSpy = vi.spyOn(source, 'generateRecommendation');
    await renderApp(service, source, 'TEACHER');

    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    expect(obsInput).not.toHaveProperty('disabled', true);
    fireEvent.change(obsInput, { target: { value: 'Interés' } });

    await act(async () => { fireEvent.click(screen.getByText(/Generar Semana/i)); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    // 03 PASS - Context Auto-Lock
    expect(obsInput).toHaveProperty('disabled', true);

    // 04 PASS - Explicit Context Unlock
    const editBtn = screen.getByText(/Editar contexto semanal/i);
    await act(async () => { fireEvent.click(editBtn); });
    expect(obsInput).not.toHaveProperty('disabled', true);

    // 05 PASS - Context editing does NOT regenerate
    fireEvent.change(obsInput, { target: { value: 'Interés editado' } });
    expect(genSpy).toHaveBeenCalledTimes(1); // Still 1

    // 06 PASS - Context editing does NOT destroy human edits
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    expect(screen.getByText("Explorar sonidos con instrumentos de percusión simples")).toBeDefined();
  });

  it("07-11. Anita initial review state and 5/5 gate", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source, 'TEACHER');
    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    fireEvent.change(obsInput, { target: { value: 'Interés' } });
    await act(async () => { fireEvent.click(screen.getByText(/Generar Semana/i)); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    // 07 PASS
    expect(screen.getByText(/0\/5 días revisados/i)).toBeDefined();
    
    // 08 PASS & 09 PASS
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    await act(async () => { fireEvent.click(screen.getByText("Guardar Día")); });
    
    expect(screen.getByText(/1\/5 días revisados/i)).toBeDefined();
    const tabLunes = screen.getByRole("tab", { name: /✓ Lunes 24/i });
    expect(tabLunes.className).toContain("bg-green-100"); // active and reviewed

    // 10 PASS & 11 PASS
    const submitBtn = screen.getByText("Enviar a Revisión");
    expect(submitBtn.closest('button')).toHaveProperty('disabled', true);

    const days = ["Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28"];
    for (const d of days) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, 'i') })); });
      await act(async () => { fireEvent.click(screen.getByText("Guardar Día")); });
    }

    expect(screen.getByText(/5\/5 días revisados/i)).toBeDefined();
    console.log("Submit button disabled attribute:", submitBtn.closest('button')?.getAttribute('disabled'));
     const freshSubmitBtn = screen.getByText("Enviar a Revisión");
     console.log("Fresh Submit button property:", freshSubmitBtn.closest('button')?.disabled);
     console.log("Progress:", screen.getByText(/días revisados/i).textContent);
     expect(freshSubmitBtn.closest('button')).not.toHaveProperty('disabled', true);
  });

  it("12-18. Director independent review state and orange feedback", async () => {
    const { service, source } = createTestDeps();
    // Setup submitted plan
    const plan = await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28', 'TEACHER');
    const recs = await source.generateRecommendation(null as any, '', '', '', '');
    plan.days = recs;
    await (service as any).repository.save(plan);
    await service.submit('p1', 'TEACHER');

    await renderApp(service, source, 'DIRECTOR');
    await act(async () => { fireEvent.click(screen.getByText(/Lista para conversar/i)); });

    // 12 PASS & 13 PASS
    const tabLunes = screen.getByRole("tab", { name: /Lunes 24/i });
    expect(tabLunes.className).not.toContain("bg-green");
    expect(tabLunes.className).not.toContain("bg-orange");

    // 14 PASS & 15 PASS
    await act(async () => { fireEvent.click(screen.getByText(/Marcar día revisado/i)); });
    expect(screen.getByRole("tab", { name: /✓ Lunes 24/i }).className).toContain("bg-green");

    // 16 PASS & 17 PASS
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    await act(async () => { fireEvent.click(screen.getByText("Marcar día revisado")); }); // First make it green
    expect(screen.getByRole("tab", { name: /✓ Martes 25/i }).className).toContain("bg-green");

    await act(async () => { fireEvent.click(screen.getAllByText("Revisar")[0]!); });
    await act(async () => { 
      fireEvent.change(screen.getByPlaceholderText(/¿Qué sugerencia tienes sobre esta actividad\?/i), { target: { value: 'Feedback' } }); 
    });
    await act(async () => { fireEvent.click(screen.getByText("Guardar observación")); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    // Orange overrides green
    expect(screen.getByRole("tab", { name: /🟠 Martes 25/i }).className).toContain("bg-orange");
  });

  it("19-24. Correction round derivation, 5/5 removed, resubmission gate", async () => {
    const { service, source } = createTestDeps();
    const plan = await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2026-08-24', '2026-08-28', 'TEACHER');
    const recs = await source.generateRecommendation(null as any, '', '', '', '');
    plan.days = recs;
    await (service as any).repository.save(plan);
    await service.submit(plan.planningId, 'TEACHER');

    // Director Rejects
    await service.reject(plan.planningId, 'Adjust', 'Ceci', 'DIRECTOR', [
      { targetId: recs[0]!.activities[0]!.activityId, observation: 'Adjust Mon', originalContent: 'x', currentContent: 'x', status: 'PENDING_CORRECTION', reviewer: 'Ceci', timestamp: new Date() },
      { targetId: recs[3].activities[0].activityId, observation: 'Adjust Thu', originalContent: 'y', currentContent: 'y', status: 'PENDING_CORRECTION', reviewer: 'Ceci', timestamp: new Date() }
    ]);

    await renderApp(service, source, 'TEACHER', false);
    await act(async () => { fireEvent.click(screen.getByText(/Revisar sugerencias/i)); });

    // 19 PASS & 20 PASS
    expect(screen.getByRole("tab", { name: /🟠 Lunes 24/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /🟠 Jueves 27/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Martes 25/i })).toBeDefined(); // Neutral
    
    // 21 PASS & 22 PASS
    const submitBtn = screen.getByText("Enviar correcciones a la Directora");
    expect(submitBtn.closest('button')).toHaveProperty('disabled', true);

    // Resolve Lunes
    await act(async () => { fireEvent.click(screen.getAllByText("Revisar / Editar")[0]); });
    const textareas = screen.getAllByDisplayValue(recs[0]!.activities[0]!.description);
    fireEvent.change(textareas[0], { target: { value: 'Fixed Mon' } });
    await act(async () => { fireEvent.click(screen.getByText("Guardar Día")); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    // Lunes becomes Green
    expect(screen.getByRole("tab", { name: /✓ Lunes 24/i })).toBeDefined();
    expect(submitBtn.closest('button')).toHaveProperty('disabled', true); // Thursday still blocks

    // Resolve Thursday
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /🟠 Jueves 27/i })); });
    await act(async () => { fireEvent.click(screen.getAllByText("Revisar / Editar")[0]); });
    const textareasThu = screen.getAllByDisplayValue(recs[3].activities[0].description);
    fireEvent.change(textareasThu[0], { target: { value: 'Fixed Thu' } });
    await act(async () => { fireEvent.click(screen.getByText("Guardar Día")); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    // 23 PASS & 24 PASS
    const freshSubmitBtn2 = screen.getByText("Enviar correcciones a la Directora");
    expect(freshSubmitBtn2.closest('button')).not.toHaveProperty('disabled', true);
  });
});
