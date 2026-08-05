import React, { useState } from 'react';
import { ExperienceContext } from './ExperienceTypes';
import { resolveExperience } from './ExperienceResolver';
import { ExperienceCopyCatalog } from './ExperienceCopyCatalog';
import { PresenceMotion } from './PresenceMotion';
import { PresenceFallback } from './PresenceFallback';
import { PresenceResolution } from './presence/PresenceResolution';
import { InstitutionalPresenceRenderer } from './presence/InstitutionalPresenceRenderer';

interface TutorIAPresenceProps {
  context: ExperienceContext;
  resolution?: PresenceResolution;
  onAction?: (action: any) => void;
}

export function TutorIAPresence({ context, resolution, onAction }: TutorIAPresenceProps) {
  const presentation = resolveExperience(context);

  const voiceCopy = ExperienceCopyCatalog[presentation.voiceKey] || ExperienceCopyCatalog['error_generic'];

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
      className="relative isolate flex flex-col md:flex-row items-center justify-between w-full h-full min-h-[480px] overflow-hidden rounded-[40px] bg-white border border-brandDark/5 text-brandDark shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      style={getLightingStyle()}
    >

      {/* 40% Conversation and Actions (Hero Structure) */}
      <div className="w-full md:w-[45%] p-10 md:p-16 z-10 flex flex-col justify-center h-full space-y-10">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-brandDark/5 border border-brandDark/10 text-brandDark text-sm font-medium backdrop-blur-md w-fit shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brandPrimary animate-pulse"></span>
            TutorIA Companion
          </div>
          <h2 className="text-3xl md:text-[44px] font-bold text-brandDark leading-[1.15] font-poppins tracking-tight">
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

      {/* 55% Companion and Scene */}
      <div className="w-full md:w-[55%] h-[340px] md:h-full flex items-center justify-center p-8 md:p-12 relative min-h-[480px]">
        <div className="absolute inset-0 bg-gradient-to-l from-brandDark/[0.02] to-transparent z-0 pointer-events-none" />

        <div className="w-full max-w-[500px] aspect-square relative z-10 flex items-center justify-center">
          <PresenceMotion level={presentation.motion}>
            {resolution ? (
              <InstitutionalPresenceRenderer resolution={resolution} variant="hero" className="w-full h-full" />
            ) : (
              <PresenceFallback mood={presentation.mood} />
            )}
          </PresenceMotion>
        </div>
      </div>
    </div>
  );
}
