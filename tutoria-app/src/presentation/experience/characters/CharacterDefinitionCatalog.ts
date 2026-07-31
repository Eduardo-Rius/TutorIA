import { CharacterDefinition, CharacterId } from './CharacterDefinition';

export const COMPANION_ID: CharacterId = 'tutoria_companion';
export const ANITA_ID: CharacterId = 'persona_anita';
export const TERE_ID: CharacterId = 'persona_tere';
export const CECI_ID: CharacterId = 'persona_ceci';
export const FALLBACK_ID: CharacterId = 'institutional_fallback';

const freezeCharacterDefinition = (
  definition: CharacterDefinition
): CharacterDefinition =>
  Object.freeze({
    ...definition,
    allowedPresenceStates: Object.freeze([...definition.allowedPresenceStates]),
    allowedContexts: Object.freeze([...definition.allowedContexts]),
  });

const definitions: Readonly<Record<CharacterId, CharacterDefinition>> = {
  [COMPANION_ID]: freezeCharacterDefinition({
    characterId: COMPANION_ID,
    displayName: 'TutorIA Companion',
    characterType: 'companion',
    institutionalPurpose: 'Provides empathetic guidance and context-aware assistance',
    representedRole: 'system',
    accessibilityDescription: 'Un asistente virtual empático que guía la experiencia',
    allowedPresenceStates: ['NEUTRAL', 'GREETING', 'THINKING', 'HELPING', 'CELEBRATING', 'WAITING'],
    allowedContexts: ['workspace-reception', 'ai-processing', 'success-celebration', 'login', 'default'],
    isActive: true,
    presencePriority: 50,
    version: '1.0.0'
  }),
  [ANITA_ID]: freezeCharacterDefinition({
    characterId: ANITA_ID,
    displayName: 'Anita',
    characterType: 'institutional_persona',
    institutionalPurpose: 'Represents the maternal educator role warmly and professionally',
    representedRole: 'Docente Maternal',
    accessibilityDescription: 'Retrato de Anita, educadora maternal',
    allowedPresenceStates: ['NEUTRAL', 'GREETING'],
    allowedContexts: ['workspace-reception', 'default'],
    isActive: true,
    presencePriority: 100, // Personas have higher priority than companion when applicable
    version: '1.0.0'
  }),
  [TERE_ID]: freezeCharacterDefinition({
    characterId: TERE_ID,
    displayName: 'Tere',
    characterType: 'institutional_persona',
    institutionalPurpose: 'Represents the director role with leadership and warmth',
    representedRole: 'Directora',
    accessibilityDescription: 'Retrato de Tere, directora del centro',
    allowedPresenceStates: ['NEUTRAL', 'GREETING'],
    allowedContexts: ['workspace-reception', 'default'],
    isActive: true,
    presencePriority: 100,
    version: '1.0.0'
  }),
  [CECI_ID]: freezeCharacterDefinition({
    characterId: CECI_ID,
    displayName: 'Ceci',
    characterType: 'institutional_persona',
    institutionalPurpose: 'Represents the supervisor role with observation and structure',
    representedRole: 'Supervisora',
    accessibilityDescription: 'Retrato de Ceci, supervisora',
    allowedPresenceStates: ['NEUTRAL', 'GREETING'],
    allowedContexts: ['workspace-reception', 'default'],
    isActive: true,
    presencePriority: 100,
    version: '1.0.0'
  }),
  [FALLBACK_ID]: freezeCharacterDefinition({
    characterId: FALLBACK_ID,
    displayName: 'Institutional Fallback',
    characterType: 'fallback',
    institutionalPurpose: 'Provides a safe, accessible visual fallback when no persona is available',
    representedRole: 'system',
    accessibilityDescription: 'Composición abstracta institucional',
    allowedPresenceStates: ['NEUTRAL'],
    allowedContexts: ['workspace-reception', 'ai-processing', 'success-celebration', 'login', 'default'],
    isActive: true,
    presencePriority: 0, // Lowest priority, used only when everything else fails
    version: '1.0.0'
  })
};

export const CharacterDefinitionCatalog = Object.freeze(definitions);
