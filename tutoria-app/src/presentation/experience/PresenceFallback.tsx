import React from 'react';
import { CharacterMood } from './ExperienceTypes';
import { Book } from 'lucide-react';

interface PresenceFallbackProps {
  mood: CharacterMood;
}

export function PresenceFallback({ mood }: PresenceFallbackProps) {
  // A dignified, accessible, and institutional visual fallback
  // No technical texts like "[Placeholder] asset missing"

  return (
    <div
      className="flex flex-col items-center justify-center w-full h-full min-h-[300px] max-w-[400px] bg-transparent"
      role="img"
      aria-label="Representación institucional"
    >
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Orbital Arcs */}
        <div className="absolute inset-0 border-[3px] border-dashed border-teal-500/20 rounded-full animate-[spin_20s_linear_infinite] motion-reduce:animate-none"></div>
        <div className="absolute inset-4 border-[2px] border-dotted border-teal-400/30 rounded-full animate-[spin_15s_linear_infinite_reverse] motion-reduce:animate-none"></div>

        {/* Abstract Core & Glow */}
        <div className="absolute inset-0 bg-brandPrimary/10 rounded-full blur-2xl"></div>
        <div className="z-10 bg-gradient-to-br from-white to-surfaceSuccess shadow-2xl shadow-brandPrimary/20 w-32 h-32 rounded-3xl border border-white flex items-center justify-center relative overflow-hidden">

          {/* Abstract Geometric Center */}
          <div className="w-16 h-16 bg-brandPrimary/10 rounded-full flex items-center justify-center relative">
            <div className="w-12 h-12 bg-brandPrimary rounded-full animate-pulse motion-reduce:animate-none"></div>
          </div>

          {/* Subtle reflection */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/60 blur-md rounded-full -translate-y-8 translate-x-8"></div>
        </div>

        {/* Abstract floating elements */}
        <div className="absolute -bottom-4 right-4 bg-white shadow-xl shadow-brandDark/5 w-12 h-12 rounded-2xl border border-brandPrimary/10 flex items-center justify-center transform rotate-12">
          <Book className="w-5 h-5 text-brandPrimary" />
        </div>
      </div>

      <div className="mt-8 w-48 h-2 bg-gradient-to-r from-transparent via-teal-400/30 to-transparent rounded-full opacity-50 blur-sm"></div>
    </div>
  );
}
