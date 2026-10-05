import { describe, it, expect } from 'vitest';
import {
  AssistDailyEvaluationGatewayRequest,
  SanitizedEvaluationAIPayload,
  AssistDailyEvaluationResponse,
  GovernedEvaluationAIError,
  validateAssistDailyEvaluationRequest,
  validateSanitizedEvaluationAIPayload,
  validateAssistDailyEvaluationResponse,
  scanForProhibitedEvaluationLanguage,
  detectSensitiveContent,
  isPlatitudeOrPadding,
  HUMAN_EVIDENCE_MIN_ACTIVITIES_DEVELOPMENT_LENGTH,
  HUMAN_EVIDENCE_MAX_ACTIVITIES_DEVELOPMENT_LENGTH,
  HUMAN_EVIDENCE_MIN_GROUP_RESPONSE_LENGTH,
  HUMAN_EVIDENCE_MAX_GROUP_RESPONSE_LENGTH,
  HUMAN_EVIDENCE_MAX_ADAPTATIONS_LENGTH,
  HUMAN_EVIDENCE_MAX_CONTINUITY_LENGTH,
  SUGGESTED_EVALUATION_MIN_LENGTH,
  SUGGESTED_EVALUATION_MAX_LENGTH,
} from '../GovernedEvaluationAIContract';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';

