# FormField Specification

## 1. Identidad
- **Component ID:** C-FOR-001
- **Component Name:** FormField
- **Category:** Forms

## 2. Propósito
Proveer el layout y la accesibilidad base para cualquier control de formulario (Input, Textarea, Select, Checkbox, etc). Agrupa la etiqueta, la descripción, el control y los mensajes de error.

## 3. Cuándo utilizar
Siempre que se deba presentar un control de entrada de datos al usuario en un formulario formal.

## 4. Cuándo no utilizar
No utilizar para controles aislados que ya tengan su propio contexto accesible explícito fuera de un formulario estándar.

## 5. Anatomía
El patrón obligatorio es:
- `FormField` (Wrapper)
  ├── `Label`
  ├── `Control` (El input/textarea/select real)
  ├── `HelpText` (Opcional, descripción)
  └── `FieldMessage` (Para errores o advertencias)

## 6. Variantes
N/A (La variante depende del Control insertado).

## 7. Tamaños
Depende del Control interno (`sm`, `md`, `lg`).

## 8. Estados
El FormField gestiona y provee el contexto a sus hijos para:
- `required`
- `optional`
- `disabled`
- `read-only`
- `error`
- `warning`
- `success`
- `loading`

## 9. Interacción
Clicar en el Label debe poner el foco en el Control asociado de forma automática.

## 10. Teclado
Soporte estándar de HTML forms.

## 11. Accesibilidad
Es vital atar la relación entre label y control.
Si hay error o descripción, el control interno debe recibir `aria-describedby` apuntando a los IDs del `FieldMessage` o `HelpText`.
Si está en estado de error, el control debe tener `aria-invalid="true"`.

## 12. Responsive
Se apila verticalmente en móviles por defecto.

## 13. Content guidelines
- Labels concisos.
- Los mensajes de error deben explicar cómo solucionar el problema, no solo reportar la falla.

## 14. Token dependencies
- `Spacing`: Para la separación entre Label, Control y Message.
- `Colors`: Para los estados de error/warning.

## 15. Composition rules
Composición estricta: Requiere `Label`, acepta un `Control`, y emite un `FieldMessage`.

## 16. Domain boundaries
**Regla explícita:** No colocar lógica de validación de dominio en los componentes visuales. El `FormField` solo recibe una prop de error `error="Mensaje"`, no sabe cómo validar un email o un CURP.

## 17. Testing contract
- Verificar que el `aria-describedby` del input coincida con el ID del `FieldMessage` renderizado.
- Verificar el enlace de `htmlFor` del label con el id del control.

## 18. Acceptance criteria
- Accesibilidad estructural ARIA completada y validada por Lighthouse/Axe.
- No contiene lógica de negocio.

## 19. Open issues
Ninguno.

## 20. Decision history
- CDS-001
- CDS-002
- CDS-005
