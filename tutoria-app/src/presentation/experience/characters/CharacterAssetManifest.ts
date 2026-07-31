import { CharacterMood } from '../ExperienceTypes';
import { CharacterId } from './CharacterDefinition';

export type AssetFormat = 'png' | 'webp' | 'svg' | 'lottie' | 'rive' | 'video';
export type AssetStatus = 'available' | 'placeholder_pending' | 'inactive';
export type AssetAccessibilityMode = 'decorative' | 'informative';
export type RepresentationType = 'static_image' | 'animation' | 'component_fallback';

export type AssetKey = 
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

export interface CharacterAssetManifest {
  readonly assetKey: AssetKey;
  readonly characterId: CharacterId;
  readonly presenceState: CharacterMood;
  readonly representationType: RepresentationType;
  readonly format?: AssetFormat;
  readonly physicalSource?: string;
  readonly intrinsicWidth?: number;
  readonly intrinsicHeight?: number;
  readonly hasTransparentBackground: boolean;
  readonly accessibilityMode: AssetAccessibilityMode;
  readonly fallbackAssetKey: AssetKey;
  readonly status: AssetStatus;
  readonly version: string;
}
