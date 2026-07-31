import { CharacterMood } from '../ExperienceTypes';
import { CharacterId } from '../characters/CharacterDefinition';
import { AssetKey } from '../characters/CharacterAssetManifest';

export type ResolutionReason = 
  | 'CONTEXT_MATCH'
  | 'PERSONA_COMPATIBILITY_MATCH'
  | 'COMPANION_DEFAULT'
  | 'NO_ELIGIBLE_CHARACTER_FALLBACK'
  | 'ASSET_UNAVAILABLE_FALLBACK'
  | 'UNSUPPORTED_CONTEXT_FALLBACK'
  | 'UNSUPPORTED_PRESENCE_STATE_FALLBACK';

export interface PresenceResolution {
  readonly characterId: CharacterId;
  readonly assetKey: AssetKey;
  readonly presenceState: CharacterMood;
  readonly accessibilityDescription: string;
  readonly reducedMotion: boolean;
  readonly resolutionReason: ResolutionReason;
  readonly isFallback: boolean;
}
