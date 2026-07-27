// Candidate Z-Index Scale
export const zIndex = {
  base: '0',
  raised: '10',
  floating: '20',
  overlay: '30',
  modal: '40',
} as const;

export type ZIndex = typeof zIndex;
