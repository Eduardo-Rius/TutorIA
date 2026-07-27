export const motion = {
  durations: {
    instant: '0ms',
    fast: '150ms',
    standard: '300ms',
    slow: '500ms',
  },
  curves: {
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    linear: 'linear',
  }
} as const;

export type Motion = typeof motion;
