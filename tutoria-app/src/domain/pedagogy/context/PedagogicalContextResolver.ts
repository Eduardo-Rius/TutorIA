import {
  PedagogicalContext,
  ContextResolverInput,
  PedagogicalContextResolution,
  PedagogicalContextSourceType,
  ContextEvidence,
  AnyContextEvidence,
  createEvidence,
  MissingContextRequirement,
  PedagogicalWarning,
  ContextCompleteness,
  ContextInputFragment,
  PartialPedagogicalContext,
  CompletePedagogicalContext,
  isCompleteContext
} from './Contracts';

type AuthorityLevel = 'authoritative' | 'preferred' | 'advisory' | 'prohibited';
const AUTHORITY_SCORE: Record<AuthorityLevel, number> = {
  authoritative: 4,
  preferred: 3,
  advisory: 2,
  prohibited: 1
};

interface FieldAssertion<K extends keyof PedagogicalContext> {
  field: K;
  value: PedagogicalContext[K];
  fragment: ContextInputFragment;
  authorityLevel: AuthorityLevel;
  timestamp: number;
}

export class PedagogicalContextResolver {
  private static readonly PRECEDENCE: Record<PedagogicalContextSourceType, number> = {
    membership_profile: 100,
    childcare_center_catalog: 100,
    group_catalog: 100,
    active_planning: 100,
    institutional_knowledge: 100,
    normative_framework: 100,
    authenticated_session: 90,
    user_selection: 80,
    educator_observation: 60,
    system_default: 10,
  };

  private static readonly ARRAY_FIELDS: ReadonlyArray<keyof PedagogicalContext> = [
    'observations',
    'institutionalFrameworkIds',
    'knowledgeResourceIds',
    'previousExperienceIds',
    'applicablePolicies'
  ];

  private static readonly SCALAR_FIELDS: ReadonlyArray<keyof PedagogicalContext> = [
    'actorId', 'actorRole', 'institutionId', 'childcareCenterId',
    'roomId', 'groupId', 'ageRange', 'planningId', 'planningStatus',
    'planningPeriod', 'activeWorkflowStep', 'pedagogicalIntent', 'locale'
  ];

  private getFieldAuthority(field: keyof PedagogicalContext, source: PedagogicalContextSourceType): AuthorityLevel {
    if (source === 'system_default') {
      return ['locale', 'generatedAt'].includes(field as string) ? 'preferred' : 'prohibited';
    }

    if (source === 'membership_profile') {
      return ['actorId', 'actorRole', 'institutionId', 'childcareCenterId', 'groupId'].includes(field as string) ? 'authoritative' : 'prohibited';
    }

    if (source === 'childcare_center_catalog') {
      return ['institutionId', 'childcareCenterId', 'roomId'].includes(field as string) ? 'authoritative' : 'prohibited';
    }

    if (source === 'group_catalog') {
      return ['institutionId', 'childcareCenterId', 'groupId', 'ageRange'].includes(field as string) ? 'authoritative' : 'prohibited';
    }

    if (source === 'active_planning') {
      return ['planningId', 'planningStatus', 'planningPeriod', 'activeWorkflowStep', 'groupId', 'childcareCenterId', 'ageRange'].includes(field as string) ? 'authoritative' : 'prohibited';
    }

    if (source === 'institutional_knowledge') {
      return ['knowledgeResourceIds'].includes(field as string) ? 'authoritative' : 'prohibited';
    }

    if (source === 'normative_framework') {
      return ['institutionalFrameworkIds', 'applicablePolicies'].includes(field as string) ? 'authoritative' : 'prohibited';
    }

    if (source === 'authenticated_session') {
      return ['actorId', 'actorRole'].includes(field as string) ? 'authoritative' : 'prohibited';
    }

    if (source === 'educator_observation') {
      return ['observations', 'previousExperienceIds'].includes(field as string) ? 'preferred' : 'prohibited';
    }

    if (source === 'user_selection') {
      if (['actorId', 'actorRole', 'institutionId', 'childcareCenterId'].includes(field as string)) return 'prohibited';
      if (['pedagogicalIntent'].includes(field as string)) return 'preferred';
      return 'advisory';
    }

    return 'advisory';
  }

