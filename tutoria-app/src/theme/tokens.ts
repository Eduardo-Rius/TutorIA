import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { gradients } from './gradients';
import { motion } from './motion';
import { breakpoints } from './breakpoints';
import { focus } from './focus';
import { zIndex } from './zIndex';
import { logos } from './logos';

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  gradients,
  motion,
  breakpoints,
  focus,
  zIndex,
  logos
} as const;

export type Tokens = typeof tokens;
