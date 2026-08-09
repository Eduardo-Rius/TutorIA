// Warm slate shadows for pedagogical notebook feel
export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(62, 74, 80, 0.05)',
  sm: '0 1px 3px 0 rgba(62, 74, 80, 0.08), 0 1px 2px -1px rgba(62, 74, 80, 0.06)',
  md: '0 4px 6px -1px rgba(62, 74, 80, 0.08), 0 2px 4px -2px rgba(62, 74, 80, 0.06)',
  soft: '0 10px 25px rgba(62, 74, 80, 0.04)',
  lg: '0 10px 15px -3px rgba(62, 74, 80, 0.08), 0 4px 6px -4px rgba(62, 74, 80, 0.06)',
  xl: '0 20px 25px -5px rgba(62, 74, 80, 0.08), 0 8px 10px -6px rgba(62, 74, 80, 0.06)',
} as const;

export type Shadows = typeof shadows;
