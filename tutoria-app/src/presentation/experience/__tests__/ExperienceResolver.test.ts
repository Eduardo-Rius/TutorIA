import { describe, it, expect } from 'vitest';
import { resolveExperience } from '../ExperienceResolver';
import { ExperienceContext, ExperienceAction } from '../ExperienceTypes';

describe('ExperienceResolver Validation and Completion Pass', () => {

  const baseContext: ExperienceContext = {
    scene: 'default',
    lifecycleState: 'DEFAULT',
    hasPendingWork: false,
    isFirstVisit: false,
  };

  const dummyAction: ExperienceAction = {
    id: 'test-action',
    label: 'Test Action',
    enabled: true
  };

  describe('Priority States Validation', () => {
    it('1. should resolve ERROR state', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'ERROR' });
      expect(res.mood).toBe('RECOVERING');
      expect(res.voiceKey).toBe('error_generic');
    });

    it('2. should resolve RECOVERY_GUIDANCE state', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'RECOVERY_GUIDANCE' });
      expect(res.mood).toBe('RECOVERING');
      expect(res.voiceKey).toBe('error_generic');
    });

    it('3. should resolve PROCESSING state and disable actions (generic)', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'PROCESSING' });
      expect(res.mood).toBe('THINKING');
      expect(res.voiceKey).toBe('processing_generic');
      expect(res.primaryAction?.enabled).toBe(false);
      expect(res.primaryAction?.id).toBe('processing_disabled');
    });

    it('3.1 should resolve PROCESSING state (ai-processing context)', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'PROCESSING', scene: 'ai-processing' });
      expect(res.mood).toBe('THINKING');
      expect(res.voiceKey).toBe('processing_context');
      expect(res.primaryAction?.enabled).toBe(false);
    });

    it('4. should resolve WAITING state', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'WAITING' });
      expect(res.mood).toBe('THINKING');
      expect(res.primaryAction?.enabled).toBe(false);
    });

    it('5. should resolve SUCCESS state', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'SUCCESS' });
      expect(res.mood).toBe('CELEBRATING');
      expect(res.motion).toBe('EXPRESSIVE');
    });

    it('6. should resolve PENDING_WORK state', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'PENDING_WORK' });
      expect(res.mood).toBe('ENCOURAGING');
      expect(res.voiceKey).toBe('workspace_resume_work');
    });

    it('7. should resolve FIRST_VISIT state (login)', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'FIRST_VISIT', scene: 'login' });
      expect(res.mood).toBe('GREETING');
      expect(res.assetKey).toBe('tutoria_login_greeting_floating');
      expect(res.voiceKey).toBe('login_welcome');
    });

    it('7.1 should resolve FIRST_VISIT state (workspace)', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'FIRST_VISIT', scene: 'workspace-reception' });
      expect(res.mood).toBe('GREETING');
      expect(res.assetKey).toBe('tutoria_workspace_greeting_floating');
      expect(res.voiceKey).toBe('workspace_greeting_default');
    });

    it('8. should resolve RETURNING_VISIT state', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'RETURNING_VISIT' });
      expect(res.mood).toBe('GREETING');
      expect(res.voiceKey).toBe('workspace_greeting_default');
    });

    it('9. should resolve EMPTY_STATE state', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'EMPTY_STATE' });
      expect(res.mood).toBe('WAITING');
      expect(res.voiceKey).toBe('empty_state_default');
    });

    it('10. should resolve DEFAULT state with fallback', () => {
      // DEFAULT fallback hits Priority 7 if scene === 'default'
      const res = resolveExperience({ ...baseContext, lifecycleState: 'DEFAULT', scene: 'default' });
      expect(res.mood).toBe('WAITING');

      // Absolute fallback
      const absoluteRes = resolveExperience({ ...baseContext, lifecycleState: 'DEFAULT', scene: 'login' as any });
      expect(absoluteRes.mood).toBe('NEUTRAL');
      expect(absoluteRes.assetKey).toBe('fallback_avatar');
    });
  });

  describe('Collision Tests (Priority verification)', () => {
    it('ERROR vs PROCESSING -> ERROR wins', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'ERROR', operationStatus: 'IN_PROGRESS' });
      expect(res.mood).toBe('RECOVERING');
    });

    it('RECOVERY_GUIDANCE vs SUCCESS -> RECOVERY_GUIDANCE wins', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'RECOVERY_GUIDANCE', operationStatus: 'COMPLETED' });
      expect(res.mood).toBe('RECOVERING');
    });

    it('PROCESSING vs PENDING_WORK -> PROCESSING wins', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'PROCESSING', hasPendingWork: true });
      expect(res.mood).toBe('THINKING');
    });

    it('WAITING vs FIRST_VISIT -> WAITING wins', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'WAITING', isFirstVisit: true });
      expect(res.mood).toBe('THINKING');
    });

    it('SUCCESS vs PENDING_WORK -> SUCCESS wins', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'SUCCESS', hasPendingWork: true });
      expect(res.mood).toBe('CELEBRATING');
    });

    it('PENDING_WORK vs FIRST_VISIT -> PENDING_WORK wins', () => {
      const res = resolveExperience({ ...baseContext, lifecycleState: 'PENDING_WORK', isFirstVisit: true });
      expect(res.mood).toBe('ENCOURAGING');
    });

    it('FIRST_VISIT vs RETURNING_VISIT -> FIRST_VISIT wins', () => {
      // Simulate BOTH active
      const res = resolveExperience({ ...baseContext, lifecycleState: 'FIRST_VISIT' });
      expect(res.mood).toBe('GREETING');
      // While it's functionally impossible for lifecycleState to be both in a union,
      // we test if lifecycleState is RETURNING_VISIT but isFirstVisit is true.
      const res2 = resolveExperience({ ...baseContext, lifecycleState: 'RETURNING_VISIT', isFirstVisit: true });
      expect(res2.mood).toBe('GREETING');
    });
  });

  describe('Contract Completeness', () => {
    it('always returns a complete valid presentation', () => {
      const res = resolveExperience({ ...baseContext, primaryAction: dummyAction });

      expect(res).toBeDefined();
      expect(res.assetKey).toBeTruthy();
      expect(res.voiceKey).toBeTruthy();
      expect(res.mood).toBeTruthy();
      expect(res.pose).toBeTruthy();
      expect(res.motion).toBeTruthy();
      expect(res.lighting).toBeTruthy();

      if (res.mood !== 'THINKING' && res.primaryAction) {
        expect(res.primaryAction.id).toBeDefined();
        expect(res.primaryAction.label).toBeDefined();
      }
    });
  });

  describe('Immutability and Determinism', () => {
    it('does not mutate the context object', () => {
      const context: ExperienceContext = { ...baseContext, primaryAction: dummyAction };
      const contextCopy = JSON.parse(JSON.stringify(context));

      resolveExperience(context);

      expect(context).toEqual(contextCopy);
    });

    it('returns deeply equal outputs for identical inputs', () => {
      const context: ExperienceContext = { ...baseContext, lifecycleState: 'SUCCESS' };

      const res1 = resolveExperience(context);
      const res2 = resolveExperience(context);

      expect(res1).toEqual(res2);
    });
  });

});
