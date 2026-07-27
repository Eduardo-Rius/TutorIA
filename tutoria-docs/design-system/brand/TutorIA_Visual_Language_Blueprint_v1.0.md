# TutorIA Visual Language Blueprint 1.0
*(ESTADO: CANDIDATE)*

Este documento ejecutivo consolida el descubrimiento y propuesta oficial del lenguaje visual de TutorIA, diseñado para alinear al Product Owner, ARB, ingenieros y diseñadores.

## 1. Propósito y Emoción
TutorIA combina rigor institucional con calidez humana. Transmite alivio a la educadora y certeza a la supervisora, evitando la fría burocracia y la infantilización excesiva.

## 2. Paleta Candidata (Tricromática Base)
- **Primary** — Navy `#003c58`: Gravedad, jerarquía, textos, instituciones, seguridad y legibilidad.
- **Secondary** — Teal `#0ca994`: Modernidad pedagógica, asistencia, acciones clave, robot de IA, innovación humana.
- **Accent** — Orange `#ff9e02`: Calidez, niñez, alertas amigables, atención, optimismo, energía pedagógica.

## 3. Tipografía (Propuesta)
- **Inter (Google Font):** Altamente legible, fantástica para UI, agnóstica de plataforma.

## 4. Ilustración e Iconografía
- **Robot (TutorIA):** Asistente IA, servicial y moderado.
- **Iconografía:** Outline (línea) limpia de 2px redondeada. Los íconos multicolores promocionales se reservan para marketing, no para componentes UI.

## 5. Espacio, Elevación e Interacción
- **Espacio:** Base-4 (`4px`). Densidad moderada.
- **Elevación:** Prioridad a contenedores planos con borde sutil. Sombras restringidas a Floating y Modales.
- **Interacción:** Rápida, limpia. Accesibilidad total (Focus ring visible). Respeto al prefers-reduced-motion.

## 6. Logo Usage System
- Sólo 3 activos han sido calificados como consumibles directos (App Eligible): Master Transparente, Imagotipo Transparente y Logotipo Transparente.
- El isotipo original pesa 2.25MB y requiere vectorización o compresión profunda antes de incrustarlo en código web.

## Riesgos y Decisiones Pendientes
- **Color Inverso:** Se requiere definir un logotipo oficial 100% blanco puro para colocar sobre fondos `Navy` o `Teal` oscuros. Las variantes color no contrastan.
- **Contraste del Teal:** El uso de texto blanco delgado sobre botones Teal puede fallar los tests WCAG AA. Se requerirá un tono Teal oscurecido (`#0b8876`) para accesibilidad funcional estricta.

## Roadmap de Implementación
1. Revisión y aprobación del ARB y Product Owner.
2. Traslado de paleta a `colors.ts` definitivo.
3. Creación de derivadas (WebP, SVG) para el Isotipo.
4. Aplicación progresiva de Tailwind tokens a los componentes UI base (Fuera del Core Domain).
