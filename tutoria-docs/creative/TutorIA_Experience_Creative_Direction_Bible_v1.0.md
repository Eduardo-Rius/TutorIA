# TutorIA Experience & Creative Direction Bible
**Version 1.0 RC**
**Status: Proposed for Ratification**

## Table of Contents
1. Authority and Governance
2. Product and Experience Philosophy
3. Visual North Star
4. Brand and Logo
5. Character Design System
6. Institutional Persona Policy
7. Experience Architecture Separation
8. Emotional Experience Engine
9. TutorIA Presence Architecture
10. Voice and Copy System
11. Motion and Lighting System
12. Scene and Storyboard Bible
13. Login Experience Specification
14. Workspace Experience Specification
15. Responsive and Accessibility
16. Asset Governance and Storage
17. Acceptance Criteria
Annex A — Type Contracts
Annex B — Initial Asset Manifest
Annex C — Scene Matrix

---

## 1. Authority and Governance
La arquitectura visual y emocional de TutorIA se rige por una estricta jerarquía documental. La *Creative Direction Bible* gobierna la experiencia visual, pero **nunca puede contradecir** la `ENGINEERING_CONSTITUTION.md`.

**Jerarquía Documental:**
1. `ENGINEERING_CONSTITUTION.md`
2. `TutorIA Experience & Creative Direction Bible`
3. Design Tokens and Character System
4. Screen Specifications
5. Components and Assets

Toda modificación futura a este documento o al sistema visual deberá realizarse mediante propuesta, revisión ARB, incremento de número de versión, registro de cambio y fecha de ratificación. Los lineamientos aquí descritos son **principios normativos sujetos únicamente al proceso formal de enmienda del ARB.**

## 2. Product and Experience Philosophy
TutorIA no es un dashboard administrativo. TutorIA es un producto emocional, vivo y empático.
- **Eliminación del pensamiento basado en Cards:** Una pantalla es una *escena* donde el usuario interactúa con TutorIA.
- **El objetivo final:** Que el usuario diga "wow" y sienta que está siendo acompañado por una inteligencia cálida.

## 3. Visual North Star
El objetivo visual definitivo de TutorIA es transmitir calidez, simplicidad, mucho aire, mucha luz, baja saturación visual y jerarquías extremadamente claras (inspiración externa: Apple Education, Duolingo, Notion, Linear, Craft, Superhuman).

**Fidelity Priority:**
1. Mockups TutorIA aprobados por ARB.
2. Creative Direction Bible.
3. Design tokens institucionales.
4. Benchmarks externos.
5. Criterio del implementador.

*Los benchmarks externos son inspiración secundaria, nunca sustitutos del mockup.* Antigravity no deberá reinterpretar la composición aprobada. Deberá reproducir la jerarquía y proporciones exactamente como se define en el ARB.

## 4. Brand and Logo
El logotipo institucional debe tener un protagonismo superior al de una aplicación convencional.
- **Login:** 200–240px.
- **Sidebar:** Área visual expandida.
Nunca se reduce al tamaño de un simple icono decorativo.

## 5. Character Design System
Todos los personajes del sistema comparten: mismo ilustrador, misma iluminación, mismo nivel de detalle, misma paleta, mismas proporciones, misma perspectiva y mismo lenguaje visual. **No se utilizarán fotografías, avatares aleatorios ni estilos mezclados.**

El estilo es 3D cartoon premium, geometría suave, calidez educativa, iluminación de estudio. Los personajes reflejarán la diversidad mexicana de manera respetuosa y natural.

## 6. Institutional Persona Policy
**Identidad Institucional (Política de Anonimización)**
La interfaz no utilizará nombres y fotografías reales del personal operativo. 
- *Authentication Identity != Institutional Persona*
- *Institutional Persona != Real Employee Identity*

La *Institutional Persona* es una proyección de presentación. Los alias (ej. Anita, Tere) y avatares nunca reemplazan la identidad de auditoría técnica. Ningún nombre operativo real será mostrado. El mapeo es determinista, basado en rol, y gobernado institucionalmente. Las personas no implican que un personaje ficticio haya realizado una acción auditada.

## 7. Experience Architecture Separation
El *Character Design System* y la *TutorIAPresence* pertenecen **exclusivamente a la capa de presentación**. No deberán introducir lógica de negocio, reglas de autorización, información personal o decisiones institucionales.

