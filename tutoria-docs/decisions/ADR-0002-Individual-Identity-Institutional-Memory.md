# ADR-0002: Usar identidades individuales con asignaciones institucionales y memoria persistente del grupo

## Contexto
En sistemas previos en guarderías, es común la mala práctica de utilizar cuentas compartidas (ej. `sala_lactantes_a@institucion.com`) para evadir la gestión de usuarios. Esto provoca la imposibilidad de auditar quién realizó una acción y la pérdida de continuidad cuando los docentes rotan. Por otro lado, si la información se amarra a la cuenta personal del docente, cuando el docente se va, se pierde la historia del grupo.

## Decisión
Se usarán identidades individuales (cada persona inicia sesión con su propio correo) unidas a un sistema de *Asignaciones Institucionales*. La memoria de la planificación, observaciones e historial será propiedad persistente del *Grupo* (ej. "Lactantes A, Guardería 001"), no del docente ni de una cuenta genérica compartida.

## Alternativas consideradas
- *Cuentas genéricas compartidas:* Rechazadas terminantemente. Destruyen la trazabilidad, violan la seguridad Zero Trust y anulan el no repudio.
- *Memoria atada al docente:* Rechazada. Los infantes pierden su historial si la educadora cambia de sala o centro.

## Ventajas
- Cumplimiento total de auditoría y trazabilidad.
- Continuidad operativa ante la rotación (un nuevo docente asignado hereda de inmediato todo el contexto del grupo).
- Seguridad robusta (se revoca el acceso de una persona al finalizar su contrato sin afectar la sala).

## Riesgos
- Mayor complejidad en la arquitectura de la base de datos (relaciones User -> Assignment -> Group).
- Exige un módulo administrativo eficiente para que las directoras hagan altas, bajas y reasignaciones ágilmente.

## Consecuencias
- Quedan estrictamente prohibidas las cuentas compartidas en el sistema de Autenticación.
- El modelo de datos de Firestore deberá soportar asignaciones con vigencia de tiempo (Start Date / End Date).

## Criterios para reconsiderar
- Esta es una decisión arquitectónica irrevocable para la versión 1.0. No sujeta a reconsideración.
