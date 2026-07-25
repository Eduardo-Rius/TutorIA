# TutorIA — Strategic Principles

## Propósito

Este documento establece la arquitectura estratégica, funcional, pedagógica, documental y de conocimiento que servirá como contrato vinculante para el desarrollo de TutorIA Platform. TutorIA se diseña como una plataforma institucional de conocimiento, continuidad operativa, asistencia pedagógica, cumplimiento normativo y memoria organizacional para centros de educación y cuidado infantil.

## 1. Principios Estratégicos

### TutorIA es una Knowledge Platform
TutorIA NO es una aplicación. TutorIA es una plataforma institucional cuyo principal activo es el conocimiento. Las funcionalidades, procesos, agentes de IA y módulos operativos dependen del conocimiento institucional administrado por la plataforma. Toda decisión funcional deberá depender de la arquitectura del conocimiento.

1. **Continuidad operativa ante la rotación de personal**: La plataforma garantiza que la operación pedagógica e institucional no se detenga ante cambios en la plantilla docente o administrativa.
2. **Conocimiento perteneciente a la institución y al grupo, no a una persona**: Toda la información generada (planeaciones, evaluaciones, observaciones) es patrimonio del centro y acompaña al grupo de niños, no a las cuentas de los usuarios creadores.
3. **Identidad individual con asignación institucional**: Todo acceso se realiza mediante identidades únicas, intransferibles, que reciben permisos temporales y basados en su asignación actual a centros y grupos.
4. **Memoria pedagógica permanente del grupo**: El historial de desarrollo, observaciones e incidentes acompaña a los infantes de forma continua y centralizada.
5. **Inteligencia artificial como asistente, no como autoridad normativa**: La IA facilita el trabajo, pero las decisiones y la validación final siempre recaen en los profesionales a cargo.
6. **Seguridad Zero Trust**: Todo acceso, transacción o consulta debe verificarse, asumiendo por defecto que no se cuenta con los privilegios.
7. **Trazabilidad integral**: Se mantendrá un registro detallado de quién, cuándo y bajo qué contexto se crea, modifica o elimina información institucional.
8. **Planeación flexible y sustentada en observación**: La propuesta de experiencias siempre partirá de necesidades e intereses reales identificados a través de observación sistemática, nunca de suposiciones preconcebidas.
9. **Diferenciación entre Educación Inicial y Educación Preescolar**: Se aplicarán motores pedagógicos distintos para respetar las características, finalidades y normativas de cada nivel educativo.
10. **Escalabilidad multiinstitución, multiguardería y multigrupo**: La arquitectura soportará múltiples esquemas de prestación y estructuras organizacionales complejas de manera concurrente.
11. **Respuestas de IA con fuente, clave documental y referencia verificable**: Toda recomendación o asistencia generada citará la base normativa y documental de donde proviene la información.
12. **Abstención de la IA cuando no exista fundamento suficiente**: Si el asistente no encuentra base documental firme o se detecta un conflicto insoluble, deberá abstenerse de responder o proponer, requiriendo intervención humana.

## Decisiones arquitectónicas irrevocables de la versión 1.0

- No habrá cuentas compartidas; cada usuario debe contar con sus credenciales propias.
- La memoria y el historial pedagógico pertenecen al grupo; no se pierden al reasignar o dar de baja a un educador.
- Cada persona tendrá identidad individual.
- Los permisos dependerán estrictamente de la institución, la guardería, el grupo asignado, el rol desempeñado y la vigencia de la asignación.
- Ninguna clave privada ni secreto se expondrá en el frontend (Firebase, OpenAI, n8n, etc.).
- La Inteligencia Artificial no sustituirá bajo ninguna circunstancia la validación final y la responsabilidad del personal autorizado.
- Los documentos clasificados como históricos o sustituidos no tendrán la misma autoridad que los vigentes durante la fase de consulta (RAG).