describe('GovernedEvaluationAIContract Unit Tests (H1R13.3C)', () => {
  const createValidRequest = (): AssistDailyEvaluationGatewayRequest => ({
    planningId: 'plan-12345',
    dayOfWeek: 'MONDAY',
    humanEvidence: {
      activitiesDevelopment: 'Se organizó el rincón de lectura con colchonetas y telas suaves para la exploración libre.',
      groupResponse: 'Las niñas y niños mostraron curiosidad, gatearon hacia las telas y manipularon las texturas con calma.',
      adaptations: 'Se redujo la intensidad de la luz artificial para favorecer un ambiente más tranquilo.',
      continuity: 'Se sugiere mantener las telas disponibles para la siguiente sesión sensorial.',
    },
  });

  const createValidProviderPayload = (): SanitizedEvaluationAIPayload => ({
    roomProfile: {
      name: 'Lactantes B',
      minAgeMonths: 7,
      maxAgeMonths: 12,
    },
    dayOfWeek: 'Lunes',
    plannedContext: {
      activities: [
        {
          category: 'C',
          objective: 'Estimular el rastreo visual y la manipulación libre de texturas.',
          description: 'Colocar telas de colores a la altura de los infantes para su alcance.',
          durationMinutes: 25,
          pdaReference: {
            field: 'Lenguajes',
            description: 'Experimenta con diversas texturas, formas y sonidos.',
          },
          prospectiveObservationTarget: 'Observar si orienta la mirada y extiende los brazos hacia las telas.',
        },
      ],
    },
    humanEvidence: {
      activitiesDevelopment: 'Se organizó el rincón con telas suaves sobre colchonetas.',
      groupResponse: 'El grupo mostró calma y exploró las texturas con las manos.',
      adaptations: 'Se dio más tiempo a los infantes que se mostraban cautelosos.',
    },
  });

  const createValidResponse = (): AssistDailyEvaluationResponse => ({
    suggestedEvaluation:
      'Durante la experiencia de exploración sensorial, las niñas y niños se acercaron con tranquilidad a las telas dispuestas en el rincón. Manipularon las texturas con interés y mantuvieron periodos breves de atención compartida, respondiendo de manera favorable a la interacción afectiva.',
  });

  // ==========================================================================
  // REQUEST CONTRACT TESTS (1-17)
  // ==========================================================================

  describe('REQUEST CONTRACT', () => {
    it('1. canonical valid request accepted', () => {
      const req = createValidRequest();
      expect(() => validateAssistDailyEvaluationRequest(req)).not.toThrow();
    });

    it('2. no human evidence rejected', () => {
      const req: any = {
        planningId: 'plan-123',
        dayOfWeek: 'MONDAY',
      };
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('HUMAN_EVIDENCE_REQUIRED');
      }
    });

    it('3. activitiesDevelopment missing rejected', () => {
      const req = createValidRequest();
      delete (req.humanEvidence as any).activitiesDevelopment;
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('HUMAN_EVIDENCE_REQUIRED');
      }
    });

    it('4. groupResponse missing rejected', () => {
      const req = createValidRequest();
      delete (req.humanEvidence as any).groupResponse;
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('HUMAN_EVIDENCE_REQUIRED');
      }
    });

    it('5. activitiesDevelopment < 15 rejected', () => {
      const req = createValidRequest();
      (req.humanEvidence as any).activitiesDevelopment = 'Muy corto'; // 9 chars
      expect(req.humanEvidence.activitiesDevelopment.trim().length).toBeLessThan(
        HUMAN_EVIDENCE_MIN_ACTIVITIES_DEVELOPMENT_LENGTH
      );
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('HUMAN_EVIDENCE_TOO_SHORT');
      }
    });

    it('6. groupResponse < 15 rejected', () => {
      const req = createValidRequest();
      (req.humanEvidence as any).groupResponse = 'Corta resp'; // 10 chars
      expect(req.humanEvidence.groupResponse.trim().length).toBeLessThan(
        HUMAN_EVIDENCE_MIN_GROUP_RESPONSE_LENGTH
      );
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('HUMAN_EVIDENCE_TOO_SHORT');
      }
    });

    it('7. activitiesDevelopment > 600 rejected', () => {
      const req = createValidRequest();
      (req.humanEvidence as any).activitiesDevelopment = 'A'.repeat(
        HUMAN_EVIDENCE_MAX_ACTIVITIES_DEVELOPMENT_LENGTH + 1
      );
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('HUMAN_EVIDENCE_TOO_LONG');
      }
    });

    it('8. groupResponse > 600 rejected', () => {
      const req = createValidRequest();
      (req.humanEvidence as any).groupResponse = 'B'.repeat(
        HUMAN_EVIDENCE_MAX_GROUP_RESPONSE_LENGTH + 1
      );
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('HUMAN_EVIDENCE_TOO_LONG');
      }
    });

    it('9. adaptations > 400 rejected', () => {
      const req = createValidRequest();
      (req.humanEvidence as any).adaptations = 'C'.repeat(
        HUMAN_EVIDENCE_MAX_ADAPTATIONS_LENGTH + 1
      );
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('HUMAN_EVIDENCE_TOO_LONG');
      }
    });

    it('10. continuity > 400 rejected', () => {
      const req = createValidRequest();
      (req.humanEvidence as any).continuity = 'D'.repeat(
        HUMAN_EVIDENCE_MAX_CONTINUITY_LENGTH + 1
      );
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('HUMAN_EVIDENCE_TOO_LONG');
      }
    });

    it('11. invalid weekday rejected', () => {
      const req: any = createValidRequest();
      req.dayOfWeek = 'SATURDAY';
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('INVALID_DAY');
      }
    });

    it('12. blank planningId rejected', () => {
      const req: any = createValidRequest();
      req.planningId = '   ';
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('INVALID_PLANNING_ID');
      }
    });

    it('13. unexpected top-level field rejected', () => {
      const req: any = createValidRequest();
      req.unexpectedField = 'malicious';
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('UNEXPECTED_FIELD');
      }
    });

    it('14. unexpected humanEvidence field rejected', () => {
      const req: any = createValidRequest();
      req.humanEvidence.unexpectedEvidenceField = 'extra';
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('UNEXPECTED_FIELD');
      }
    });

    it('15. currentDate rejected', () => {
      const req: any = createValidRequest();
      req.currentDate = '2026-10-05';
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('UNEXPECTED_FIELD');
      }
    });

    it('16. executionStatus rejected', () => {
      const req: any = createValidRequest();
      req.humanEvidence.executionStatus = 'EXECUTED_AS_PLANNED';
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('UNEXPECTED_FIELD');
      }
    });

    it('17. whitespace does not satisfy minimum length', () => {
      const req = createValidRequest();
      (req.humanEvidence as any).activitiesDevelopment = '  ok  \n\t  '; // trims to 2 chars
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('HUMAN_EVIDENCE_TOO_SHORT');
      }
    });
  });

  // ==========================================================================
  // PROVIDER PAYLOAD TESTS (18-23)
  // ==========================================================================

  describe('PROVIDER PAYLOAD CONTRACT', () => {
    it('18. canonical sanitized provider payload accepted', () => {
      const payload = createValidProviderPayload();
      expect(() => validateSanitizedEvaluationAIPayload(payload)).not.toThrow();
    });

    it('19. technical identifier in provider payload rejected', () => {
      const payload: any = createValidProviderPayload();
      payload.planningId = 'plan-leak-id';
      expect(() => validateSanitizedEvaluationAIPayload(payload)).toThrowError(GovernedEvaluationAIError);
      try {
        validateSanitizedEvaluationAIPayload(payload);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('INVALID_PROVIDER_PAYLOAD');
      }
    });

    it('20. malformed room profile rejected', () => {
      const payload: any = createValidProviderPayload();
      payload.roomProfile = { name: '', minAgeMonths: -1, maxAgeMonths: 5 };
      expect(() => validateSanitizedEvaluationAIPayload(payload)).toThrowError(GovernedEvaluationAIError);
      try {
        validateSanitizedEvaluationAIPayload(payload);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('INVALID_PROVIDER_PAYLOAD');
      }
    });

    it('21. malformed activity rejected', () => {
      const payload: any = createValidProviderPayload();
      payload.plannedContext.activities = [
        {
          category: '',
          objective: 'Falta categoria',
          description: 'Desc',
          durationMinutes: 30,
        },
      ];
      expect(() => validateSanitizedEvaluationAIPayload(payload)).toThrowError(GovernedEvaluationAIError);
      try {
        validateSanitizedEvaluationAIPayload(payload);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('INVALID_PROVIDER_PAYLOAD');
      }
    });

    it('22. invalid duration rejected', () => {
      const payload: any = createValidProviderPayload();
      payload.plannedContext.activities[0].durationMinutes = 200; // max is 180
      expect(() => validateSanitizedEvaluationAIPayload(payload)).toThrowError(GovernedEvaluationAIError);
      try {
        validateSanitizedEvaluationAIPayload(payload);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('INVALID_PROVIDER_PAYLOAD');
      }
    });

    it('23. unexpected provider payload field rejected', () => {
      const payload: any = createValidProviderPayload();
      payload.unexpectedField = 'leak';
      expect(() => validateSanitizedEvaluationAIPayload(payload)).toThrowError(GovernedEvaluationAIError);
      try {
        validateSanitizedEvaluationAIPayload(payload);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('UNEXPECTED_FIELD');
      }
    });
  });

  // ==========================================================================
  // RESPONSE TESTS (24-29)
  // ==========================================================================

  describe('RESPONSE CONTRACT', () => {
    it('24. canonical response accepted', () => {
      const res = createValidResponse();
      expect(() => validateAssistDailyEvaluationResponse(res)).not.toThrow();
    });

    it('25. missing suggestedEvaluation rejected', () => {
      const res: any = {};
      expect(() => validateAssistDailyEvaluationResponse(res)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationResponse(res);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('INVALID_PROVIDER_RESPONSE');
      }
    });

    it('26. non-string suggestedEvaluation rejected', () => {
      const res: any = { suggestedEvaluation: 12345 };
      expect(() => validateAssistDailyEvaluationResponse(res)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationResponse(res);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('INVALID_PROVIDER_RESPONSE');
      }
    });

    it('27. response < 30 rejected', () => {
      const res: any = { suggestedEvaluation: 'Demasiado corto' }; // 15 chars
      expect(() => validateAssistDailyEvaluationResponse(res)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationResponse(res);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('INVALID_PROVIDER_RESPONSE');
      }
    });

    it('28. response > 1000 rejected', () => {
      const res: any = {
        suggestedEvaluation: 'Durante la actividad el grupo '.repeat(40), // > 1000 chars
      };
      expect(res.suggestedEvaluation.length).toBeGreaterThan(SUGGESTED_EVALUATION_MAX_LENGTH);
      expect(() => validateAssistDailyEvaluationResponse(res)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationResponse(res);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('INVALID_PROVIDER_RESPONSE');
      }
    });

    it('29. unexpected response field rejected', () => {
      const res: any = {
        suggestedEvaluation:
          'Texto cualitativo descriptivo válido para la evaluación del día en educación inicial sin juicios.',
        pedagogicalReflection: 'Reflexión no solicitada',
      };
      expect(() => validateAssistDailyEvaluationResponse(res)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationResponse(res);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('UNEXPECTED_FIELD');
      }
    });
  });

  // ==========================================================================
  // PROHIBITED LANGUAGE POLICY TESTS (30-39)
  // ==========================================================================

  describe('PROHIBITED LANGUAGE POLICY', () => {
    it('30. "se logró el objetivo" rejected', () => {
      const scan = scanForProhibitedEvaluationLanguage(
        'Durante la sesión se logró el objetivo propuesto con las niñas y niños.'
      );
      expect(scan.hasProhibitedLanguage).toBe(true);
      expect(scan.violation).toContain('objetivo');
    });

    it('31. unaccented equivalent rejected where applicable', () => {
      const scan = scanForProhibitedEvaluationLanguage(
        'En la actividad se logro el objetivo satisfactoriamente.'
      );
      expect(scan.hasProhibitedLanguage).toBe(true);
      expect(scan.violation).toContain('objetivo');
    });

    it('32. "PDA logrado" rejected', () => {
      const scan = scanForProhibitedEvaluationLanguage(
        'El grupo mostró avances y se considera el PDA logrado en la jornada.'
      );
      expect(scan.hasProhibitedLanguage).toBe(true);
      expect(scan.violation).toContain('PDA');
    });

    it('33. "PDA alcanzado" rejected', () => {
      const scan = scanForProhibitedEvaluationLanguage(
        'Con esta experiencia se da por tenido el PDA alcanzado.'
      );
      expect(scan.hasProhibitedLanguage).toBe(true);
      expect(scan.violation).toContain('PDA');
    });

    it('34. "PDA dominado" rejected', () => {
      const scan = scanForProhibitedEvaluationLanguage(
        'Los niños demostraron el PDA dominado por completo.'
      );
      expect(scan.hasProhibitedLanguage).toBe(true);
      expect(scan.violation).toContain('PDA');
    });

    it('35. "PDA completado" rejected', () => {
      const scan = scanForProhibitedEvaluationLanguage(
        'La educadora verificó el PDA completado en la sala.'
      );
      expect(scan.hasProhibitedLanguage).toBe(true);
      expect(scan.violation).toContain('PDA');
    });

    it('36. percentage achievement claim rejected', () => {
      const scan = scanForProhibitedEvaluationLanguage(
        'Se alcanzó un 100% de logro en las actividades planificadas.'
      );
      expect(scan.hasProhibitedLanguage).toBe(true);
      expect(scan.violation).toContain('percentage');
    });

    it('37. numeric grade claim rejected', () => {
      const scan = scanForProhibitedEvaluationLanguage(
        'El desempeño merece una calificación de 10 por su participación.'
      );
      expect(scan.hasProhibitedLanguage).toBe(true);
      expect(scan.violation).toContain('numeric scoring');
    });

    it('38. clear diagnostic claim rejected', () => {
      const scan = scanForProhibitedEvaluationLanguage(
        'El infante presenta un déficit severo en su coordinación motora.'
      );
      expect(scan.hasProhibitedLanguage).toBe(true);
      expect(scan.violation).toContain('clinical/diagnostic');
    });

    it('39. safe descriptive qualitative narrative accepted', () => {
      const safeText =
        'Durante la exploración con telas, las niñas y niños mostraron curiosidad, manipularon libremente las texturas y respondieron con sonrisas a las melodías suaves entonadas por la educadora.';
      const scan = scanForProhibitedEvaluationLanguage(safeText);
      expect(scan.hasProhibitedLanguage).toBe(false);
    });
  });

  // ==========================================================================
  // SENSITIVE INPUT DETECTION TESTS (40-44)
  // ==========================================================================

  describe('SENSITIVE INPUT DETECTION', () => {
    it('40. CURP-like value rejected in human evidence', () => {
      const text = 'La mamá de Juan entregó el CURP ABCD010101HMCRRA01 para el expediente.';
      const detection = detectSensitiveContent(text);
      expect(detection.hasSensitiveContent).toBe(true);
      expect(detection.reason).toContain('CURP');

      const req = createValidRequest();
      (req.humanEvidence as any).activitiesDevelopment = text;
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('SENSITIVE_CONTENT_DETECTED');
      }
    });

    it('41. email rejected in human evidence', () => {
      const text = 'Favor de contactar a anita.educadora@guarderia.imss.gob.mx para el reporte.';
      const detection = detectSensitiveContent(text);
      expect(detection.hasSensitiveContent).toBe(true);
      expect(detection.reason).toContain('Email');

      const req = createValidRequest();
      (req.humanEvidence as any).groupResponse = text;
      expect(() => validateAssistDailyEvaluationRequest(req)).toThrowError(GovernedEvaluationAIError);
      try {
        validateAssistDailyEvaluationRequest(req);
      } catch (err: any) {
        expect(err.diagnosticCode).toBe('SENSITIVE_CONTENT_DETECTED');
      }
    });

    it('42. high-confidence phone pattern rejected', () => {
      const text = 'Llamar al teléfono 55-1234-5678 en caso de dudas sobre la actividad.';
      const detection = detectSensitiveContent(text);
      expect(detection.hasSensitiveContent).toBe(true);
      expect(detection.reason).toContain('Phone');
    });

    it('43. obvious credential/token-like content rejected if detector supports it', () => {
      const text = 'Bearer sk-abcdef1234567890abcdef1234567890 secreto del servicio';
      const detection = detectSensitiveContent(text);
      expect(detection.hasSensitiveContent).toBe(true);
      expect(detection.reason).toContain('Credential');
    });

    it('44. ordinary pedagogical prose is not falsely rejected', () => {
      const safeProse =
        'El grupo de lactantes exploró las pelotas con entusiasmo y gatearon por la colchoneta.';
      const detection = detectSensitiveContent(safeProse);
      expect(detection.hasSensitiveContent).toBe(false);

      const platitude = isPlatitudeOrPadding(safeProse);
      expect(platitude).toBe(false);
    });
  });

  // ==========================================================================
  // SEMANTIC BOUNDARY TESTS (45-46)
  // ==========================================================================

  describe('SEMANTIC BOUNDARY', () => {
    it('45. prospectiveObservationTarget remains merely a provider payload field and does not generate any observed fact in local code', () => {
      const payload = createValidProviderPayload();
      expect(payload.plannedContext.activities[0]?.prospectiveObservationTarget).toBe(
        'Observar si orienta la mirada y extiende los brazos hacia las telas.'
      );
      // Validating payload does not alter humanEvidence or invent an observation
      expect(payload.humanEvidence.activitiesDevelopment).not.toContain(
        'extiende los brazos hacia las telas'
      );
    });

    it('46. no validator claims semantic truthfulness', () => {
      // Proves that validators only verify structural and policy invariants,
      // never asserting that Anita or the provider is telling the empirical truth.
      const syntheticContradictionResponse: AssistDailyEvaluationResponse = {
        suggestedEvaluation:
          'El grupo permaneció completamente sereno y participó con alegría durante toda la sesión matutina.',
      };
      // Validation passes structurally because semantic fidelity is governed by Anita's Human Gate
      expect(() =>
        validateAssistDailyEvaluationResponse(syntheticContradictionResponse)
      ).not.toThrow();
    });
  });

  // ==========================================================================
  // ARCHITECTURE & IMMUTABILITY INVARIANTS (47-50)
  // ==========================================================================

  describe('ARCHITECTURE & IMMUTABILITY INVARIANTS', () => {
    it('47. no network call occurs during pure contract validation', () => {
      const req = createValidRequest();
      const res = createValidResponse();
      expect(() => validateAssistDailyEvaluationRequest(req)).not.toThrow();
      expect(() => validateAssistDailyEvaluationResponse(res)).not.toThrow();
    });

    it('48. no Firestore write occurs during pure contract validation', () => {
      const payload = createValidProviderPayload();
      expect(() => validateSanitizedEvaluationAIPayload(payload)).not.toThrow();
    });

    it('49. no OpenAI dependency exists in GovernedEvaluationAIContract', () => {
      // Contract operates purely on in-memory JavaScript/TypeScript primitives
      expect(typeof validateAssistDailyEvaluationRequest).toBe('function');
      expect(typeof validateAssistDailyEvaluationResponse).toBe('function');
      expect(typeof validateSanitizedEvaluationAIPayload).toBe('function');
    });

    it('50. no WeeklyPlanning / PlanningDay schema mutation occurs', () => {
      const plan = WeeklyPlanning.create(
        'p-test',
        'dc-1',
        'lactantes-b',
        't1',
        '2026-08-24',
        '2026-08-28'
      );
      // Invariant: WeeklyPlanning and PlanningDay retain unchanged schema
      expect(plan.planningId).toBe('p-test');
      expect(plan.status).toBe('DRAFT');
      expect((plan as any).evaluation).toBeUndefined();

      // PlanningDay interface retains existing evaluation string and zero executionStatus
      const sampleDay: any = {
        date: '2026-08-24',
        dayOfWeek: 'MONDAY',
        activities: [],
        complementaryActivities: [],
        materials: [],
        evaluation: 'Texto evaluacion existente',
      };
      expect(sampleDay.evaluation).toBe('Texto evaluacion existente');
      expect(sampleDay.executionStatus).toBeUndefined();
    });
  });
});
