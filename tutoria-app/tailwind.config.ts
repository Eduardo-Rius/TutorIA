import type { Config } from 'tailwindcss';
import { tokens } from './src/theme/tokens';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Override Tailwind's default configuration completely where applicable
    colors: tokens.colors,
    spacing: tokens.spacing,
    borderRadius: tokens.radius,
    boxShadow: tokens.shadows,
    fontFamily: tokens.typography.fontFamily,
    fontSize: tokens.typography.sizes,
    fontWeight: tokens.typography.weights,
    zIndex: tokens.zIndex,
    // Add custom extensions
    extend: {
      backgroundImage: tokens.gradients,
      transitionDuration: tokens.motion.durations,
      transitionTimingFunction: tokens.motion.curves,
      screens: tokens.breakpoints,
    },
  },
  plugins: [],
} satisfies Config;
