export const colors = {
  brandPrimary: '#003c58', // Navy
  brandSecondary: '#0ca994', // Teal
  brandAccent: '#ff9e02', // Orange
  surfacePrimary: '#ffffff',

  // NOTE: Scales 50-950, danger, success, warning, info are blocked.
  // Not declaring them until ARB provides validated HSL scales.
} as const;

export type Colors = typeof colors;
