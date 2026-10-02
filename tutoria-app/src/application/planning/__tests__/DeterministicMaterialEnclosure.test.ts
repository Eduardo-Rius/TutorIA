import { describe, it, expect, vi } from 'vitest';
import {
  createRequestScopedMaterialTable,
  buildWeeklyPlanningJsonSchema,
  validateObjectiveForMaterialAgnosticism,
  validateProceduralActionEnclosure,
  projectInternalActivityToCanonical,
  parseAndAllowlistUntrustedProposal,
  AIWeeklyPlanningProposalSource,
  type WeeklyPlanningAIExecutor,
} from '../AIWeeklyPlanningProposalSource';
import {
  InvalidWeeklyPlanningProposalError,
  type WeeklyPlanningProposalRequest,
  type ProposedActivity,
  type WeeklyPlanningProposalResponse,
} from '../WeeklyPlanningProposalSource';
import { serializeWeeklyPlanningProposalEvidence } from '../../../presentation/planning-ui/weeklyPlanningProposalEvidence';

describe('H1R12.3A-I — DETERMINISTIC MATERIAL ENCLOSURE', () => {
  const sampleEducatorMaterials = [
    'pelotas suaves',
    'telas de diferentes texturas',
    'recipientes plásticos',
    'hojas',
    'crayones gruesos',
    'música infantil',
  ];

  const sampleApprovedFixtures = ['colchonetas', 'cunas'];

  // ============================================================
  // 13 — REQUEST-SCOPED REF TESTS (1 TO 11)
  // ============================================================

  describe('13 — Request-Scoped Material Symbol Table & Ref Tests', () => {
    it('1. deterministic material mapping: assigns deterministic IDs in order', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials, sampleApprovedFixtures);

      expect(table.entries).toHaveLength(8);
      expect(table.entries[0]).toEqual({
        refId: 'MAT-01',
        displayName: 'pelotas suaves',
        source: 'EDUCATOR_SUPPLIED',
      });
      expect(table.entries[1]).toEqual({
        refId: 'MAT-02',
        displayName: 'telas de diferentes texturas',
        source: 'EDUCATOR_SUPPLIED',
      });
      expect(table.entries[5]).toEqual({
        refId: 'MAT-06',
        displayName: 'música infantil',
        source: 'EDUCATOR_SUPPLIED',
      });
      expect(table.entries[6]).toEqual({
        refId: 'MAT-07',
        displayName: 'colchonetas',
        source: 'APPROVED_FIXTURE',
      });
      expect(table.entries[7]).toEqual({
        refId: 'MAT-08',
        displayName: 'cunas',
        source: 'APPROVED_FIXTURE',
      });
    });

    it('2. same input -> same refs: repeated calls produce identical symbol tables', () => {
      const table1 = createRequestScopedMaterialTable(sampleEducatorMaterials, sampleApprovedFixtures);
      const table2 = createRequestScopedMaterialTable(sampleEducatorMaterials, sampleApprovedFixtures);

      expect(table1.entries).toEqual(table2.entries);
      for (let i = 0; i < table1.entries.length; i++) {
        expect(table1.entries[i]?.refId).toBe(table2.entries[i]?.refId);
        expect(table1.entries[i]?.displayName).toBe(table2.entries[i]?.displayName);
      }
    });

    it('3. no timestamp/random IDs: IDs are pure deterministic counter-based symbols', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);

      for (const entry of table.entries) {
        expect(entry.refId).toMatch(/^MAT-\d{2}$/);
        // Ensure no timestamps (not containing Date.now digits) and no UUID patterns
        expect(entry.refId).not.toMatch(/[a-f0-9]{8}-[a-f0-9]{4}/);
        expect(entry.refId.length).toBe(6);
      }
    });

    it('4. only educator materials + approved fixtures enter symbol table', () => {
      const table = createRequestScopedMaterialTable(
        ['pelotas suaves', 'hojas'],
        ['colchonetas']
      );

      const displayNames = table.entries.map((e) => e.displayName);
      expect(displayNames).toEqual(['pelotas suaves', 'hojas', 'colchonetas']);
      expect(table.refMap.has('MAT-01')).toBe(true);
      expect(table.refMap.has('MAT-02')).toBe(true);
      expect(table.refMap.has('MAT-03')).toBe(true);
      expect(table.refMap.has('MAT-04')).toBe(false);

      // Unsupplied materials must NOT exist in the symbol table
      expect(table.displayNameMap.has('sonajas')).toBe(false);
      expect(table.displayNameMap.has('sonajas suaves')).toBe(false);
      expect(table.displayNameMap.has('plastilina')).toBe(false);
    });

    it('5. valid ref resolves correctly from symbol table', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);

      const entry1 = table.refMap.get('MAT-01');
      expect(entry1).toBeDefined();
      expect(entry1?.displayName).toBe('pelotas suaves');

      const entry3 = table.refMap.get('MAT-03');
      expect(entry3).toBeDefined();
      expect(entry3?.displayName).toBe('recipientes plásticos');
    });

    it('6. unknown ref fails closed: rejects any ref outside request-scoped table', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);

      const rawAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular el seguimiento visual',
        proceduralAction: 'Mover suavemente {material} frente al lactante',
        materialRefs: ['MAT-99'], // Unknown ref
        durationMinutes: 10,
      };

      expect(() =>
        projectInternalActivityToCanonical(rawAct, table, 0, 0)
      ).toThrow(InvalidWeeklyPlanningProposalError);

      expect(() =>
        projectInternalActivityToCanonical(rawAct, table, 0, 0)
      ).toThrow(/Unknown material ref 'MAT-99'/);
    });

    it('7. materialRefs constrained to allowed universe in strict JSON Schema', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);
      const schema = buildWeeklyPlanningJsonSchema(table);

      const daysProp = (schema as any).properties.days;
      const actSchema = daysProp.items.properties.activities.items;
      const materialRefsItem = actSchema.properties.materialRefs.items;

      expect(materialRefsItem.enum).toEqual([
        'MAT-01',
        'MAT-02',
        'MAT-03',
        'MAT-04',
        'MAT-05',
        'MAT-06',
      ]);
      expect(actSchema.required).toContain('materialRefs');
      expect(actSchema.additionalProperties).toBe(false);
    });

    it('8. projected ProposedActivity.materials contains human-readable canonical supplied names', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);

      const rawAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular el seguimiento visual de contrastes',
        proceduralAction: 'Presentar {material} a una distancia de 20-30 cm',
        materialRefs: ['MAT-01', 'MAT-02'],
        durationMinutes: 10,
      };

      const canonical = projectInternalActivityToCanonical(rawAct, table, 0, 0);
      expect(canonical.materials).toEqual([
        'pelotas suaves',
        'telas de diferentes texturas',
      ]);
    });

    it('9. no provider ref leaks to Anita: ref IDs do not appear in canonical activity', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);

      const rawAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la exploración visual',
        proceduralAction: 'Desplazar lentamente {material} frente al campo visual',
        materialRefs: ['MAT-01'],
        durationMinutes: 15,
      };

      const canonical = projectInternalActivityToCanonical(rawAct, table, 0, 0);

      // Verify that no internal 'MAT-' ref leaks into any educator-facing field
      expect(canonical.description).not.toContain('MAT-');
      expect(canonical.objective).not.toContain('MAT-');
      for (const mat of canonical.materials) {
        expect(mat).not.toContain('MAT-');
      }
      expect(canonical.description).toBe(
        'Desplazar lentamente pelotas suaves frente al campo visual'
      );
    });

    it('10. public ProposedActivity contract unchanged: produces exact canonical shape', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);

      const rawAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Favorecer la estimulación táctil',
        proceduralAction: 'Acercar {material} a las manos del lactante',
        materialRefs: ['MAT-02'],
        durationMinutes: 10,
      };

      const canonical: ProposedActivity = projectInternalActivityToCanonical(rawAct, table, 0, 0);

      const keys = Object.keys(canonical).sort();
      expect(keys).toEqual([
        'category',
        'description',
        'durationMinutes',
        'materials',
        'objective',
      ]);
      expect(typeof canonical.category).toBe('string');
      expect(typeof canonical.objective).toBe('string');
      expect(typeof canonical.description).toBe('string');
      expect(typeof canonical.durationMinutes).toBe('number');
      expect(Array.isArray(canonical.materials)).toBe(true);
    });

    it('11. H1R12.1 evidence contract unchanged: serializes deterministically from projected proposal', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);

      const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      const rawProposal = {
        days: days.map((dayOfWeek) => ({
          dayOfWeek,
          activities: [
            {
              category: 'EXPERIENCIAS ARTÍSTICAS',
              objective: 'Estimular la fijación visual',
              proceduralAction: 'Mover suavemente {material} en el campo visual',
              materialRefs: ['MAT-01'],
              durationMinutes: 10,
            },
          ],
        })),
      };

      const projected = parseAndAllowlistUntrustedProposal(rawProposal, table);

      const jsonString = serializeWeeklyPlanningProposalEvidence(projected, {
        room: {
          roomId: 'room-lactantes-a',
          name: 'Lactantes A',
          minAgeMonths: 0,
          maxAgeMonths: 6,
        },
        modality: 'DIRECT',
        weekStart: '2026-08-10',
        weekEnd: '2026-08-14',
      });

      const evidence = JSON.parse(jsonString);
      expect(evidence.version).toBe('1.0');
      expect(evidence.room.name).toBe('Lactantes A');
      expect(evidence.days).toHaveLength(5);
      const firstAct = evidence.days[0]?.activities[0];
      expect(firstAct?.materials).toEqual(['pelotas suaves']);
      expect(firstAct?.description).toBe('Mover suavemente pelotas suaves en el campo visual');
      // Zero volatile metadata
      expect(evidence.capturedAt).toBeUndefined();
    });
  });

  // ============================================================
  // 14 — NARRATIVE / OBJECTIVE TESTS (12 TO 17)
  // ============================================================

  describe('14 — Narrative & Objective Hardening Tests', () => {
    it('12. objective with a request-scoped material display name is rejected', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);

      expect(() => {
        validateObjectiveForMaterialAgnosticism(
          'Favorecer el seguimiento visual usando pelotas suaves en el tapete',
          table
        );
      }).toThrow(InvalidWeeklyPlanningProposalError);

      expect(() => {
        validateObjectiveForMaterialAgnosticism(
          'Favorecer la prensión con crayones gruesos',
          table
        );
      }).toThrow(/cannot name physical materials.*crayones gruesos/i);
    });

    it('13. objective with material ref syntax is rejected', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);

      expect(() => {
        validateObjectiveForMaterialAgnosticism(
          'Estimular los sentidos utilizando MAT-01',
          table
        );
      }).toThrow(InvalidWeeklyPlanningProposalError);

      expect(() => {
        validateObjectiveForMaterialAgnosticism(
          'Estimular los sentidos con {material}',
          table
        );
      }).toThrow(/cannot contain material reference syntax/);
    });

    it('14. material-bearing final description uses server-resolved authorized material', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);

      // Case A: placeholder {material} interpolation
      const rawWithPlaceholder = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Favorecer la respuesta auditiva',
        proceduralAction: 'Reproducir {material} a volumen tenue durante el momento pedagógico',
        materialRefs: ['MAT-06'],
        durationMinutes: 15,
      };
      const canonicalA = projectInternalActivityToCanonical(rawWithPlaceholder, table, 0, 0);
      expect(canonicalA.description).toBe(
        'Reproducir música infantil a volumen tenue durante el momento pedagógico'
      );
      expect(canonicalA.materials).toEqual(['música infantil']);

      // Case B: prefix composition when no placeholder is used
      const rawNoPlaceholder = {
        category: 'AMBIENTES DE APRENDIZAJE',
        objective: 'Propiciar la exploración de texturas',
        proceduralAction: 'colocar sobre la colchoneta para que el lactante roce con sus manos',
        materialRefs: ['MAT-02'],
        durationMinutes: 10,
      };
      const canonicalB = projectInternalActivityToCanonical(rawNoPlaceholder, table, 0, 0);
      expect(canonicalB.description).toBe(
        'Con telas de diferentes texturas: colocar sobre la colchoneta para que el lactante roce con sus manos'
      );
      expect(canonicalB.materials).toEqual(['telas de diferentes texturas']);
    });

    it('15. empty materialRefs causes zero physical material interpolation', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);

      const rawNonMaterialAct = {
        category: 'ACTIVACIÓN FÍSICA',
        objective: 'Favorecer el movimiento libre y la flexión-extensión guiada',
        proceduralAction:
          'Realizar flexiones y extensiones suaves de piernas y brazos cantando rimas al lactante',
        materialRefs: [],
        durationMinutes: 10,
      };

      const canonical = projectInternalActivityToCanonical(rawNonMaterialAct, table, 0, 0);
      expect(canonical.materials).toEqual([]);
      expect(canonical.description).toBe(
        'Realizar flexiones y extensiones suaves de piernas y brazos cantando rimas al lactante'
      );
      // Zero material words interpolated
      expect(canonical.description).not.toContain('Con ');
      expect(canonical.description).not.toContain('pelotas');
      expect(canonical.description).not.toContain('telas');
    });

    it('16. exact Case A "sonajas suaves" class cannot reach canonical proposal', () => {
      const table = createRequestScopedMaterialTable(sampleEducatorMaterials);
      // Authorized materials: pelotas suaves, telas, recipientes, hojas, crayones, música.
      // (sonajas are NOT authorized)

      // Attempt 1: Provider attempts to declare 'sonajas suaves' in materialRefs
      const rawAttempt1 = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la orientación auditiva',
        proceduralAction: 'Mover {material} cerca del lactante',
        materialRefs: ['sonajas suaves'],
        durationMinutes: 10,
      };
      expect(() =>
        projectInternalActivityToCanonical(rawAttempt1, table, 0, 0)
      ).toThrow(InvalidWeeklyPlanningProposalError);

      // Attempt 2: Provider attempts an unmapped ref id
      const rawAttempt2 = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la orientación auditiva',
        proceduralAction: 'Mover {material} cerca del lactante',
        materialRefs: ['MAT-SONAJAS'],
        durationMinutes: 10,
      };
      expect(() =>
        projectInternalActivityToCanonical(rawAttempt2, table, 0, 0)
      ).toThrow(InvalidWeeklyPlanningProposalError);

      // Attempt 3: Exact Case A reproduction — empty materialRefs while attempting free text introduction
      const rawAttempt3 = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la orientación auditiva de los lactantes',
        proceduralAction:
          'Cantar suavemente y realizar contacto visual para captar la atención de los lactantes',
        materialRefs: [],
        durationMinutes: 10,
      };
      const canonicalAttempt3 = projectInternalActivityToCanonical(rawAttempt3, table, 0, 0);
      // Under Architecture E, materials is strictly derived from materialRefs -> empty
      expect(canonicalAttempt3.materials).toEqual([]);
      // "sonajas suaves" CANNOT be established as an authoritative material
      expect(canonicalAttempt3.materials).not.toContain('sonajas suaves');
      expect(canonicalAttempt3.materials).not.toContain('sonajas');
    });

    it('17. no Spanish noun blacklist is required for the guarantee', () => {
      // The architecture enforces enclosure via request-scoped materialRefs symbol table,
      // not via maintaining an open-ended dictionary of Spanish nouns.
      const table = createRequestScopedMaterialTable(['bloques de madera']);

      // A legitimate non-material pedagogical action using common body/voice words is accepted
      const nonMaterialAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la comunicación temprana y el balbuceo',
        proceduralAction:
          'Conversar con el lactante imitando sus sonidos y sonriendo con calidez',
        materialRefs: [],
        durationMinutes: 10,
      };

      const canonical = projectInternalActivityToCanonical(nonMaterialAct, table, 0, 0);
      expect(canonical.materials).toEqual([]);
      expect(canonical.objective).toBe('Estimular la comunicación temprana y el balbuceo');
    });
  });

  // ============================================================
  // 15 — GOVERNANCE REGRESSION (18 TO 25)
  // ============================================================

  describe('15 — Governance Regression (Zero Side Effects & Human Gate Preservation)', () => {
    const buildFullFiveDayCandidate = (materialRefs: string[] = ['MAT-01']) => {
      const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      return {
        days: days.map((dayOfWeek) => ({
          dayOfWeek,
          activities: Array.from({ length: 5 }, (_, i) => ({
            category: 'EXPERIENCIAS ARTÍSTICAS',
            objective: `Objetivo pedagógico del momento ${i + 1}`,
            proceduralAction: `Interacción pedagógica ${i + 1} con {material}`,
            materialRefs,
            durationMinutes: 10,
          })),
        })),
      };
    };

    const makeProposalRequest = (): WeeklyPlanningProposalRequest => ({
      planningId: 'plan-test-123',
      roomId: 'room-lactantes-a',
      daycareId: 'daycare-001',
      teacherId: 'teacher-anita',
      room: {
        roomId: 'room-lactantes-a',
        name: 'Lactantes A',
        minAgeMonths: 0,
        maxAgeMonths: 6,
      },
      modality: 'DIRECT',
      weekStart: '2026-08-10',
      weekEnd: '2026-08-14',
      currentContext: {
        availableMaterials:
          'pelotas suaves, telas de diferentes texturas, recipientes plásticos, hojas, crayones gruesos, música infantil',
      },
    });

    it('18. proposal does not persist: zero database mutations during propose()', async () => {
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(buildFullFiveDayCandidate()),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const proposal = await source.propose(makeProposalRequest());

      expect(proposal).toBeDefined();
      expect(proposal.days).toHaveLength(5);
      // Pure in-memory object: no database ID or Firestore collection metadata
      expect((proposal as any).id).toBeUndefined();
      expect((proposal as any)._firestore).toBeUndefined();
    });

    it('19. proposal does not approve: proposal contains zero approval state', async () => {
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(buildFullFiveDayCandidate()),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const proposal = await source.propose(makeProposalRequest());

      expect((proposal as any).status).toBeUndefined();
      expect((proposal as any).approved).toBeUndefined();
      expect((proposal as any).approvedBy).toBeUndefined();
      expect((proposal as any).isApproved).toBeUndefined();
    });

    it('20. no lifecycle transition: planning lifecycle is untouched', async () => {
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(buildFullFiveDayCandidate()),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const proposal = await source.propose(makeProposalRequest());

      expect((proposal as any).lifecycleState).toBeUndefined();
      expect((proposal as any).workflowState).toBeUndefined();
    });

    it('21. no PDA: activities contain zero PDA assignment or pdaId', async () => {
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(buildFullFiveDayCandidate()),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const proposal = await source.propose(makeProposalRequest());

      for (const day of proposal.days) {
        for (const act of day.activities) {
          expect((act as any).pdaId).toBeUndefined();
          expect((act as any).pda).toBeUndefined();
          expect((act as any).curricularPDA).toBeUndefined();
        }
      }
    });

    it('22. no curricularTraceability: activities contain zero curricular traceability', async () => {
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(buildFullFiveDayCandidate()),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const proposal = await source.propose(makeProposalRequest());

      for (const day of proposal.days) {
        for (const act of day.activities) {
          expect((act as any).curricularTraceability).toBeUndefined();
          expect((act as any).catalogRevision).toBeUndefined();
        }
      }
    });

    it('23. no complementary activity creation: does not invent institutional complementary programs', async () => {
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(buildFullFiveDayCandidate()),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const proposal = await source.propose(makeProposalRequest());

      expect((proposal as any).complementaryActivities).toBeUndefined();
      for (const day of proposal.days) {
        expect((day as any).complementaryActivities).toBeUndefined();
      }
    });

    it('24. no prioritized practice creation: does not invent prioritized practices', async () => {
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(buildFullFiveDayCandidate()),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const proposal = await source.propose(makeProposalRequest());

      expect((proposal as any).prioritizedPractices).toBeUndefined();
      for (const day of proposal.days) {
        expect((day as any).prioritizedPractices).toBeUndefined();
      }
    });

    it('25. Human Gate remains Anita’s decision point: returns candidate proposal for human review', async () => {
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn().mockResolvedValue(buildFullFiveDayCandidate()),
      };

      const source = new AIWeeklyPlanningProposalSource(mockExecutor);
      const proposal = await source.propose(makeProposalRequest());

      // The proposal is returned directly as candidate data for Anita's Human Gate
      expect(proposal.days).toHaveLength(5);
      expect(proposal.days[0]?.activities).toHaveLength(5);
      const firstAct = proposal.days[0]?.activities[0];
      expect(firstAct?.category).toBe('EXPERIENCIAS ARTÍSTICAS');
      expect(firstAct?.materials).toEqual(['pelotas suaves']);
      expect(firstAct?.description).toContain('pelotas suaves');
    });
  });

  // ============================================================
  // H1R12.3A-I.1 — SECTION 1 FORENSIC COUNTEREXAMPLE
  // ============================================================

  describe('H1R12.3A-I.1 Section 1 — Blocker Forensic Counterexample', () => {
    it('proves the free proceduralAction material leak counterexample is blocked', () => {
      // Allowed request-scoped materials:
      // MAT-01 = "telas de diferentes texturas"
      // MAT-02 = "música infantil"
      const allowedMaterials = ['telas de diferentes texturas', 'música infantil'];
      const table = createRequestScopedMaterialTable(allowedMaterials);

      // Provider returns internal payload attempting to smuggle "sonajas suaves" via proceduralAction:
      const counterexamplePayload = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la respuesta auditiva a sonidos suaves.',
        proceduralAction: 'Utilizar sonajas suaves para captar la atención de los lactantes.',
        materialRefs: [],
        durationMinutes: 10,
      };

      // Under H1R12.3A-I.1, projection MUST throw InvalidWeeklyPlanningProposalError
      // and "sonajas" MUST NOT reach canonical description.
      expect(() => {
        projectInternalActivityToCanonical(counterexamplePayload, table, 0, 0);
      }).toThrow(InvalidWeeklyPlanningProposalError);

      expect(() => {
        projectInternalActivityToCanonical(counterexamplePayload, table, 0, 0);
      }).toThrow(/unauthorized material 'sonaja\(s\)'/);
    });
  });

  // ============================================================
  // H1R12.3A-I.1 — SECTION 8 REQUIRED ADVERSARIAL TESTS (A TO E)
  // ============================================================

  describe('H1R12.3A-I.1 Section 8 — Required Adversarial Enclosure Tests (A to E)', () => {
    const table = createRequestScopedMaterialTable(['telas de diferentes texturas', 'música infantil']);

    it('A. allowed: telas, música | procedural provider attempt: "Utilizar sonajas suaves..." | materialRefs: [] -> "sonajas" MUST NOT reach canonical description', () => {
      const hostileAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la respuesta auditiva a sonidos suaves.',
        proceduralAction: 'Utilizar sonajas suaves para captar la atención de los lactantes.',
        materialRefs: [],
        durationMinutes: 10,
      };

      expect(() => {
        projectInternalActivityToCanonical(hostileAct, table, 0, 0);
      }).toThrow(InvalidWeeklyPlanningProposalError);

      // Verify that even via parseAndAllowlistUntrustedProposal the whole proposal fails closed
      const fullProposal = {
        days: [
          {
            dayOfWeek: 'MONDAY',
            activities: [hostileAct],
          },
        ],
      };

      expect(() => {
        parseAndAllowlistUntrustedProposal(fullProposal, table);
      }).toThrow(InvalidWeeklyPlanningProposalError);
    });

    it('B. allowed: telas, música | provider attempts unknown materialRefs: ["MAT-99"] -> whole proposal rejected', () => {
      const unknownRefAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular el movimiento suave',
        proceduralAction: 'Mover {material} frente al lactante',
        materialRefs: ['MAT-99'],
        durationMinutes: 10,
      };

      expect(() => {
        projectInternalActivityToCanonical(unknownRefAct, table, 0, 0);
      }).toThrow(InvalidWeeklyPlanningProposalError);

      expect(() => {
        projectInternalActivityToCanonical(unknownRefAct, table, 0, 0);
      }).toThrow(/Unknown material ref 'MAT-99'/);
    });

    it('C. allowed: telas, música | provider attempts legacy payload { description, materials } -> real production provider path MUST NOT accept legacy shape', () => {
      const legacyAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la respuesta auditiva a sonidos suaves.',
        description: 'Utilizar sonajas suaves para captar la atención de los lactantes.',
        materials: [],
        durationMinutes: 10,
      };

      // Real production provider path MUST reject legacy shape
      expect(() => {
        projectInternalActivityToCanonical(legacyAct as any, table, 0, 0);
      }).toThrow(InvalidWeeklyPlanningProposalError);

      expect(() => {
        projectInternalActivityToCanonical(legacyAct as any, table, 0, 0);
      }).toThrow(/unexpected or forbidden property 'description'/);
    });

    it('D. valid: materialRef corresponding to "telas de diferentes texturas" -> canonical description may contain exactly the resolved authorized display material', () => {
      const validMaterialAct = {
        category: 'AMBIENTES DE APRENDIZAJE',
        objective: 'Favorecer la exploración de contrastes suaves',
        proceduralAction: 'Deslizar suavemente {material} sobre las manos del lactante',
        materialRefs: ['MAT-01'], // MAT-01 = telas de diferentes texturas
        durationMinutes: 10,
      };

      const canonical = projectInternalActivityToCanonical(validMaterialAct, table, 0, 0);
      expect(canonical.materials).toEqual(['telas de diferentes texturas']);
      expect(canonical.description).toBe(
        'Deslizar suavemente telas de diferentes texturas sobre las manos del lactante'
      );
      expect(canonical.description).toContain('telas de diferentes texturas');
    });

    it('E. valid empty-material activity using existing permitted non-material interaction -> canonical description remains useful to Anita and contains no invented physical material', () => {
      const validNonMaterialAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Favorecer el vínculo afectivo y la respuesta vocal temprana',
        proceduralAction:
          'Cantar suavemente rimas y modular la voz manteniendo contacto visual afectivo con el lactante',
        materialRefs: [],
        durationMinutes: 10,
      };

      const canonical = projectInternalActivityToCanonical(validNonMaterialAct, table, 0, 0);
      expect(canonical.materials).toEqual([]);
      expect(canonical.description).toBe(
        'Cantar suavemente rimas y modular la voz manteniendo contacto visual afectivo con el lactante'
      );
      // Contains useful instruction for Anita, zero physical props
      expect(canonical.description).not.toContain('{material}');
      expect(canonical.description).not.toContain('Con ');
      expect(canonical.description).not.toContain('sonaja');
    });
  });

  // ============================================================
  // H1R12.3A-I.1 — SECTION 9 CASE A GOLDEN REGRESSION
  // ============================================================

  describe('H1R12.3A-I.1 Section 9 — Case A Golden Regression ("sonajas suaves")', () => {
    const authorizedMaterials = [
      'pelotas suaves',
      'telas de diferentes texturas',
      'recipientes plásticos',
      'hojas',
      'crayones gruesos',
      'música infantil',
    ];
    const table = createRequestScopedMaterialTable(authorizedMaterials);

    it('blocks "sonajas suaves" when materialRefs: [] is supplied with object-introducing verb', () => {
      const rawAttempt = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la respuesta auditiva a sonidos suaves.',
        proceduralAction: 'Utilizar sonajas suaves para captar la atención de los lactantes.',
        materialRefs: [],
        durationMinutes: 10,
      };

      expect(() => {
        projectInternalActivityToCanonical(rawAttempt, table, 0, 0);
      }).toThrow(InvalidWeeklyPlanningProposalError);

      expect(() => {
        projectInternalActivityToCanonical(rawAttempt, table, 0, 0);
      }).toThrow(/unauthorized material 'sonaja\(s\)'/);
    });

    it('blocks "sonajas suaves" even when non-utilizar verb is attempted in proceduralAction', () => {
      const rawAttempt = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la orientación auditiva del lactante',
        proceduralAction: 'Hacer sonar sonajas suaves cerca del oído del lactante.',
        materialRefs: [],
        durationMinutes: 10,
      };

      expect(() => {
        projectInternalActivityToCanonical(rawAttempt, table, 0, 0);
      }).toThrow(InvalidWeeklyPlanningProposalError);

      expect(() => {
        projectInternalActivityToCanonical(rawAttempt, table, 0, 0);
      }).toThrow(/unauthorized material 'sonaja\(s\)'/);
    });

    it('blocks "sonajas suaves" when smuggled alongside an authorized materialRef', () => {
      const rawAttempt = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la orientación auditiva del lactante',
        proceduralAction: 'Presentar {material} y agitar sonajas suaves frente al lactante.',
        materialRefs: ['MAT-01'], // pelotas suaves is authorized, but sonajas suaves is not
        durationMinutes: 10,
      };

      expect(() => {
        projectInternalActivityToCanonical(rawAttempt, table, 0, 0);
      }).toThrow(InvalidWeeklyPlanningProposalError);

      expect(() => {
        projectInternalActivityToCanonical(rawAttempt, table, 0, 0);
      }).toThrow(/unauthorized material 'sonaja\(s\)'/);
    });

    it('blocks legacy format attempting to pass "sonajas suaves" in description with materials: []', () => {
      const legacyAttempt = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la respuesta auditiva a sonidos suaves.',
        description: 'Utilizar sonajas suaves para captar la atención de los lactantes.',
        materials: [],
        durationMinutes: 10,
      };

      expect(() => {
        projectInternalActivityToCanonical(legacyAttempt as any, table, 0, 0);
      }).toThrow(InvalidWeeklyPlanningProposalError);
    });

    it('allows "sonajas suaves" if and only if the educator explicitly supplied it in the authorized request-scoped universe', () => {
      const tableWithSonajas = createRequestScopedMaterialTable([
        'sonajas suaves',
        'pelotas suaves',
      ]);

      const legitimateAct = {
        category: 'EXPERIENCIAS ARTÍSTICAS',
        objective: 'Estimular la orientación auditiva a sonidos suaves',
        proceduralAction: 'Desplazar suavemente {material} en el campo visual del lactante',
        materialRefs: ['MAT-01'], // MAT-01 is sonajas suaves because educator supplied it
        durationMinutes: 10,
      };

      const canonical = projectInternalActivityToCanonical(legitimateAct, tableWithSonajas, 0, 0);
      expect(canonical.materials).toEqual(['sonajas suaves']);
      expect(canonical.description).toBe(
        'Desplazar suavemente sonajas suaves en el campo visual del lactante'
      );
    });
  });
});
