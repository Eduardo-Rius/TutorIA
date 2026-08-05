import { describe, it, expect, beforeEach } from 'vitest';
import { PedagogicalContextResolver } from '../PedagogicalContextResolver';
import { ContextResolverInput, ContextInputFragment, isCompleteContext, PartialPedagogicalContext, CompletePedagogicalContext } from '../Contracts';

describe('PedagogicalContextResolver', () => {
  let resolver: PedagogicalContextResolver;

  beforeEach(() => {
    resolver = new PedagogicalContextResolver();
  });

  const GENERATED_AT = '2026-08-04T18:00:00.000Z';

  // Helpers
  const getRequiredFragment = (
    fragments: readonly ContextInputFragment[],
    index: number
  ): ContextInputFragment => {
    const fragment = fragments[index];

    if (fragment === undefined) {
      throw new Error(`Expected test fragment at index ${index}.`);
    }

    return fragment;
  };

  const buildFragment = (overrides: Partial<ContextInputFragment>): ContextInputFragment => ({
    sourceType: 'authenticated_session',
    sourceReference: 'ref-1',
    capturedAt: GENERATED_AT,
    payload: {},
    isAuthoritative: false,
    ...overrides,
  });

  const getBaseFragments = (): ContextInputFragment[] => [
    buildFragment({
      sourceType: 'membership_profile',
      isAuthoritative: true,
      payload: {
        actorId: 'user-1',
        actorRole: 'educator',
        institutionId: 'inst-1',
        childcareCenterId: 'center-1',
        groupId: 'group-maternal',
      }
    }),
    buildFragment({
      sourceType: 'active_planning',
      isAuthoritative: true,
      payload: {
        planningId: 'plan-1',
        planningStatus: 'draft',
        planningPeriod: 'week-1',
        ageRange: '45_days_to_6_months',
      }
    })
  ];

  it('1. Contexto completo para una Docente Maternal', () => {
    const input: ContextResolverInput = {
      generatedAt: GENERATED_AT,
      fragments: [
        ...getBaseFragments(),
        buildFragment({
          sourceType: 'educator_observation',
          payload: { observations: ['Observation 1'] }
        }),
        buildFragment({
          sourceType: 'user_selection',
          payload: { pedagogicalIntent: 'Develop motor skills' }
        }),
        buildFragment({
          sourceType: 'system_default',
          payload: { locale: 'es-MX' }
        }),
        buildFragment({
          sourceType: 'normative_framework',
          isAuthoritative: true,
          payload: { institutionalFrameworkIds: ['frame-1'] }
        })
      ]
    };

    const res = resolver.resolve(input);
    expect(res.completeness).toBe('complete');
    expect(res.canProvideGuidance).toBe(true);
    expect(res.canGenerateDraft).toBe(true);
    expect(res.canSubmitForApproval).toBe(true);
    expect(res.context.groupId).toBe('group-maternal');
  });

  it('2. Falta de grupo activo', () => {
    const fragments = getBaseFragments();
    const membershipFragment = getRequiredFragment(fragments, 0);
    const payload = { ...membershipFragment.payload };
    delete payload.groupId;
    fragments[0] = { ...membershipFragment, payload };

    const res = resolver.resolve({ generatedAt: GENERATED_AT, fragments });
    expect(res.canProvideGuidance).toBe(false);
    expect(res.canGenerateDraft).toBe(false);
    expect(res.completeness).toBe('incomplete');
    expect(res.missingRequirements).toContainEqual(expect.objectContaining({ field: 'groupId', severity: 'high' }));
  });

  it('3. Falta de rango de edad', () => {
    const fragments = getBaseFragments();
    const planningFragment = getRequiredFragment(fragments, 1);
    const payload = { ...planningFragment.payload };
    delete payload.ageRange;
    fragments[1] = { ...planningFragment, payload };

    const res = resolver.resolve({ generatedAt: GENERATED_AT, fragments });
    expect(res.canProvideGuidance).toBe(false);
    expect(res.completeness).toBe('incomplete');
    expect(res.missingRequirements).toContainEqual(expect.objectContaining({ field: 'ageRange', severity: 'high' }));
  });

  it('4. Planeación perteneciente a otro centro', () => {
    const fragments = getBaseFragments();
    const planningFragment = getRequiredFragment(fragments, 1);
    const overrides = { ...planningFragment.payload, childcareCenterId: 'center-2' };
    fragments[1] = buildFragment({
      sourceType: planningFragment.sourceType,
      isAuthoritative: planningFragment.isAuthoritative,
      payload: overrides
    });

    const res = resolver.resolve({ generatedAt: GENERATED_AT, fragments });
    expect(res.completeness).toBe('blocked');
    expect(res.missingRequirements).toContainEqual(expect.objectContaining({
      field: 'childcareCenterId',
      severity: 'critical',
      reason: expect.stringContaining('Authoritative conflict detected')
    }));
  });

  it('5. Usuario sin autorización para el grupo', () => {
    const input: ContextResolverInput = {
      generatedAt: GENERATED_AT,
      fragments: [
        buildFragment({
          sourceType: 'membership_profile',
          isAuthoritative: true,
          payload: { groupId: 'group-maternal' }
        }),
        buildFragment({
          sourceType: 'user_selection',
          isAuthoritative: false,
          payload: { groupId: 'group-preschool' }
        })
      ]
    };

    const res = resolver.resolve(input);
    expect(res.context.groupId).toBe('group-maternal');
    expect(res.warnings).toContainEqual(expect.objectContaining({
      field: 'groupId',
      message: expect.stringContaining('Conflicting non-authoritative value \'group-preschool\' from user_selection ignored')
    }));
  });

  it('6. Contradicción entre selección de usuario y catálogo institucional', () => {
    const input: ContextResolverInput = {
      generatedAt: GENERATED_AT,
      fragments: [
        buildFragment({
          sourceType: 'group_catalog',
          isAuthoritative: true,
          payload: { ageRange: '45_days_to_6_months' }
        }),
        buildFragment({
          sourceType: 'user_selection',
          isAuthoritative: false,
          payload: { ageRange: '1_to_2_years' }
        })
      ]
    };

    const res = resolver.resolve(input);
    expect(res.context.ageRange).toBe('45_days_to_6_months');
  });

  it('7. Observaciones disponibles, pero sin intención pedagógica', () => {
    const input: ContextResolverInput = {
      generatedAt: GENERATED_AT,
      fragments: [
        ...getBaseFragments(),
        buildFragment({
          sourceType: 'educator_observation',
          payload: { observations: ['Obs 1'] }
        })
      ]
    };
    const res = resolver.resolve(input);
    expect(res.canProvideGuidance).toBe(false);
    expect(res.missingRequirements).toContainEqual(expect.objectContaining({ field: 'pedagogicalIntent', severity: 'high' }));
  });

  it('8. Intención disponible, pero sin marco institucional (guidance but no draft)', () => {
    const input: ContextResolverInput = {
      generatedAt: GENERATED_AT,
      fragments: [
        ...getBaseFragments(),
        buildFragment({
          sourceType: 'user_selection',
          payload: { pedagogicalIntent: 'Intent' }
        })
      ]
    };
    const res = resolver.resolve(input);
    expect(res.canProvideGuidance).toBe(true);
    expect(res.canGenerateDraft).toBe(false);
    expect(res.completeness).toBe('sufficient_for_guidance');
  });

  it('9. Contexto suficiente para guidance, pero no para draft', () => {
    const input: ContextResolverInput = {
      generatedAt: GENERATED_AT,
      fragments: [
        ...getBaseFragments(),
        buildFragment({ sourceType: 'user_selection', payload: { pedagogicalIntent: 'Walk' } })
      ]
    };
    const res = resolver.resolve(input);
    expect(res.completeness).toBe('sufficient_for_guidance');
    expect(res.canProvideGuidance).toBe(true);
    expect(res.canGenerateDraft).toBe(false);
  });

  it('10. Contexto bloqueado para submission', () => {
    const fragments = getBaseFragments();
    const planningFragment = getRequiredFragment(fragments, 1);
    const overrides = { ...planningFragment.payload, planningStatus: 'approved' };

    fragments[1] = buildFragment({
      sourceType: planningFragment.sourceType,
      isAuthoritative: planningFragment.isAuthoritative,
      payload: overrides
    });

    const input: ContextResolverInput = {
      generatedAt: GENERATED_AT,
      fragments: [
        ...fragments,
        buildFragment({ sourceType: 'user_selection', payload: { pedagogicalIntent: 'Walk' } }),
        buildFragment({ sourceType: 'educator_observation', payload: { observations: ['Obs'] } })
      ]
    };

    const res = resolver.resolve(input);
    expect(res.canGenerateDraft).toBe(true);
    expect(res.canSubmitForApproval).toBe(false);
    expect(res.completeness).toBe('sufficient_for_draft');
  });

  it('11. Determinismo de resolución', () => {
    const input = { generatedAt: GENERATED_AT, fragments: getBaseFragments() };
    const res1 = resolver.resolve(input);
    const res2 = resolver.resolve(input);
    expect(res1).toEqual(res2);
  });

  it('12. No mutación de entradas', () => {
    const input = { generatedAt: GENERATED_AT, fragments: getBaseFragments() };
    Object.freeze(input);
    Object.freeze(input.fragments);
    input.fragments.forEach(f => Object.freeze(f));
    input.fragments.forEach(f => Object.freeze(f.payload));

    expect(() => resolver.resolve(input)).not.toThrow();
  });

  it('13. Preservación de valores unknown', () => {
    const res = resolver.resolve({ generatedAt: GENERATED_AT, fragments: [] });
    expect(res.context.groupId).toBeUndefined();
  });

  it('14. Precedencia correcta de fuentes', () => {
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [
        buildFragment({ sourceType: 'user_selection', payload: { ageRange: 'A' }, capturedAt: '2026-08-04T12:00:00Z' }),
        buildFragment({ sourceType: 'group_catalog', payload: { ageRange: 'B' }, capturedAt: '2026-08-04T10:00:00Z' })
      ]
    });
    expect(res.context.ageRange).toBe('B');
  });

  it('15. Trazabilidad completa de campos críticos', () => {
    const res = resolver.resolve({ generatedAt: GENERATED_AT, fragments: getBaseFragments() });
    expect(res.evidence.find(e => e.field === 'actorId')).toBeDefined();
    expect(res.evidence.find(e => e.field === 'childcareCenterId')).toBeDefined();
  });

  it('16. La resolución no depende del orden de las fuentes de entrada', () => {
    const input1 = { generatedAt: GENERATED_AT, fragments: getBaseFragments() };
    const input2 = { generatedAt: GENERATED_AT, fragments: [...getBaseFragments()].reverse() };
    expect(resolver.resolve(input1)).toEqual(resolver.resolve(input2));
  });

  it('17. Dos ejecuciones producen exactamente la misma salida', () => {
    const input = { generatedAt: GENERATED_AT, fragments: getBaseFragments() };
    const json1 = JSON.stringify(resolver.resolve(input));
    const json2 = JSON.stringify(resolver.resolve(input));
    expect(json1).toEqual(json2);
  });

  it('18. Una selección explícita no autorizada no reemplaza un valor institucional', () => {
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [
        buildFragment({ sourceType: 'membership_profile', isAuthoritative: true, payload: { institutionId: 'inst-1' } }),
        buildFragment({ sourceType: 'user_selection', isAuthoritative: false, payload: { institutionId: 'inst-hacker' } })
      ]
    });
    expect(res.context.institutionId).toBe('inst-1');
  });

  it('19. Un valor institucional contradictorio genera evidencia del conflicto', () => {
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [
        buildFragment({ sourceType: 'membership_profile', isAuthoritative: true, payload: { institutionId: 'inst-1' }, capturedAt: '2026-08-04T12:00:00Z' }),
        buildFragment({ sourceType: 'childcare_center_catalog', isAuthoritative: true, payload: { institutionId: 'inst-2' }, capturedAt: '2026-08-04T11:00:00Z' })
      ]
    });
    expect(res.completeness).toBe('blocked');
    expect(res.missingRequirements.some(m => m.reason.includes('Authoritative conflict') && m.field === 'institutionId')).toBe(true);
  });

  it('20. La salida no comparte arreglos mutables con la entrada', () => {
    const observations = ['obs-1'];
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [buildFragment({ sourceType: 'educator_observation', payload: { observations } })]
    });
    expect(res.context.observations).not.toBe(observations);
    expect(res.context.observations).toEqual(observations);
    expect(Object.isFrozen(res.context.observations)).toBe(true);
  });

  it('21. Un dato operativo por default no completa un requisito pedagógico', () => {
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [
        buildFragment({ sourceType: 'system_default', payload: { groupId: 'default-group' } })
      ]
    });
    expect(res.context.groupId).toBeUndefined();
    expect(res.warnings).toContainEqual(expect.objectContaining({ field: 'groupId' }));
  });

  it('22. Un campo ausente permanece ausente en el contexto final', () => {
    const res = resolver.resolve({ generatedAt: GENERATED_AT, fragments: getBaseFragments() });
    expect(res.context.roomId).toBeUndefined();
  });

  it('23. canProvideGuidance, canGenerateDraft y canSubmitForApproval pueden producir combinaciones distintas', () => {
    const incomplete = resolver.resolve({ generatedAt: GENERATED_AT, fragments: [] });
    expect([incomplete.canProvideGuidance, incomplete.canGenerateDraft, incomplete.canSubmitForApproval]).toEqual([false, false, false]);

    const draftApproved = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [
        ...getBaseFragments(),
        buildFragment({ sourceType: 'user_selection', payload: { pedagogicalIntent: 'I' } }),
        buildFragment({ sourceType: 'educator_observation', payload: { observations: ['O'] } }),
        buildFragment({ sourceType: 'active_planning', isAuthoritative: true, payload: { planningStatus: 'approved' }, capturedAt: '2026-08-04T18:01:00.000Z' })
      ]
    });
    expect([draftApproved.canProvideGuidance, draftApproved.canGenerateDraft, draftApproved.canSubmitForApproval]).toEqual([true, true, false]);
  });

  it('24. Ningún warning se pierde cuando existe además un bloqueo', () => {
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [
        buildFragment({ sourceType: 'membership_profile', isAuthoritative: true, payload: { institutionId: 'inst-1' }, capturedAt: '2026-08-04T12:00:00Z' }),
        buildFragment({ sourceType: 'childcare_center_catalog', isAuthoritative: true, payload: { institutionId: 'inst-2' }, capturedAt: '2026-08-04T11:00:00Z' }),
        buildFragment({ sourceType: 'system_default', payload: { groupId: 'g1' } })
      ]
    });
    expect(res.completeness).toBe('blocked');
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('25. El resolver mantiene estable el orden de evidencias, faltantes y warnings', () => {
    const input = { generatedAt: GENERATED_AT, fragments: getBaseFragments() };
    const res1 = resolver.resolve(input);
    const res2 = resolver.resolve(input);
    expect(res1.evidence).toEqual(res2.evidence);
    expect(res1.missingRequirements).toEqual(res2.missingRequirements);
    expect(res1.warnings).toEqual(res2.warnings);
  });

  // TARGETED REFINEMENT TESTS (26-41)

  it('26. Contexto incompleto no se tipa ni se fuerza como completo', () => {
    const res = resolver.resolve({ generatedAt: GENERATED_AT, fragments: [] });
    expect(isCompleteContext(res.context)).toBe(false);
    expect(res.context.groupId).toBeUndefined(); // TS infers it's optional because it's PartialPedagogicalContext
  });

  it('27. Type guard reconoce un contexto realmente completo', () => {
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [
        ...getBaseFragments(),
        buildFragment({ sourceType: 'user_selection', payload: { pedagogicalIntent: 'Walk', locale: 'es-MX' } })
      ]
    });
    expect(isCompleteContext(res.context)).toBe(true);
    if (isCompleteContext(res.context)) {
      // TS infers groupId is defined inside this block
      expect(typeof res.context.groupId).toBe('string');
    }
  });

  it('28. Empate exacto produce la misma salida con arreglo invertido', () => {
    const f1 = buildFragment({ sourceType: 'membership_profile', payload: { institutionId: 'inst-1' }, sourceReference: 'A' });
    const f2 = buildFragment({ sourceType: 'membership_profile', payload: { institutionId: 'inst-2' }, sourceReference: 'B' });

    const res1 = resolver.resolve({ generatedAt: GENERATED_AT, fragments: [f1, f2] });
    const res2 = resolver.resolve({ generatedAt: GENERATED_AT, fragments: [f2, f1] });

    // sourceReference A is sorted before B, so A wins in both cases
    expect(res1.context.institutionId).toBe('inst-1');
    expect(res2.context.institutionId).toBe('inst-1');
    expect(res1).toEqual(res2);
  });

  it('29. Misma prioridad y fecha se desempata mediante sourceReference', () => {
    const f1 = buildFragment({ sourceType: 'membership_profile', payload: { institutionId: 'inst-2' }, sourceReference: 'Z' });
    const f2 = buildFragment({ sourceType: 'membership_profile', payload: { institutionId: 'inst-1' }, sourceReference: 'A' });

    const res = resolver.resolve({ generatedAt: GENERATED_AT, fragments: [f1, f2] });
    expect(res.context.institutionId).toBe('inst-1'); // A wins over Z lexicographically
  });

  it('30. Autoridad se decide por field + sourceType', () => {
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [
        buildFragment({ sourceType: 'educator_observation', payload: { actorRole: 'admin', observations: ['O1'] }, capturedAt: '2026-08-04T12:00:00Z' })
      ]
    });
    // educator_observation is prohibited for actorRole, but allowed for observations
    expect(res.context.actorRole).toBeUndefined();
    expect(res.context.observations).toContain('O1');
  });

  it('31. isAuthoritative=true no concede autoridad a una fuente prohibida', () => {
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [
        buildFragment({ sourceType: 'user_selection', isAuthoritative: true, payload: { institutionId: 'inst-hacker' } })
      ]
    });
    expect(res.context.institutionId).toBeUndefined();
    expect(res.warnings).toContainEqual(expect.objectContaining({ message: expect.stringContaining('prohibited') }));
  });

  it('32. Fuente prioritaria no necesariamente es autoritativa', () => {
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [
        buildFragment({ sourceType: 'user_selection', payload: { pedagogicalIntent: 'Walk' } }) // preferred
      ]
    });
    // User selection is preferred for intent, not strictly authoritative, but is highest available.
    expect(res.context.pedagogicalIntent).toBe('Walk');
  });

  it('33. ContextEvidence conserva correlación field-value', () => {
    const res = resolver.resolve({ generatedAt: GENERATED_AT, fragments: getBaseFragments() });
    const ev = res.evidence.find(e => e.field === 'actorRole');
    expect(ev?.value).toBe('educator'); // TypeScript inference guarantees value type matches field
  });

  it('34. Input permanece estructuralmente idéntico después de resolve', () => {
    const input = { generatedAt: GENERATED_AT, fragments: getBaseFragments() };
    const originalInputStr = JSON.stringify(input);
    resolver.resolve(input);
    expect(JSON.stringify(input)).toEqual(originalInputStr);
  });

  it('35. No existe referencia compartida entre arrays de entrada y salida', () => {
    const obs = ['O1'];
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [buildFragment({ sourceType: 'educator_observation', payload: { observations: obs } })]
    });
    expect(res.context.observations).not.toBe(obs);
  });

  it('36. Timestamp inválido no participa silenciosamente en el orden', () => {
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [
        buildFragment({ sourceType: 'membership_profile', payload: { institutionId: 'inst-1' }, capturedAt: 'Invalid Date' }),
        buildFragment({ sourceType: 'membership_profile', payload: { institutionId: 'inst-2' }, capturedAt: '2026-08-04T12:00:00Z' })
      ]
    });
    // Invalid date is ignored, valid date wins
    expect(res.context.institutionId).toBe('inst-2');
    expect(res.warnings).toContainEqual(expect.objectContaining({ message: expect.stringContaining('Invalid capturedAt') }));
  });

  it('37. Conflicto autoritativo conserva ambas evidencias', () => {
    const res = resolver.resolve({
      generatedAt: GENERATED_AT,
      fragments: [
        buildFragment({ sourceType: 'membership_profile', payload: { institutionId: 'inst-1' }, sourceReference: 'A' }),
        buildFragment({ sourceType: 'childcare_center_catalog', payload: { institutionId: 'inst-2' }, sourceReference: 'B' })
      ]
    });
    const instEv = res.evidence.filter(e => e.field === 'institutionId');
    expect(instEv.length).toBe(2);
    // childcare_center_catalog wins over membership_profile due to alphabetical sort (C vs M)
    expect(instEv.some(e => e.value === 'inst-2' && e.isSelected)).toBe(true);
    expect(instEv.some(e => e.value === 'inst-1' && !e.isSelected)).toBe(true);
  });

  it('38. Conflicto autoritativo invertido genera salida idéntica', () => {
    const f1 = buildFragment({ sourceType: 'membership_profile', payload: { institutionId: 'inst-1' }, sourceReference: 'A' });
    const f2 = buildFragment({ sourceType: 'childcare_center_catalog', payload: { institutionId: 'inst-2' }, sourceReference: 'B' });
    const res1 = resolver.resolve({ generatedAt: GENERATED_AT, fragments: [f1, f2] });
    const res2 = resolver.resolve({ generatedAt: GENERATED_AT, fragments: [f2, f1] });
    expect(res1).toEqual(res2);
  });

  it('39. canSubmitForApproval implica canGenerateDraft', () => {
    const res = resolver.resolve({ generatedAt: GENERATED_AT, fragments: getBaseFragments() });
    if (res.canSubmitForApproval) {
      expect(res.canGenerateDraft).toBe(true);
    }
  });

  it('40. canGenerateDraft implica canProvideGuidance', () => {
    const res = resolver.resolve({ generatedAt: GENERATED_AT, fragments: getBaseFragments() });
    if (res.canGenerateDraft) {
      expect(res.canProvideGuidance).toBe(true);
    }
  });

  it('41. Todos los objetos y arrays de salida requeridos están congelados', () => {
    const res = resolver.resolve({ generatedAt: GENERATED_AT, fragments: getBaseFragments() });
    expect(Object.isFrozen(res)).toBe(true);
    expect(Object.isFrozen(res.context)).toBe(true);
    expect(Object.isFrozen(res.evidence)).toBe(true);
    expect(Object.isFrozen(res.missingRequirements)).toBe(true);
    expect(Object.isFrozen(res.warnings)).toBe(true);
    res.evidence.forEach(e => expect(Object.isFrozen(e)).toBe(true));
  });
});
