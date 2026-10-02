import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OpenAIWeeklyPlanningExecutor,
  WeeklyPlanningAIExecutorConfigurationError,
  WeeklyPlanningAIExecutorTransportError,
  WeeklyPlanningAIExecutorHttpError,
  WeeklyPlanningAIExecutorInvalidResponseError,
  DEFAULT_WEEKLY_PLANNING_AI_MODEL,
  DEFAULT_WEEKLY_PLANNING_MAX_COMPLETION_TOKENS,
  DEFAULT_WEEKLY_PLANNING_TEMPERATURE,
  DEFAULT_WEEKLY_PLANNING_TIMEOUT_MS,
  WeeklyPlanningAITelemetryEvent,
  parseSafeTokenCount,
} from '../OpenAIWeeklyPlanningExecutor';
import {
  WeeklyPlanningAIPromptPayload,
  AIWeeklyPlanningProposalSource,
  buildPrivacyMinimizedAIInput,
  buildWeeklyPlanningAIPromptPayload,
} from '../../../application/planning/AIWeeklyPlanningProposalSource';
import {
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
  InvalidWeeklyPlanningProposalError,
} from '../../../application/planning/WeeklyPlanningProposalSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';

describe('OpenAIWeeklyPlanningExecutor (H1R11.4 Foundation)', () => {
  const FAKE_TEST_API_KEY = 'test-openai-key-fake-12345';

  const sampleActivitiesForDay = [
    {
      category: 'EXPERIENCIAS ARTÍSTICAS',
      objective: 'Estimulación auditiva suave.',
      proceduralAction: 'Cantar nanas con {material} de fondo.',
      materialRefs: ['MAT-03'],
      durationMinutes: 15,
    },
    {
      category: 'AMBIENTES DE APRENDIZAJE',
      objective: 'Exploración táctil en manos.',
      proceduralAction: 'Deslizar {material} sobre las manos.',
      materialRefs: ['MAT-02'],
      durationMinutes: 15,
    },
    {
      category: 'ACTIVACIÓN FÍSICA',
      objective: 'Pataleo libre guiado.',
      proceduralAction: 'Presentar {material} durante el movimiento suave de piernas.',
      materialRefs: ['MAT-01'],
      durationMinutes: 15,
    },
    {
      category: 'LECTURA EN VOZ ALTA',
      objective: 'Escucha de narración rítmica.',
      proceduralAction: 'Entonar rimas cortas con {material} suave de fondo.',
      materialRefs: ['MAT-03'],
      durationMinutes: 15,
    },
    {
      category: 'PENSAMIENTO MATEMÁTICO',
      objective: 'Seguimiento visual.',
      proceduralAction: 'Mover suavemente {material} en el campo visual.',
      materialRefs: ['MAT-01'],
      durationMinutes: 15,
    },
  ];

  const validModelProposalJson = JSON.stringify({
    days: [
      { dayOfWeek: 'MONDAY', activities: sampleActivitiesForDay },
      { dayOfWeek: 'TUESDAY', activities: sampleActivitiesForDay },
      { dayOfWeek: 'WEDNESDAY', activities: sampleActivitiesForDay },
      { dayOfWeek: 'THURSDAY', activities: sampleActivitiesForDay },
      { dayOfWeek: 'FRIDAY', activities: sampleActivitiesForDay },
    ],
  });

  const createMockOpenAISuccessResponse = (
    contentString: string = validModelProposalJson,
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } = {
      prompt_tokens: 450,
      completion_tokens: 320,
      total_tokens: 770,
    }
  ): Response => {
    const body = {
      id: 'chatcmpl-mock-test-001',
      object: 'chat.completion',
      created: 1727600000,
      model: DEFAULT_WEEKLY_PLANNING_AI_MODEL,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: contentString,
          },
          finish_reason: 'stop',
        },
      ],
      usage,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const sampleDirectRequest: WeeklyPlanningProposalRequest = {
    modality: 'DIRECT',
    room: {
      roomId: 'room-lactantes-1',
      name: 'Lactantes A',
      minAgeMonths: 0,
      maxAgeMonths: 6,
    },
    weekStart: '2026-10-05',
    weekEnd: '2026-10-09',
    currentContext: {
      observations: 'El grupo muestra interés en texturas y nanas suaves.',
      identifiedNeeds: 'Consolidar sostén cefálico y pataleo libre.',
      specialSituations: 'Dos alumnos en periodo de adaptación.',
      availableMaterials: 'Pelotas suaves, telas de diferentes texturas, música infantil.',
    },
    constraints: {
      minActivitiesPerDay: 5,
      maxActivitiesPerDay: 5,
      minDurationMinutes: 10,
      maxDurationMinutes: 30,
    },
  };

  const sampleIndirectRequest: WeeklyPlanningProposalRequest = {
    ...sampleDirectRequest,
    modality: 'INDIRECT',
  };

  let samplePayload: WeeklyPlanningAIPromptPayload;

  beforeEach(() => {
    vi.restoreAllMocks();
    samplePayload = buildWeeklyPlanningAIPromptPayload(
      buildPrivacyMinimizedAIInput(sampleDirectRequest)
    );
  });

  describe('1. Model Execution & Bounded Parameters', () => {
    it('executes with gpt-4o-mini, bounded max_tokens (3000), low temperature (0.2), and json_object format', async () => {
      const fetchFn = vi.fn().mockResolvedValue(createMockOpenAISuccessResponse());

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      const result = await executor.execute(samplePayload);

      expect(fetchFn).toHaveBeenCalledTimes(1);
      const [url, requestInit] = fetchFn.mock.calls[0];

      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(requestInit.method).toBe('POST');
      expect(requestInit.headers['Content-Type']).toBe('application/json');
      expect(requestInit.headers['Authorization']).toBe(`Bearer ${FAKE_TEST_API_KEY}`);

      const body = JSON.parse(requestInit.body);
      expect(body.model).toBe(DEFAULT_WEEKLY_PLANNING_AI_MODEL);
      expect(body.model).toBe('gpt-4o-mini');
      expect(body.max_completion_tokens).toBe(DEFAULT_WEEKLY_PLANNING_MAX_COMPLETION_TOKENS);
      expect(body.max_completion_tokens).toBe(3000);
      expect(body.temperature).toBe(DEFAULT_WEEKLY_PLANNING_TEMPERATURE);
      expect(body.temperature).toBe(0.2);
      expect(body.response_format).toEqual({ type: 'json_object' });

      // Verifies system and user prompts are passed as messages
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toBe(samplePayload.systemPrompt);
      expect(body.messages[1].role).toBe('user');
      expect(body.messages[1].content).toBe(samplePayload.userPrompt);

      // Verifies result is raw untrusted parsed object
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect((result as any).days).toHaveLength(5);
    });

    it('makes exactly one HTTP call with zero retries on failure', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('Simulated socket hang up'));

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      await expect(executor.execute(samplePayload)).rejects.toThrow(
        WeeklyPlanningAIExecutorTransportError
      );

      // Zero retries: must be invoked exactly once
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('enforces explicit bounded timeout via AbortController signal', async () => {
      let passedSignal: AbortSignal | null = null;
      const fetchFn = vi.fn().mockImplementation((_url, init) => {
        passedSignal = init.signal;
        return Promise.resolve(createMockOpenAISuccessResponse());
      });

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        timeoutMs: 15000,
        fetchFn,
      });

      await executor.execute(samplePayload);
      expect(passedSignal).toBeDefined();
      expect(passedSignal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('2. Server-Side Secret & Privacy Boundary', () => {
    it('fails with CONFIGURATION error when API key is missing', async () => {
      const fetchFn = vi.fn();
      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: '',
        fetchFn,
      });

      await expect(executor.execute(samplePayload)).rejects.toThrow(
        WeeklyPlanningAIExecutorConfigurationError
      );
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('fails with CONFIGURATION error when API key is whitespace only', async () => {
      const fetchFn = vi.fn();
      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: '   ',
        fetchFn,
      });

      await expect(executor.execute(samplePayload)).rejects.toThrow(
        WeeklyPlanningAIExecutorConfigurationError
      );
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('never leaks API key in error messages', async () => {
      const sensitiveKey = 'sk-sensitive-secret-token-do-not-leak';
      const fetchFn = vi.fn().mockResolvedValue(new Response('Forbidden', { status: 403 }));

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: sensitiveKey,
        fetchFn,
      });

      try {
        await executor.execute(samplePayload);
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(WeeklyPlanningAIExecutorHttpError);
        const error = err as WeeklyPlanningAIExecutorHttpError;
        expect(error.message).not.toContain(sensitiveKey);
        expect(error.safeCategory).toBe('HTTP');
        expect(error.upstreamStatus).toBe(403);
      }
    });

    it('never leaks API key in telemetry', async () => {
      const sensitiveKey = 'sk-sensitive-telemetry-key-999';
      const telemetryEvents: WeeklyPlanningAITelemetryEvent[] = [];
      const fetchFn = vi.fn().mockResolvedValue(createMockOpenAISuccessResponse());

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: sensitiveKey,
        fetchFn,
        onTelemetry: (ev) => telemetryEvents.push(ev),
      });

      await executor.execute(samplePayload);

      expect(telemetryEvents.length).toBeGreaterThan(0);
      for (const ev of telemetryEvents) {
        const serialized = JSON.stringify(ev);
        expect(serialized).not.toContain(sensitiveKey);
      }
    });

    it('never includes prompts, pedagogical free text, or PII in telemetry events', async () => {
      const telemetryEvents: WeeklyPlanningAITelemetryEvent[] = [];
      const fetchFn = vi.fn().mockResolvedValue(createMockOpenAISuccessResponse());

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
        onTelemetry: (ev) => telemetryEvents.push(ev),
      });

      await executor.execute(samplePayload);

      expect(telemetryEvents).toHaveLength(2); // started + completed
      const [started, completed] = telemetryEvents;

      expect(started.event).toBe('weekly_planning_ai.started');
      expect(completed.event).toBe('weekly_planning_ai.completed');

      const serializedStarted = JSON.stringify(started);
      const serializedCompleted = JSON.stringify(completed);

      // Verify prompt text excluded
      expect(serializedStarted).not.toContain('You are TutorIA');
      expect(serializedCompleted).not.toContain('You are TutorIA');

      // Verify educator context excluded
      expect(serializedStarted).not.toContain('El grupo muestra interés');
      expect(serializedCompleted).not.toContain('El grupo muestra interés');
      expect(serializedStarted).not.toContain('Consolidar motricidad');
      expect(serializedCompleted).not.toContain('Consolidar motricidad');
      expect(serializedStarted).not.toContain('Pintura dactilar');
      expect(serializedCompleted).not.toContain('Pintura dactilar');

      // Verify internal IDs excluded
      expect(serializedStarted).not.toContain('room-maternal-1');
      expect(serializedCompleted).not.toContain('room-maternal-1');
    });
  });

  describe('3. Safe Error Taxonomy', () => {
    it('classifies 401 Unauthorized as HTTP error with safeCategory HTTP and upstreamStatus 401', async () => {
      const fetchFn = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      try {
        await executor.execute(samplePayload);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(WeeklyPlanningAIExecutorHttpError);
        expect(err.safeCategory).toBe('HTTP');
        expect(err.upstreamStatus).toBe(401);
        expect(err.message).toBe('Weekly planning AI upstream HTTP error (401).');
        expect(err.message).not.toContain('Invalid API key');
      }
    });

    it('classifies 429 Rate Limited as HTTP error with safeCategory HTTP and upstreamStatus 429', async () => {
      const fetchFn = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      try {
        await executor.execute(samplePayload);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(WeeklyPlanningAIExecutorHttpError);
        expect(err.safeCategory).toBe('HTTP');
        expect(err.upstreamStatus).toBe(429);
        expect(err.message).toBe('Weekly planning AI upstream HTTP error (429).');
        expect(err.message).not.toContain('Quota exceeded');
      }
    });

    it('classifies 500 Internal Server Error as HTTP error with safeCategory HTTP and upstreamStatus 500', async () => {
      const fetchFn = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Internal server error' } }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      try {
        await executor.execute(samplePayload);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(WeeklyPlanningAIExecutorHttpError);
        expect(err.safeCategory).toBe('HTTP');
        expect(err.upstreamStatus).toBe(500);
        expect(err.message).toBe('Weekly planning AI upstream HTTP error (500).');
        expect(err.message).not.toContain('Internal server error');
      }
    });

    it('classifies network fetch rejection as TRANSPORT error with safeCategory TRANSPORT', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      try {
        await executor.execute(samplePayload);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(WeeklyPlanningAIExecutorTransportError);
        expect(err.safeCategory).toBe('TRANSPORT');
        expect(err.message).toBe('Weekly planning AI transport failure during request dispatch.');
      }
    });

    it('classifies timeout/abort as TRANSPORT error with safeCategory TRANSPORT', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      const fetchFn = vi.fn().mockRejectedValue(abortError);

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        timeoutMs: 5000,
        fetchFn,
      });

      try {
        await executor.execute(samplePayload);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(WeeklyPlanningAIExecutorTransportError);
        expect(err.safeCategory).toBe('TRANSPORT');
        expect(err.message).toContain('request timed out after 5000ms');
      }
    });

    it('classifies malformed non-JSON envelope as INVALID_RESPONSE error', async () => {
      const fetchFn = vi.fn().mockResolvedValue(
        new Response('<html><body>502 Bad Gateway</body></html>', {
          status: 200, // Misconfigured proxy returning HTML with 200
          headers: { 'Content-Type': 'text/html' },
        })
      );

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      try {
        await executor.execute(samplePayload);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(WeeklyPlanningAIExecutorInvalidResponseError);
        expect(err.safeCategory).toBe('INVALID_RESPONSE');
        expect(err.message).toBe('Weekly planning AI response envelope is not valid JSON.');
      }
    });

    it('classifies missing or empty choices array as INVALID_RESPONSE error', async () => {
      const fetchFn = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'resp-1', choices: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      try {
        await executor.execute(samplePayload);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(WeeklyPlanningAIExecutorInvalidResponseError);
        expect(err.safeCategory).toBe('INVALID_RESPONSE');
        expect(err.message).toBe('Weekly planning AI response missing choices array.');
      }
    });

    it('classifies empty or non-string message content as INVALID_RESPONSE error', async () => {
      const fetchFn = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'resp-1',
            choices: [{ message: { role: 'assistant', content: '   ' } }],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      try {
        await executor.execute(samplePayload);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(WeeklyPlanningAIExecutorInvalidResponseError);
        expect(err.safeCategory).toBe('INVALID_RESPONSE');
        expect(err.message).toBe(
          'Weekly planning AI response message content is empty or not a string.'
        );
      }
    });

    it('classifies unparseable model JSON string as INVALID_RESPONSE error', async () => {
      const fetchFn = vi.fn().mockResolvedValue(
        createMockOpenAISuccessResponse('Not valid JSON at all')
      );

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      try {
        await executor.execute(samplePayload);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(WeeklyPlanningAIExecutorInvalidResponseError);
        expect(err.safeCategory).toBe('INVALID_RESPONSE');
        expect(err.message).toBe('Weekly planning AI model content is not valid JSON.');
      }
    });

    it('safely drains response body on non-2xx without leaking body text', async () => {
      const sensitiveLeak = 'REDACTED_UPSTREAM_CREDENTIALS_AND_KEYS';
      let drained = false;

      const mockResponse = {
        ok: false,
        status: 400,
        text: vi.fn().mockImplementation(() => {
          drained = true;
          return Promise.resolve(`{"error": {"details": "${sensitiveLeak}"}}`);
        }),
      } as unknown as Response;

      const fetchFn = vi.fn().mockResolvedValue(mockResponse);

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      try {
        await executor.execute(samplePayload);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(WeeklyPlanningAIExecutorHttpError);
        expect(drained).toBe(true);
        expect(err.message).not.toContain(sensitiveLeak);
      }
    });
  });

  describe('4. Telemetry Lifecycle & Usage Extraction', () => {
    it('emits started and completed events with safe token usage counts', async () => {
      const events: WeeklyPlanningAITelemetryEvent[] = [];
      const fetchFn = vi.fn().mockResolvedValue(
        createMockOpenAISuccessResponse(validModelProposalJson, {
          prompt_tokens: 512,
          completion_tokens: 256,
          total_tokens: 768,
        })
      );

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
        onTelemetry: (ev) => events.push(ev),
      });

      await executor.execute(samplePayload);

      expect(events).toHaveLength(2);
      expect(events[0].event).toBe('weekly_planning_ai.started');
      expect(events[0].correlationId).toBeDefined();
      expect(events[0].model).toBe('gpt-4o-mini');

      expect(events[1].event).toBe('weekly_planning_ai.completed');
      const completed = events[1] as any;
      expect(completed.correlationId).toBe(events[0].correlationId);
      expect(completed.latencyMs).toBeGreaterThanOrEqual(0);
      expect(completed.usage).toEqual({
        promptTokens: 512,
        completionTokens: 256,
        totalTokens: 768,
      });
    });

    it('emits failed event with safe category and upstreamStatus on HTTP failure', async () => {
      const events: WeeklyPlanningAITelemetryEvent[] = [];
      const fetchFn = vi.fn().mockResolvedValue(new Response('Error', { status: 429 }));

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
        onTelemetry: (ev) => events.push(ev),
      });

      await expect(executor.execute(samplePayload)).rejects.toThrow();

      expect(events).toHaveLength(2);
      expect(events[0].event).toBe('weekly_planning_ai.started');
      expect(events[1].event).toBe('weekly_planning_ai.failed');
      const failed = events[1] as any;
      expect(failed.safeErrorCategory).toBe('HTTP');
      expect(failed.upstreamStatus).toBe(429);
      expect(failed.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('never lets errors thrown by telemetry observers disrupt execution', async () => {
      const throwingObserver = vi.fn().mockImplementation(() => {
        throw new Error('Telemetry explosion');
      });

      const fetchFn = vi.fn().mockResolvedValue(createMockOpenAISuccessResponse());

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
        onTelemetry: throwingObserver,
      });

      const result = await executor.execute(samplePayload);
      expect(result).toBeDefined();
      expect(throwingObserver).toHaveBeenCalled();
    });

    it('parses valid non-negative integer token counts safely via parseSafeTokenCount', () => {
      expect(parseSafeTokenCount(100)).toBe(100);
      expect(parseSafeTokenCount(0)).toBe(0);
      expect(parseSafeTokenCount(-1)).toBeNull();
      expect(parseSafeTokenCount(3.14)).toBeNull();
      expect(parseSafeTokenCount('100')).toBeNull();
      expect(parseSafeTokenCount(null)).toBeNull();
      expect(parseSafeTokenCount(undefined)).toBeNull();
      expect(parseSafeTokenCount(NaN)).toBeNull();
      expect(parseSafeTokenCount(Infinity)).toBeNull();
    });
  });

  describe('5. Modality Neutrality (DIRECT & INDIRECT)', () => {
    it('executes successfully for DIRECT requests', async () => {
      const fetchFn = vi.fn().mockResolvedValue(createMockOpenAISuccessResponse());
      const directPayload = buildWeeklyPlanningAIPromptPayload(
        buildPrivacyMinimizedAIInput(sampleDirectRequest)
      );

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      const result = await executor.execute(directPayload);
      expect(result).toBeDefined();
      expect((result as any).days).toHaveLength(5);
    });

    it('executes successfully for INDIRECT requests', async () => {
      const fetchFn = vi.fn().mockResolvedValue(createMockOpenAISuccessResponse());
      const indirectPayload = buildWeeklyPlanningAIPromptPayload(
        buildPrivacyMinimizedAIInput(sampleIndirectRequest)
      );

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      const result = await executor.execute(indirectPayload);
      expect(result).toBeDefined();
      expect((result as any).days).toHaveLength(5);
    });
  });

  describe('6. Human Governance & Immutability Proof', () => {
    it('proves executor has zero authority to mutate WeeklyPlanning domain aggregate', async () => {
      const planning: WeeklyPlanning = WeeklyPlanning.create(
        'plan-gov-test-001',
        'daycare-1',
        'room-1',
        'teacher-1',
        '2026-10-05',
        '2026-10-09'
      );

      const snapshotBefore = JSON.stringify(planning);

      const fetchFn = vi.fn().mockResolvedValue(createMockOpenAISuccessResponse());
      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      await executor.execute(samplePayload);

      const snapshotAfter = JSON.stringify(planning);
      expect(snapshotAfter).toBe(snapshotBefore);
      expect(planning.status).toBe('DRAFT');
    });

    it('proves candidate response carries zero approval, submission, or closure authority', async () => {
      const fetchFn = vi.fn().mockResolvedValue(createMockOpenAISuccessResponse());
      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      const result = (await executor.execute(samplePayload)) as any;

      expect(result.status).toBeUndefined();
      expect(result.approvedBy).toBeUndefined();
      expect(result.submittedBy).toBeUndefined();
      expect(result.closedBy).toBeUndefined();
      expect(result.reviewHistory).toBeUndefined();
    });

    it('proves candidate response carries zero curricularTraceability, pdaId, or complementary activities', async () => {
      const fetchFn = vi.fn().mockResolvedValue(createMockOpenAISuccessResponse());
      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      const result = (await executor.execute(samplePayload)) as any;

      expect(result.curricularTraceability).toBeUndefined();
      expect(result.complementaryActivities).toBeUndefined();
      expect(result.prioritizedPractices).toBeUndefined();

      for (const day of result.days) {
        for (const act of day.activities) {
          expect(act.curricularTraceability).toBeUndefined();
          expect(act.pdaId).toBeUndefined();
          expect(act.catalogRevision).toBeUndefined();
        }
      }
    });
  });

  describe('7. End-to-End Integration Chain with AIWeeklyPlanningProposalSource', () => {
    it('successfully connects WeeklyPlanningProposalRequest -> AIWeeklyPlanningProposalSource -> OpenAIWeeklyPlanningExecutor -> WeeklyPlanningProposalResponse', async () => {
      const fetchFn = vi.fn().mockResolvedValue(createMockOpenAISuccessResponse());

      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      const proposalSource = new AIWeeklyPlanningProposalSource(executor);
      const response: WeeklyPlanningProposalResponse = await proposalSource.propose(
        sampleDirectRequest
      );

      // Verifies response is valid canonical proposal
      expect(response).toBeDefined();
      expect(response.days).toHaveLength(5);

      const weekdays = response.days.map((d) => d.dayOfWeek);
      expect(weekdays).toEqual(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);

      for (const day of response.days) {
        expect(day.activities.length).toBe(5);
        for (const act of day.activities) {
          expect(act.category).toBeDefined();
          expect(act.objective.trim().length).toBeGreaterThan(0);
          expect(act.description.trim().length).toBeGreaterThan(0);
          expect(act.durationMinutes).toBeGreaterThanOrEqual(15);
          expect(act.durationMinutes).toBeLessThanOrEqual(30);
          expect(Array.isArray(act.materials)).toBe(true);
        }
      }
    });

    it('fails closed when executor returns model content with forbidden root fields', async () => {
      const hostileOutput = JSON.stringify({
        days: JSON.parse(validModelProposalJson).days,
        status: 'APPROVED',
        approvedBy: 'malicious-injected-actor',
      });

      const fetchFn = vi.fn().mockResolvedValue(createMockOpenAISuccessResponse(hostileOutput));
      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      const proposalSource = new AIWeeklyPlanningProposalSource(executor);

      await expect(proposalSource.propose(sampleDirectRequest)).rejects.toThrow(
        InvalidWeeklyPlanningProposalError
      );
    });

    it('fails closed when executor returns model content with curricularTraceability injected', async () => {
      const modifiedDays = JSON.parse(validModelProposalJson).days;
      modifiedDays[0].activities[0].curricularTraceability = { pdaId: 'INVENTED-PDA' };

      const hostileOutput = JSON.stringify({ days: modifiedDays });

      const fetchFn = vi.fn().mockResolvedValue(createMockOpenAISuccessResponse(hostileOutput));
      const executor = new OpenAIWeeklyPlanningExecutor({
        apiKey: FAKE_TEST_API_KEY,
        fetchFn,
      });

      const proposalSource = new AIWeeklyPlanningProposalSource(executor);

      await expect(proposalSource.propose(sampleDirectRequest)).rejects.toThrow(
        InvalidWeeklyPlanningProposalError
      );
    });
  });

  describe('8. Architectural & Environment Security Invariants', () => {
    it('proves zero Firebase dependencies or imports in executor module', async () => {
      // Introspect OpenAIWeeklyPlanningExecutor module
      const executorModule = await import('../OpenAIWeeklyPlanningExecutor');
      expect(executorModule).toBeDefined();

      // Read source code of OpenAIWeeklyPlanningExecutor.ts to verify zero firebase imports
      const fs = await import('node:fs');
      const path = await import('node:path');
      const sourceCode = fs.readFileSync(
        path.resolve(__dirname, '../OpenAIWeeklyPlanningExecutor.ts'),
        'utf-8'
      );

      expect(sourceCode).not.toContain('firebase');
      expect(sourceCode).not.toContain('firestore');
      expect(sourceCode).not.toContain('httpsCallable');
    });

    it('proves zero VITE_ environment variable access in executor module', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const sourceCode = fs.readFileSync(
        path.resolve(__dirname, '../OpenAIWeeklyPlanningExecutor.ts'),
        'utf-8'
      );

      expect(sourceCode).not.toContain('VITE_');
      expect(sourceCode).not.toContain('import.meta.env');
    });

    it('locks default timeout to 30000ms', () => {
      expect(DEFAULT_WEEKLY_PLANNING_TIMEOUT_MS).toBe(30000);
    });
  });
});
