# Playbook: Policy Violation Handling

**Status:** ACTIVE

## Objetivo
Establecer cómo las aplicaciones cliente (Web, Móvil, APIs) deben reaccionar ante los códigos de error producidos por el `Policy Intelligence Engine`.

## El Flujo de Manejo

1. **El Motor Evalúa:** 
   El `PolicyEngine` emite un `PolicyReport` que contiene una o varias `PolicyViolation`.
2. **El Application Service Reacciona:** 
   Si existe alguna violación con severidad `BLOCKING`, el Application Service debe revertir la transacción o rechazar el Command.
3. **La API expone DTOs:** 
   Los errores se devuelven en el cuerpo de la respuesta con `code` (ej. `PLN-001`), `severity` y `messageKey`.
4. **La UI Traduce y Formatea:**
   El frontend utiliza el `messageKey` (ej. `planning.date.overlap`) para recuperar el texto en el idioma del usuario, e inyecta la información rica que viaja en el objeto `metadata` para crear un mensaje altamente formativo: *"Tu planeación choca con otra planeación entre el [metadata.validFrom] y [metadata.validUntil]"*.

## Prohibiciones
- Nunca hardcodear strings de error en el motor de políticas.
- Nunca procesar lógicas de renderizado (React/UI) dentro del dominio.
- La UI no debe ignorar nunca una severidad `BLOCKING`.\n