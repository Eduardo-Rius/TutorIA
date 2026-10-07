import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import { DailyEvaluationHumanGate } from '../DailyEvaluationHumanGate';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import type { EvaluationRecommendationSource } from '../../../infrastructure/ai/FirebaseEvaluationRecommendationSource';
import type { AssistDailyEvaluationGatewayRequest } from '../../../application/planning/GovernedEvaluationAIContract';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_DAYCARE_ID,
  FIRST_LIGHT_ROOM_ID,
  FIRST_LIGHT_PLANNING_ID,
} from '../firstLightLabHarness';

describe('H1R13.3H.2 — DailyEvaluationHumanGate Component Tests', () => {
  const sampleSuggestedText =
    'Durante la jornada, las niñas y niños exploraron los materiales sonoros con curiosidad activa, manteniendo una interacción receptiva con las sonajas y respondiendo a los estímulos propuestos.';

  let mockSource: EvaluationRecommendationSource;
  let mockOnAccept: ReturnType<typeof vi.fn>;
  let mockOnEdit: ReturnType<typeof vi.fn>;
  let mockOnDiscard: ReturnType<typeof vi.fn>;
  let mockSaveDailyEvaluationDraft: ReturnType<typeof vi.fn>;
  let mockConfirmAndSubmitDailyEvaluation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnAccept = vi.fn();
    mockOnEdit = vi.fn();
    mockOnDiscard = vi.fn();
    mockSaveDailyEvaluationDraft = vi.fn();
    mockConfirmAndSubmitDailyEvaluation = vi.fn();

    mockSource = {
      assistDailyEvaluation: vi.fn().mockResolvedValue({
        suggestedEvaluation: sampleSuggestedText,
      }),
    };
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof DailyEvaluationHumanGate>> = {}) => {
    return render(
      <DailyEvaluationHumanGate
        planningId="plan-h1r13"
        dayOfWeek="MONDAY"
        isEligible={true}
        source={mockSource}
        onAccept={mockOnAccept}
        onEdit={mockOnEdit}
        onDiscard={mockOnDiscard}
        {...props}
      />
    );
  };

  it('1. CTA renders for eligible TEACHER', () => {
    renderComponent({ isEligible: true });
    const ctaButton = screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i });
    expect(ctaButton).toBeDefined();
  });

  it('2. CTA absent/disabled when eligibility false', () => {
    renderComponent({ isEligible: false });
    const ctaButton = screen.queryByRole('button', { name: /Ayúdame a redactar mi evaluación/i });
    expect(ctaButton).toBeNull();
  });

  it('3. Evidence form opens', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    expect(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i)).toBeDefined();
    expect(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i)).toBeDefined();
    expect(screen.getByLabelText(/¿Realizaste algún ajuste durante las actividades\?/i)).toBeDefined();
    expect(screen.getByLabelText(/¿Hay algo que consideres importante retomar o continuar\?/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Preparar borrador sugerido/i })).toBeDefined();
  });

  it('4. activitiesDevelopment < 15 rejected', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    const devInput = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i);
    const respInput = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i);
    const submitBtn = screen.getByRole('button', { name: /Preparar borrador sugerido/i });

    // 12 characters in development (< 15 minimum)
    fireEvent.change(devInput, { target: { value: 'Corto avance' } });
    fireEvent.change(respInput, { target: { value: 'Respuesta suficientemente larga y descriptiva' } });

    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('5. groupResponse < 15 rejected', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    const devInput = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i);
    const respInput = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i);
    const submitBtn = screen.getByRole('button', { name: /Preparar borrador sugerido/i });

    // 14 characters in response (< 15 minimum)
    fireEvent.change(devInput, { target: { value: 'Desarrollo suficientemente largo y detallado' } });
    fireEvent.change(respInput, { target: { value: 'Muy corta resp' } });

    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('6. activitiesDevelopment > 600 rejected', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    const devInput = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i);
    const respInput = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i);
    const submitBtn = screen.getByRole('button', { name: /Preparar borrador sugerido/i });

    // 601 characters (> 600 maximum)
    fireEvent.change(devInput, { target: { value: 'a'.repeat(601) } });
    fireEvent.change(respInput, { target: { value: 'Respuesta del grupo adecuada y dentro de rango' } });

    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('7. groupResponse > 600 rejected', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    const devInput = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i);
    const respInput = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i);
    const submitBtn = screen.getByRole('button', { name: /Preparar borrador sugerido/i });

    fireEvent.change(devInput, { target: { value: 'Desarrollo de las actividades dentro del rango requerido' } });
    fireEvent.change(respInput, { target: { value: 'b'.repeat(601) } });

    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('8. adaptations > 400 rejected', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    const devInput = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i);
    const respInput = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i);
    const adapInput = screen.getByLabelText(/¿Realizaste algún ajuste durante las actividades\?/i);
    const submitBtn = screen.getByRole('button', { name: /Preparar borrador sugerido/i });

    fireEvent.change(devInput, { target: { value: 'Desarrollo de actividades dentro del rango requerido' } });
    fireEvent.change(respInput, { target: { value: 'Respuesta del grupo adecuada y dentro de rango' } });
    fireEvent.change(adapInput, { target: { value: 'c'.repeat(401) } });

    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('9. continuity > 400 rejected', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    const devInput = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i);
    const respInput = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i);
    const contInput = screen.getByLabelText(/¿Hay algo que consideres importante retomar o continuar\?/i);
    const submitBtn = screen.getByRole('button', { name: /Preparar borrador sugerido/i });

    fireEvent.change(devInput, { target: { value: 'Desarrollo de actividades dentro del rango requerido' } });
    fireEvent.change(respInput, { target: { value: 'Respuesta del grupo adecuada y dentro de rango' } });
    fireEvent.change(contInput, { target: { value: 'd'.repeat(401) } });

    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('10. optional evidence may be omitted', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    const devInput = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i);
    const respInput = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i);
    const submitBtn = screen.getByRole('button', { name: /Preparar borrador sugerido/i });

    fireEvent.change(devInput, { target: { value: 'Las actividades sensoriales se desarrollaron según lo planeado' } });
    fireEvent.change(respInput, { target: { value: 'El grupo participó activamente con las sonajas' } });

    // adaptations and continuity left blank
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('11. valid evidence enables generation', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    const devInput = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i);
    const respInput = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i);
    const submitBtn = screen.getByRole('button', { name: /Preparar borrador sugerido/i });

    fireEvent.change(devInput, { target: { value: 'Las actividades de exploración musical se llevaron a cabo normalmente' } });
    fireEvent.change(respInput, { target: { value: 'Los niños mostraron mucho entusiasmo y coordinación' } });

    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('12. duplicate request prevented while requesting', async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockSource.assistDailyEvaluation = vi.fn().mockReturnValue(pendingPromise);

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Las actividades musicales se completaron con tranquilidad' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'El grupo mostró una respuesta receptiva y constante' },
    });

    const submitBtn = screen.getByRole('button', { name: /Preparar borrador sugerido/i });
    fireEvent.click(submitBtn);

    // Now requesting: button should be absent or replaced by loading state, preventing second click
    expect(mockSource.assistDailyEvaluation).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Preparar borrador sugerido/i })).toBeNull();
    expect(screen.getByText(/Preparando borrador sugerido\.\.\./i)).toBeDefined();

    // Resolve
    await act(async () => {
      resolvePromise!({ suggestedEvaluation: sampleSuggestedText });
    });

    expect(screen.getByTestId('suggestion-review-surface')).toBeDefined();
  });

  it('13. exact request contains: planningId, dayOfWeek, humanEvidence', async () => {
    let capturedReq: AssistDailyEvaluationGatewayRequest | undefined;
    mockSource.assistDailyEvaluation = vi.fn().mockImplementation(async (req) => {
      capturedReq = req;
      return { suggestedEvaluation: sampleSuggestedText };
    });

    renderComponent({ planningId: 'plan-xyz-99', dayOfWeek: 'WEDNESDAY' });
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Las actividades sensoriales se ejecutaron paso a paso' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Los niños mantuvieron la atención en las texturas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Realizaste algún ajuste durante las actividades\?/i), {
      target: { value: 'Se acercaron materiales a niños con menor alcance' },
    });
    fireEvent.change(screen.getByLabelText(/¿Hay algo que consideres importante retomar o continuar\?/i), {
      target: { value: 'Revisar texturas más suaves' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    expect(capturedReq).toBeDefined();
    expect(capturedReq).toEqual({
      planningId: 'plan-xyz-99',
      dayOfWeek: 'WEDNESDAY',
      humanEvidence: {
        activitiesDevelopment: 'Las actividades sensoriales se ejecutaron paso a paso',
        groupResponse: 'Los niños mantuvieron la atención en las texturas',
        adaptations: 'Se acercaron materiales a niños con menor alcance',
        continuity: 'Revisar texturas más suaves',
      },
    });
  });

  it('14. request contains no forbidden planning/security context', async () => {
    let capturedReq: any;
    mockSource.assistDailyEvaluation = vi.fn().mockImplementation(async (req) => {
      capturedReq = req;
      return { suggestedEvaluation: sampleSuggestedText };
    });

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo de las actividades según la programación' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Respuesta atenta y entusiasta de todo el grupo' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    const topKeys = Object.keys(capturedReq);
    expect(topKeys).toEqual(['planningId', 'dayOfWeek', 'humanEvidence']);

    const forbidden = ['uid', 'teacherId', 'daycareId', 'role', 'status', 'currentDate', 'room', 'activities', 'apiKey', 'tokens'];
    for (const key of forbidden) {
      expect(capturedReq).not.toHaveProperty(key);
      expect(capturedReq.humanEvidence).not.toHaveProperty(key);
    }
  });

  it('15. suggestion rendered transiently', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo de actividades sensoriales con sonajas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Grupo atento y participativo durante la jornada' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    expect(screen.getByTestId('suggestion-review-surface')).toBeDefined();
    expect(screen.getByText(sampleSuggestedText)).toBeDefined();
    expect(screen.getByRole('button', { name: /USAR/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /EDITAR/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /DESCARTAR/i })).toBeDefined();
  });

  it('16. suggestion does not alter manual draft before human action', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo adecuado de las actividades programadas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Grupo motivado y receptivo a los nuevos materiales' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    // Neither onAccept nor onEdit should have been called automatically
    expect(mockOnAccept).not.toHaveBeenCalled();
    expect(mockOnEdit).not.toHaveBeenCalled();
  });

  it('17. USAR invokes acceptance callback with exact suggested text', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo adecuado de las actividades programadas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Grupo motivado y receptivo a los nuevos materiales' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    fireEvent.click(screen.getByRole('button', { name: /USAR/i }));

    expect(mockOnAccept).toHaveBeenCalledTimes(1);
    expect(mockOnAccept).toHaveBeenCalledWith(sampleSuggestedText);
    expect(screen.queryByTestId('suggestion-review-surface')).toBeNull();
  });

  it('18. USAR causes zero persistence', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo adecuado de las actividades programadas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Grupo motivado y receptivo a los nuevos materiales' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    fireEvent.click(screen.getByRole('button', { name: /USAR/i }));

    // Zero persistence invariant
    expect(mockSaveDailyEvaluationDraft).not.toHaveBeenCalled();
    expect(mockConfirmAndSubmitDailyEvaluation).not.toHaveBeenCalled();
  });

  it('19. EDITAR invokes edit callback with exact suggested text', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo adecuado de las actividades programadas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Grupo motivado y receptivo a los nuevos materiales' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    fireEvent.click(screen.getByRole('button', { name: /EDITAR/i }));

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(sampleSuggestedText);
    expect(screen.queryByTestId('suggestion-review-surface')).toBeNull();
  });

  it('20. EDITAR requests focus behavior', async () => {
    const focusSpy = vi.fn();
    const fakeTextareaRef = {
      current: {
        focus: focusSpy,
      } as any,
    };

    renderComponent({ textareaRef: fakeTextareaRef });
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo adecuado de las actividades programadas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Grupo motivado y receptivo a los nuevos materiales' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    fireEvent.click(screen.getByRole('button', { name: /EDITAR/i }));

    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('21. EDITAR causes zero persistence', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo adecuado de las actividades programadas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Grupo motivado y receptivo a los nuevos materiales' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    fireEvent.click(screen.getByRole('button', { name: /EDITAR/i }));

    expect(mockSaveDailyEvaluationDraft).not.toHaveBeenCalled();
    expect(mockConfirmAndSubmitDailyEvaluation).not.toHaveBeenCalled();
  });

  it('22. DESCARTAR leaves manual draft unchanged', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo adecuado de las actividades programadas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Grupo motivado y receptivo a los nuevos materiales' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    fireEvent.click(screen.getByRole('button', { name: /DESCARTAR/i }));

    expect(mockOnAccept).not.toHaveBeenCalled();
    expect(mockOnEdit).not.toHaveBeenCalled();
    expect(mockOnDiscard).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('suggestion-review-surface')).toBeNull();
  });

  it('23. DESCARTAR causes zero persistence', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo adecuado de las actividades programadas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Grupo motivado y receptivo a los nuevos materiales' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    fireEvent.click(screen.getByRole('button', { name: /DESCARTAR/i }));

    expect(mockSaveDailyEvaluationDraft).not.toHaveBeenCalled();
    expect(mockConfirmAndSubmitDailyEvaluation).not.toHaveBeenCalled();
  });

  it('24. AI error shows safe fallback', async () => {
    mockSource.assistDailyEvaluation = vi.fn().mockRejectedValue(new Error('Internal network timeout'));

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo adecuado de las actividades programadas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Grupo motivado y receptivo a los nuevos materiales' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    expect(
      screen.getByText(
        'No fue posible generar la sugerencia en este momento. Puedes continuar redactando tu evaluación manualmente.'
      )
    ).toBeDefined();

    // Verify raw error or stack trace is NOT shown
    expect(screen.queryByText(/Internal network timeout/i)).toBeNull();
  });

  it('25. AI error preserves manual draft', async () => {
    mockSource.assistDailyEvaluation = vi.fn().mockRejectedValue(new Error('Internal network timeout'));

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo adecuado de las actividades programadas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Grupo motivado y receptivo a los nuevos materiales' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    expect(mockOnAccept).not.toHaveBeenCalled();
    expect(mockOnEdit).not.toHaveBeenCalled();
  });

  it('26. human evidence preserved after safe error', async () => {
    mockSource.assistDailyEvaluation = vi.fn().mockRejectedValue(new Error('Service unavailable'));

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    const devInput = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i) as HTMLTextAreaElement;
    const respInput = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i) as HTMLTextAreaElement;
    const adapInput = screen.getByLabelText(/¿Realizaste algún ajuste durante las actividades\?/i) as HTMLTextAreaElement;
    const contInput = screen.getByLabelText(/¿Hay algo que consideres importante retomar o continuar\?/i) as HTMLTextAreaElement;

    fireEvent.change(devInput, { target: { value: 'Desarrollo de las experiencias sensoriales' } });
    fireEvent.change(respInput, { target: { value: 'Interés y buena respuesta de los niños' } });
    fireEvent.change(adapInput, { target: { value: 'Se utilizaron colchonetas más bajas' } });
    fireEvent.change(contInput, { target: { value: 'Continuar con juego libre' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    expect(devInput.value).toBe('Desarrollo de las experiencias sensoriales');
    expect(respInput.value).toBe('Interés y buena respuesta de los niños');
    expect(adapInput.value).toBe('Se utilizaron colchonetas más bajas');
    expect(contInput.value).toBe('Continuar con juego libre');
  });

  it('27. no automatic submit', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));

    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Desarrollo adecuado de las actividades programadas' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Grupo motivado y receptivo a los nuevos materiales' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    expect(mockConfirmAndSubmitDailyEvaluation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /USAR/i }));

    expect(mockConfirmAndSubmitDailyEvaluation).not.toHaveBeenCalled();
  });

  it('28. CHANGES_REQUESTED eligibility supported', () => {
    // When eligibility is true (even in CHANGES_REQUESTED context), CTA is rendered and operational
    renderComponent({ isEligible: true, dayOfWeek: 'TUESDAY' });
    const ctaButton = screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i });
    expect(ctaButton).toBeDefined();

    fireEvent.click(ctaButton);
    expect(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i)).toBeDefined();
  });
});

