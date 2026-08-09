import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { PedagogicalRecommendationSource } from '../../../application/planning/PedagogicalRecommendationSource';
import { PlanningDay } from '../../../domain/planning/WeeklyPlanning';
import React from 'react';

global.alert = vi.fn();

const createTestDeps = () => {
  const repo = new InMemoryWeeklyPlanningRepository();
  const service = new PlanningWorkflowService(repo);
  const source: PedagogicalRecommendationSource = {
    generateRecommendation: vi.fn().mockResolvedValue([
      { dayOfWeek: 'MONDAY', activities: [{ activityId: 'a1', category: 'Exploración', objective: 'Obj', description: 'Desc', materials: ['m1'], durationMinutes: 20, curricularTraceability: [] }] },
      { dayOfWeek: 'TUESDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'WEDNESDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'THURSDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'FRIDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
    ] as PlanningDay[])
  };
  return { repo, service, source };
};

describe('PlanningDemoApp UX Requirements (UX Iteration 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderApp = async (service: PlanningWorkflowService, source: PedagogicalRecommendationSource) => {
    let result;
    await act(async () => {
      result = render(<PlanningDemoApp service={service} source={source} />);
      // wait a bit for initial fetch
      await new Promise(r => setTimeout(r, 50));
    });
    return result!;
  };

  it('1. Teacher sees welcome message instead of raw button', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    expect(await screen.findByText(/Vamos a preparar tu semana/i)).toBeDefined();
    expect(await screen.findByText(/Comenzar nuestra semana/i)).toBeDefined();
    expect(screen.queryByText(/La semana pasada trabajamos la exploración sensorial/i)).toBeNull();
    expect(screen.getByText(/Podemos continuar fortaleciendo la exploración/i)).toBeDefined();
  });

  it('2. Teacher flow shows humanized conversational steps', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    expect(screen.getByText(/¿Qué observaste en tu grupo\?/i)).toBeDefined();
    expect(screen.getByText(/¿Qué necesitas fortalecer esta semana\?/i)).toBeDefined();
    expect(screen.getByText(/Algo que quiero tener presente/i)).toBeDefined();
    expect(screen.getByText(/Materiales que tengo a la mano/i)).toBeDefined();
  });

  it('3. Active listening step interrupts generation (Lo que entendí)', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i), { target: { value: 'obs' } });
    fireEvent.change(screen.getByLabelText(/¿Qué necesitas fortalecer esta semana\?/i), { target: { value: 'needs' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Crear propuesta juntas/i));
    });

    expect(screen.getByText(/Lo que entendí de tu grupo/i)).toBeDefined();
  });

  it('4. REJECTED maps to Revisar sugerencias in list', async () => {
    const { repo, service, source } = createTestDeps();
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2026-08-10', '2026-08-14', 'TEACHER');
    const days: PlanningDay[] = [
      { dayOfWeek: 'MONDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'TUESDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'WEDNESDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'THURSDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'FRIDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
    ];
    await service.saveDraft('p1', 'obs', 'needs', [], days, 'TEACHER');
    await service.submit('p1', 'TEACHER');
    await service.reject('p1', 'reason', 'd1', 'DIRECTOR');
    await renderApp(service, source);
    expect(await screen.findByText(/Revisar sugerencias de la Directora/i)).toBeDefined();
  });

  it('5. Five Spanish weekdays render with emotional context (no artificial latency)', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });

    fireEvent.change(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i), { target: { value: 'obs' } });
    fireEvent.change(screen.getByLabelText(/¿Qué necesitas fortalecer esta semana\?/i), { target: { value: 'needs' } });
    await act(async () => {
      fireEvent.click(screen.getByText(/Crear propuesta juntas/i));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Sí, construyamos la semana/i));
    });

    // No artificial 5500ms delay needed anymore
    expect(screen.getAllByText('Lunes').length).toBeGreaterThan(0);
    expect(screen.getByText(/Comenzamos con indicaciones sencillas/i)).toBeDefined();
    expect(screen.getByText('Martes')).toBeDefined();
    expect(screen.getByText('Miércoles')).toBeDefined();
    expect(screen.getByText('Jueves')).toBeDefined();
    expect(screen.getByText('Viernes')).toBeDefined();
  });

  it('6. Director has no edit fields but sees specific texts', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText('Ceci (Directora)'));
      await new Promise(r => setTimeout(r, 50));
    });
    expect(screen.queryByLabelText(/¿Qué observaste en tu grupo\?/i)).toBeNull();
  });

  it('7. Supervisor has no mutation actions', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText('Tere (Supervisora)'));
      await new Promise(r => setTimeout(r, 50));
    });
    expect(screen.queryByText(/¡Me parece excelente!/i)).toBeNull();
    expect(screen.queryByText(/Sugerir algo/i)).toBeNull();
  });

  it('8. Director correction reason appears to Teacher as a conversation', async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2026-08-10', '2026-08-14', 'TEACHER');
    const days: PlanningDay[] = [
      { dayOfWeek: 'MONDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'TUESDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'WEDNESDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'THURSDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'FRIDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
    ];
    await service.saveDraft('p1', 'obs', 'needs', [], days, 'TEACHER');
    await service.submit('p1', 'TEACHER');
    await service.reject('p1', 'TEST_REASON_123', 'd1', 'DIRECTOR');
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(await screen.findByText(/Revisar sugerencias de la Directora/i));
    });
    expect(await screen.findByText(/"TEST_REASON_123"/i)).toBeDefined();
    expect(await screen.findByText(/La Directora dejó una sugerencia para fortalecer esta propuesta/i)).toBeDefined();
  });

  it('9. IN_REVIEW disables Teacher editing', async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2026-08-10', '2026-08-14', 'TEACHER');
    const days: PlanningDay[] = [
      { dayOfWeek: 'MONDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'TUESDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'WEDNESDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'THURSDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'FRIDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
    ];
    await service.saveDraft('p1', 'obs', 'needs', [], days, 'TEACHER');
    await service.submit('p1', 'TEACHER');
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(await screen.findByText(/La Directora la está leyendo/i));
    });
    const obsInput = await screen.findByLabelText(/¿Qué observaste en tu grupo\?/i);
    expect((obsInput as HTMLTextAreaElement).disabled).toBe(true);
  });

  it('10. No window.alert dependency, toasts are humanized', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i), { target: { value: 'obs' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Guardar mi avance por hoy'));
    });
    expect(global.alert).not.toHaveBeenCalled();
    expect(screen.getByText(/Tu avance está protegido/i)).toBeDefined();
  });

  it('11. Print view removes generic header and uses story title', async () => {
    const { service, source } = createTestDeps();
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2026-08-10', '2026-08-14', 'TEACHER');
    const days: PlanningDay[] = [
      { dayOfWeek: 'MONDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'TUESDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'WEDNESDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'THURSDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'FRIDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
    ];
    await service.saveDraft('p1', 'obs', 'needs', [], days, 'TEACHER');
    await service.submit('p1', 'TEACHER');
    await service.approve('p1', 'DIRECTOR');

    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText('Tere (Supervisora)'));
      await new Promise(r => setTimeout(r, 50));
    });
    await act(async () => {
      fireEvent.click(await screen.findByText(/Planeación aprobada/i));
    });
    expect(screen.getByText(/Documento de planeación/i)).toBeDefined();
    expect(screen.queryByText(/Un viaje pedagógico/i)).toBeNull();
    expect(screen.queryByText(/Aprobada oficialmente/i)).toBeNull();
    expect(screen.queryByText(/Documento oficial/i)).toBeNull();
  });

  it('12. Weekly planning container uses one-scroll (no horizontal navigation)', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });

    fireEvent.change(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i), { target: { value: 'obs' } });
    fireEvent.change(screen.getByLabelText(/¿Qué necesitas fortalecer esta semana\?/i), { target: { value: 'needs' } });
    await act(async () => {
      fireEvent.click(screen.getByText(/Crear propuesta juntas/i));
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Sí, construyamos la semana/i));
    });

    const lunesElements = screen.getAllByText('Lunes');
    const container = lunesElements[0]!.parentElement!.parentElement!;
    expect(container.className).not.toContain('overflow-x-auto');
    expect(container.className).not.toContain('snap-x');
    expect(container.className).toContain('space-y-12');
  });

  it('13. Teacher can choose "Quiero ajustar algo" and go back to editing', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i), { target: { value: 'obs' } });
    fireEvent.change(screen.getByLabelText(/¿Qué necesitas fortalecer esta semana\?/i), { target: { value: 'needs' } });
    await act(async () => {
      fireEvent.click(screen.getByText(/Crear propuesta juntas/i));
    });
    expect(screen.getByText(/Lo que entendí de tu grupo/i)).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByText(/Quiero ajustar algo/i));
    });
    // Should be back to stage 1 where inputs are visible
    expect(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i)).toBeDefined();
  });

  it('14. Weekly purpose/intention appears before days', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i), { target: { value: 'TEST_OBSERVATION' } });
    fireEvent.change(screen.getByLabelText(/¿Qué necesitas fortalecer esta semana\?/i), { target: { value: 'TEST_NEED' } });
    await act(async () => {
      fireEvent.click(screen.getByText(/Crear propuesta juntas/i));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Sí, construyamos la semana/i));
    });

    const purposeContainer = screen.getAllByText(/Propósito de la semana/i)[0]!.parentElement;
    expect(purposeContainer?.textContent).toContain('test_need');
    expect(purposeContainer?.textContent).toContain('TEST_OBSERVATION');
  });

  it('15. Material summary uses only generated materials', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i), { target: { value: 'obs' } });
    fireEvent.change(screen.getByLabelText(/¿Qué necesitas fortalecer esta semana\?/i), { target: { value: 'needs' } });
    await act(async () => {
      fireEvent.click(screen.getByText(/Crear propuesta juntas/i));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Sí, construyamos la semana/i));
    });

    const materialsHeader = screen.getAllByText(/Materiales de la semana/i)[0];
    const container = materialsHeader!.parentElement;
    expect(container?.textContent).toContain('m1'); // from mock
  });

  it('16. Evaluation is not falsely completed', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i), { target: { value: 'obs' } });
    fireEvent.change(screen.getByLabelText(/¿Qué necesitas fortalecer esta semana\?/i), { target: { value: 'needs' } });
    await act(async () => {
      fireEvent.click(screen.getByText(/Crear propuesta juntas/i));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Sí, construyamos la semana/i));
    });

    const evalText = screen.getByText(/Este espacio estará disponible para registrar cómo respondió/i);
    expect(evalText).toBeDefined();
  });

  it('17. Complementary-program activities are not fabricated', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i), { target: { value: 'obs' } });
    fireEvent.change(screen.getByLabelText(/¿Qué necesitas fortalecer esta semana\?/i), { target: { value: 'needs' } });
    await act(async () => {
      fireEvent.click(screen.getByText(/Crear propuesta juntas/i));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Sí, construyamos la semana/i));
    });
    // The UI shouldn't invent complementary activities. We only rendered the activities provided.
    expect(screen.queryByText(/Actividades complementarias/i)).toBeNull();
  });

  it('18. Director sees same persisted context/purpose/material summary', async () => {
    const { repo, service, source } = createTestDeps();
    await service.createPlanning('p1', 'd1', 'lactantes-c', 't1', '2026-08-10', '2026-08-14', 'TEACHER');
    const days: PlanningDay[] = [
      { dayOfWeek: 'MONDAY', date: '', complementaryActivities: [], materials: [], activities: [{ activityId: 'a1', category: 'Cat', objective: 'Obj', description: 'Desc', materials: ['m_director'], durationMinutes: 10, curricularTraceability: [] }] },
      { dayOfWeek: 'TUESDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'WEDNESDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'THURSDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
      { dayOfWeek: 'FRIDAY', date: '', complementaryActivities: [], materials: [], activities: [] },
    ];
    await service.saveDraft('p1', 'obs_director', 'needs_director', [], days, 'TEACHER');
    await service.submit('p1', 'TEACHER');

    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText('Ceci (Directora)'));
      await new Promise(r => setTimeout(r, 50));
    });
    await act(async () => {
      const anitaElements = await screen.findAllByText('Anita');
      fireEvent.click(anitaElements[anitaElements.length - 1]);
      await new Promise(r => setTimeout(r, 50));
    });

    const pageText = document.body.textContent || '';
    expect(pageText).toContain('obs_director');
    expect(pageText).toContain('needs_director');
    expect(pageText).toContain('Propósito de la semana');
    expect(pageText).toContain('Materiales de la semana');
    expect(pageText).toContain('m_director');
  });

  it('19. Input Truthfulness A & B: Special consideration & Materials are NOT represented as engine-considered', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i), { target: { value: 'obs' } });
    fireEvent.change(screen.getByLabelText(/¿Qué necesitas fortalecer esta semana\?/i), { target: { value: 'needs' } });
    fireEvent.change(screen.getByLabelText(/Algo que quiero tener presente/i), { target: { value: 'MY_SECRET_CONSIDERATION' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Crear propuesta juntas/i));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Sí, construyamos la semana/i));
    });

    const pageText = document.body.innerHTML;
    expect(pageText).not.toContain('MY_SECRET_CONSIDERATION');
    expect(pageText).not.toContain('Considerando:');
  });

  it('20. Input Truthfulness C: Teacher-entered materials do NOT appear in generated material summary', async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source);
    await act(async () => {
      fireEvent.click(screen.getByText(/Comenzar nuestra semana/i));
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i), { target: { value: 'obs' } });
    fireEvent.change(screen.getByLabelText(/¿Qué necesitas fortalecer esta semana\?/i), { target: { value: 'needs' } });
    fireEvent.change(screen.getByLabelText(/Materiales que tengo a la mano/i), { target: { value: 'MY_SECRET_MATERIAL' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Crear propuesta juntas/i));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Sí, construyamos la semana/i));
    });

    const pageText = document.body.innerHTML;
    expect(pageText).not.toContain('MY_SECRET_MATERIAL');
  });

});
