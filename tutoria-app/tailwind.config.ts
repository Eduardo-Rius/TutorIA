import type { Config } from 'tailwindcss';
import { colors } from './src/theme/colors';
import { typography } from './src/theme/typography';
import { spacing } from './src/theme/spacing';
import { radius } from './src/theme/radius';
import { shadows } from './src/theme/shadows';
import { gradients } from './src/theme/gradients';
import { motion } from './src/theme/motion';
import { breakpoints } from './src/theme/breakpoints';
import { zIndex } from './src/theme/zIndex';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: colors,
    spacing: spacing,
    borderRadius: radius,
    boxShadow: shadows,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes,
    fontWeight: typography.weights,
    zIndex: zIndex,
    extend: {
      backgroundImage: gradients,
      transitionDuration: motion.durations,
      transitionTimingFunction: motion.curves,
      screens: breakpoints,
      keyframes: {
        'bounce-slow': {
          '0%, 100%': {
            transform: 'translateY(-5%)',
            animationTimingFunction: 'cubic-bezier(0.8,0,1,1)',
          },
          '50%': {
            transform: 'none',
            animationTimingFunction: 'cubic-bezier(0,0,0.2,1)',
          },
        },
      },
      animation: {
        'bounce-slow': 'bounce-slow 2.5s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