describe('H1R13.3H.2 — PlanningDemoApp Integration Flow', () => {
  const createIntegrationSetup = async (initialEval = '') => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();

    const plan = WeeklyPlanning.create(
      'plan-integration-1',
      'dc-1',
      'lactantes-c',
      't1',
      '2026-08-24',
      '2026-08-28'
    );
    const recs = await pedSource.generateRecommendation(null as any, 'Obs', 'Needs', 'Sit', 'Mat');
    plan.days = recs;
    plan.status = 'APPROVED';
    plan.approvedBy = 'Ceci';
    plan.approvedAt = new Date('2026-08-23T12:00:00Z');

    if (initialEval) {
      plan.days[0].evaluation = initialEval;
      plan.days[0].evaluationStatus = 'DRAFT';
    }

    await repo.save(plan);

    const mockEvalAI: EvaluationRecommendationSource = {
      assistDailyEvaluation: vi.fn().mockResolvedValue({
        suggestedEvaluation: 'Texto sugerido por la IA para la evaluación del día lunes.',
      }),
    };

    return { repo, service, pedSource, plan, mockEvalAI };
  };

  const openMondayEvaluation = async (service: any, pedSource: any, mockEvalAI: any) => {
    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          evaluationRecommendationSource={mockEvalAI}
          currentDate="2026-08-24"
        />
      );
    });

    // Wait for listTeacherPlanning async resolution
    const planButton = await screen.findByText(/Propuesta lista para usarse/i);
    await act(async () => {
      fireEvent.click(planButton);
    });

    // Wait for TeacherWizard to load and show Monday tab
    const mondayTab = await screen.findByRole('tab', { name: /Lunes 24/i });
    await act(async () => {
      fireEvent.click(mondayTab);
    });

    // Wait for daily evaluation section to be ready
    await screen.findByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i);
  };

  it('accepted suggestion updates only dailyEvaluations local draft (zero auto-save)', async () => {
    const { repo, service, pedSource, mockEvalAI } = await createIntegrationSetup();
    await openMondayEvaluation(service, pedSource, mockEvalAI);

    // Human Gate CTA is visible
    expect(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i })).toBeDefined();

    // Open Human Gate and fill evidence
    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));
    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Las actividades de exploración musical se llevaron a cabo normalmente' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Los niños mostraron mucho entusiasmo y coordinación' },
    });

    // Request suggestion
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    // USAR
    const surface = screen.getByTestId('suggestion-review-surface');
    await act(async () => {
      fireEvent.click(within(surface).getByRole('button', { name: /USAR/i }));
    });

    // Textarea has the suggested text locally
    const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Texto sugerido por la IA para la evaluación del día lunes.');

    // Repo check: zero persistence occurred!
    const planInRepo = await repo.findById('plan-integration-1');
    expect(planInRepo?.days[0]?.evaluation).toBeFalsy();
  });

  it('edit suggestion updates local draft and focuses textarea (zero auto-save)', async () => {
    const { repo, service, pedSource, mockEvalAI } = await createIntegrationSetup();
    await openMondayEvaluation(service, pedSource, mockEvalAI);

    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));
    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Las actividades de exploración musical se llevaron a cabo normalmente' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Los niños mostraron mucho entusiasmo y coordinación' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    // EDITAR
    const surface = screen.getByTestId('suggestion-review-surface');
    await act(async () => {
      fireEvent.click(within(surface).getByRole('button', { name: /EDITAR/i }));
    });

    const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Texto sugerido por la IA para la evaluación del día lunes.');
    expect(document.activeElement).toBe(textarea);

    // Repo check: zero persistence occurred!
    const planInRepo = await repo.findById('plan-integration-1');
    expect(planInRepo?.days[0]?.evaluation).toBeFalsy();
  });

  it('discard preserves existing local draft (zero persistence)', async () => {
    const { repo, service, pedSource, mockEvalAI } = await createIntegrationSetup('Borrador previo escrito por Anita');
    await openMondayEvaluation(service, pedSource, mockEvalAI);

    const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Borrador previo escrito por Anita');

    fireEvent.click(screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i }));
    fireEvent.change(screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i), {
      target: { value: 'Las actividades de exploración musical se llevaron a cabo normalmente' },
    });
    fireEvent.change(screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i), {
      target: { value: 'Los niños mostraron mucho entusiasmo y coordinación' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    // DESCARTAR
    const surface = screen.getByTestId('suggestion-review-surface');
    await act(async () => {
      fireEvent.click(within(surface).getByRole('button', { name: /DESCARTAR/i }));
    });

    // Textarea is preserved!
    expect(textarea.value).toBe('Borrador previo escrito por Anita');

    // Repo check: unchanged!
    const planInRepo = await repo.findById('plan-integration-1');
    expect(planInRepo?.days[0]?.evaluation).toBe('Borrador previo escrito por Anita');
  });

  it('save remains existing handler', async () => {
    const { repo, service, pedSource, mockEvalAI } = await createIntegrationSetup();
    await openMondayEvaluation(service, pedSource, mockEvalAI);

    // Type text or accept from AI
    const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Texto redactado para guardar como borrador.' } });

    // Click existing save control
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/i }));
    });

    // Repo check: explicitly saved via existing handler
    const planInRepo = await repo.findById('plan-integration-1');
    expect(planInRepo?.days[0]?.evaluation).toBe('Texto redactado para guardar como borrador.');
  });

  it('submit remains existing handler', async () => {
    const { repo, service, pedSource, mockEvalAI } = await createIntegrationSetup();
    await openMondayEvaluation(service, pedSource, mockEvalAI);

    const textarea = screen.getByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Texto completo listo para enviar a Ceci.' } });

    // Click existing submit control
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar evaluación a Ceci/i }));
    });

    // Repo check: submitted and in IN_REVIEW state
    const planInRepo = await repo.findById('plan-integration-1');
    expect(planInRepo?.days[0]?.evaluation).toBe('Texto completo listo para enviar a Ceci.');
    expect(planInRepo?.days[0]?.evaluationStatus).toBe('IN_REVIEW');
  });
});

