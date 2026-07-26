# Evaluation

## Propósito
Registrar el resultado, progreso o retroceso observado en un Grupo o Infante respecto a una Planeación o ciclo específico.

## Responsabilidades
Cerrar el ciclo pedagógico (Plan -> Actuación -> Evaluación).

## No es responsable de
Definir nuevas actividades (eso es Recommendation/Planning).

## Owner
Docente / Psicólogo / Evaluador.

## Identificador
`evaluationId` (UUID)

## Atributos principales
- tenantId
- centerId
- groupId
- childId (opcional)
- planningId (opcional)
- authorId
- score / level (nivel de logro)
- qualitativeNotes
- date

## Relaciones
Cierra el ciclo de: Planning.
Pertenece a: Group / Child.

## Reglas de negocio
- Solo personal autorizado puede emitir evaluaciones formales.
- Una evaluación no se puede alterar después de un periodo de gracia (ej. 48 hrs).

## Restricciones
Requiere apuntar a un registro válido del menor o del grupo.

## Invariantes
Debe tener un Author.

## Eventos publicados
EvaluationRegistered.

## Eventos consumidos
Ninguno.

## Consideraciones MultiTenant
Datos aislados. Escalas de evaluación son parametrizables por Tenant.

## Consideraciones de Seguridad
Datos altamente sensibles si están atados al progreso de un menor específico.

## Consideraciones de Auditoría
Cambios post-evaluación son incidentes severos.

## Futuras extensiones
Predicción predictiva de rezago basada en IA.
