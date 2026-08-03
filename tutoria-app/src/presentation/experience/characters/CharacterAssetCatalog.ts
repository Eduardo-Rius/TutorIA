import { CharacterAssetManifest, AssetKey } from './CharacterAssetManifest';
import { COMPANION_ID, ANITA_ID, TERE_ID, CECI_ID, FALLBACK_ID } from './CharacterDefinitionCatalog';

import companionGreetingAsset from '../../../assets/characters/companion/companion-greeting.svg';
import companionThinkingAsset from '../../../assets/characters/companion/companion-thinking.svg';
import companionHelpingAsset from '../../../assets/characters/companion/companion-helping.svg';
import companionWaitingAsset from '../../../assets/characters/companion/companion-waiting.svg';
import companionCelebratingAsset from '../../../assets/characters/companion/companion-celebrating.svg';
import anitaNeutralAsset from '../../../assets/characters/personas/anita-neutral.svg';
import tereNeutralAsset from '../../../assets/characters/personas/tere-neutral.svg';
import ceciNeutralAsset from '../../../assets/characters/personas/ceci-neutral.svg';
import fallbackAsset from '../../../assets/characters/fallback/institutional-presence-fallback.svg';

const freezeCharacterAssetManifest = (
  manifest: CharacterAssetManifest
): CharacterAssetManifest => Object.freeze({ ...manifest });

const assets: Readonly<Record<AssetKey, CharacterAssetManifest>> = {
  'tutoria_login_greeting_floating': freezeCharacterAssetManifest({
    assetKey: 'tutoria_login_greeting_floating',
    characterId: COMPANION_ID,
    presenceState: 'GREETING',
    representationType: 'static_image',
    format: 'svg',
    physicalSource: companionGreetingAsset,
    hasTransparentBackground: true,
    accessibilityMode: 'informative',
    fallbackAssetKey: 'fallback_avatar',
    status: 'available',
    version: '1.0.0'
  }),
  'tutoria_workspace_greeting_floating': freezeCharacterAssetManifest({
    assetKey: 'tutoria_workspace_greeting_floating',
    characterId: COMPANION_ID,
    presenceState: 'GREETING',
    representationType: 'static_image',
    format: 'svg',
    physicalSource: companionGreetingAsset,
    hasTransparentBackground: true,
    accessibilityMode: 'informative',
    fallbackAssetKey: 'fallback_avatar',
    status: 'available',
    version: '1.0.0'
  }),
  'tutoria_planning_thinking_sitting': freezeCharacterAssetManifest({
    assetKey: 'tutoria_planning_thinking_sitting',
    characterId: COMPANION_ID,
    presenceState: 'THINKING',
    representationType: 'static_image',
    format: 'svg',
    physicalSource: companionThinkingAsset,
    hasTransparentBackground: true,
    accessibilityMode: 'informative',
    fallbackAssetKey: 'fallback_avatar',
    status: 'available',
    version: '1.0.0'
  }),
  'tutoria_planning_helping_pointing': freezeCharacterAssetManifest({
    assetKey: 'tutoria_planning_helping_pointing',
    characterId: COMPANION_ID,
    presenceState: 'HELPING',
    representationType: 'static_image',
    format: 'svg',
    physicalSource: companionHelpingAsset,
    hasTransparentBackground: true,
    accessibilityMode: 'informative',
    fallbackAssetKey: 'fallback_avatar',
    status: 'available',
    version: '1.0.0'
  }),
  'tutoria_empty_waiting_observing': freezeCharacterAssetManifest({
    assetKey: 'tutoria_empty_waiting_observing',
    characterId: COMPANION_ID,
    presenceState: 'WAITING',
    representationType: 'static_image',
    format: 'svg',
    physicalSource: companionWaitingAsset,
    hasTransparentBackground: true,
    accessibilityMode: 'informative',
    fallbackAssetKey: 'fallback_avatar',
    status: 'available',
    version: '1.0.0'
  }),
  'tutoria_success_celebrating_floating': freezeCharacterAssetManifest({
    assetKey: 'tutoria_success_celebrating_floating',
    characterId: COMPANION_ID,
    presenceState: 'CELEBRATING',
    representationType: 'static_image',
    format: 'svg',
    physicalSource: companionCelebratingAsset,
    hasTransparentBackground: true,
    accessibilityMode: 'informative',
    fallbackAssetKey: 'fallback_avatar',
    status: 'available',
    version: '1.0.0'
  }),
  'persona_maternal_anita_neutral': freezeCharacterAssetManifest({
    assetKey: 'persona_maternal_anita_neutral',
    characterId: ANITA_ID,
    presenceState: 'NEUTRAL',
    representationType: 'static_image',
    format: 'svg',
    physicalSource: anitaNeutralAsset,
    hasTransparentBackground: true,
    accessibilityMode: 'informative',
    fallbackAssetKey: 'fallback_avatar',
    status: 'available',
    version: '1.0.0'
  }),
  'persona_director_tere_neutral': freezeCharacterAssetManifest({
    assetKey: 'persona_director_tere_neutral',
    characterId: TERE_ID,
    presenceState: 'NEUTRAL',
    representationType: 'static_image',
    format: 'svg',
    physicalSource: tereNeutralAsset,
    hasTransparentBackground: true,
    accessibilityMode: 'informative',
    fallbackAssetKey: 'fallback_avatar',
    status: 'available',
    version: '1.0.0'
  }),
  'persona_supervisor_ceci_neutral': freezeCharacterAssetManifest({
    assetKey: 'persona_supervisor_ceci_neutral',
    characterId: CECI_ID,
    presenceState: 'NEUTRAL',
    representationType: 'static_image',
    format: 'svg',
    physicalSource: ceciNeutralAsset,
    hasTransparentBackground: true,
    accessibilityMode: 'informative',
    fallbackAssetKey: 'fallback_avatar',
    status: 'available',
    version: '1.0.0'
  }),
  'fallback_avatar': freezeCharacterAssetManifest({
    assetKey: 'fallback_avatar',
    characterId: FALLBACK_ID,
    presenceState: 'NEUTRAL',
    representationType: 'static_image',
    format: 'svg',
    physicalSource: fallbackAsset,
    hasTransparentBackground: true,
    accessibilityMode: 'decorative',
    fallbackAssetKey: 'fallback_avatar',
    status: 'available',
    version: '1.0.0'
  })
};

export const CharacterAssetCatalog = Object.freeze(assets);
