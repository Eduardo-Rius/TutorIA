import { describe, it, expect } from 'vitest';
import {
  buildWeeklyPlanningProposalEvidence,
  serializeWeeklyPlanningProposalEvidence,
  WeeklyPlanningEvidenceContext,
  WeeklyPlanningProposalEvidence,
} from '../weeklyPlanningProposalEvidence';
import type {
  WeeklyPlanningProposalResponse,
  ProposedPlanningDay,
} from '../../../application/planning/WeeklyPlanningProposalSource';
import type { Room } from '../../../domain/planning/RoomCatalog';

describe('H1R12.1 — WeeklyPlanningProposalEvidence Deterministic Serializer', () => {
  const canonicalRoom: Room = {
    roomId: 'room-lactantes-a',
    name: 'Lactantes A',
    minAgeMonths: 0,
    maxAgeMonths: 6,
  };

  const canonicalContext: WeeklyPlanningEvidenceContext = {
    room: canonicalRoom,
    modality: 'DIRECT',
    weekStart: '2026-08-24',
    weekEnd: '2026-08-28',
  };

  const createSampleProposal = (): WeeklyPlanningProposalResponse => ({
    days: [
      {
        dayOfWeek: 'MONDAY',
        date: '2026-08-24',
        activities: [
          {
            experienceId: 'EXP-D1-A1',
            category: 'EXPERIENCIAS ARTÍSTICAS',
            objective: 'Estimular el rastreo visual y fijación de la mirada.',
            description: 'Movimiento guiado de móvil de contraste suave frente al infante.',
            durationMinutes: 15,
            materials: ['Móvil de contraste visual', 'Colchoneta limpia'],
          },
          {
            experienceId: 'EXP-D1-A2',
            category: 'ACTIVACIÓN FÍSICA',
            objective: 'Favorecer el tono muscular en cuello mediante tiempo boca abajo guiado.',
            description: 'Postura guiada sobre cuña suave con apoyo visual al frente.',
            durationMinutes: 10,
            materials: ['Cuña de estimulación', 'Sonaja suave'],
          },
        ],
      },
      {
        dayOfWeek: 'TUESDAY',
        date: '2026-08-25',
        activities: [
          {
            experienceId: 'EXP-D2-A1',
            category: 'LENGUAJE Y COMUNICACIÓN',
            objective: 'Promover la vocalización responsiva y el contacto visual.',
            description: 'Diálogo cara a cara con entonación melódica y pausas para respuesta.',
            durationMinutes: 15,
            materials: ['Colchoneta'],
          },
        ],
      },
      {
        dayOfWeek: 'WEDNESDAY',
        date: '2026-08-26',
        activities: [
          {
            experienceId: 'EXP-D3-A1',
            category: 'AMBIENTES DE APRENDIZAJE',
            objective: 'Estimular la exploración sensorial táctil.',
            description: 'Contacto guiado con retazos de algodón y terciopelo.',
            durationMinutes: 15,
            materials: ['Retazos de tela suaves'],
          },
        ],
      },
      {
        dayOfWeek: 'THURSDAY',
        date: '2026-08-27',
        activities: [
          {
            experienceId: 'EXP-D4-A1',
            category: 'LECTURA EN VOZ ALTA',
            objective: 'Acercar a la cadencia de la palabra cantada y leída.',
            description: 'Lectura rítmica con libro de tela y figuras grandes.',
            durationMinutes: 10,
            materials: ['Libro de tela suave'],
          },
        ],
      },
      {
        dayOfWeek: 'FRIDAY',
        date: '2026-08-28',
        activities: [
          {
            experienceId: 'EXP-D5-A1',
            category: 'PENSAMIENTO MATEMÁTICO',
            objective: 'Desarrollar la noción de permanencia del objeto.',
            description: 'Juego de ocultar sonaja bajo manta ligera y descubrirla.',
            durationMinutes: 15,
            materials: ['Sonaja ligera', 'Manta de tela'],
          },
        ],
      },
    ],
    progression: {
      weeklyFocus: 'Estimulación sensorial temprana y comunicación afectiva',
      experiences: [
        {
          experienceId: 'EXP-D1-A1',
          role: 'EXPLORE',
          observationTarget: 'Estimular el rastreo visual y fijación de la mirada',
        },
        {
          experienceId: 'EXP-D1-A2',
          role: 'EXPLORE',
          observationTarget: 'Favorecer el tono muscular en cuello mediante tiempo boca abajo guiado',
        },
        {
          experienceId: 'EXP-D2-A1',
          role: 'EXPLORE',
          observationTarget: 'Promover la vocalización responsiva y el contacto visual',
        },
        {
          experienceId: 'EXP-D3-A1',
          role: 'EXPLORE',
          observationTarget: 'Estimular la exploración sensorial táctil',
        },
        {
          experienceId: 'EXP-D4-A1',
          role: 'EXPLORE',
          observationTarget: 'Acercar a la cadencia de la palabra cantada y leída',
        },
        {
          experienceId: 'EXP-D5-A1',
          role: 'OBSERVE_OR_CONSOLIDATE',
          revisitsExperienceId: 'EXP-D1-A1',
          observationTarget: 'Desarrollar la noción de permanencia del objeto',
        },
      ],
    },
  });

  // Requirement 3: evidence JSON contains canonical room context
  it('3. evidence JSON contains canonical room context (roomId, name, minAgeMonths, maxAgeMonths)', () => {
    const proposal = createSampleProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(evidence.room.roomId).toBe('room-lactantes-a');
    expect(evidence.room.name).toBe('Lactantes A');
    expect(evidence.room.minAgeMonths).toBe(0);
    expect(evidence.room.maxAgeMonths).toBe(6);
  });

  // Requirement 4: evidence JSON contains modality and week
  it('4. evidence JSON contains modality and weekStart/weekEnd', () => {
    const proposal = createSampleProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(evidence.modality).toBe('DIRECT');
    expect(evidence.weekStart).toBe('2026-08-24');
    expect(evidence.weekEnd).toBe('2026-08-28');
    expect(evidence.version).toBe('1.0');
  });

  // Requirement 5: evidence JSON contains all five weekdays
  it('5. evidence JSON contains all five weekdays in canonical order', () => {
    const proposal = createSampleProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(evidence.days).toHaveLength(5);
    expect(evidence.days.map((d) => d.dayOfWeek)).toEqual([
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
    ]);
  });

  // Requirement 6: evidence JSON contains every activity from the proposal
  it('6. evidence JSON contains every activity from the proposal with complete canonical fields', () => {
    const proposal = createSampleProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    // Monday has 2 activities, other days have 1
    const totalActivities = evidence.days.reduce((sum, d) => sum + d.activities.length, 0);
    expect(totalActivities).toBe(6);

    const monAct1 = evidence.days[0].activities[0];
    expect(monAct1.category).toBe('EXPERIENCIAS ARTÍSTICAS');
    expect(monAct1.objective).toBe('Estimular el rastreo visual y fijación de la mirada.');
    expect(monAct1.description).toBe('Movimiento guiado de móvil de contraste suave frente al infante.');
    expect(monAct1.durationMinutes).toBe(15);
    expect(monAct1.materials).toEqual(['Móvil de contraste visual', 'Colchoneta limpia']);
  });

  // Requirement 7: activity ordering is preserved
  it('7. activity ordering is strictly preserved exactly as presented to Anita', () => {
    const proposal = createSampleProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    const mon = evidence.days[0];
    expect(mon.activities[0].category).toBe('EXPERIENCIAS ARTÍSTICAS');
    expect(mon.activities[1].category).toBe('ACTIVACIÓN FÍSICA');
  });

  // Requirement 8: materials ordering/content is preserved
  it('8. materials ordering and contents are strictly preserved', () => {
    const proposal = createSampleProposal();
    const evidence = buildWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(evidence.days[0].activities[0].materials).toEqual([
      'Móvil de contraste visual',
      'Colchoneta limpia',
    ]);
    expect(evidence.days[0].activities[1].materials).toEqual([
      'Cuña de estimulación',
      'Sonaja suave',
    ]);
  });

  // Requirement 9: same proposal/context serializes byte-for-byte identically on repeated calls
  it('9. same proposal/context serializes byte-for-byte identically across repeated calls', () => {
    const proposal = createSampleProposal();
    const json1 = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);
    const json2 = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);
    const json3 = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(json1).toBe(json2);
    expect(json2).toBe(json3);
    expect(json1.length).toBeGreaterThan(100);
  });

  // Requirement 10: evidence JSON does NOT contain capturedAt
  it('10. evidence JSON does NOT contain capturedAt or any volatile timestamps', () => {
    const proposal = createSampleProposal();
    const json = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    expect(json).not.toContain('capturedAt');
    expect(json).not.toContain('timestamp');
    expect(json).not.toContain('createdAt');
    expect(json).not.toContain('generatedAt');
  });

  // Requirement 11: evidence JSON excludes UID/auth/token/lifecycle/provider metadata
  it('11. evidence JSON excludes UID, teacher identity, tokens, lifecycle status, and provider metadata', () => {
    const proposal = createSampleProposal();
    const json = serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    const forbiddenTerms = [
      'uid',
      'teacherId',
      'teacherEmail',
      'authToken',
      'bearer',
      'secret',
      'apiKey',
      'status',
      'lifecycle',
      'draft',
      'approved',
      'in_review',
      'correlationId',
      'openai',
      'prompt',
      'rawResponse',
      'curricularTraceability',
      'pdaId',
      'complementaryActivities',
      'prioritizedPractices',
    ];

    for (const term of forbiddenTerms) {
      expect(json.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });

  // Requirement 16: serialize does NOT mutate proposal
  it('16. serialize does NOT mutate the original proposal object or its days/activities', () => {
    const proposal = createSampleProposal();
    const snapshotBefore = JSON.stringify(proposal);

    serializeWeeklyPlanningProposalEvidence(proposal, canonicalContext);

    const snapshotAfter = JSON.stringify(proposal);
    expect(snapshotAfter).toBe(snapshotBefore);
  });

  it('guarantees deterministic weekday sorting even if proposal days are out of order', () => {
    const sample = createSampleProposal();
    const unorderedProposal: WeeklyPlanningProposalResponse = {
      days: [
        sample.days[4], // Friday
        sample.days[0], // Monday
        sample.days[2], // Wednesday
        sample.days[1], // Tuesday
        sample.days[3], // Thursday
      ],
      progression: sample.progression,
    };

    const evidence = buildWeeklyPlanningProposalEvidence(unorderedProposal, canonicalContext);
    expect(evidence.days.map((d) => d.dayOfWeek)).toEqual([
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
    ]);
  });
});
