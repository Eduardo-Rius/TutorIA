import { CharacterMood, ExperienceScene, ExperienceLifecycleState } from '../ExperienceTypes';
import { CharacterId, InstitutionalRoleKey } from '../characters/CharacterDefinition';
import { CharacterDefinitionCatalog, COMPANION_ID, FALLBACK_ID } from '../characters/CharacterDefinitionCatalog';
import { CharacterAssetCatalog } from '../characters/CharacterAssetCatalog';
import { PresenceResolution, ResolutionReason } from './PresenceResolution';

export interface PresencePolicyContext {
  readonly institutionalRole: InstitutionalRoleKey;
  readonly workspaceState: ExperienceLifecycleState;
  readonly experienceState: CharacterMood;
  readonly scene: ExperienceScene;
  readonly allowedCharacters: readonly CharacterId[];
  readonly reducedMotionPreference: boolean;
  readonly requireAvailableAssets: boolean;
}

export class PresencePolicy {
  static resolve(context: PresencePolicyContext): PresenceResolution {
    const defaultFallback: PresenceResolution = {
      characterId: FALLBACK_ID,
      assetKey: 'fallback_avatar',
      presenceState: 'NEUTRAL',
      accessibilityDescription: CharacterDefinitionCatalog[FALLBACK_ID].accessibilityDescription,
      reducedMotion: context.reducedMotionPreference,
      resolutionReason: 'NO_ELIGIBLE_CHARACTER_FALLBACK',
      isFallback: true
    };

    if (context.allowedCharacters.length === 0) {
      return defaultFallback;
    }

    const { selectedCharacterId, matchReason } = this.resolveCharacterId(context);

    if (selectedCharacterId === FALLBACK_ID) {
      return { ...defaultFallback, resolutionReason: matchReason };
    }

    const characterDef = CharacterDefinitionCatalog[selectedCharacterId];

    const asset = Object.values(CharacterAssetCatalog).find(
      (a) => a.characterId === selectedCharacterId && a.presenceState === context.experienceState
    );

    if (!asset || (context.requireAvailableAssets && asset.status !== 'available')) {
      return { ...defaultFallback, resolutionReason: 'ASSET_UNAVAILABLE_FALLBACK' };
    }

    return {
      characterId: selectedCharacterId,
      assetKey: asset.assetKey,
      presenceState: context.experienceState,
      accessibilityDescription: characterDef.accessibilityDescription,
      reducedMotion: context.reducedMotionPreference,
      resolutionReason: matchReason,
      isFallback: false
    };
  }

  private static resolveCharacterId(
    context: PresencePolicyContext
  ): {
    readonly selectedCharacterId: CharacterId;
    readonly matchReason: ResolutionReason;
  } {
    // 1. Obtener candidatos permitidos
    const candidates = context.allowedCharacters
      .map(id => CharacterDefinitionCatalog[id])
      .filter(def => def !== undefined && def.isActive);

    // 2. Filtrar por compatibilidad de rol, escena y presence state
    const eligibleCandidates = candidates.filter(def => {
      // Un personaje es compatible con el rol si:
      // a) Es un companion/sistema (no atado a un rol específico) -> def.representedRole === 'system'
      // b) Representa exactamente el rol institucional del usuario
      const isRoleCompatible = def.representedRole === 'system' || def.representedRole === context.institutionalRole;
      const isSceneCompatible = def.allowedContexts.includes(context.scene);
      const isPresenceStateCompatible = def.allowedPresenceStates.includes(context.experienceState);
      
      return isRoleCompatible && isSceneCompatible && isPresenceStateCompatible;
    });

    if (eligibleCandidates.length === 0) {
      // Intento final: Si no hay nadie compatible con este contexto específico, 
      // ¿el Companion general está en la lista pero falló por estado/escena?
      // Si falló por eso, el resolve principal lo detectará y marcará FALLBACK.
      // Pero si eligible está vacío, devolvemos fallback directamente.
      return { selectedCharacterId: FALLBACK_ID, matchReason: 'NO_ELIGIBLE_CHARACTER_FALLBACK' };
    }

    // 3. Ordenar por prioridad explícita (mayor a menor)
    eligibleCandidates.sort((a, b) => b.presencePriority - a.presencePriority);

    const winner = eligibleCandidates[0];

    let reason: ResolutionReason = 'CONTEXT_MATCH';
    if (winner.characterType === 'institutional_persona') {
      reason = 'PERSONA_COMPATIBILITY_MATCH';
    } else if (winner.characterId === COMPANION_ID) {
      reason = 'COMPANION_DEFAULT';
    }

    return { selectedCharacterId: winner.characterId, matchReason: reason };
  }
}
