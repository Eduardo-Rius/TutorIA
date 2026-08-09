export const colors = {
  // New Semantic Tokens
  'brand-primary': '#6b8c82',
  'brand-secondary': '#8bb0ce',
  'brand-accent': '#dfb75f',
  'brand-support': '#d1866f',
  'brand-dark': '#3e4a50',

  'surface-warm': '#f9f8f4',
  'surface-white': '#ffffff',
  'surface-ivory': '#f4f0e6',
  'surface-soft': '#e9e4d8',

  'text-primary': '#333b3d',
  'text-muted': '#6e7a7c',
  'text-light': '#a4b1b3',
  'text-inverse': '#ffffff',
  'text-accent': '#557269',

  'status-draft': '#cfd4d6',
  'status-review': '#8bb0ce',
  'status-adjustment': '#df9c5f',
  'status-approved': '#6b8c82',

  'role-teacher': '#6b8c82',
  'role-director': '#8bb0ce',
  'role-supervisor': '#887d96',

  'border-soft': '#e9e4d8',
  'border-default': '#dad3c5',

  // Legacy mappings to preserve components outside of PlanningDemoApp
  brandPrimary: '#6b8c82',
  brandSecondary: '#8bb0ce',
  brandDark: '#3e4a50',
  surfaceLight: '#f9f8f4',
  surfacePrimary: '#ffffff',
  surfaceSuccess: '#e9f2ee',
  borderDefault: '#dad3c5',
  success: '#6b8c82',
  warning: '#df9c5f',
  danger: '#df9c5f',
  textLight: '#a4b1b3',
  navHover: '#3e4a50',
} as const;

export type Colors = typeof colors;
