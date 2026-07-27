# Component Responsive Contract

Reglas estructurales para el comportamiento adaptativo de los componentes en diferentes resoluciones y dispositivos. No se fijan breakpoints matemáticos definitivos todavía (pendientes de diseño final), pero se establece el comportamiento esperado.

## 1. Dispositivos Objetivo (Targets)
- Móvil Pequeño (Small Mobile)
- Móvil Estándar (Mobile)
- Tablet Vertical (Portrait)
- Tablet Horizontal (Landscape)
- Laptop Institucional (Desktop estándar, baja resolución)
- Pantalla Amplia (Ultrawide / Grandes monitores)

## 2. Reglas Candidatas de Comportamiento

### Formularios
- **Móvil/Tablet Vertical:** Todos los campos se apilan a una sola columna al 100% de ancho.
- **Desktop:** Pueden distribuirse en grids de 2 o 3 columnas según la agrupación lógica.

### Botones Críticos
- Los botones de acción principal (Guardar, Aprobar, Siguiente) deben permanecer visibles o flotantes (sticky) en móvil para evitar scroll excesivo.
- En móvil, los botones pueden tomar el 100% del ancho (block).

### Tablas (Data Display)
- Las tablas HTML complejas no caben en móvil.
- Alternativa 1: Transformar cada fila en una `Card`.
- Alternativa 2: Habilitar un scroll horizontal nativo y controlado, con sombra indicativa.

### Modales y Diálogos
- **Desktop:** Se renderizan como modales centrales clásicos.
- **Móvil:** Los diálogos pesados deben convertirse en Bottom Drawers (Paneles anclados abajo deslizables) para mejorar la ergonomía táctil a una mano.

### Navegación Lateral
- **Desktop:** Sidebar siempre visible (o colapsable a iconos).
- **Móvil:** La navegación lateral se esconde detrás de un Menú Hamburguesa, o se convierte en un Topbar / Bottombar.

### Targets Táctiles (Hit Targets)
- Los componentes interactivos (IconButton, Checkbox, Radio) NUNCA reducen su tamaño interactivo en móvil. Mínimo 44x44px.

### Contenido Normativo
- Textos densos institucionales deben conservar una longitud de línea óptima (max 65-75 caracteres por línea en desktop) y márgenes legibles en móvil. No reducir la tipografía por debajo de 16px para cuerpo de texto.