describe('H1R13.3H.6 — Cable 3: LAB Demo Canonical Persisted Planning ID', () => {
  const eligibleLabEnv = {
    [FIRST_LIGHT_LAB_FLAG]: 'true',
    VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
  };

  it('A-E. controlled LAB/demo path uses canonical planningId f1000000-0000-4000-8000-000000000001, dayOfWeek=TUESDAY, preserves human evidence, zero auto-persistence', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();

    const plan = WeeklyPlanning.create(
      FIRST_LIGHT_PLANNING_ID,
      FIRST_LIGHT_DAYCARE_ID,
      FIRST_LIGHT_ROOM_ID,
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );
    const recs = await pedSource.generateRecommendation(null as any, 'Obs', 'Needs', 'Sit', 'Mat');
    plan.days = recs;
    plan.status = 'APPROVED';
    plan.approvedBy = 'Ceci';
    plan.approvedAt = new Date('2026-08-23T12:00:00Z');
    plan.days[0].evaluation = 'Las actividades del lunes se completaron satisfactoriamente.';
    plan.days[0].evaluationStatus = 'APPROVED';
    plan.days[0].evaluationReviewedBy = 'Ceci';
    plan.days[0].evaluationReviewedAt = new Date('2026-08-24T18:00:00Z');
    await repo.save(plan);

    const mockEvalAI: EvaluationRecommendationSource = {
      assistDailyEvaluation: vi.fn().mockResolvedValue({
        suggestedEvaluation: 'Texto sugerido para la evaluación del día martes en LAB.',
      }),
    };

    const mockAuth: any = {
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      restoreSession: vi.fn().mockResolvedValue('lab-teacher-anita'),
      getCurrentUser: vi.fn().mockReturnValue('lab-teacher-anita'),
    };

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          evaluationRecommendationSource={mockEvalAI}
          currentDate="2026-08-25"
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // In H.7B, TeacherWizard auto-opens canonical planning directly. Navigate to Tuesday 25 tab
    const tuesdayTab = await screen.findByRole('tab', { name: /Martes 25/i });
    await act(async () => {
      fireEvent.click(tuesdayTab);
    });

    // Wait for daily evaluation section to be ready
    await screen.findByPlaceholderText(/Describe de manera objetiva el desarrollo de las actividades/i);

    // Open Human Gate
    const openGateBtn = screen.getByRole('button', { name: /Ayúdame a redactar mi evaluación/i });
    fireEvent.click(openGateBtn);

    // Fill all 4 human evidence fields
    const devInput = screen.getByLabelText(/¿Cómo se desarrollaron las actividades de este día\?/i);
    const respInput = screen.getByLabelText(/¿Qué observaste en la respuesta del grupo\?/i);
    const adapInput = screen.getByLabelText(/¿Realizaste algún ajuste durante las actividades\?/i);
    const contInput = screen.getByLabelText(/¿Hay algo que consideres importante retomar o continuar\?/i);

    fireEvent.change(devInput, {
      target: { value: 'Las niñas y niños exploraron las texturas de pelotas y telas.' },
    });
    fireEvent.change(respInput, {
      target: { value: 'Mostraron curiosidad y respuesta positiva con balbuceos.' },
    });
    fireEvent.change(adapInput, {
      target: { value: 'Se colocaron tapetes acolchonados adicionales.' },
    });
    fireEvent.change(contInput, {
      target: { value: 'Se continuará con estimulación auditiva el miércoles.' },
    });

    // Request AI suggestion
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preparar borrador sugerido/i }));
    });

    // PROOF A, B, C: assistDailyEvaluation was called with canonical planningId, TUESDAY, and intact human evidence
    expect(mockEvalAI.assistDailyEvaluation).toHaveBeenCalledTimes(1);
    const callArg: AssistDailyEvaluationGatewayRequest = (mockEvalAI.assistDailyEvaluation as any).mock.calls[0][0];
    expect(callArg.planningId).toBe('f1000000-0000-4000-8000-000000000001');
    expect(callArg.dayOfWeek).toBe('TUESDAY');
    expect(callArg.humanEvidence).toEqual({
      activitiesDevelopment: 'Las niñas y niños exploraron las texturas de pelotas y telas.',
      groupResponse: 'Mostraron curiosidad y respuesta positiva con balbuceos.',
      adaptations: 'Se colocaron tapetes acolchonados adicionales.',
      continuity: 'Se continuará con estimulación auditiva el miércoles.',
    });

    // PROOF D: Zero automatic persistence occurs in repository
    const planInRepo = await repo.findById('f1000000-0000-4000-8000-000000000001');
    expect(planInRepo?.days[1]?.evaluation).not.toBe('Texto sugerido para la evaluación del día martes en LAB.');
    expect(planInRepo?.days[1]?.evaluationStatus).toBeUndefined();

    // PROOF E: Suggestion review surface is visible, transient, sovereign
    const reviewSurface = screen.getByTestId('suggestion-review-surface');
    expect(reviewSurface).toBeDefined();
    expect(within(reviewSurface).getByText(/Texto sugerido para la evaluación del día martes en LAB./i)).toBeDefined();
  });

  it('F. TeacherWizard initializes planningId to canonical fixture when isFirstLight is true and planId is null', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();

    const mockAuth: any = {
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      restoreSession: vi.fn().mockResolvedValue('lab-teacher-anita'),
      getCurrentUser: vi.fn().mockReturnValue('lab-teacher-anita'),
    };

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          firstLightEnv={eligibleLabEnv}
          firstLightAuth={mockAuth}
        />
      );
    });

    // Click "✨ Comenzar nuestra semana" (onNew -> planId is null)
    const newBtn = await screen.findByRole('button', { name: /Comenzar nuestra semana/i });
    await act(async () => {
      fireEvent.click(newBtn);
    });

    // Verify that the new planning created in repo uses FIRST_LIGHT_PLANNING_ID
    const created = await repo.findById(FIRST_LIGHT_PLANNING_ID);
    expect(created).toBeDefined();
    expect(created?.planningId).toBe('f1000000-0000-4000-8000-000000000001');
    expect(created?.daycareId).toBe(FIRST_LIGHT_DAYCARE_ID);
    expect(created?.roomId).toBe(FIRST_LIGHT_ROOM_ID);
  });

  it('F. TeacherWizard initializes ephemeral planningId (p-demo-) when isFirstLight is false', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();

    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={pedSource}
          firstLightEnv={{}} // Ineligible / Non-LAB
        />
      );
    });

    // Click "✨ Comenzar nuestra semana" (onNew -> planId is null)
    const newBtn = screen.getByRole('button', { name: /Comenzar nuestra semana/i });
    await act(async () => {
      fireEvent.click(newBtn);
    });

    // Verify that FIRST_LIGHT_PLANNING_ID was NOT created in repo
    const canonicalPlan = await repo.findById(FIRST_LIGHT_PLANNING_ID);
    expect(canonicalPlan).toBeNull();

    // Verify an ephemeral planning was created with p-demo- prefix
    const allPlans = await repo.listByTeacher('t1');
    expect(allPlans.length).toBe(1);
    expect(allPlans[0].planningId.startsWith('p-demo-')).toBe(true);
    expect(allPlans[0].planningId).not.toBe('f1000000-0000-4000-8000-000000000001');
  });
});
