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

  it('5. Five Spanish weekdays render as tabs and Lunes is initially visible', async () => {
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

    // Check tabs
    expect(screen.getByRole('tab', { name: 'Lunes' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Martes' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Miércoles' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Jueves' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Viernes' })).toBeDefined();

    // Check active day content (Lunes is active)
    expect(screen.getByText(/Comenzamos con indicaciones sencillas/i)).toBeDefined();
    // Verify Martes content is not visible
    expect(screen.queryByText(/Reforzamos la respuesta mediante juego e imitación/i)).toBeNull();
  });

  it('5.1 Teacher can change weekdays, expand categories, and edits survive switching', async () => {
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

    // 5. A category can expand
    const editButtons = screen.getAllByText('Editar');
    expect(editButtons.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.click(editButtons[0]!);
    });
    // Check that textarea appears
    const textarea = screen.getByLabelText('Actividad');
    expect(textarea).toBeDefined();

    // 8. An edit survives category switching
    fireEvent.change(textarea, { target: { value: 'EDITED_TEXT' } });

    // Switch to Martes
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Martes' }));
    });
    expect(screen.queryByText('EDITED_TEXT')).toBeNull(); // Should be unmounted

    // Return to Lunes
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Lunes' }));
    });

    // Expand again
    await act(async () => {
      fireEvent.click(screen.getAllByText('Editar')[0]!);
    });
    expect((screen.getByLabelText('Actividad') as HTMLTextAreaElement).value).toBe('EDITED_TEXT');
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

    const tabs = screen.getAllByRole('tablist');
    expect(tabs.length).toBeGreaterThan(0);
    const container = tabs[0]!.parentElement!;
    expect(container.className).toContain('space-y-8');
    expect(container.className).not.toContain('snap-x');
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

  it('15. Teacher materials are logically derived for active day and common weekly use', async () => {
    const { service, source } = createTestDeps();
    source.generateRecommendation = vi.fn().mockResolvedValue([
      { dayOfWeek: 'MONDAY', activities: [
          { activityId: 'a1', category: 'Exploración', objective: '', description: '', materials: ['Crayolas', ' Hojas ', 'crayolas'], durationMinutes: 20, curricularTraceability: [] }
      ] },
      { dayOfWeek: 'TUESDAY', date: '', complementaryActivities: [], materials: [], activities: [
          { activityId: 'a2', category: 'Arte', objective: '', description: '', materials: ['Crayolas', 'Pintura'], durationMinutes: 20, curricularTraceability: [] }
      ] },
      { dayOfWeek: 'WEDNESDAY', date: '', complementaryActivities: [], materials: [], activities: [
          { activityId: 'a3', category: 'Arte', objective: '', description: '', materials: ['Crayolas'], durationMinutes: 20, curricularTraceability: [] }
      ] },
      { dayOfWeek: 'THURSDAY', date: '', complementaryActivities: [], materials: [], activities: [
          { activityId: 'a4', category: 'Arte', objective: '', description: '', materials: ['Crayolas', 'Hojas'], durationMinutes: 20, curricularTraceability: [] }
      ] },
      { dayOfWeek: 'FRIDAY', date: '', complementaryActivities: [], materials: [], activities: [
          { activityId: 'a5', category: 'Arte', objective: '', description: '', materials: ['Crayolas', 'Música'], durationMinutes: 20, curricularTraceability: [] }
      ] },
    ] as PlanningDay[]);

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

    // 5. Present in all five days -> Uso diario
    expect(screen.getByText(/Materiales de uso diario/i)).toBeDefined();
    // Get all li elements in common materials
    const commonSection = screen.getByText(/Materiales de uso diario/i).parentElement;
    expect(commonSection?.textContent).toContain('Crayolas'); // common

    // 1. Monday derives only Monday, 4. Duplicates render once (' Hojas ' and 'crayolas' in MONDAY)
    // 6. Common (Crayolas) is not duplicated in day specific
    expect(screen.getByText(/Materiales para el lunes/i)).toBeDefined();
    const daySection = screen.getByText(/Materiales para el lunes/i).parentElement;
    expect(daySection?.textContent).toContain('Hojas');
    expect(daySection?.textContent).not.toContain('Crayolas');

    // 2. Tuesday materials (Pintura) not visible when Monday is active
    expect(screen.queryByText('Pintura')).toBeNull();

    // 3. Switching to Tuesday updates materials
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Martes' })); });
    expect(screen.getByText(/Materiales para el martes/i)).toBeDefined();
    const tuesdaySection = screen.getByText(/Materiales para el martes/i).parentElement;
    expect(tuesdaySection?.textContent).toContain('Pintura');
    expect(screen.queryByText('Hojas')).toBeNull();
  });

  it('15.1 Empty common intersection does not render false common section', async () => {
    const { service, source } = createTestDeps();
    source.generateRecommendation = vi.fn().mockResolvedValue([
      { dayOfWeek: 'MONDAY', activities: [{ activityId: 'a1', category: 'Cat', objective: '', description: '', materials: ['LunesMat'], durationMinutes: 10, curricularTraceability: [] }] },
      { dayOfWeek: 'TUESDAY', activities: [{ activityId: 'a2', category: 'Cat', objective: '', description: '', materials: ['MartesMat'], durationMinutes: 10, curricularTraceability: [] }] },
      { dayOfWeek: 'WEDNESDAY', activities: [] },
      { dayOfWeek: 'THURSDAY', activities: [] },
      { dayOfWeek: 'FRIDAY', activities: [] },
    ] as unknown as PlanningDay[]);

    await renderApp(service, source);
    await act(async () => { fireEvent.click(screen.getByText(/Comenzar nuestra semana/i)); });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en tu grupo\?/i), { target: { value: 'obs' } });
    fireEvent.change(screen.getByLabelText(/¿Qué necesitas fortalecer esta semana\?/i), { target: { value: 'needs' } });
    await act(async () => { fireEvent.click(screen.getByText(/Crear propuesta juntas/i)); });
    await act(async () => { fireEvent.click(screen.getByText(/Sí, construyamos la semana/i)); });

    expect(screen.queryByText(/Materiales de uso diario/i)).toBeNull();
    expect(screen.getByText(/Materiales para el lunes/i)).toBeDefined();
    expect(screen.getByText('LunesMat')).toBeDefined();
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
      fireEvent.click(anitaElements[anitaElements.length - 1]!);
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