> **Principle:** Presence presents intent; it does not create institutional intent.

La Application Layer provee acciones semánticas y hechos operativos. Presence solo las presenta.

## 8. Emotional Experience Engine
Normative architectural name: Emotional Experience Engine.
'Emotional Operating System' is a creative metaphor and does not define a software layer, bounded context or source of institutional authority.

El motor gobierna el estado expresivo del producto basándose puramente en contextos operativos observables (FIRST_VISIT, RETURNING_VISIT, PENDING_WORK, PROCESSING, WAITING, SUCCESS, EMPTY_STATE, RECOVERY_GUIDANCE, DEFAULT).

> **Principle:** TutorIA may express warmth and empathy, but it must not infer, diagnose or persist the emotional state of the user.

El sistema maneja una **autorizada continuidad contextual basada en estado operativo observable** (ej. "trabajo pendiente", "paso actual"), sin retener perfiles conductuales ocultos.

**Deterministic Resolution Priority (Una escena gobernada a la vez):**
1. ERROR / RECOVERY
2. PROCESSING / WAITING
3. SUCCESS
4. PENDING WORK
5. FIRST VISIT
6. RETURNING VISIT
7. DEFAULT

## 9. TutorIA Presence Architecture
La Presencia es un sistema superior. 

```text
Experience Engine -> TutorIAPresence -> Character Resolver -> Illustration + Motion + Voice + CTA + Light
```

El Companion nunca es un accesorio. Toda pantalla principal deberá responder a: *"¿Dónde está presente TutorIA?"* (Puede ser avatar, loading, asomándose o completo, pero nunca ausente).

## 10. Voice and Copy System
El lenguaje es empático, en primera persona, sin lenguaje administrativo ni promesas excesivas de IA.
La implementación inicial debe usar un catálogo determinista, versionado y aprobado por el ARB (`ExperienceCopyKey`). **No se autoriza copy generativo en runtime** para saludos, errores, éxito, CTAs o guías.

## 11. Motion and Lighting System
- **Motion:** None (reduced-motion), Subtle (respiración/flotación), Expressive (celebración breve), Transitional. No usar animaciones infinitas intensas.
- **Lighting:** Uso de Glow, blurs radiales y capas múltiples para dar profundidad editorial a la escena, respetando el performance.

## 12. Scene and Storyboard Bible
Cada escena es un contrato estricto. (Ver Annex C para la matriz).
El diseño no opera por tarjetas estáticas, opera por secuencias operativas presentadas cálidamente.

## 13. Login Experience Specification
- **Composición:** Vertical. Fondo institucional profundo, iluminación radial.
- **Logo:** 200–240px.
- **Personaje:** TutorIA Companion es el protagonista exclusivo (no perfiles de rol aquí).
- **Acceso:** Control visible, errores legibles, contraste AA, sin múltiples avatares como selector si no rigen la autenticación.

## 14. Workspace Experience Specification
El Workspace es una composición editorial.
- **Branding Zone:** Logo, Navegación, Perfil anónimo.
- **Context Bar:** Centro activo, Sala/Grupo.
- **Experience Hero (Desktop):** 40% Conversation and Actions / 60% Companion and Scene. 
- **Mobile:** Contenido vertical, Companion debajo o adaptado sin comprometer acciones primarias.

## 15. Responsive and Accessibility
- **Mínimo:** WCAG AA, foco visible, navegación por teclado.
- Soporte estricto a `prefers-reduced-motion` e imágenes decorativas con `alt=""`.
- Tamaños mínimos táctiles.
- Layout funcional hasta 200% de zoom. No depender únicamente del color.

## 16. Asset Governance and Storage
Rutas obligatorias:
```text
src/assets/characters/tutoria/...
src/assets/characters/personas/...
src/assets/characters/manifest/character-assets.ts
```
Uso de fallback visual institucional discreto (nunca instrucciones técnicas visibles). Preservar jerarquía aunque falte el asset.

