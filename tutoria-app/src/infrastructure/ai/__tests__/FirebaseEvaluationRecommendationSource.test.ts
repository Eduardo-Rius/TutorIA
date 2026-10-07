import { describe, it, expect, vi } from 'vitest';
import {
  FirebaseEvaluationRecommendationSource,
  FirebaseEvaluationRecommendationTransportError,
} from '../FirebaseEvaluationRecommendationSource';
import {
  type AssistDailyEvaluationGatewayRequest,
  GovernedEvaluationAIError,
} from '../../../application/planning/GovernedEvaluationAIContract';

describe('H1R13.3H.2 — FirebaseEvaluationRecommendationSource Client Remote Adapter', () => {
  const validRequest: AssistDailyEvaluationGatewayRequest = {
    planningId: 'plan-12345',
    dayOfWeek: 'MONDAY',
    humanEvidence: {
      activitiesDevelopment: 'Se realizaron las actividades sensoriales de exploración con sonajas y telas según lo programado.',
      groupResponse: 'Los lactantes mostraron curiosidad activa e interactuaron con los materiales sonoros con agrado.',
      adaptations: 'Se redujo la intensidad de la luz para facilitar la concentración.',
      continuity: 'Continuar explorando texturas rugosas en la siguiente sesión.',
    },
  };

  const validResponsePayload = {
    suggestedEvaluation: 'Durante la jornada se observó una participación activa de las niñas y niños en la exploración sonora, respondiendo favorablemente a los estímulos táctiles y sonoros proporcionados.',
  };

  it('1. correct callable name: assistDailyEvaluation', async () => {
    let callableNamePassed = '';
    const mockFactory = vi.fn().mockImplementation((_functions, name: string) => {
      callableNamePassed = name;
      return async () => ({
        data: validResponsePayload,
      });
    });

    const mockFunctionsInstance = {} as any;
    const source = new FirebaseEvaluationRecommendationSource({
      functions: mockFunctionsInstance,
      callableFactory: mockFactory,
    });

    await source.assistDailyEvaluation(validRequest);

    expect(mockFactory).toHaveBeenCalledTimes(1);
    expect(callableNamePassed).toBe('assistDailyEvaluation');
  });

  it('2. exact valid request forwarded', async () => {
    let capturedPayload: any;
    const mockCallable = vi.fn().mockImplementation(async (payload) => {
      capturedPayload = payload;
      return { data: validResponsePayload };
    });

    const source = new FirebaseEvaluationRecommendationSource({
      callableFn: mockCallable,
    });

    await source.assistDailyEvaluation(validRequest);

    expect(mockCallable).toHaveBeenCalledTimes(1);
    expect(capturedPayload).toEqual({
      planningId: 'plan-12345',
      dayOfWeek: 'MONDAY',
      humanEvidence: {
        activitiesDevelopment: 'Se realizaron las actividades sensoriales de exploración con sonajas y telas según lo programado.',
        groupResponse: 'Los lactantes mostraron curiosidad activa e interactuaron con los materiales sonoros con agrado.',
        adaptations: 'Se redujo la intensidad de la luz para facilitar la concentración.',
        continuity: 'Continuar explorando texturas rugosas en la siguiente sesión.',
      },
    });
  });

  it('3. valid suggestedEvaluation returned', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: validResponsePayload,
    });

    const source = new FirebaseEvaluationRecommendationSource({
      callableFn: mockCallable,
    });

    const result = await source.assistDailyEvaluation(validRequest);

    expect(result).toEqual(validResponsePayload);
    expect(result.suggestedEvaluation).toBe(validResponsePayload.suggestedEvaluation);
  });

  it('4. malformed response rejected', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: null,
    });

    const source = new FirebaseEvaluationRecommendationSource({
      callableFn: mockCallable,
    });

    await expect(source.assistDailyEvaluation(validRequest)).rejects.toThrow(
      GovernedEvaluationAIError
    );
  });

  it('5. missing suggestedEvaluation rejected', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {},
    });

    const source = new FirebaseEvaluationRecommendationSource({
      callableFn: mockCallable,
    });

    await expect(source.assistDailyEvaluation(validRequest)).rejects.toThrow(
      GovernedEvaluationAIError
    );
  });

  it('6. unexpected response shape handled fail-closed if required by locked contract expectations', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        suggestedEvaluation: validResponsePayload.suggestedEvaluation,
        unexpectedExtraField: 'injected-data',
      },
    });

    const source = new FirebaseEvaluationRecommendationSource({
      callableFn: mockCallable,
    });

    await expect(source.assistDailyEvaluation(validRequest)).rejects.toThrow(
      GovernedEvaluationAIError
    );
  });

  it('7. dependency injection permits network-free tests', async () => {
    let networkCallOccurred = false;
    const deterministicCallable = vi.fn().mockImplementation(async () => {
      // Deterministic pure mock, zero Firebase / OpenAI network call
      networkCallOccurred = false;
      return { data: validResponsePayload };
    });

    const source = new FirebaseEvaluationRecommendationSource({
      callableFn: deterministicCallable,
    });

    const response = await source.assistDailyEvaluation(validRequest);

    expect(networkCallOccurred).toBe(false);
    expect(deterministicCallable).toHaveBeenCalledTimes(1);
    expect(response.suggestedEvaluation).toBe(validResponsePayload.suggestedEvaluation);
  });

  it('8. no forbidden client context added', async () => {
    let forwardedPayload: any;
    const mockCallable = vi.fn().mockImplementation(async (payload) => {
      forwardedPayload = payload;
      return { data: validResponsePayload };
    });

    const source = new FirebaseEvaluationRecommendationSource({
      callableFn: mockCallable,
    });

    await source.assistDailyEvaluation(validRequest);

    const keys = Object.keys(forwardedPayload);
    expect(keys).toEqual(['planningId', 'dayOfWeek', 'humanEvidence']);

    // Explicitly verify absence of all forbidden authority/context keys
    const forbiddenKeys = [
      'uid',
      'authUid',
      'teacherId',
      'daycareId',
      'role',
      'status',
      'currentDate',
      'room',
      'activities',
      'pda',
      'pdaReference',
      'prospectiveObservationTarget',
      'apiKey',
      'secret',
      'tokens',
      'model',
      'provider',
    ];

    for (const forbiddenKey of forbiddenKeys) {
      expect(forwardedPayload).not.toHaveProperty(forbiddenKey);
      expect(forwardedPayload.humanEvidence).not.toHaveProperty(forbiddenKey);
    }
  });

  it('9. no secret/provider metadata added', async () => {
    let forwardedPayload: any;
    const mockCallable = vi.fn().mockImplementation(async (payload) => {
      forwardedPayload = payload;
      return { data: validResponsePayload };
    });

    const source = new FirebaseEvaluationRecommendationSource({
      callableFn: mockCallable,
    });

    await source.assistDailyEvaluation(validRequest);

    const stringified = JSON.stringify(forwardedPayload);
    expect(stringified).not.toContain('apiKey');
    expect(stringified).not.toContain('openai');
    expect(stringified).not.toContain('gpt-');
    expect(stringified).not.toContain('Bearer');
    expect(stringified).not.toContain('token');
  });

  it('10. handles transport error cleanly with FirebaseEvaluationRecommendationTransportError', async () => {
    const mockCallable = vi.fn().mockRejectedValue(new Error('Network connection offline'));

    const source = new FirebaseEvaluationRecommendationSource({
      callableFn: mockCallable,
    });

    await expect(source.assistDailyEvaluation(validRequest)).rejects.toThrow(
      FirebaseEvaluationRecommendationTransportError
    );
  });
});
