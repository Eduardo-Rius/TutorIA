import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InstitutionalPresenceRenderer } from '../InstitutionalPresenceRenderer';
import { PresenceResolution } from '../PresenceResolution';
import { COMPANION_ID } from '../../characters/CharacterDefinitionCatalog';

// Mock the Fallback so we can easily find it
vi.mock('../../PresenceFallback', () => ({
  PresenceFallback: ({ mood }: { mood: string }) => <div data-testid="presence-fallback">{mood}</div>
}));

// Mock the CharacterAssetCatalog
vi.mock('../../characters/CharacterAssetCatalog', () => ({
  CharacterAssetCatalog: {
    'available_asset': {
      status: 'available',
      physicalSource: '/test.svg',
      accessibilityMode: 'informative'
    },
    'decorative_asset': {
      status: 'available',
      physicalSource: '/decorative.svg',
      accessibilityMode: 'decorative'
    },
    'pending_asset': {
      status: 'placeholder_pending',
      physicalSource: undefined,
      accessibilityMode: 'informative'
    }
  }
}));

describe('InstitutionalPresenceRenderer', () => {
  const baseResolution: PresenceResolution = {
    characterId: COMPANION_ID,
    assetKey: 'available_asset',
    presenceState: 'GREETING',
    accessibilityDescription: 'Un robot amigable saludando.',
    reducedMotion: false,
    isFallback: false
  };

  it('renders <img> when the asset is available', () => {
    render(<InstitutionalPresenceRenderer resolution={baseResolution} />);
    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/test.svg');
  });

  it('uses the correct accessible description for informative assets', () => {
    render(<InstitutionalPresenceRenderer resolution={baseResolution} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('alt')).toBe('Un robot amigable saludando.');
    expect(img.getAttribute('aria-hidden')).toBe('false');
  });

  it('renders alt="" and aria-hidden="true" when the asset is decorative', () => {
    const decorativeResolution = { ...baseResolution, assetKey: 'decorative_asset' };
    render(<InstitutionalPresenceRenderer resolution={decorativeResolution} />);

    const wrapper = screen.getByTestId('institutional-presence-renderer');
    const img = wrapper.querySelector('img');

    expect(img).toBeTruthy();
    expect(img?.getAttribute('alt')).toBe('');
    expect(img?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders PresenceFallback when isFallback is true', () => {
    const fallbackResolution = { ...baseResolution, isFallback: true };
    render(<InstitutionalPresenceRenderer resolution={fallbackResolution} />);

    expect(screen.getByTestId('presence-fallback')).toBeTruthy();
    expect(screen.getByText('GREETING')).toBeTruthy();
  });

  it('renders fallback when the asset does not exist or is not available', () => {
    const missingResolution = { ...baseResolution, assetKey: 'pending_asset' };
    render(<InstitutionalPresenceRenderer resolution={missingResolution} />);

    expect(screen.getByTestId('presence-fallback')).toBeTruthy();
  });

  it('renders fallback upon image onError', () => {
    render(<InstitutionalPresenceRenderer resolution={baseResolution} />);
    const img = screen.getByRole('img');

    fireEvent.error(img);

    expect(screen.getByTestId('presence-fallback')).toBeTruthy();
  });

  it('does not mutate the received resolution', () => {
    const originalResolution = JSON.parse(JSON.stringify(baseResolution));
    render(<InstitutionalPresenceRenderer resolution={baseResolution} />);

    expect(baseResolution).toEqual(originalResolution);
  });

  it('maintains a stable wrapper', () => {
    render(<InstitutionalPresenceRenderer resolution={baseResolution} className="test-class" />);
    const wrapper = screen.getByTestId('institutional-presence-renderer');

    expect(wrapper.classList.contains('test-class')).toBe(true);
    expect(wrapper.classList.contains('relative')).toBe(true);
    expect(wrapper.classList.contains('flex')).toBe(true);
  });

  describe('Variant Rendering', () => {
    it('Hero Persona receives aspect-[390/524] and object-bottom', () => {
      const personaResolution = { ...baseResolution, characterId: 'persona_anita' as any };
      render(<InstitutionalPresenceRenderer resolution={personaResolution} variant="hero" />);

      const wrapper = screen.getByTestId('institutional-presence-renderer');
      const img = screen.getByRole('img');

      expect(wrapper.classList.contains('aspect-[390/524]')).toBe(true);
      expect(wrapper.classList.contains('aspect-square')).toBe(false);
      expect(img.classList.contains('object-bottom')).toBe(true);
      expect(img.classList.contains('object-contain')).toBe(true);
    });

    it('Hero Companion receives aspect-square and object-center', () => {
      render(<InstitutionalPresenceRenderer resolution={baseResolution} variant="hero" />);

      const wrapper = screen.getByTestId('institutional-presence-renderer');
      const img = screen.getByRole('img');

      expect(wrapper.classList.contains('aspect-square')).toBe(true);
      expect(wrapper.classList.contains('aspect-[390/524]')).toBe(false);
      expect(img.classList.contains('object-center')).toBe(true);
      expect(img.classList.contains('object-contain')).toBe(true);
    });

    it('Avatar Persona receives object-cover, object-top, and no aspect ratio classes', () => {
      const personaResolution = { ...baseResolution, characterId: 'persona_anita' as any };
      render(<InstitutionalPresenceRenderer resolution={personaResolution} variant="avatar" />);

      const wrapper = screen.getByTestId('institutional-presence-renderer');
      const img = screen.getByRole('img');

      expect(wrapper.classList.contains('aspect-[390/524]')).toBe(false);
      expect(wrapper.classList.contains('aspect-square')).toBe(false);
      expect(wrapper.classList.contains('rounded-full')).toBe(true);
      expect(wrapper.classList.contains('overflow-hidden')).toBe(true);

      expect(img.classList.contains('object-cover')).toBe(true);
      expect(img.classList.contains('object-top')).toBe(true);
    });
  });
});
