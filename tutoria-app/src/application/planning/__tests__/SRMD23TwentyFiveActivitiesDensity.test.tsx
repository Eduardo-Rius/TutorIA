import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  DeterministicWeeklyPlanningProposalSource,
} from '../DeterministicWeeklyPlanningProposalSource';
import {
  AIWeeklyPlanningProposalSource,
  buildWeeklyPlanningJsonSchema,
  buildWeeklyPlanningAISystemPrompt,
  buildPrivacyMinimizedAIInput,
  projectPedagogicalGenerationPolicy,
  createRequestScopedMaterialTable,
} from '../AIWeeklyPlanningProposalSource';
import {
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
  OFFICIAL_WEEKDAYS,
  validateWeeklyPlanningProposalResponse,
} from '../WeeklyPlanningProposalSource';
import {
  PedagogicalAgePolicyCatalog,
  LACTANTES_A_AGE_POLICY,
  LACTANTES_B_AGE_POLICY,
  PedagogicalSafetyValidator,
} from '../../../domain/planning/PedagogicalAgePolicy';
import { Room, RoomCatalog } from '../../../domain/planning/RoomCatalog';
import { WeeklyPlanningProposalHumanGate } from '../../../presentation/planning-ui/WeeklyPlanningProposalHumanGate';
import { WeeklyPlanning, PlanningDay } from '../../../domain/planning/WeeklyPlanning';
import { IMSS_CATEGORIES } from '../../../constants/imssCategories';

