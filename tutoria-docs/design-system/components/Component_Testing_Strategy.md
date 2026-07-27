# Component Testing Strategy

Este documento esboza los niveles de pruebas que deberán ser implementados por los desarrolladores cuando comience el Sprint de Codificación. **(No se instalan herramientas ni se crean tests en este Sprint).**

## 1. Niveles de Testing Definidos

### Unit Testing
Pruebas aisladas para lógica pura de componentes (si existe alguna) o props.
- Validar el renderizado correcto según las props (variantes, tamaños).

### Interaction Testing
Simulación de eventos del DOM.
- Verificar eventos `onClick`, `onChange`, `onFocus`.
- Validar que un botón `disabled` no dispara eventos.

### Keyboard Testing
Simulación de navegación tabulada.
- Validar que el componente es alcanzable con TAB.
- Validar que se acciona con Espacio y Enter.

### Accessibility Testing (a11y)
Auditoría automatizada de DOM estructural.
- Validar ausencia de violaciones axe-core (ARIA roles, contrastes inyectados).
- Verificar enlace `htmlFor` y `aria-describedby` en formularios.

### Visual Regression Testing
Pruebas de captura de pantalla comparativa.
- Snapshot testing condicionado: Únicamente aplicable a componentes visualmente pesados o primitivos base donde los cambios de CSS puedan corromper la cascada. No abusar de snapshots inútiles.

### Responsive Testing
Validación de estructura HTML bajo distintos Viewports simulados.

### Reduced Motion Testing
Verificar que si se pasa el flag (o media query) de prefers-reduced-motion, las animaciones devuelven un 0 o un fade directo.

### High Contrast Testing
Verificar que la interfaz sobrevive sin colores de fondo usando solo los bordes.

### Screen Reader Testing
Verificación de lectura narrativa de componentes modales o toast.

### Performance & Bundle Impact
Medir el tamaño del bundle generado por el componente. Prohibir dependencias pesadas innecesarias (ej. importar Lodash completo para un Dropdown).