## 17. Acceptance Criteria
- **Brand:** Logo con protagonismo, escala correcta, sin distorsión.
- **Hero:** Ancho/jerarquía editorial (no-card). Companion protagonista y CTA claro.
- **Character System:** Consistencia 3D. Cero fotos. Cero placeholders técnicos en UI visible. Fallbacks accesibles funcionales.
- **Privacy:** Cero nombres reales en visualizaciones, uso estricto de `InstitutionalPersona`.
- **Responsive:** Testeado en 1440x900, 1280x800, 1024x768, 768x1024, 390x844.
- **Visual Fidelity:** Comparación estricta Side-by-Side (Mockup ARB vs Implemented) para todas las escenas clave.
- **Architecture:** `TutorIAPresence` no contiene dependencias de dominio ni infraestructura. Copy completamente determinista (`ExperienceCopyKey`).

---

## Annex A — Type Contracts

CharacterMood describes TutorIA's presentation expression. It never represents, stores or implies an inferred emotional state of the user.

```typescript
interface ExperienceContext {
  scene: ExperienceScene;
  lifecycleState: ExperienceLifecycleState;
  timeSegment?: TimeSegment;
  hasPendingWork: boolean;
  isFirstVisit: boolean;
  operationStatus?: OperationStatus;
  primaryAction?: ExperienceAction;
}

interface ExperienceAction {
  id: string;
  label: string;
  target?: string;
  enabled: boolean;
}

interface PresencePresentation {
  assetKey: CharacterAssetKey;
  voiceKey: ExperienceCopyKey;
  mood: CharacterMood;
  pose: CharacterPose;
  motion: MotionLevel;
  lighting: LightingPreset;
  primaryAction?: ExperienceAction;
}
```
*Note: ExperienceContext is immutable input. PresencePresentation is immutable output. The Experience Engine is a pure deterministic resolver without domain mutation, infrastructure dependency, LLM dependency, or direct router dependency.*

## Annex B — Initial Asset Manifest
*(Las llaves representan los archivos finales .webp exportados con fondo transparente).*
- `tutoria_login_greeting_floating`
- `tutoria_workspace_greeting_floating`
- `tutoria_planning_thinking_sitting`
- `tutoria_planning_helping_pointing`
- `tutoria_empty_waiting_observing`
- `tutoria_success_celebrating_floating`
- `persona_maternal_anita_neutral`
- `persona_director_tere_neutral`
- `persona_supervisor_ceci_neutral`

## Annex C — Scene Matrix

### Scene: Workspace Reception
- **Scene ID:** `workspace-reception`
- **Operational Trigger:** Dashboard load (First Visit / Returning / Pending Work).
- **Emotional Objective:** Confianza y compañía.
- **Functional Objective:** Iniciar o reanudar trabajo.
- **Presence State:** `Greeting` o `Encouraging`.
- **Approved Copy Key:** `workspace_greeting_default` o `workspace_resume_work`.
- **Primary Action:** Supplied by Application (Ej. Continuar planeación).
- **Illustration:** `tutoria_workspace_greeting_floating`.
- **Motion Level:** Subtle.
- **Lighting Preset:** Daylight / Soft glow.
- **Fallback Behavior:** Institutional avatar discreto.
- **A11y & Exit:** Alt text presente. Termina al hacer click en el CTA.

### Scene: AI Processing
- **Scene ID:** `ai-processing`
- **Operational Trigger:** LLM operation execution (Loading).
- **Emotional Objective:** Concentración y empatía.
- **Functional Objective:** Manejar la espera de manera fluida.
- **Presence State:** `Thinking`.
- **Approved Copy Key:** `processing_generic` o `processing_context`.
- **Primary Action:** none supplied. Interaction State: temporarily unavailable while the application operation is processing.
- **Illustration:** `tutoria_planning_thinking_sitting`.
- **Motion Level:** Subtle (pulsing).
- **Lighting Preset:** Focused radial glow.
- **Fallback Behavior:** Accessible institutional progress state with approved explanatory text. A conventional spinner may be used only as the lowest technical fallback and must not become the primary experience.

### Scene: Success Celebration
- **Scene ID:** `success-celebration`
- **Operational Trigger:** Completar flujo PM-01.
- **Emotional Objective:** Orgullo institucional compartido.
- **Functional Objective:** Cerrar el ciclo y ofrecer siguiente paso.
- **Presence State:** `Celebrating`.
- **Approved Copy Key:** `success_planning_approved`.
- **Primary Action:** Volver al Workspace.
- **Illustration:** `tutoria_success_celebrating_floating`.
- **Motion Level:** Expressive.
- **Lighting Preset:** Bright / Warm.
- **Fallback Behavior:** Icono Check animado con texto institucional.
