export const radius = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  button: '12px',
  pill: '9999px',
  circle: '50%',
} as const;

export type Radius = typeof radius;
