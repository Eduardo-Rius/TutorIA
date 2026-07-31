import { describe, it, expect } from 'vitest';
import { CharacterAssetCatalog } from '../CharacterAssetCatalog';
import { CharacterDefinitionCatalog } from '../CharacterDefinitionCatalog';

describe('Character Asset Manifest Catalog', () => {
  it('is completely immutable at runtime', () => {
    expect(Object.isFrozen(CharacterAssetCatalog)).toBe(true);
    
    // Check an inner object
    const assetKey = 'fallback_avatar';
    expect(Object.isFrozen(CharacterAssetCatalog[assetKey])).toBe(true);
    
    expect(() => {
      // @ts-ignore
      CharacterAssetCatalog['new_key'] = {};
    }).toThrow(TypeError);

    expect(() => {
      // @ts-ignore
      CharacterAssetCatalog[assetKey].status = 'placeholder_pending';
    }).toThrow(TypeError);
  });

  it('has valid formats, fallback assets, and points to existing characterIds', () => {
    const assetKeys = Object.keys(CharacterAssetCatalog);
    const uniqueKeys = new Set(assetKeys);
    expect(uniqueKeys.size).toBe(assetKeys.length);

    Object.values(CharacterAssetCatalog).forEach((asset) => {
      expect(CharacterDefinitionCatalog[asset.characterId]).toBeDefined();
      expect(asset.fallbackAssetKey).toBeDefined();
      
      if (asset.representationType === 'component_fallback') {
        expect(asset.format).toBeUndefined();
        expect(asset.physicalSource).toBeUndefined();
      } else if (asset.status === 'placeholder_pending') {
        expect(asset.physicalSource).toBeUndefined(); // Pending assets do not generate physical routes
      } else if (asset.status === 'available') {
        expect(asset.physicalSource).toBeDefined();
      }
    });
  });
});
