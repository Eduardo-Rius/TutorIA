import { describe, it, expect } from 'vitest';
import { PresencePolicy, PresencePolicyContext } from '../PresencePolicy';
import { COMPANION_ID, ANITA_ID, TERE_ID, CECI_ID, FALLBACK_ID } from '../../characters/CharacterDefinitionCatalog';

describe('Presence Policy Selection Rules', () => {
  const baseContext: PresencePolicyContext = {
    institutionalRole: 'system',
    workspaceState: 'PENDING_WORK',
    experienceState: 'GREETING',
    scene: 'workspace-reception',
    allowedCharacters: [COMPANION_ID],
    reducedMotionPreference: false,
    requireAvailableAssets: false
  };

  it('is deterministic: produces same output for same input', () => {
    const contextCopy1 = { ...baseContext };
    const contextCopy2 = { ...baseContext };
    
    const res1 = PresencePolicy.resolve(contextCopy1);
    const res2 = PresencePolicy.resolve(contextCopy2);
    
    expect(res1).toEqual(res2);
    // Ensure context was not mutated
    expect(contextCopy1).toEqual(baseContext);
  });

  it('resolves Companion as default for general context', () => {
    const res = PresencePolicy.resolve(baseContext);
    expect(res.characterId).toBe(COMPANION_ID);
    expect(res.resolutionReason).toBe('COMPANION_DEFAULT');
  });

  it('resolves Anita for Docente Maternal role because of higher priority', () => {
    const res = PresencePolicy.resolve({
      ...baseContext,
      institutionalRole: 'Docente Maternal',
      allowedCharacters: [ANITA_ID, COMPANION_ID], // Both are allowed, but Anita has higher priority (100 > 50)
      experienceState: 'NEUTRAL'
    });
    expect(res.characterId).toBe(ANITA_ID);
    expect(res.resolutionReason).toBe('PERSONA_COMPATIBILITY_MATCH');
  });

  it('resolves Tere for Directora role', () => {
    const res = PresencePolicy.resolve({
      ...baseContext,
      institutionalRole: 'Directora',
      allowedCharacters: [TERE_ID, COMPANION_ID],
      experienceState: 'NEUTRAL'
    });
    expect(res.characterId).toBe(TERE_ID);
    expect(res.resolutionReason).toBe('PERSONA_COMPATIBILITY_MATCH');
  });

  it('resolves Ceci for Supervisora role', () => {
    const res = PresencePolicy.resolve({
      ...baseContext,
      institutionalRole: 'Supervisora',
      allowedCharacters: [CECI_ID, COMPANION_ID],
      experienceState: 'NEUTRAL'
    });
    expect(res.characterId).toBe(CECI_ID);
    expect(res.resolutionReason).toBe('PERSONA_COMPATIBILITY_MATCH');
  });

  it('handles unknown context using fallback', () => {
    const res = PresencePolicy.resolve({
      ...baseContext,
      allowedCharacters: [COMPANION_ID],
      scene: 'onboarding' as any // simulating unknown context
    });
    expect(res.isFallback).toBe(true);
    expect(res.resolutionReason).toBe('NO_ELIGIBLE_CHARACTER_FALLBACK');
  });

  it('handles asset unavailable using fallback when strict mode is on', () => {
    const res = PresencePolicy.resolve({
      ...baseContext,
      requireAvailableAssets: true // Since our assets are 'placeholder_pending'
    });
    expect(res.isFallback).toBe(true);
    expect(res.resolutionReason).toBe('ASSET_UNAVAILABLE_FALLBACK');
  });

  it('conserves reduced motion preference without mutation', () => {
    const res = PresencePolicy.resolve({
      ...baseContext,
      reducedMotionPreference: true
    });
    expect(res.reducedMotion).toBe(true);
  });

  // Collision tests
  it('collision: role does not match persona restriction, falls back to companion', () => {
    const res = PresencePolicy.resolve({
      ...baseContext,
      institutionalRole: 'system', // 'system' does not map to Anita's 'Docente Maternal'
      allowedCharacters: [ANITA_ID, COMPANION_ID], 
      experienceState: 'GREETING'
    });
    // Should fallback to companion because Anita was filtered out by role compatibility
    expect(res.characterId).toBe(COMPANION_ID);
    expect(res.resolutionReason).toBe('COMPANION_DEFAULT');
  });

  it('collision: absence of characters allowed', () => {
    const res = PresencePolicy.resolve({
      ...baseContext,
      allowedCharacters: []
    });
    expect(res.isFallback).toBe(true);
    expect(res.resolutionReason).toBe('NO_ELIGIBLE_CHARACTER_FALLBACK');
  });
  
  it('collision: presence state not supported by allowed characters', () => {
    const res = PresencePolicy.resolve({
      ...baseContext,
      institutionalRole: 'Docente Maternal',
      allowedCharacters: [ANITA_ID], // Only Anita allowed
      experienceState: 'CELEBRATING' // Anita does not support CELEBRATING
    });
    // Anita is filtered out by state compatibility. No candidates left.
    expect(res.isFallback).toBe(true);
    expect(res.resolutionReason).toBe('NO_ELIGIBLE_CHARACTER_FALLBACK');
  });
});
