import {
  ExperienceContext,
  PresencePresentation,
  ExperienceLifecycleState
} from './ExperienceTypes';

/**
 * The Emotional Experience Engine Resolver.
 * This is a pure deterministic function that evaluates the operational context
 * and returns the appropriate Presentation Intent (PresencePresentation).
 *
 * It never mutates domain state or depends on infrastructure.
 */
export function resolveExperience(context: ExperienceContext): PresencePresentation {
  const { lifecycleState, scene, primaryAction } = context;

  // Resolve according to ARB Deterministic Priority

  // Priority 1: ERROR / RECOVERY
  if (lifecycleState === 'ERROR' || lifecycleState === 'RECOVERY_GUIDANCE') {
    return {
      assetKey: 'fallback_avatar',
      voiceKey: 'error_generic',
      mood: 'RECOVERING',
      pose: 'OBSERVING',
      motion: 'NONE',
      lighting: 'NEUTRAL',
      primaryAction
    };
  }

  // Priority 2: PROCESSING / WAITING
  if (lifecycleState === 'PROCESSING' || lifecycleState === 'WAITING' || context.operationStatus === 'IN_PROGRESS') {
    return {
      assetKey: 'tutoria_planning_thinking_sitting',
      voiceKey: context.scene === 'ai-processing' ? 'processing_context' : 'processing_generic',
      mood: 'THINKING',
      pose: 'SITTING',
      motion: 'SUBTLE',
      lighting: 'FOCUSED_RADIAL',
      // By ARB directive, processing state disables primary actions
      primaryAction: {
        id: 'processing_disabled',
        label: 'Procesando...',
        enabled: false
      }
    };
  }

  // Priority 3: SUCCESS
  if (lifecycleState === 'SUCCESS' || context.operationStatus === 'COMPLETED') {
    return {
      assetKey: 'tutoria_success_celebrating_floating',
      voiceKey: 'success_planning_approved',
      mood: 'CELEBRATING',
      pose: 'FLOATING',
      motion: 'EXPRESSIVE',
      lighting: 'BRIGHT_WARM',
      primaryAction
    };
  }

  // Priority 4: PENDING WORK
  if (lifecycleState === 'PENDING_WORK' || context.hasPendingWork) {
    return {
      assetKey: 'tutoria_workspace_greeting_floating',
      voiceKey: 'workspace_resume_work',
      mood: 'ENCOURAGING',
      pose: 'FLOATING',
      motion: 'SUBTLE',
      lighting: 'SOFT_GLOW',
      primaryAction
    };
  }

  // Priority 5: FIRST VISIT
  if (lifecycleState === 'FIRST_VISIT' || context.isFirstVisit) {
    return {
      assetKey: scene === 'login' ? 'tutoria_login_greeting_floating' : 'tutoria_workspace_greeting_floating',
      voiceKey: scene === 'login' ? 'login_welcome' : 'workspace_greeting_default',
      mood: 'GREETING',
      pose: 'FLOATING',
      motion: 'SUBTLE',
      lighting: 'DAYLIGHT',
      primaryAction
    };
  }

  // Priority 6: RETURNING VISIT
  if (lifecycleState === 'RETURNING_VISIT') {
    return {
      assetKey: 'tutoria_workspace_greeting_floating',
      voiceKey: 'workspace_greeting_default',
      mood: 'GREETING',
      pose: 'FLOATING',
      motion: 'SUBTLE',
      lighting: 'DAYLIGHT',
      primaryAction
    };
  }

  // Priority 7: EMPTY STATE / DEFAULT
  if (lifecycleState === 'EMPTY_STATE' || scene === 'default') {
    return {
      assetKey: 'tutoria_empty_waiting_observing',
      voiceKey: 'empty_state_default',
      mood: 'WAITING',
      pose: 'OBSERVING',
      motion: 'NONE',
      lighting: 'NEUTRAL',
      primaryAction
    };
  }

  // Absolute Fallback (Safety net)
  return {
    assetKey: 'fallback_avatar',
    voiceKey: 'workspace_greeting_default',
    mood: 'NEUTRAL',
    pose: 'STANDING',
    motion: 'NONE',
    lighting: 'NEUTRAL',
    primaryAction
  };
}
