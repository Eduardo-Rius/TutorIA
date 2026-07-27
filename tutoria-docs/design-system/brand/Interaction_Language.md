# Interaction and Motion (CANDIDATE)

El diseño de interacción en TutorIA debe transmitir eficiencia e inmediatez. La animación es una pista funcional, no una decoración.

## Estados de Componente
- **Default:** Estado base.
- **Hover:** Oscurecimiento leve (botones) o elevación leve (cards) para indicar interactividad.
- **Focus:** Outline visible (`ring-teal-500`) INDISPENSABLE para navegación por teclado (Accesibilidad).
- **Pressed (Active):** Escala leve hacia abajo (`scale-95`) u oscurecimiento adicional.
- **Selected:** Borde grueso o fondo `surfaceTinted` (Teal claro).
- **Disabled:** Opacidad reducida (50%), cursor `not-allowed`, desaturación (gris).
- **Loading:** Sustitución de ícono por spinner, texto mantenido pero opaco.
- **Empty:** Ilustración de estado + Botón claro de acción primaria (ej. Crear planeación).

## Reglas de Movimiento (Motion)
La claridad es prioridad. Las animaciones deben ser sutiles y rápidas.

- **Microinteracciones (Botones, Hover):** Extremadamente rápidas (100ms - 150ms). Curva `ease-out`.
- **Transiciones Estándar (Pestañas, Acordeones):** Moderadas (200ms - 250ms).
- **Aparición de Panel (Sidebars, Dropdowns):** Rápidas (250ms - 300ms). Movimiento de deslizamiento leve.
- **Feedback del Asistente (Robot):** Suaves. Aparición progresiva de texto simulando mecanografía o fading in (300ms).

## Accesibilidad (Prefers-Reduced-Motion)
El CSS deberá respetar invariablemente `@media (prefers-reduced-motion: reduce)`. En este caso, todas las transiciones complejas o desplazamientos se cambiarán por un simple fundido cruzado (fade) o desaparición instantánea (0ms).
