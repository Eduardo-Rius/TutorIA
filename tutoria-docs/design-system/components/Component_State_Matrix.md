# Component State Matrix

Esta matriz define qué estados interactivos o lógicos son obligatorios para las familias de componentes.

## Estados Definidos
- `default`: Estado base.
- `hover`: Cursor posicionado sobre el elemento.
- `focus-visible`: Foco mediante navegación por teclado (debe ser muy evidente).
- `pressed`: Al hacer clic o presionar espacio/enter (Active).
- `selected`: Elemento de opción escogido (ej. Tab, Radio).
- `disabled`: Estado inactivo no interactuable.
- `loading`: Procesando acción asíncrona.
- `success`: Validación positiva.
- `warning`: Advertencia de negocio.
- `error`: Validación negativa.
- `read-only`: Campo visible pero inmutable por usuario.
- `empty`: Estado de contenedor sin datos.

## Matriz por Familia de Componente

| Familia | hover | focus-visible | pressed | selected | disabled | loading | error/warn/succ | empty | read-only |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Botones/Links** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Inputs/Forms** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Selects/Radios**| ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Cards (Clickables)** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **DataDisplay/Tables**| ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **AI Assistants** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