  private parseTimestamp(ts: string): number {
    const time = new Date(ts).getTime();
    if (isNaN(time)) {
      return -1; // Flag as invalid
    }
    return time;
  }

  public resolve(input: ContextResolverInput): PedagogicalContextResolution {
    const context: Partial<Record<keyof PedagogicalContext, unknown>> = {};
    const evidence: AnyContextEvidence[] = [];
    const warnings: PedagogicalWarning[] = [];
    const missing: MissingContextRequirement[] = [];

    // Initialize arrays
    for (const field of PedagogicalContextResolver.ARRAY_FIELDS) {
      context[field] = [];
    }

    // Validate generatedAt
    const generatedAtTime = this.parseTimestamp(input.generatedAt);
    if (generatedAtTime === -1) {
      warnings.push(Object.freeze({
        field: 'generatedAt',
        message: `Invalid generatedAt timestamp: ${input.generatedAt}`,
        sourceType: 'system_default'
      }));
      context.generatedAt = input.generatedAt;
    } else {
      context.generatedAt = input.generatedAt;
    }

    // Process all assertions
    const allAssertions = new Map<keyof PedagogicalContext, FieldAssertion<keyof PedagogicalContext>[]>();

    for (const fragment of input.fragments) {
      const fragmentTime = this.parseTimestamp(fragment.capturedAt);
      if (fragmentTime === -1) {
        warnings.push(Object.freeze({
          field: 'generatedAt', // Generic field for fragment invalidity
          message: `Invalid capturedAt timestamp in fragment ${fragment.sourceType}: ${fragment.capturedAt}. Fragment ignored.`,
          sourceType: fragment.sourceType
        }));
        continue;
      }

      for (const key of Object.keys(fragment.payload)) {
        const field = key as keyof PedagogicalContext;
        const val = fragment.payload[field];
        if (val !== undefined && val !== null) {
          const auth = this.getFieldAuthority(field, fragment.sourceType);

          if (auth === 'prohibited') {
            warnings.push(Object.freeze({
              field,
              message: `Source '${fragment.sourceType}' is prohibited from asserting '${field}'. Ignored.`,
              sourceType: fragment.sourceType
            }));
            continue;
          }

          if (!allAssertions.has(field)) {
            allAssertions.set(field, []);
          }
          allAssertions.get(field)!.push({
            field,
            value: val,
            fragment,
            authorityLevel: auth,
            timestamp: fragmentTime
          });
        }
      }
    }

    // Resolve SCALAR FIELDS
    for (const field of PedagogicalContextResolver.SCALAR_FIELDS) {
      const assertions = allAssertions.get(field) || [];
      if (assertions.length === 0) continue;

      // Deterministic Total Order
      assertions.sort((a, b) => {
        // 1. field authority
        const authDiff = AUTHORITY_SCORE[b.authorityLevel] - AUTHORITY_SCORE[a.authorityLevel];
        if (authDiff !== 0) return authDiff;

        // 2. source precedence
        const precDiff = PedagogicalContextResolver.PRECEDENCE[b.fragment.sourceType] - PedagogicalContextResolver.PRECEDENCE[a.fragment.sourceType];
        if (precDiff !== 0) return precDiff;

        // 3. explicit isAuthoritative
        const isAuthA = a.fragment.isAuthoritative ? 1 : 0;
        const isAuthB = b.fragment.isAuthoritative ? 1 : 0;
        if (isAuthB !== isAuthA) return isAuthB - isAuthA;

        // 4. capturedAt
        if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;

        // 5. sourceType
        const typeComp = a.fragment.sourceType.localeCompare(b.fragment.sourceType);
        if (typeComp !== 0) return typeComp;

        // 6. sourceReference
        const refComp = a.fragment.sourceReference.localeCompare(b.fragment.sourceReference);
        if (refComp !== 0) return refComp;

        // 7. canonical value representation
        return String(a.value).localeCompare(String(b.value));
      });

      const winner = assertions[0];
      if (!winner) continue;

      context[field] = winner.value;
      const isWinnerAuth = winner.authorityLevel === 'authoritative' || (winner.authorityLevel !== 'advisory' && winner.fragment.isAuthoritative);

      evidence.push(createEvidence(
        field,
        winner.value as PedagogicalContext[keyof PedagogicalContext],
        winner.fragment.sourceType,
        winner.fragment.sourceReference,
        winner.fragment.capturedAt,
        isWinnerAuth ? 1.0 : 0.8,
        isWinnerAuth,
        true
      ) as AnyContextEvidence);

      // Check remaining assertions for conflicts
      for (let i = 1; i < assertions.length; i++) {
        const loser = assertions[i];
        if (!loser) continue;

        const isLoserAuth = loser.authorityLevel === 'authoritative' || (loser.authorityLevel !== 'advisory' && loser.fragment.isAuthoritative);

        if (loser.value !== winner.value) {
          evidence.push(createEvidence(
            field,
            loser.value as PedagogicalContext[keyof PedagogicalContext],
            loser.fragment.sourceType,
            loser.fragment.sourceReference,
            loser.fragment.capturedAt,
            isLoserAuth ? 1.0 : 0.8,
            isLoserAuth,
            false
          ) as AnyContextEvidence);

          if (isWinnerAuth && isLoserAuth) {
            // Authoritative Conflict!
            if (['institutionId', 'childcareCenterId', 'groupId'].includes(field as string)) {
              missing.push(Object.freeze({
                field: field as keyof PedagogicalContext,
                reason: `Authoritative conflict detected for ${field}. Selected '${winner.value}' (from ${winner.fragment.sourceType}) vs '${loser.value}' (from ${loser.fragment.sourceType})`,
                severity: 'critical',
                remediation: 'Resolve institutional membership and planning mismatch.',
                blocksRecommendation: true
              }));
            } else {
              warnings.push(Object.freeze({
                field,
                message: `Conflicting authoritative value '${loser.value}' from ${loser.fragment.sourceType} ignored (lower total order)`,
                sourceType: loser.fragment.sourceType
              }));
            }
          } else if (isWinnerAuth && !isLoserAuth) {
            warnings.push(Object.freeze({
              field,
              message: `Conflicting non-authoritative value '${loser.value}' from ${loser.fragment.sourceType} ignored in favor of authoritative '${winner.value}'`,
              sourceType: loser.fragment.sourceType
            }));
          } else {
             warnings.push(Object.freeze({
              field,
              message: `Conflicting non-authoritative value '${loser.value}' from ${loser.fragment.sourceType} ignored (lower total order)`,
              sourceType: loser.fragment.sourceType
            }));
          }
        }
      }
    }

    // Resolve ARRAY FIELDS
    for (const field of PedagogicalContextResolver.ARRAY_FIELDS) {
      const assertions = allAssertions.get(field) || [];
      const merged = new Set<string>();

      // Sort assertions so that the order of insertion is deterministic
      assertions.sort((a, b) => {
        const authDiff = AUTHORITY_SCORE[b.authorityLevel] - AUTHORITY_SCORE[a.authorityLevel];
        if (authDiff !== 0) return authDiff;
        const precDiff = PedagogicalContextResolver.PRECEDENCE[b.fragment.sourceType] - PedagogicalContextResolver.PRECEDENCE[a.fragment.sourceType];
        if (precDiff !== 0) return precDiff;
        if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
        const typeComp = a.fragment.sourceType.localeCompare(b.fragment.sourceType);
        if (typeComp !== 0) return typeComp;
        const refComp = a.fragment.sourceReference.localeCompare(b.fragment.sourceReference);
        if (refComp !== 0) return refComp;
        return 0; // Don't sort by value because values are arrays!
      });

      for (const assertion of assertions) {
        const arr = assertion.value as string[];
        if (Array.isArray(arr)) {
           // To be strictly deterministic on array contents, sort the items themselves if needed?
           // The requirements say deterministic order, which we have for fragments. Array order comes from fragments.
           const isAuth = assertion.authorityLevel === 'authoritative' || (assertion.authorityLevel !== 'advisory' && assertion.fragment.isAuthoritative);
           let contributed = false;
           for (const item of arr) {
             if (!merged.has(item)) {
               merged.add(item);
               contributed = true;
             }
           }
           if (contributed) {
             evidence.push(createEvidence(
               field,
               arr,
               assertion.fragment.sourceType,
               assertion.fragment.sourceReference,
               assertion.fragment.capturedAt,
               isAuth ? 1.0 : 0.8,
               isAuth,
               true
             ) as AnyContextEvidence);
           }
        }
      }
      context[field] = Object.freeze(Array.from(merged));
    }

    let canProvideGuidance = true;
    let canGenerateDraft = true;
    let canSubmitForApproval = true;
    let isBlocked = missing.some(m => m.severity === 'critical');

    // Critical authorization fields
    const authFields: Array<keyof PedagogicalContext> = ['actorId', 'actorRole', 'institutionId'];
    for (const f of authFields) {
      if (context[f] === undefined) {
        missing.push(Object.freeze({
          field: f,
          reason: `Missing critical authorization field: ${f}`,
          severity: 'critical',
          remediation: 'Authenticate and ensure institutional membership is active.',
          blocksRecommendation: true
        }));
        isBlocked = true;
      }
    }

    // Core targeting fields
    const targetFields: Array<keyof PedagogicalContext> = ['groupId', 'ageRange', 'planningPeriod'];
    for (const f of targetFields) {
      if (context[f] === undefined) {
        missing.push(Object.freeze({
          field: f,
          reason: `Missing core targeting field: ${f}`,
          severity: 'high',
          remediation: `Select or assign a valid ${f}.`,
          blocksRecommendation: true
        }));
        canProvideGuidance = false;
      }
    }

    if (context.pedagogicalIntent === undefined) {
      missing.push(Object.freeze({
        field: 'pedagogicalIntent',
        reason: 'Missing pedagogical intent.',
        severity: 'high',
        remediation: 'Define the pedagogical intent for the planning.',
        blocksRecommendation: true
      }));
      canProvideGuidance = false;
    }

    const obs = context.observations as string[] | undefined;
    const fw = context.institutionalFrameworkIds as string[] | undefined;
    const hasObservations = (obs && obs.length > 0);
    const hasFrameworks = (fw && fw.length > 0);

    if (!hasObservations && !hasFrameworks) {
       missing.push(Object.freeze({
        field: 'institutionalFrameworkIds',
        reason: 'Missing pedagogical evidence or normative framework.',
        severity: 'low',
        remediation: 'Add observations or link institutional frameworks.',
        blocksRecommendation: false
      }));
      canGenerateDraft = false;
    }

    // Capability invariants
    if (isBlocked) {
      canProvideGuidance = false;
      canGenerateDraft = false;
      canSubmitForApproval = false;
    } else {
      if (!canProvideGuidance) {
        canGenerateDraft = false;
      }
      if (!canGenerateDraft || !context.planningId || context.planningStatus !== 'draft') {
        canSubmitForApproval = false;
      }
    }

    context.generatedAt = input.generatedAt;

    let completeness: ContextCompleteness = 'complete';
    if (isBlocked) {
      completeness = 'blocked';
    } else if (!canProvideGuidance && !canGenerateDraft) {
      completeness = 'incomplete';
    } else if (canProvideGuidance && !canGenerateDraft) {
      completeness = 'sufficient_for_guidance';
    } else if (canGenerateDraft && !canSubmitForApproval) {
      completeness = 'sufficient_for_draft';
    }

    // Final context construction.
    // Justification: We built `context` dynamically with unknown values because of TypeScript's generic iteration limitations.
    const finalContext = Object.freeze({ ...context }) as PartialPedagogicalContext;

    // Justification: By using the `isCompleteContext` type guard, we branch the logic.
    // We use a mutable variable to preserve the exact narrowed type securely without forcing a cast on the output.
    let honestContext: PartialPedagogicalContext | CompletePedagogicalContext;
    if (isCompleteContext(finalContext)) {
      honestContext = finalContext; // narrowed to CompletePedagogicalContext
    } else {
      honestContext = finalContext; // remains PartialPedagogicalContext
    }

    return Object.freeze({
      context: honestContext,
      evidence: Object.freeze([...evidence]),
      completeness,
      missingRequirements: Object.freeze([...missing]),
      warnings: Object.freeze([...warnings]),
      resolutionReason: `Resolved ${evidence.length} evidences resulting in ${completeness} state.`,
      canGenerateDraft,
      canProvideGuidance,
      canSubmitForApproval
    });
  }
}
