# ADR-0004: TutorIA como Knowledge Operating System

## Contexto
Las plataformas educativas tradicionales se enfocan en digitalizar el papel (formularios, PDFs). Esta visión condena al software a volverse obsoleto cada vez que cambia la normativa. Si se construye TutorIA como una "aplicación generadora de planeaciones", estaremos acoplando el código fuente a manuales operativos específicos que expiran rápidamente.

## Decisión
Se diseña TutorIA explícitamente como una plataforma de conocimiento (Knowledge Operating System - KOS) y no como un sistema tradicional de captura.

## Alternativas consideradas
- *Sistema CRUD Tradicional:* Crear una base de datos relacional para capturar formularios fijos. Rechazado, inescalable para la IA.
- *App monolítica basada en Prompts Hardcodeados:* Rechazado, costoso de mantener y propenso a inestabilidad normativa.

## Ventajas
- La plataforma se vuelve atemporal. Si mañana la SEP cambia todo el modelo, solo se reemplazan los documentos en el Knowledge Registry y el sistema se adapta instantáneamente.
- Convierte a la plataforma en un activo de altísimo valor estratégico (Gobernanza Institucional).

## Riesgos
- Curva de aprendizaje técnica profunda para el equipo de desarrollo (RAG, Vector Databases, Knowledge Graphs).
- Mayor costo inicial de infraestructura y diseño.

## Consecuencias
- Toda funcionalidad futura asume que existe un "oráculo" documental normativo del cual extraer permisos, lógicas y reglas operativas.
