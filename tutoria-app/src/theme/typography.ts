export const typography = {
  fontFamily: {
    sans: [
      'Inter',
      'ui-sans-serif',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'sans-serif'
    ],
    poppins: [
      'Poppins',
      'sans-serif'
    ]
  },
  weights: {
    300: '300',
    400: '400',
    500: '500',
    600: '600',
    700: '700',
    800: '800',
  },
  sizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  }
} as const;

export type Typography = typeof typography;
