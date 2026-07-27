import { colors } from './colors';

// CANDIDATE Gradients - Do not use in critical components yet
export const gradients = {
  primary: `linear-gradient(to right, ${colors.brandPrimary}, ${colors.brandSecondary})`,
  secondary: `linear-gradient(to right, ${colors.brandSecondary}, ${colors.brandPrimary})`,
  hero: `linear-gradient(to bottom right, ${colors.brandPrimary}, ${colors.brandSecondary}, ${colors.brandAccent})`,
  accent: `linear-gradient(to right, ${colors.brandAccent}, ${colors.brandSecondary})`,
} as const;

export type Gradients = typeof gradients;
