import { CharacterMood, ExperienceScene } from '../ExperienceTypes';

export type CharacterType = 'companion' | 'institutional_persona' | 'fallback';

export type CharacterId = 
  | 'tutoria_companion'
  | 'persona_anita'
  | 'persona_tere'
  | 'persona_ceci'
  | 'institutional_fallback';

export type InstitutionalRoleKey = 
  | 'Docente Maternal'
  | 'Directora'
  | 'Supervisora'
  | 'system';

export interface CharacterDefinition {
  readonly characterId: CharacterId;
  readonly displayName: string;
  readonly characterType: CharacterType;
  readonly institutionalPurpose: string;
  readonly representedRole: InstitutionalRoleKey;
  readonly accessibilityDescription: string;
  readonly allowedPresenceStates: readonly CharacterMood[];
  readonly allowedContexts: readonly ExperienceScene[];
  readonly isActive: boolean;
  readonly presencePriority: number; // Higher number = higher priority
  readonly version: string;
}
