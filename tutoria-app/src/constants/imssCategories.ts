// tutoria-app/src/constants/imssCategories.ts
export const IMSS_CATEGORIES = [
  'EXPERIENCIAS ARTÍSTICAS',
  'AMBIENTES DE APRENDIZAJE',
  'ACTIVACIÓN FÍSICA',
  'LECTURA EN VOZ ALTA',
  'PENSAMIENTO MATEMÁTICO'
] as const;

export type ImssCategory = (typeof IMSS_CATEGORIES)[number];