describe('SR-MD-23 — Ampliación pedagógica: mínimo cinco actividades diarias para todas las salas', () => {
  const deterministicSource = new DeterministicWeeklyPlanningProposalSource();

  const sampleRooms: Record<string, Room> = {
    lactantesA: {
      roomId: 'lactantes-a',
      name: 'Lactantes A',
      minAgeMonths: 0,
      maxAgeMonths: 6,
    },
    lactantesB: {
      roomId: 'lactantes-b',
      name: 'Lactantes B',
      minAgeMonths: 7,
      maxAgeMonths: 12,
    },
    lactantesC: {
      roomId: 'lactantes-c',
      name: 'Lactantes C',
      minAgeMonths: 13,
      maxAgeMonths: 18,
    },
    maternalA: {
      roomId: 'maternales-a',
      name: 'Maternal A',
      minAgeMonths: 19,
      maxAgeMonths: 24,
    },
    maternalB1: {
      roomId: 'maternales-b1',
      name: 'Maternal B1',
      minAgeMonths: 25,
      maxAgeMonths: 36,
    },
    preescolar1: {
      roomId: 'preescolar-1',
      name: 'Preescolar 1',
      minAgeMonths: 37,
      maxAgeMonths: 48,
    },
  };

  const createProposalRequest = (
    room: Room,
    overrides: Partial<WeeklyPlanningProposalRequest> = {}
  ): WeeklyPlanningProposalRequest => ({
    planningId: `test-sr-md-23-${room.roomId}`,
    weekStart: '2026-08-24',
    weekEnd: '2026-08-28',
    modality: 'DIRECT',
    room,
    currentContext: {
      observations: 'Observaciones de exploración libre sobre tapetes y colchonetas.',
      identifiedNeeds: 'Fortalecer la autonomía, el movimiento libre y la comunicación.',
      specialSituations: 'Dos lactantes en proceso de adaptación gradual.',
      availableMaterials: 'Colchonetas, telas suaves de colores, sonajas livianas, pelotas suaves',
    },
    ...overrides,
  });

  // =========================================================================
  // 1. REGLA FUNCIONAL: MÍNIMO 5 ACTIVIDADES POR DÍA × 5 DÍAS = 25 SEMANALES
  // =========================================================================
  describe('1. Regla Funcional — Generación de 25 actividades semanales en todas las salas', () => {
    it('1.1. Deterministic Fallback genera exactamente 5 actividades por día (25 actividades en la semana) para todas las salas', async () => {
      for (const [roomKey, room] of Object.entries(sampleRooms)) {
        const req = createProposalRequest(room);
        const proposal = await deterministicSource.propose(req);

        expect(proposal.days).toHaveLength(5);
        let totalWeekActivities = 0;

        for (const day of proposal.days) {
          expect(day.activities.length).toBeGreaterThanOrEqual(5);
          expect(day.activities).toHaveLength(5);
          totalWeekActivities += day.activities.length;
        }

        expect(
          totalWeekActivities,
          `La sala ${room.name} (${roomKey}) debe producir exactamente 25 actividades en la semana`
        ).toBe(25);
      }
    });

    it('1.2. Las 5 actividades diarias dentro de cada día están diferenciadas y rotadas', async () => {
      const req = createProposalRequest(sampleRooms.lactantesB);
      const proposal = await deterministicSource.propose(req);

      for (const day of proposal.days) {
        const categoriesInDay = day.activities.map((a) => a.category);
        const objectivesInDay = day.activities.map((a) => a.objective);

        // All 5 categories appear in each day
        const uniqueCategories = new Set(categoriesInDay);
        expect(uniqueCategories.size).toBe(5);

        // All 5 objectives in each day are distinct
        const uniqueObjectives = new Set(objectivesInDay);
        expect(uniqueObjectives.size).toBe(5);
      }
    });

    it('1.3. La IA no se activa en salas no autorizadas (autorizadas: Lactantes A, B y C)', () => {
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_A')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_B')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_C')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNALES_A')).toBe(false);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNALES_B')).toBe(false);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('PREESCOLAR_1')).toBe(false);
    });

    it('1.4. El esquema JSON estricto para IA exige un mínimo de 5 actividades por día (minItems: 5)', () => {
      const table = createRequestScopedMaterialTable(
        ['Telas suaves', 'Sonajas'],
        ['Colchoneta de estimulación']
      );
      const schema = buildWeeklyPlanningJsonSchema(table) as any;

      expect(schema.properties.days.items.properties.activities.minItems).toBe(5);
      expect(schema.properties.days.items.properties.activities.maxItems).toBe(10);
    });

    it('1.5. El system prompt de IA instruye generar al menos 5 actividades diarias (25 semanales)', () => {
      const req = createProposalRequest(sampleRooms.lactantesA);
      const policy = PedagogicalAgePolicyCatalog.getPolicyForRoom(req.room)!;
      const projection = projectPedagogicalGenerationPolicy(policy, req);
      const minimized = buildPrivacyMinimizedAIInput(req, projection);
      const prompt = buildWeeklyPlanningAISystemPrompt(minimized);

      expect(prompt).toContain('DAILY PEDAGOGICAL DENSITY & BALANCED COVERAGE (SR-MD-23)');
      expect(prompt).toContain('You must generate AT LEAST 5 differentiated activities per day × 5 days = at least 25 activities weekly');
      expect(prompt).toContain('Minimum: At least 5 activities per operational weekday');
    });
  });

  // =========================================================================
  // 2. COBERTURA PEDAGÓGICA Y CALIDAD DE ACTIVIDADES
  // =========================================================================
  describe('2. Cobertura pedagógica, calidad y seguridad', () => {
    it('2.1. Cada actividad incluye objetivo, Inicio, Desarrollo, Cierre, materiales y duración', async () => {
      for (const room of Object.values(sampleRooms)) {
        const req = createProposalRequest(room);
        const proposal = await deterministicSource.propose(req);

        for (const day of proposal.days) {
          for (const act of day.activities) {
            expect(act.objective.trim().length).toBeGreaterThan(10);
            expect(act.durationMinutes).toBeGreaterThanOrEqual(5);
            expect(act.durationMinutes).toBeLessThanOrEqual(60);
            expect(act.materials.length).toBeGreaterThan(0);

            // Structural check
            expect(act.description).toMatch(/\bInicio:\s*/i);
            expect(act.description).toMatch(/\bDesarrollo:\s*/i);
            expect(act.description).toMatch(/\bCierre:\s*/i);
            expect(act.description).toMatch(/Adaptaci[oó]n/i);
          }
        }
      }
    });

    it('2.2. En Lactantes A, se conservan obligatoriamente las adaptaciones bimodales (43 días–3 meses y 4–6 meses)', async () => {
      const req = createProposalRequest(sampleRooms.lactantesA);
      const proposal = await deterministicSource.propose(req);

      for (const day of proposal.days) {
        for (const act of day.activities) {
          expect(act.description).toContain('• Adaptación 43 días a 3 meses:');
          expect(act.description).toContain('• Adaptación 4 a 6 meses:');

          // Verify with domain policy validator
          expect(act.description.toLowerCase()).not.toContain('tracción');
          expect(act.description.toLowerCase()).not.toContain('plastilina');
        }
      }
    });

    it('2.3. En Lactantes B, se conservan las adaptaciones para 7–12 meses y cierre afectivo sin asambleas reflexivas', async () => {
      const req = createProposalRequest(sampleRooms.lactantesB);
      const proposal = await deterministicSource.propose(req);

      for (const day of proposal.days) {
        for (const act of day.activities) {
          expect(act.description).toMatch(/Adaptaciones:\s*Adecuación para 7 a 12 meses/i);
          // Cierre must not contain dialogical reflection or assembly
          expect(act.description.toLowerCase()).not.toMatch(/hablar sobre lo que han visto/);
          expect(act.description.toLowerCase()).not.toMatch(/reunir a los lactantes para reflexionar/);
        }
      }
    });

    it('2.4. Todas las salas incluyen Lectura en voz alta diariamente con duración apropiada', async () => {
      for (const room of Object.values(sampleRooms)) {
        const req = createProposalRequest(room);
        const proposal = await deterministicSource.propose(req);

        for (const day of proposal.days) {
          const readingAct = day.activities.find((a) => a.category === 'LECTURA EN VOZ ALTA');
          expect(readingAct, `El día ${day.dayOfWeek} en sala ${room.name} debe contener LECTURA EN VOZ ALTA`).toBeDefined();
          expect(readingAct?.durationMinutes).toBeGreaterThanOrEqual(10);
        }
      }
    });
  });

  // =========================================================================
  // 3. RETENCIÓN Y NO TRUNCAMIENTO EN LA INTERFAZ Y EXPORTACIÓN IMSS
  // =========================================================================
  describe('3. Retención de 25 actividades en interfaz y formato IMSS', () => {
    it('3.1. WeeklyPlanningProposalHumanGate visualiza las 25 actividades sin truncar ninguna', async () => {
      const req = createProposalRequest(sampleRooms.lactantesB);
      const proposal = await deterministicSource.propose(req);

      expect(proposal.days).toHaveLength(5);
      const totalActivities = proposal.days.reduce((acc, d) => acc + d.activities.length, 0);
      expect(totalActivities).toBe(25);

      render(
        <WeeklyPlanningProposalHumanGate
          proposal={proposal}
          sourceType="AI"
          onAccept={vi.fn()}
          onDiscard={vi.fn()}
        />
      );

      // Verify header presence
      expect(screen.getByText('Revisar propuesta de TutorIA')).toBeTruthy();

      // Verify every single day shows "5 actividades"
      const dayBadges = screen.getAllByText('5 actividades');
      expect(dayBadges).toHaveLength(5);

      // Verify all 25 activities are rendered in the DOM
      expect(screen.getAllByText('Objetivo:')).toHaveLength(25);
      expect(screen.getAllByText('Descripción:')).toHaveLength(25);
      expect(screen.getAllByText('Materiales:')).toHaveLength(25);
      expect(screen.getAllByText('Duración:')).toHaveLength(25);

      // Verify all 5 categories are displayed across the human gate
      for (const category of IMSS_CATEGORIES) {
        const categoryTags = screen.getAllByText(category);
        expect(categoryTags.length).toBeGreaterThanOrEqual(5);
      }
    });

    it('3.2. La conversión de propuesta a PlanningDay[] retiene las 25 actividades con IDs y trazabilidad limpia', async () => {
      const req = createProposalRequest(sampleRooms.lactantesA);
      const proposal = await deterministicSource.propose(req);

      const convertedDays: PlanningDay[] = proposal.days.map((pDay, idx) => ({
        date: pDay.date || `2026-08-${24 + idx}`,
        dayOfWeek: pDay.dayOfWeek,
        activities: pDay.activities.map((a, aIdx) => ({
          activityId: `act-${pDay.dayOfWeek.toLowerCase()}-${aIdx + 1}`,
          category: a.category,
          objective: a.objective,
          description: a.description,
          durationMinutes: a.durationMinutes,
          materials: [...a.materials],
          curricularTraceability: [],
        })),
        complementaryActivities: [],
        prioritizedPractices: [],
        materials: Array.from(new Set(pDay.activities.flatMap((a) => a.materials))),
        evaluation: '',
        executionNotes: '',
      }));

      expect(convertedDays).toHaveLength(5);
      const allConvertedActs = convertedDays.flatMap((d) => d.activities);
      expect(allConvertedActs).toHaveLength(25);

      // Verify all have valid non-empty activityIds
      for (const act of allConvertedActs) {
        expect(act.activityId).toBeTruthy();
        expect(act.curricularTraceability).toEqual([]);
      }
    });

    it('3.3. Integridad histórica: semanas existentes con menos actividades (1 a 3/día) permanecen válidas sin error', () => {
      const historicalDay: PlanningDay = {
        date: '2026-08-24',
        dayOfWeek: 'MONDAY',
        activities: [
          {
            activityId: 'hist-act-1',
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Lectura compartida de cuento histórico',
            description: 'Inicio: Bienvenida con calma.\nDesarrollo: Lectura breve con ilustraciones.\nCierre: Nanas suaves.\nAdaptaciones: Acompañamiento sensible.',
            durationMinutes: 15,
            materials: ['Cuento'],
            curricularTraceability: [],
          },
        ],
        complementaryActivities: [],
        prioritizedPractices: [],
        materials: ['Cuento'],
        evaluation: 'Excelente respuesta de los infantes.',
        executionNotes: '',
      };

      const planning = new WeeklyPlanning(
        'hist-plan-001',
        'daycare-01',
        'lactantes-b',
        'teacher-01',
        '2026-08-24',
        '2026-08-28',
        'DRAFT',
        'Obs',
        'Needs',
        'Sit',
        'Mat',
        [],
        [],
        [historicalDay],
        1
      );

      expect(planning.days).toHaveLength(1);
      expect(planning.days[0].activities).toHaveLength(1);
      expect(planning.days[0].daysOfWeek === undefined).toBe(true);
      expect(planning.days[0].evaluation).toBe('Excelente respuesta de los infantes.');
    });
  });
});
