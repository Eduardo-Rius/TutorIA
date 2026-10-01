import { describe, it, expect, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DeterministicWeeklyPlanningProposalSource } from '../DeterministicWeeklyPlanningProposalSource';
import {
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalService,
  OFFICIAL_WEEKDAYS,
} from '../WeeklyPlanningProposalSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { Room } from '../../../domain/planning/RoomCatalog';
import { IMSS_CATEGORIES } from '../../../constants/imssCategories';

describe('H1R11.2 — Deterministic Weekly Planning Proposal Baseline', () => {
  const source = new DeterministicWeeklyPlanningProposalSource();

  const infantRoom: Room = {
    roomId: 'lactantes-c',
    name: 'Lactantes C',
    minAgeMonths: 13,
    maxAgeMonths: 18,
  };

  const toddlerRoom: Room = {
    roomId: 'maternales-a',
    name: 'Maternales A',
    minAgeMonths: 19,
    maxAgeMonths: 24,
  };

  const createRequest = (
    overrides: Partial<WeeklyPlanningProposalRequest> = {}
  ): WeeklyPlanningProposalRequest => ({
    planningId: 'test-proposal-plan-001',
    weekStart: '2026-08-24',
    weekEnd: '2026-08-28',
    modality: 'DIRECT',
    room: infantRoom,
    currentContext: {
      observations: 'Observaciones de exploración libre sobre tapetes.',
      identifiedNeeds: 'Estimular desplazamiento autónomo y gateo.',
      specialSituations: 'Adaptación de dos lactantes.',
      availableMaterials: 'Colchonetas, pelotas suaves, sonajas',
    },
    ...overrides,
  });

  // =========================================================================
  // REQUIREMENT A, B, C: TRANSIENT RESPONSE AND WEEKDAYS
  // =========================================================================
  describe('Proposal Structure & Weekdays', () => {
    it('A. Provider returns a transient WeeklyPlanningProposalResponse', async () => {
      const request = createRequest();
      const response = await source.propose(request);

      expect(response).toBeDefined();
      expect(response.days).toBeDefined();
      expect(Array.isArray(response.days)).toBe(true);
      expect(Object.isFrozen(response)).toBe(true);
      expect(Object.isFrozen(response.days)).toBe(true);
    });

    it('B. Exactly five weekdays are produced', async () => {
      const response = await source.propose(createRequest());
      expect(response.days.length).toBe(5);
    });

    it('C. Weekdays are unique, complete, and in official order (Monday to Friday)', async () => {
      const response = await source.propose(createRequest());
      const producedWeekdays = response.days.map((d) => d.dayOfWeek);

      expect(producedWeekdays).toEqual(OFFICIAL_WEEKDAYS);
      const uniqueWeekdays = new Set(producedWeekdays);
      expect(uniqueWeekdays.size).toBe(5);

      // Verify dates are derived deterministically
      expect(response.days[0]!.date).toBe('2026-08-24');
      expect(response.days[1]!.date).toBe('2026-08-25');
      expect(response.days[2]!.date).toBe('2026-08-26');
      expect(response.days[3]!.date).toBe('2026-08-27');
      expect(response.days[4]!.date).toBe('2026-08-28');
    });
  });

  // =========================================================================
  // REQUIREMENT D & E: DIRECT AND INDIRECT MODALITIES
  // =========================================================================
  describe('Modality Compatibility', () => {
    it('D. DIRECT modality proposal generation works', async () => {
      const directReq = createRequest({ modality: 'DIRECT' });
      const response = await source.propose(directReq);

      expect(response.days.length).toBe(5);
      for (const day of response.days) {
        expect(day.activities.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('E. INDIRECT modality proposal generation works', async () => {
      const indirectReq = createRequest({ modality: 'INDIRECT' });
      const response = await source.propose(indirectReq);

      expect(response.days.length).toBe(5);
      for (const day of response.days) {
        expect(day.activities.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // =========================================================================
  // REQUIREMENT F & G: CANONICAL CATEGORIES AND CONSTRAINTS
  // =========================================================================
  describe('Canonical Categories & Constraints', () => {
    it('F. Canonical allowed categories are strictly respected', async () => {
      const response = await source.propose(createRequest());

      for (const day of response.days) {
        for (const act of day.activities) {
          expect(IMSS_CATEGORIES).toContain(act.category);
        }
      }
    });

    it('G.1 Honors allowedCategories constraint filtering', async () => {
      const restrictedReq = createRequest({
        constraints: {
          allowedCategories: ['ACTIVACIÓN FÍSICA', 'LECTURA EN VOZ ALTA'],
        },
      });

      const response = await source.propose(restrictedReq);

      for (const day of response.days) {
        for (const act of day.activities) {
          expect(['ACTIVACIÓN FÍSICA', 'LECTURA EN VOZ ALTA']).toContain(act.category);
        }
      }
    });

    it('G.2 Honors minActivitiesPerDay constraint', async () => {
      const multiActReq = createRequest({
        constraints: {
          minActivitiesPerDay: 2,
        },
      });

      const response = await source.propose(multiActReq);

      for (const day of response.days) {
        expect(day.activities.length).toBe(2);
      }
    });

    it('G.3 Honors duration bounds constraints', async () => {
      const durationReq = createRequest({
        constraints: {
          minDurationMinutes: 30,
          maxDurationMinutes: 45,
        },
      });

      const response = await source.propose(durationReq);

      for (const day of response.days) {
        for (const act of day.activities) {
          expect(act.durationMinutes).toBeGreaterThanOrEqual(30);
          expect(act.durationMinutes).toBeLessThanOrEqual(45);
        }
      }
    });
  });

  // =========================================================================
  // REQUIREMENT H: DETERMINISM (MATHEMATICALLY REPRODUCIBLE)
  // =========================================================================
  describe('Determinism', () => {
    it('H. Identical request produces identical semantic proposal every time (zero randomness)', async () => {
      const request = createRequest();

      const run1 = await source.propose(request);
      const run2 = await source.propose(request);
      const run3 = await source.propose(request);

      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
      expect(JSON.stringify(run2)).toBe(JSON.stringify(run3));
    });

    it('Adapts age-appropriate wording between infants and toddlers deterministically', async () => {
      const infantResp = await source.propose(createRequest({ room: infantRoom }));
      const toddlerResp = await source.propose(createRequest({ room: toddlerRoom }));

      // Infant activity contains infant-appropriate keywords
      const infantDesc = infantResp.days[0]!.activities[0]!.description;
      expect(infantDesc.toLowerCase()).toContain('lactantes');

      // Toddler activity contains toddler-appropriate keywords
      const toddlerDesc = toddlerResp.days[0]!.activities[0]!.description;
      expect(toddlerDesc.toLowerCase()).toContain('niñas y niños');
    });

    it('Parses and applies availableMaterials deterministically without inventing specialized equipment', async () => {
      const reqWithMaterials = createRequest({
        currentContext: {
          availableMaterials: 'Cajas de cartón, Tapetes de hule espuma',
        },
      });

      const response = await source.propose(reqWithMaterials);
      const allMaterials = response.days.flatMap((d) => d.activities.flatMap((a) => a.materials));

      expect(allMaterials.some((m) => m === 'Cajas de cartón' || m === 'Tapetes de hule espuma')).toBe(true);
    });

    it('Uses safe fallback materials when none provided', async () => {
      const reqEmptyMaterials = createRequest({
        currentContext: {
          availableMaterials: '   ',
        },
      });

      const response = await source.propose(reqEmptyMaterials);
      for (const day of response.days) {
        for (const act of day.activities) {
          expect(act.materials.length).toBeGreaterThanOrEqual(1);
          // Does not invent expensive specialized robotics/tablets
          for (const m of act.materials) {
            expect(m).not.toMatch(/tablet|pantalla|robot|computadora/i);
          }
        }
      }
    });
  });

  // =========================================================================
  // REQUIREMENT I, J: ZERO REPOSITORY AUTHORITY & ZERO DOMAIN MUTATION
  // =========================================================================
  describe('Zero Persistence Authority & Domain Invariants', () => {
    it('I. Provider has zero repository/persistence authority', async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const saveSpy = vi.spyOn(repo, 'save');

      const service = new WeeklyPlanningProposalService(source);
      await service.getProposal(createRequest());

      expect(saveSpy).not.toHaveBeenCalled();
      expect(await repo.findById('test-proposal-plan-001')).toBeNull();
    });

    it('J. WeeklyPlanning aggregate is not mutated', async () => {
      const plan = WeeklyPlanning.create(
        'plan-gov-001',
        'daycare-1',
        'lactantes-c',
        'teacher-anita',
        '2026-08-24',
        '2026-08-28'
      );
      const snapshot = JSON.stringify(plan);

      await source.propose(createRequest({ planningId: plan.planningId }));

      expect(JSON.stringify(plan)).toBe(snapshot);
      expect(plan.days.length).toBe(0);
      expect(plan.status).toBe('DRAFT');
    });
  });

  // =========================================================================
  // REQUIREMENT K, L, M, N, O: NO DOMAIN/APPROVAL/EVALUATION LEAKAGE
  // =========================================================================
  describe('Forbidden Fields & Governance Boundaries', () => {
    it('K. Proposal has no planning lifecycle approval fields', async () => {
      const response = await source.propose(createRequest());
      const raw = response as Record<string, unknown>;

      expect(raw['status']).toBeUndefined();
      expect(raw['approvedBy']).toBeUndefined();
      expect(raw['approvedAt']).toBeUndefined();
      expect(raw['closedBy']).toBeUndefined();
      expect(raw['closedAt']).toBeUndefined();
      expect(raw['reviewHistory']).toBeUndefined();
    });

    it('L. Proposal has no evaluation approval fields', async () => {
      const response = await source.propose(createRequest());

      for (const day of response.days) {
        const rawDay = day as Record<string, unknown>;
        expect(rawDay['evaluation']).toBeUndefined();
        expect(rawDay['executionNotes']).toBeUndefined();
        expect(rawDay['evaluationStatus']).toBeUndefined();
        expect(rawDay['evaluationConfirmedAt']).toBeUndefined();
        expect(rawDay['evaluationConfirmedBy']).toBeUndefined();
        expect(rawDay['evaluationReviewedAt']).toBeUndefined();
        expect(rawDay['evaluationReviewedBy']).toBeUndefined();
        expect(rawDay['evaluationDirectorComment']).toBeUndefined();
      }
    });

    it('M. Proposal has no complementaryActivities', async () => {
      const response = await source.propose(createRequest());

      for (const day of response.days) {
        const rawDay = day as Record<string, unknown>;
        expect(rawDay['complementaryActivities']).toBeUndefined();
      }
    });

    it('N. Proposal has no prioritizedPractices', async () => {
      const response = await source.propose(createRequest());

      for (const day of response.days) {
        const rawDay = day as Record<string, unknown>;
        expect(rawDay['prioritizedPractices']).toBeUndefined();
      }
    });

    it('O. Proposal has no curricularTraceability or direct PDA references', async () => {
      const response = await source.propose(createRequest());

      for (const day of response.days) {
        for (const act of day.activities) {
          const rawAct = act as Record<string, unknown>;
          expect(rawAct['curricularTraceability']).toBeUndefined();
          expect(rawAct['pdaId']).toBeUndefined();
          expect(rawAct['reference']).toBeUndefined();
        }
      }
    });

    it('P. currentContext remains request-level input and is not copied wholesale into activities', async () => {
      const response = await source.propose(createRequest());

      for (const day of response.days) {
        const rawDay = day as Record<string, unknown>;
        expect(rawDay['observations']).toBeUndefined();
        expect(rawDay['identifiedNeeds']).toBeUndefined();
        expect(rawDay['specialSituations']).toBeUndefined();

        for (const act of day.activities) {
          const rawAct = act as Record<string, unknown>;
          expect(rawAct['observations']).toBeUndefined();
          expect(rawAct['identifiedNeeds']).toBeUndefined();
        }
      }
    });
  });

  // =========================================================================
  // REQUIREMENT Q & R: FAIL-CLOSED ON INVALID INPUTS & PRIVACY
  // =========================================================================
  describe('Fail-Closed Behavior & Privacy Safety', () => {
    it('Q. Invalid or impossible constraints fail closed with InvalidWeeklyPlanningProposalError', async () => {
      const impossibleConstraints = createRequest({
        constraints: {
          minActivitiesPerDay: 5,
          maxActivitiesPerDay: 2, // Contradictory: min > max
        },
      });

      await expect(source.propose(impossibleConstraints)).rejects.toThrow(
        /maxActivitiesPerDay must be an integer greater than or equal to minActivitiesPerDay/
      );
    });

    it('R. No child/family/medical/auth/API-key fields are accepted or introduced', async () => {
      const response = await source.propose(createRequest());
      const rawString = JSON.stringify(response);

      // Verify absence of sensitive tokens or fields
      expect(rawString).not.toMatch(/curp|diagnostico|medico|password|token|apiKey/i);
    });
  });

  // =========================================================================
  // REQUIREMENT STEP 12: PROVE ZERO EXTERNAL INTELLIGENCE
  // =========================================================================
  describe('Zero External Intelligence & Zero Secrets Guarantee', () => {
    it('Static source file inspection proves no external AI, SDK, or network libraries are imported', () => {
      const sourceFilePath = path.resolve(
        __dirname,
        '../DeterministicWeeklyPlanningProposalSource.ts'
      );
      const sourceContent = fs.readFileSync(sourceFilePath, 'utf8');

      // Forbids OpenAI, Firebase, Gemini, Anthropic, fetch, axios
      expect(sourceContent).not.toMatch(/from\s+['"]openai['"]/i);
      expect(sourceContent).not.toMatch(/from\s+['"]firebase/i);
      expect(sourceContent).not.toMatch(/from\s+['"]@google/i);
      expect(sourceContent).not.toMatch(/from\s+['"]@anthropic/i);
      expect(sourceContent).not.toMatch(/from\s+['"]axios['"]/i);
      expect(sourceContent).not.toMatch(/\bfetch\s*\(/);
      expect(sourceContent).not.toMatch(/httpsCallable/);
      expect(sourceContent).not.toMatch(/process\.env\.OPENAI/);
      expect(sourceContent).not.toMatch(/import\.meta\.env\.VITE_OPENAI/);
    });
  });
});
