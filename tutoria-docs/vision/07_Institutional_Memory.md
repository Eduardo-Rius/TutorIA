# TutorIA — Institutional Memory

## Propósito
Garantizar que el sistema retenga de forma permanente, estructurada y segura todo el historial cognitivo, pedagógico y organizacional. La plataforma previene la pérdida de conocimiento cuando el personal clave o los niños cambian de ciclo.

## Tipos de Memoria

### Operational Memory
- **Definición:** Eventos, incidencias, aprobaciones, asignaciones y decisiones operativas del día a día.
- **Propietario:** El Centro (Guardería) y la Institución.
- **Sensibilidad:** Moderada a Alta.
- **Usuarios autorizados:** Directores, Administradores, Supervisores.
- **Retención:** Según normativa legal (usualmente 5 años post-egreso).
- **Reglas de aislamiento:** Aislado por Centro.

### Pedagogical Memory
- **Definición:** Observaciones, planeaciones, evaluaciones, ajustes curriculares y prácticas pedagógicas efectivas.
- **Propietario:** El Grupo y el Centro.
- **Sensibilidad:** Alta (cuando involucra observaciones directas).
- **Usuarios autorizados:** Educadoras asignadas, Pedagogas, Directores.
- **Reglas de aislamiento:** Aislado al grupo; transferible si el grupo asciende íntegro.
- **Uso por IA:** Altamente utilizado como contexto para generar nuevas planeaciones iterativas.

### Institutional Memory
- **Definición:** Políticas, decisiones fundacionales, excepciones autorizadas, acuerdos de dirección y aprendizaje organizacional.
- **Propietario:** La Institución.
- **Sensibilidad:** General a Restringida.
- **Usuarios autorizados:** Toda la estructura (según su nivel de jerarquía).
- **Reglas de aislamiento:** Visible a nivel Tenant.
- **Uso por IA:** Base fundamental del Knowledge Graph y RAG.

### Group Memory
- **Definición:** Historia contextual y pedagógica persistente de un salón (Ej. "Lactantes A 2026").
- **Propietario:** El Centro.
- **Sensibilidad:** Moderada.
- **Posibilidad de eliminación:** Inmutable durante el ciclo escolar.

### Child Development Timeline
- **Definición:** Línea de tiempo individual, médica y conductual del menor.
- **Propietario:** La Familia y la Institución (custodio temporal).
- **Sensibilidad:** Crítica (Máxima protección PII).
- **Usuarios autorizados:** Médicos, Directora, Educadora titular (con restricciones de need-to-know).
- **Portabilidad:** Posibilidad de transferir a otro centro de la misma institución si el niño es reasignado.
- **Uso por IA:** Solo permitido mediante anonimización profunda on-the-fly; modelos sin retención.

### Knowledge Memory
- **Definición:** Versiones, relaciones ontológicas, citas, conflictos históricos y minería de uso del corpus institucional normativo.
- **Propietario:** Institución (Nivel Central).
- **Sensibilidad:** Baja/Moderada.
- **Retención:** Permanente (marcado como "derogado" pero nunca borrado).

### AI Memory
- **Definición:** Contexto autorizado de conversaciones pasadas, recomendaciones emitidas, retroalimentación del usuario y evaluaciones de calidad.
- **Propietario:** La plataforma TutorIA (Tenant aislado).
- **Sensibilidad:** Moderada a Alta (puede contener trazas de PII accidental, sujeto a sanitización).
- **Uso por IA:** Solo para continuidad de diálogo en sesiones activas (Short-term memory) y resumen de perfil de usuario (Long-term profile). *(Establecer claramente: AI Memory nunca equivale a memoria ilimitada onnisciente ni autoriza mezclar información aprendida entre tenants bajo ninguna circunstancia).*
