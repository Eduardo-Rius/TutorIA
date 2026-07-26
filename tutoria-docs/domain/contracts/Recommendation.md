# Recommendation

## Propósito
Capturar la inferencia generada por el Motor de IA basada en el contexto y conocimiento normativo.

## Responsabilidades
Asistir al humano, sugiriendo planeaciones, atenciones o marcando riesgos.

## No es responsable de
Tomar la decisión final o aprobar flujos (Human Oversight imperativo).

## Owner
AI Engine (creador) / Docente (consumidor y validador).

## Identificador
`recommendationId` (UUID)

## Atributos principales
- tenantId
- type (planning_suggestion, risk_alert, format_correction)
- content (JSON estructurado)
- sourceReferences (Citations)
- targetId (ej. planningId en borrador)
- status (pending_review, accepted, rejected, modified)

## Relaciones
Se apoya en: KnowledgeSource, Observation.
Aplica a: Planning, Evaluation.

## Reglas de negocio
- Toda sugerencia sintética debe estar amarrada a sus KnowledgeSources (RAG).
- El usuario humano debe aceptar explícitamente o rechazar la recomendación.

## Restricciones
La IA no puede mutar datos directamente sin la aceptación humana.

## Invariantes
Debe conservar el `targetId` para contexto.

## Eventos publicados
RecommendationGenerated, RecommendationAccepted, RecommendationRejected.

## Eventos consumidos
ObservationRegistered (Trigger para generar recomendación).

## Consideraciones MultiTenant
Los prompts de la IA aíslan su contexto por Tenant.

## Consideraciones de Seguridad
La inferencia de IA no debe filtrar datos (Data masking antes de enviar a LLMs).

## Consideraciones de Auditoría
Obligatorio guardar qué se sugirió y qué hizo el humano con esa sugerencia.

## Futuras extensiones
Modelos locales finetuned.
