export type CharacterType = 'TUTORIA_COMPANION' | 'INSTITUTIONAL_PERSONA';
export type CharacterMood = 'NEUTRAL' | 'GREETING' | 'THINKING' | 'HELPING' | 'READING' | 'EXPLAINING' | 'CELEBRATING' | 'WAITING' | 'ENCOURAGING' | 'RECOVERING';
export type CharacterPose = 'FLOATING' | 'SITTING' | 'STANDING' | 'READING' | 'WRITING' | 'POINTING' | 'OBSERVING' | 'HOLDING_TABLET';
export type CharacterContext = 'LOGIN' | 'WORKSPACE_HERO' | 'PLANNING' | 'GENERATING' | 'EMPTY_STATE' | 'SUCCESS' | 'HELP' | 'ONBOARDING';

export type ExperienceScene = 'workspace-reception' | 'ai-processing' | 'success-celebration' | 'login' | 'default';

export type ExperienceLifecycleState =
  | 'ERROR'
  | 'RECOVERY_GUIDANCE'
  | 'PROCESSING'
  | 'WAITING'
  | 'SUCCESS'
  | 'PENDING_WORK'
  | 'FIRST_VISIT'
  | 'RETURNING_VISIT'
  | 'EMPTY_STATE'
  | 'DEFAULT';

export type TimeSegment = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type OperationStatus = 'IDLE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type MotionLevel = 'NONE' | 'SUBTLE' | 'EXPRESSIVE' | 'TRANSITIONAL';
export type LightingPreset = 'DAYLIGHT' | 'SOFT_GLOW' | 'FOCUSED_RADIAL' | 'BRIGHT_WARM' | 'NEUTRAL';

export type ExperienceCopyKey =
  | 'workspace_greeting_default'
  | 'workspace_resume_work'
  | 'processing_generic'
  | 'processing_context'
  | 'success_planning_approved'
  | 'error_generic'
  | 'empty_state_default'
  | 'login_welcome';

export type CharacterAssetKey =
  | 'tutoria_login_greeting_floating'
  | 'tutoria_workspace_greeting_floating'
  | 'tutoria_planning_thinking_sitting'
  | 'tutoria_planning_helping_pointing'
  | 'tutoria_empty_waiting_observing'
  | 'tutoria_success_celebrating_floating'
  | 'persona_maternal_anita_neutral'
  | 'persona_director_tere_neutral'
  | 'persona_supervisor_ceci_neutral'
  | 'fallback_avatar';

export interface ExperienceAction {
  id: string;
  label: string;
  target?: string;
  enabled: boolean;
}

/**
 * Immutable input for the Experience Engine.
 */
export interface ExperienceContext {
  readonly scene: ExperienceScene;
  readonly lifecycleState: ExperienceLifecycleState;
  readonly timeSegment?: TimeSegment;
  readonly hasPendingWork: boolean;
  readonly isFirstVisit: boolean;
  readonly operationStatus?: OperationStatus;
  readonly primaryAction?: ExperienceAction;
}

/**
 * Immutable output from the Experience Engine.
 */
export interface PresencePresentation {
  readonly assetKey: CharacterAssetKey;
  readonly voiceKey: ExperienceCopyKey;
  readonly mood: CharacterMood;
  readonly pose: CharacterPose;
  readonly motion: MotionLevel;
  readonly lighting: LightingPreset;
  readonly primaryAction?: ExperienceAction;
}
