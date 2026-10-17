import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import type { EvaluationRecommendationSource } from '../../../infrastructure/ai/FirebaseEvaluationRecommendationSource';
import type { AuthenticationProvider } from '../../../application/ports/AuthenticationProvider';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_DAYCARE_ID,
} from '../firstLightLabHarness';

describe('SR-MD-21 — Pérdida aparente de borrador de evaluación (Lactantes B)', () => {
  const PLAN_ID = 'd28a4788-35e7-4ed4-a278-92825f2be73e';
  const ROOM_ID = 'room-lactantes-b';
  const CURRENT_DATE = '2026-08-24';

  const defaultFirstLightEnv = {
    [FIRST_LIGHT_LAB_FLAG]: 'true',
    VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/');
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/');
    }
  });

  const createMockAuth = (uid: string = FIRST_LIGHT_TEACHER_ID): AuthenticationProvider => ({
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue(uid),
  });

  const setupPlanning = async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_TEACHER_ID);

    const plan = WeeklyPlanning.create(
      PLAN_ID,
      FIRST_LIGHT_DAYCARE_ID,
      ROOM_ID,
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );
    const recs = await pedSource.generateRecommendation(null as any, 'Obs', 'Needs', 'Sit', 'Mat');
    plan.days = recs;
    plan.status = 'APPROVED';
    plan.approvedBy = 'Ceci';
    plan.approvedAt = new Date('2026-08-23T12:00:00Z');
    await repo.save(plan);

    const mockEvalAI: EvaluationRecommendationSource = {
      assistDailyEvaluation: vi.fn().mockResolvedValue({
        suggestedEvaluation: 'Sugerencia pedagógica IA: Se desarrollaron actividades con sonajas para Lactantes B [CONTROL E2E-LB-24AGO-V1]',
      }),
    };

    return { repo, service, pedSource, mockEvalAI, mockAuth };
  };

  // 1. Generar sugerencia IA → USAR → texto visible en editor
  it('1. Generar sugerencia IA → USAR → texto visible en editor', async () => {
    const { service, pedSource, mockEvalAI, mockAuth } = await setupPlanning();
    window.history.replaceState({}, '', `/?planId=${PLAN_ID}`);

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        evaluationRecommendationSource={mockEvalAI}
        currentDate={CURRENT_DATE}
      />
    );

    // Click Monday tab
    const mondayTab = await screen.findByRole('tab', { name: /Lunes 24/i });
    await act(async () => {
      fireEvent.click(mondayTab);
    });

    // Open assistant
    const openAssistantBtn = await screen.findByRole('button', { name: /Ayúdame a redactar mi evaluación/i });
    await act(async () => {
      fireEvent.click(openAssistantBtn);
    });

    // Capture 4 observations
    const devInput = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i);
    const respInput = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i);
    const adapInput = screen.getByLabelText(/¿Realizaste algún ajuste durante las actividades\?/i);
    const contInput = screen.getByLabelText(/¿Hay algo que consideres importante retomar o continuar\?/i);

    fireEvent.change(devInput, { target: { value: 'Obs 1: Se desarrollaron actividades con sonajas de forma adecuada.' } });
    fireEvent.change(respInput, { target: { value: 'Obs 2: Respuesta de interés y seguimiento visual por parte de los lactantes.' } });
    fireEvent.change(adapInput, { target: { value: 'Obs 3: Ajuste en la distancia del material.' } });
    fireEvent.change(contInput, { target: { value: 'Obs 4: Continuar exploración sonora.' } });

    // Click Preparar borrador sugerido
    const prepareBtn = screen.getByRole('button', { name: /Preparar borrador sugerido/i });
    await act(async () => {
      fireEvent.click(prepareBtn);
    });

    // Check suggestion card
    const suggestionCard = await screen.findByTestId('suggestion-review-surface');
    expect(suggestionCard).toBeDefined();
    expect(within(suggestionCard).getByText(/Sugerencia pedagógica IA/i)).toBeDefined();

    // Click USAR
    const usarBtn = within(suggestionCard).getByRole('button', { name: /USAR/i });
    await act(async () => {
      fireEvent.click(usarBtn);
    });

    // Editor textarea must now visibly contain the suggestion text
    const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe(
      'Sugerencia pedagógica IA: Se desarrollaron actividades con sonajas para Lactantes B [CONTROL E2E-LB-24AGO-V1]'
    );
  });

  // 2. Guardar borrador → confirmación de persistencia → recargar F5 → texto íntegro
  it('2. Guardar borrador → confirmación de persistencia → recargar F5 → texto íntegro', async () => {
    const { repo, service, pedSource, mockEvalAI, mockAuth } = await setupPlanning();
    window.history.replaceState({}, '', `/?planId=${PLAN_ID}`);

    const { unmount } = render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        evaluationRecommendationSource={mockEvalAI}
        currentDate={CURRENT_DATE}
      />
    );

    // Click Monday tab
    const mondayTab = await screen.findByRole('tab', { name: /Lunes 24/i });
    await act(async () => {
      fireEvent.click(mondayTab);
    });

    const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: 'Borrador pedagógico de prueba: observación del grupo de Lactantes B.' },
    });

    // Click Guardar borrador
    const saveDraftBtn = screen.getByRole('button', { name: /Guardar borrador/i });
    await act(async () => {
      fireEvent.click(saveDraftBtn);
    });

    // Toast confirmation
    const toast = await screen.findByText(/✓ Borrador de evaluación guardado/i);
    expect(toast).toBeDefined();

    // Check persistence in repository
    const persistedPlan = await repo.findById(PLAN_ID);
    expect(persistedPlan?.days[0]?.evaluation).toBe(
      'Borrador pedagógico de prueba: observación del grupo de Lactantes B.'
    );
    expect(persistedPlan?.days[0]?.evaluationStatus).toBe('DRAFT');

    // Simulate F5 reload: unmount and re-render
    unmount();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        evaluationRecommendationSource={mockEvalAI}
        currentDate={CURRENT_DATE}
      />
    );

    const reloadedMondayTab = await screen.findByRole('tab', { name: /Lunes 24/i });
    await act(async () => {
      fireEvent.click(reloadedMondayTab);
    });

    const reloadedTextarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i) as HTMLTextAreaElement;
    expect(reloadedTextarea.value).toBe(
      'Borrador pedagógico de prueba: observación del grupo de Lactantes B.'
    );
  });

  // 3. Cambiar de día y regresar → texto íntegro
  it('3. Cambiar de día y regresar → texto íntegro', async () => {
    const { service, pedSource, mockEvalAI, mockAuth } = await setupPlanning();
    window.history.replaceState({}, '', `/?planId=${PLAN_ID}`);

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        evaluationRecommendationSource={mockEvalAI}
        currentDate={CURRENT_DATE}
      />
    );

    const mondayTab = await screen.findByRole('tab', { name: /Lunes 24/i });
    await act(async () => {
      fireEvent.click(mondayTab);
    });

    const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: 'Texto de evaluación en progreso para Lactantes B' },
    });

    // Switch to Tuesday
    const tuesdayTab = await screen.findByRole('tab', { name: /Martes 25/i });
    await act(async () => {
      fireEvent.click(tuesdayTab);
    });

    // Switch back to Monday
    const mondayTabAgain = await screen.findByRole('tab', { name: /Lunes 24/i });
    await act(async () => {
      fireEvent.click(mondayTabAgain);
    });

    // Text in Monday textarea remains intact
    const textareaAfterSwitch = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i) as HTMLTextAreaElement;
    expect(textareaAfterSwitch.value).toBe('Texto de evaluación en progreso para Lactantes B');
  });

  // 4. Error de persistencia → aviso visible, sin limpiar el texto
  it('4. Error de persistencia → aviso visible, sin limpiar el texto', async () => {
    const { service, pedSource, mockEvalAI, mockAuth } = await setupPlanning();
    window.history.replaceState({}, '', `/?planId=${PLAN_ID}`);

    // Mock saveDailyEvaluationDraft failure
    vi.spyOn(service, 'saveDailyEvaluationDraft').mockRejectedValueOnce(
      new Error('Fallo simulado de red en Firestore')
    );

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        evaluationRecommendationSource={mockEvalAI}
        currentDate={CURRENT_DATE}
      />
    );

    const mondayTab = await screen.findByRole('tab', { name: /Lunes 24/i });
    await act(async () => {
      fireEvent.click(mondayTab);
    });

    const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: 'Observación que no debe perderse ante error de red' },
    });

    const saveDraftBtn = screen.getByRole('button', { name: /Guardar borrador/i });
    await act(async () => {
      fireEvent.click(saveDraftBtn);
    });

    // Visible error alert
    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert.textContent).toContain('Fallo simulado de red en Firestore');

    // Textarea MUST retain the text intact
    expect(textarea.value).toBe('Observación que no debe perderse ante error de red');
  });

  // 5. Abrir/cerrar asistente → no eliminar indebidamente trabajo no guardado
  it('5. Abrir/cerrar asistente → no eliminar indebidamente trabajo no guardado', async () => {
    const { service, pedSource, mockEvalAI, mockAuth } = await setupPlanning();
    window.history.replaceState({}, '', `/?planId=${PLAN_ID}`);

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        evaluationRecommendationSource={mockEvalAI}
        currentDate={CURRENT_DATE}
      />
    );

    const mondayTab = await screen.findByRole('tab', { name: /Lunes 24/i });
    await act(async () => {
      fireEvent.click(mondayTab);
    });

    // Open assistant
    const openAssistantBtn = await screen.findByRole('button', { name: /Ayúdame a redactar mi evaluación/i });
    await act(async () => {
      fireEvent.click(openAssistantBtn);
    });

    // Fill observations
    const devInput = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i);
    const respInput = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i);
    const adapInput = screen.getByLabelText(/¿Realizaste algún ajuste durante las actividades\?/i);
    const contInput = screen.getByLabelText(/¿Hay algo que consideres importante retomar o continuar\?/i);

    fireEvent.change(devInput, { target: { value: 'Observación detallada sobre la manipulación de materiales.' } });
    fireEvent.change(respInput, { target: { value: 'Atención visual sostenida y sonrisas de los bebés.' } });
    fireEvent.change(adapInput, { target: { value: 'Disposición de colchonetas en círculo.' } });
    fireEvent.change(contInput, { target: { value: 'Repetir la actividad el día miércoles.' } });

    // Close assistant using Cancelar
    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    // Reopen assistant
    const reopenAssistantBtn = await screen.findByRole('button', { name: /Ayúdame a redactar mi evaluación/i });
    await act(async () => {
      fireEvent.click(reopenAssistantBtn);
    });

    // All 4 observations must still be present!
    const devInputReopened = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i) as HTMLTextAreaElement;
    const respInputReopened = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i) as HTMLTextAreaElement;
    const adapInputReopened = screen.getByLabelText(/¿Realizaste algún ajuste durante las actividades\?/i) as HTMLTextAreaElement;
    const contInputReopened = screen.getByLabelText(/¿Hay algo que consideres importante retomar o continuar\?/i) as HTMLTextAreaElement;

    expect(devInputReopened.value).toBe('Observación detallada sobre la manipulación de materiales.');
    expect(respInputReopened.value).toBe('Atención visual sostenida y sonrisas de los bebés.');
    expect(adapInputReopened.value).toBe('Disposición de colchonetas en círculo.');
    expect(contInputReopened.value).toBe('Repetir la actividad el día miércoles.');

    // Also test switching tabs: switch to Tuesday and back to Monday
    const tuesdayTab = await screen.findByRole('tab', { name: /Martes 25/i });
    await act(async () => {
      fireEvent.click(tuesdayTab);
    });

    const mondayTabAgain = await screen.findByRole('tab', { name: /Lunes 24/i });
    await act(async () => {
      fireEvent.click(mondayTabAgain);
    });

    // Open assistant on Monday again
    const reopenAfterTabSwitchBtn = await screen.findByRole('button', { name: /Ayúdame a redactar mi evaluación/i });
    await act(async () => {
      fireEvent.click(reopenAfterTabSwitchBtn);
    });

    const devInputAfterSwitch = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i) as HTMLTextAreaElement;
    expect(devInputAfterSwitch.value).toBe('Observación detallada sobre la manipulación de materiales.');
  });

  // 6. Verificar que guardar borrador no equivale a enviar a Educadora
  it('6. Verificar que guardar borrador no equivale a enviar a Educadora', async () => {
    const { repo, service, pedSource, mockEvalAI, mockAuth } = await setupPlanning();
    window.history.replaceState({}, '', `/?planId=${PLAN_ID}`);

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        evaluationRecommendationSource={mockEvalAI}
        currentDate={CURRENT_DATE}
      />
    );

    const mondayTab = await screen.findByRole('tab', { name: /Lunes 24/i });
    await act(async () => {
      fireEvent.click(mondayTab);
    });

    const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: 'Borrador provisional de evaluación del lunes' },
    });

    const saveDraftBtn = screen.getByRole('button', { name: /Guardar borrador/i });
    await act(async () => {
      fireEvent.click(saveDraftBtn);
    });

    // Check plan in repository
    const plan = await repo.findById(PLAN_ID);
    const monday = plan?.days[0];

    // Status must remain DRAFT, NOT IN_REVIEW
    expect(monday?.evaluationStatus).toBe('DRAFT');
    expect(monday?.evaluationSubmittedAt).toBeUndefined();
    expect(monday?.evaluationSubmittedBy).toBeUndefined();

    // Editor still shows action buttons (not locked into sent state)
    expect(screen.getByRole('button', { name: /Enviar evaluación a Educadora/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Guardar borrador/i })).toBeDefined();
  });

  // 7. Verificar que un borrador no sobrescribe versiones históricas enviadas
  it('7. Verificar que un borrador no sobrescribe versiones históricas enviadas', async () => {
    const { repo, service } = await setupPlanning();

    // Set Monday as having an earlier submitted version, now in CHANGES_REQUESTED
    const plan = (await repo.findById(PLAN_ID))!;
    plan.days[0].evaluation = 'V1 original: Primera versión enviada por Asistente Educativa';
    plan.days[0].evaluationStatus = 'CHANGES_REQUESTED';
    plan.days[0].evaluationDirectorComment = 'Ampliar descripción sobre el interés del grupo.';
    plan.days[0].evaluationReviewedAt = new Date('2026-08-24T14:00:00Z');
    plan.days[0].evaluationReviewedBy = 'Ceci';
    plan.days[0].evaluationSubmittedAt = new Date('2026-08-24T13:00:00Z');
    plan.days[0].evaluationSubmittedBy = 'lab-teacher-anita';
    plan.days[0].evaluationHistory = [
      {
        version: 1,
        content: 'V1 original: Primera versión enviada por Asistente Educativa',
        submittedAt: new Date('2026-08-24T13:00:00Z'),
        submittedBy: 'lab-teacher-anita',
        directorComment: 'Ampliar descripción sobre el interés del grupo.',
        reviewedAt: new Date('2026-08-24T14:00:00Z'),
        reviewedBy: 'Ceci',
        status: 'CHANGES_REQUESTED',
      },
    ];
    await repo.save(plan);

    // Now save a correction draft
    await service.saveDailyEvaluationDraft(
      PLAN_ID,
      'MONDAY',
      'V2 borrador de corrección: Se detalla el interés observado en la actividad de sonajas.',
      'TEACHER',
      CURRENT_DATE,
      'lab-teacher-anita'
    );

    const updatedPlan = (await repo.findById(PLAN_ID))!;
    const monday = updatedPlan.days[0];

    // The draft is isolated in evaluationDraft
    expect(monday.evaluationDraft).toBe(
      'V2 borrador de corrección: Se detalla el interés observado en la actividad de sonajas.'
    );
    // The original sent evaluation is preserved
    expect(monday.evaluation).toBe('V1 original: Primera versión enviada por Asistente Educativa');
    // Historical entry is intact
    expect(monday.evaluationHistory).toHaveLength(1);
    expect(monday.evaluationHistory![0].version).toBe(1);
    expect(monday.evaluationHistory![0].content).toBe(
      'V1 original: Primera versión enviada por Asistente Educativa'
    );
  });
});
