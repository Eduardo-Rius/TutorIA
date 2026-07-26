# Observation

## Propósito
Registrar un hito, comportamiento o evaluación diaria de un grupo o de un infante específico. Es la semilla de la cual nacen las planeaciones pedagógicas.

## Responsabilidades
Capturar el estado "actual" del infante/grupo.

## No es responsable de
Predecir o recomendar acciones futuras (eso lo hace Recommendation/Planning).

## Owner
Docente del Grupo.

## Identificador
`observationId` (UUID)

## Atributos principales
- tenantId
- centerId
- groupId
- childId (opcional, null si es observación grupal)
- authorId (User)
- content (texto crudo)
- date
- category (comportamental, académica, salud)

## Relaciones
Pertenece a: Group o Child.
Alimenta a: Planning.

## Reglas de negocio
- Una vez guardada y firmada, no se puede borrar ni alterar el contenido (solo agregar fe de erratas).
- Obligatoria para detonar sugerencias de AI de alta calidad.

## Restricciones
Si pertenece a un Child, solo el personal con acceso a dicho Child puede leerla.

## Invariantes
Debe apuntar a un Group existente.

## Eventos publicados
ObservationRegistered.

## Eventos consumidos
Ninguno.

## Consideraciones MultiTenant
Totalmente asilado mediante `tenantId` y `centerId`.

## Consideraciones de Seguridad
Nivel Crítico de PII si especifica un `childId`.

## Consideraciones de Auditoría
Sujeto a inmutabilidad clínica/educativa.

## Futuras extensiones
Análisis de sentimiento (AI) automático sobre las observaciones.
