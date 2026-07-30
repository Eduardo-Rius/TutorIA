import React, { ReactNode } from 'react';
import { MotionLevel } from './ExperienceTypes';

interface PresenceMotionProps {
  level: MotionLevel;
  children: ReactNode;
}

export function PresenceMotion({ level, children }: PresenceMotionProps) {
  // Respect prefers-reduced-motion using a CSS class that conditionally disables animation
  const baseClasses = 'transition-all duration-700 ease-in-out';

  let motionClasses = '';
  switch (level) {
    case 'SUBTLE':
      // Very slow floating/breathing animation
      motionClasses = 'animate-[floating_6s_ease-in-out_infinite] motion-reduce:animate-none';
      break;
    case 'EXPRESSIVE':
      // Slight bounce or celebratory pulse
      motionClasses = 'animate-[pulse_2s_ease-in-out_infinite] motion-reduce:animate-none scale-105';
      break;
    case 'TRANSITIONAL':
      motionClasses = 'animate-[fade-in-up_0.5s_ease-out] motion-reduce:animate-none';
      break;
    case 'NONE':
    default:
      motionClasses = '';
      break;
  }

  return (
    <div className={`${baseClasses} ${motionClasses}`}>
      {children}
    </div>
  );
}
