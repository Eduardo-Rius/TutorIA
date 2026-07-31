import { describe, it, expect } from 'vitest';
import { CharacterDefinitionCatalog, ANITA_ID } from '../CharacterDefinitionCatalog';

describe('Character Definition Catalog', () => {
  it('is completely immutable at runtime', () => {
    // 1. Catálogo exterior
    expect(Object.isFrozen(CharacterDefinitionCatalog)).toBe(true);

    // 2. Definición interior
    expect(Object.isFrozen(CharacterDefinitionCatalog[ANITA_ID])).toBe(true);

    // 3. Arreglos internos
    expect(Object.isFrozen(CharacterDefinitionCatalog[ANITA_ID].allowedPresenceStates)).toBe(true);
    expect(Object.isFrozen(CharacterDefinitionCatalog[ANITA_ID].allowedContexts)).toBe(true);

    // 4. Intentos de modificación
    expect(() => {
      // @ts-ignore
      CharacterDefinitionCatalog['new_key'] = {};
    }).toThrow(TypeError);

    expect(() => {
      // @ts-ignore
      CharacterDefinitionCatalog[ANITA_ID].presencePriority = 999;
    }).toThrow(TypeError);

    expect(() => {
      // @ts-ignore
      CharacterDefinitionCatalog[ANITA_ID].allowedContexts.push('login');
    }).toThrow(TypeError);
  });

  it('has unique IDs and active characters are valid', () => {
    const ids = Object.keys(CharacterDefinitionCatalog);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    Object.values(CharacterDefinitionCatalog).forEach((char) => {
      if (char.isActive) {
        expect(char.allowedPresenceStates.length).toBeGreaterThan(0);
        expect(char.accessibilityDescription).toBeTruthy();
        expect(char.version).toBeDefined();
        expect(typeof char.presencePriority).toBe('number');
      }
    });
  });
});
