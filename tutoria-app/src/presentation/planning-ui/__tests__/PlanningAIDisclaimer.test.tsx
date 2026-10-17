import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';

describe('SR-MD-16 Fase 2 — Planning Institutional AI Disclaimer', () => {
  const EXACT_DISCLAIMER_TEXT =
    'La IA puede cometer errores. Toda propuesta requiere revisión y validación del personal educativo responsable.';

  const createDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  beforeEach(() => {
    window.history.pushState({}, '', '/workspace/planning');
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  it('1. Aviso visible en Planeaciones con texto institucional exacto', async () => {
    const { service, source } = createDeps();
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} role="TEACHER" />);
    });

    const disclaimerElements = screen.getAllByText(EXACT_DISCLAIMER_TEXT);
    expect(disclaimerElements).toHaveLength(1);
    expect(disclaimerElements[0]).toBeDefined();
  });

  it('2. Una sola instancia del aviso en toda la pantalla', async () => {
    const { service, source } = createDeps();
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} role="TEACHER" />);
    });

    const footers = screen.getAllByTestId('planning-ai-disclaimer-footer');
    expect(footers).toHaveLength(1);
  });

  it('3. Aviso oculto al imprimir y con clase print:hidden', async () => {
    const { service, source } = createDeps();
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} role="TEACHER" />);
    });

    const footer = screen.getByTestId('planning-ai-disclaimer-footer');
    expect(footer.className).toContain('print:hidden');
  });

  it('4. No usa position: fixed, no usa overlays y no bloquea controles de acción', async () => {
    const { service, source } = createDeps();
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} role="TEACHER" />);
    });

    const footer = screen.getByTestId('planning-ai-disclaimer-footer');
    expect(footer.className).not.toContain('fixed');
    expect(footer.className).not.toContain('absolute');
    expect(footer.className).toContain('mt-auto');
    expect(footer.className).toContain('w-full');
    expect(footer.className).toContain('text-center');

    // Controles interactivos como el botón Comenzar semana permanecen accesibles
    const startBtn = screen.getByText('✨ Comenzar nuestra semana');
    expect(startBtn).toBeDefined();
  });

  it('5. Visible en vista de Directora (Ceci / DIRECTOR)', async () => {
    const { service, source } = createDeps();
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} role="DIRECTOR" />);
    });

    const footer = screen.getByTestId('planning-ai-disclaimer-footer');
    expect(footer).toBeDefined();
    expect(footer.textContent).toContain(EXACT_DISCLAIMER_TEXT);
  });

  it('6. Visible en vista de Supervisora (Tere / SUPERVISOR)', async () => {
    const { service, source } = createDeps();
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} role="SUPERVISOR" />);
    });

    const footer = screen.getByTestId('planning-ai-disclaimer-footer');
    expect(footer).toBeDefined();
    expect(footer.textContent).toContain(EXACT_DISCLAIMER_TEXT);
  });

  it('7. En modo PRINT, el documento oficial NO contiene el pie de advertencia y está fuera de #printable-document-root', async () => {
    const { repo, service, source } = createDeps();

    // Crear un plan aprobado en el repositorio
    const plan = WeeklyPlanning.create(
      'plan-official-print-test',
      'dc-1',
      'lactantes-c',
      't1',
      '2026-08-24',
      '2026-08-28'
    );
    plan.days = [
      { date: '2026-08-24', dayOfWeek: 'MONDAY', activities: [{ activityId: 'act-1', category: 'C', objective: 'Act 1', description: 'Desc 1', durationMinutes: 15, materials: [], curricularTraceability: [] }], complementaryActivities: [], materials: [] },
      { date: '2026-08-25', dayOfWeek: 'TUESDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-26', dayOfWeek: 'WEDNESDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-27', dayOfWeek: 'THURSDAY', activities: [], complementaryActivities: [], materials: [] },
      { date: '2026-08-28', dayOfWeek: 'FRIDAY', activities: [], complementaryActivities: [], materials: [] }
    ];
    plan.observations = 'Observaciones Test';
    plan.status = 'APPROVED_FOR_EXECUTION';
    plan.approvedBy = 'Ceci';
    plan.approvedAt = new Date();
    await repo.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} role="TEACHER" />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Anita (Pedagoga)'));
    });

    // En vista regular con plan aprobado (TeacherWizard), el footer existe
    expect(screen.queryByTestId('planning-ai-disclaimer-footer')).not.toBeNull();

    // Navegar a Versión Oficial IMSS
    const officialBtn = await screen.findByRole('button', { name: /Versión Oficial IMSS/i });
    await act(async () => {
      fireEvent.click(officialBtn);
    });

    // 7.A: En modo PRINT, el footer de PlanningDemoApp NO existe
    expect(screen.queryByTestId('planning-ai-disclaimer-footer')).toBeNull();

    // 7.B: El documento oficial imprimible (#printable-document-root) existe y NO contiene el texto del aviso
    const root = document.getElementById('printable-document-root');
    expect(root).toBeDefined();
    expect(root?.textContent).not.toContain(EXACT_DISCLAIMER_TEXT);
  });
});
