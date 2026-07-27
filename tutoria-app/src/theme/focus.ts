import { colors } from './colors';

export const focus = {
  visible: {
    outline: `2px solid ${colors.brandSecondary}`,
    outlineOffset: '2px',
  }
} as const;

export type Focus = typeof focus;
