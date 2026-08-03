import React, { useState, useEffect } from 'react';
import { PresenceResolution } from './PresenceResolution';
import { CharacterAssetCatalog } from '../characters/CharacterAssetCatalog';
import { PresenceFallback } from '../PresenceFallback';

export interface InstitutionalPresenceRendererProps {
  readonly resolution: PresenceResolution;
  readonly className?: string;
  readonly testId?: string;
}

export const InstitutionalPresenceRenderer: React.FC<InstitutionalPresenceRendererProps> = ({
  resolution,
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

  return (
    <div className={`relative flex items-center justify-center ${className}`} data-testid={testId}>
      <img
        src={manifest.physicalSource}
        alt={altText}
        aria-hidden={ariaHidden}
        className={`w-full h-full object-contain ${resolution.reducedMotion ? 'motion-reduce' : ''}`}
        onError={() => setHasError(true)}
      />
    </div>
  );
};
