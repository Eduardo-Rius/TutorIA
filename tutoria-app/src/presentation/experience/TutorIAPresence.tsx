import React, { useState } from 'react';
import { ExperienceContext } from './ExperienceTypes';
import { resolveExperience } from './ExperienceResolver';
import { ExperienceCopyCatalog } from './ExperienceCopyCatalog';
import { CharacterAssetCatalog } from './CharacterAssetCatalog';
import { PresenceMotion } from './PresenceMotion';
import { PresenceFallback } from './PresenceFallback';

interface TutorIAPresenceProps {
  context: ExperienceContext;
  onAction?: (action: any) => void;
}

export function TutorIAPresence({ context, onAction }: TutorIAPresenceProps) {
  const presentation = resolveExperience(context);
  const [imageError, setImageError] = useState(false);

  const voiceCopy = ExperienceCopyCatalog[presentation.voiceKey] || ExperienceCopyCatalog['error_generic'];
  const assetUrl = CharacterAssetCatalog[presentation.assetKey];

  const getLightingStyle = (): React.CSSProperties => {
    switch (presentation.lighting) {
      case 'DAYLIGHT': return { background: 'radial-gradient(circle at center, rgba(0,169,157,0.05) 0%, transparent 70%)' };
      case 'SOFT_GLOW': return { background: 'radial-gradient(circle at center, rgba(13,110,253,0.05) 0%, transparent 70%)' };
      case 'FOCUSED_RADIAL': return { background: 'radial-gradient(circle at center, rgba(0,169,157,0.1) 0%, transparent 50%)' };
      case 'BRIGHT_WARM': return { background: 'radial-gradient(circle at center, rgba(245,158,11,0.05) 0%, transparent 70%)' };
      case 'NEUTRAL':
      default: return { background: 'transparent' };
    }
  };

  return (
    <div
      data-testid="tutoria-presence"
      className="relative isolate flex flex-col md:flex-row items-center justify-between w-full h-full min-h-[400px] overflow-hidden rounded-[32px] bg-surfaceSuccess border border-success/10 text-brandDark shadow-sm"
      style={getLightingStyle()}
    >

      {/* 40% Conversation and Actions (Hero Structure) */}
      <div className="w-full md:w-2/5 p-8 md:p-14 z-10 flex flex-col justify-center h-full space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brandDark/5 border border-brandDark/10 text-brandDark text-xs font-semibold backdrop-blur-md w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
            TutorIA Companion
          </div>
          <h2 className="text-3xl md:text-[40px] font-bold text-brandDark leading-tight font-poppins">
            {voiceCopy}
          </h2>
        </div>

        {presentation.primaryAction && (
          <div className="pt-4">
            <button
              disabled={!presentation.primaryAction.enabled}
              className="px-7 py-4 bg-brandPrimary text-white rounded-full font-semibold hover:bg-[#008F82] transition-all shadow-lg shadow-brandPrimary/30 hover:shadow-brandPrimary/50 flex items-center gap-2 group hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none w-full sm:w-auto justify-center"
              onClick={() => {
                if (presentation.primaryAction?.enabled && onAction) {
                  onAction(presentation.primaryAction);
                }
              }}
            >
              {presentation.primaryAction.label}
            </button>
          </div>
        )}
      </div>

      {/* 60% Companion and Scene */}
      <div className="w-full md:w-3/5 h-[300px] md:h-full flex items-center justify-center p-8 relative min-h-[400px]">
        <div className="absolute inset-0 bg-gradient-to-l from-white/20 to-transparent z-0 pointer-events-none" />

        <div className="w-full max-w-[450px] aspect-square relative z-10 flex items-center justify-center">
          <PresenceMotion level={presentation.motion}>
            {imageError || !assetUrl ? (
              <PresenceFallback mood={presentation.mood} />
            ) : (
              <img
                src={assetUrl}
                alt={`TutorIA - ${presentation.mood.toLowerCase()}`}
                className="w-full h-full object-contain drop-shadow-xl"
                onError={() => setImageError(true)}
              />
            )}
          </PresenceMotion>
        </div>
      </div>
    </div>
  );
}
