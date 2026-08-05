import React, { useState, useEffect } from 'react';
import { PresenceResolution } from './PresenceResolution';
import { CharacterAssetCatalog } from '../characters/CharacterAssetCatalog';
import { PresenceFallback } from '../PresenceFallback';

export type InstitutionalPresenceVariant =
  | 'hero'
  | 'avatar'
  | 'card';

export interface InstitutionalPresenceRendererProps {
  readonly resolution: PresenceResolution;
  readonly variant?: InstitutionalPresenceVariant;
  readonly className?: string;
  readonly testId?: string;
}

export const InstitutionalPresenceRenderer: React.FC<InstitutionalPresenceRendererProps> = ({
  resolution,
  variant = 'hero',
  className = '',
  testId = 'institutional-presence-renderer'
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if resolution changes
  useEffect(() => {
    setHasError(false);
  }, [resolution.assetKey]);

  if (resolution.isFallback || hasError) {
    return <PresenceFallback mood={resolution.presenceState} />;
  }

  const manifest = CharacterAssetCatalog[resolution.assetKey];

  if (!manifest || manifest.status !== 'available' || !manifest.physicalSource) {
    return <PresenceFallback mood={resolution.presenceState} />;
  }

  const altText = manifest.accessibilityMode === 'informative' ? resolution.accessibilityDescription : '';
  const ariaHidden = manifest.accessibilityMode === 'decorative';

  const isPersona = resolution.characterId.startsWith('persona_');

  if (variant === 'avatar') {
    return (
      <div className={`relative flex items-center justify-center w-full h-full min-w-0 min-h-0 overflow-hidden rounded-full ${className}`} data-testid={testId}>
        <img
          src={manifest.physicalSource}
          alt={altText}
          aria-hidden={ariaHidden}
          className={`w-full h-full object-cover object-top ${resolution.reducedMotion ? 'motion-reduce' : ''}`}
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  const containerAspectClass = isPersona ? 'aspect-[390/524]' : 'aspect-square';
  const imageAlignmentClass = isPersona ? 'object-bottom' : 'object-center';

  return (
    <div className={`relative flex items-center justify-center ${containerAspectClass} ${className}`} data-testid={testId}>
      <img
        src={manifest.physicalSource}
        alt={altText}
        aria-hidden={ariaHidden}
        className={`w-full h-full object-contain ${imageAlignmentClass} ${resolution.reducedMotion ? 'motion-reduce' : ''}`}
        onError={() => setHasError(true)}
      />
    </div>
  );
};
