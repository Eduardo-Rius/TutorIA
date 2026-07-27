# Playbook: Planning Approval Workflow

**Type:** Decision Record / Playbook
**Domain:** Pedagogical Planning Engine
**Date:** 2026-07-27

## Contexto Operativo
La aprobación de una planeación no es un acto burocrático, es un contrato de responsabilidad. El Tutor declara haber diseñado actividades seguras y alineadas al currículo; la Directora declara haberlas validado bajo la norma vigente de Protección Civil y SEP.

## Actores Involucrados
- **Autor (Tutor):** Diseña y somete la planeación.
- **Aprobador (Director/Coordinador):** Revisa, comenta y aprueba o rechaza.

## Flujo Esperado (Happy Path)
1. El Autor marca la planeación como `READY_FOR_REVIEW`.
2. El sistema la envía automáticamente al `WorkQueue` de los Aprobadores autorizados del mismo Centro. (El estado pasa a `UNDER_REVIEW`).
3. La Directora abre la planeación desde su `WorkQueue`.
4. Ejecuta (o visualiza) el resultado del `PedagogicalReviewProvider` (ej. Validación de Consistencia e Inclusión).
5. Si todo está correcto, firma digitalmente.
6. El estado pasa a `APPROVED`. 
7. Se genera un `PlanningSnapshot` congelando el contexto de ese momento.
8. El evento `PlanApproved` es emitido (puede limpiar el WorkItem del Director y notificar al Tutor).

## Casos Excepcionales
- **Aprobador Ausente:** Si el Director principal está de baja, el sistema permite que un rol superior (ej. Supervisor Regional) que tenga alcance sobre ese Centro asuma el rol de aprobador, generando una traza de auditoría especial en la firma.
- **Enmiendas Post-Aprobación (Amends):** Si una contingencia obliga a alterar un plan ya `APPROVED`, se debe utilizar un comando `AmendPlan`. Esto no sobreescribe la versión actual. Crea una `PlanningVersion` `v2` en estado `DRAFT`, forzando a que pase nuevamente por todo el ciclo de firmas, preservando la `v1` en el historial auditable.
