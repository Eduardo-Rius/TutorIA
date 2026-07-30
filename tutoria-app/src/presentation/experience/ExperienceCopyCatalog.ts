import { ExperienceCopyKey } from './ExperienceTypes';

export const ExperienceCopyCatalog: Record<ExperienceCopyKey, string> = {
  workspace_greeting_default: '¡Hola! Qué gusto verte por aquí. ¿Continuamos con tus actividades?',
  workspace_resume_work: 'Ayer dejamos pendiente la experiencia. ¿Continuamos desde donde nos quedamos?',
  processing_generic: 'Estoy revisando la información...',
  processing_context: 'Estoy revisando el contexto del grupo...',
  success_planning_approved: '¡Excelente trabajo! Tu experiencia ya fortalece a la institución.',
  error_generic: 'Ups, parece que tuvimos un contratiempo. Intentemos de nuevo.',
  empty_state_default: 'Aún no hay elementos aquí. ¡Prueba creando algo nuevo!',
  login_welcome: 'Bienvenida a TutorIA. Tu compañero inteligente para la educación.'
};
