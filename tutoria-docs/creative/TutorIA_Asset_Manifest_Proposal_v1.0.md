# TutorIA Character Asset Manifest Proposal
**Version 1.0**

Este documento detalla el listado de assets iniciales (ilustraciones) requeridos para el ARB (ChatGPT) con el objetivo de satisfacer la experiencia visual de TutorIA Phase B (Character Design System). 

## Estructura del Manifiesto
Se utilizará una interfaz TypeScript (`CharacterAssetManifest`) en el código para mapear estas llaves (`CharacterAssetKey`) a sus respectivas rutas estáticas.

```typescript
export type CharacterAssetKey = 
  // TutorIA Companion
  | 'tutoria_login_greeting_floating'
  | 'tutoria_workspace_greeting_floating'
  | 'tutoria_planning_thinking_sitting'
  | 'tutoria_planning_helping_pointing'
  | 'tutoria_empty_waiting_observing'
  | 'tutoria_success_celebrating_floating'
  
  // Institutional Personas (Fallback visuales de perfiles y contextos)
  | 'persona_maternal_anita_neutral'
  | 'persona_director_tere_neutral'
  | 'persona_supervisor_ceci_neutral';
```

## Propuesta de Assets Requeridos

### 1. El Protagonista: TutorIA Companion

| Key | Mood | Pose | Context | Descripción Esperada |
| :--- | :--- | :--- | :--- | :--- |
| `tutoria_login_greeting_floating` | Greeting | Floating | Login | Companion flotando amigablemente, con iluminación cálida, invitando al usuario a iniciar sesión. |
| `tutoria_workspace_greeting_floating`| Greeting | Floating | Workspace Hero | Companion en la sección derecha del Hero (60%), posiblemente con una mano (o equivalente) levantada saludando ("Buenos días"). Tamaño grande. |
| `tutoria_planning_thinking_sitting`| Thinking | Sitting | Generating / Loading | Companion sentado sobre un pequeño cubo o nube (accesorio), con expresión concentrada revisando el contexto de planeación (ej. Loading State de PM-01). |
| `tutoria_planning_helping_pointing`| Helping | Pointing | Planning | Companion sosteniendo una tablet o un libro, señalando un área de mejora en la propuesta educativa. |
| `tutoria_empty_waiting_observing` | Waiting | Observing | Empty State | Companion flotando o asomándose con expresión curiosa y empática. Se utilizará en vistas donde no hay datos recientes. |
| `tutoria_success_celebrating_floating`| Celebrating| Floating | Success | Companion rodeado de sutiles estrellas o confeti estético, expresión feliz. Para uso al aprobar una planeación (Phase B5). |

### 2. Personajes Institucionales (Institutional Personas)

Dado que se ocultarán los rostros de empleadas reales, necesitamos las siguientes ilustraciones (estilo matching con el Companion) para los avatares circulares del Sidebar, Context Bar y Navegación.

| Key | Rol Institucional | Alias | Pose | Descripción Esperada |
| :--- | :--- | :--- | :--- | :--- |
| `persona_maternal_anita_neutral` | Docente Maternal | Anita | Neutral (Portrait) | Retrato circular (headshot/bust). Estilo 3D cálido. Representando a una educadora joven, empática. (Diversidad mexicana). |
| `persona_director_tere_neutral` | Directora | Tere | Neutral (Portrait) | Retrato circular. Representando liderazgo, experiencia y calidez. |
| `persona_supervisor_ceci_neutral`| Supervisora | Ceci | Neutral (Portrait) | Retrato circular. Perfil observador y estructurado pero cálido. |

## Resumen para Generación
Para que el ARB (Ilustrador) comience la producción, se requieren **6 ilustraciones completas del Companion** (con fondo transparente, alta resolución, cuidando las sombras proyectadas sobre el entorno base) y **3 retratos busto para roles institucionales**. 

*(Nota Técnica para Frontend: Todos estos recursos serán exportados en `.webp` y almacenados en `src/assets/characters/`)*.
