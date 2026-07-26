# TutorIA Engineering Risk Register

Este documento actúa como el registro vivo de riesgos detectados a lo largo del desarrollo de TutorIA. Permite tener trazabilidad sobre amenazas latentes, su impacto y las estrategias de mitigación establecidas.

---

### Arquitectónicos
**Riesgo:** Acoplamiento temprano a un proveedor de LLM específico (Ej. OpenAI).
- **Probabilidad:** Alta.
- **Impacto:** Crítico (Vendor lock-in).
- **Mitigación:** Abstraer las llamadas a IA a través del modelo de Event Bus o de una capa intermedia de servicios cognitivos.
- **Owner:** Architecture Team.

**Riesgo:** Fuga de datos entre Tenants debido a un modelo defectuoso en Firestore.
- **Probabilidad:** Media.
- **Impacto:** Crítico (Pérdida de cumplimiento legal).
- **Mitigación:** ADR-0006 MultiTenant-First. Validaciones duras en Firestore Security Rules.
- **Owner:** Security & Architecture Team.

### Funcionales
**Riesgo:** Inconsistencias temporales si un usuario cambia de rol a medio ciclo.
- **Probabilidad:** Media.
- **Impacto:** Alto (Desconexión de histórico pedagógico).
- **Mitigación:** Diseñar asignaciones (Assignments) inmutables y enlazadas a un marco temporal (Ciclo).
- **Owner:** Product Team.

### Seguridad
**Riesgo:** Exposición involuntaria de claves de acceso o service accounts en el cliente.
- **Probabilidad:** Baja (Prevenida por Engineering Constitution).
- **Impacto:** Crítico.
- **Mitigación:** Revisiones de código estrictas, pre-commit hooks, y limitación de variables de entorno (VITE_ solo para claves públicas).
- **Owner:** Engineering Team.

### Conocimiento
**Riesgo:** Ingestión de documentos derogados o contradictorios en el Knowledge Registry.
- **Probabilidad:** Media.
- **Impacto:** Crítico (Alucinaciones peligrosas).
- **Mitigación:** Revisión humana forzosa en la fase de ingestión y cálculo periódico del Knowledge Quality Score (KQS).
- **Owner:** Knowledge Governance.

### Producto
**Riesgo:** Sobrecarga de la UI intentando resolver flujos no esenciales en la etapa inicial.
- **Probabilidad:** Alta.
- **Impacto:** Medio (Retrasos en hitos clave).
- **Mitigación:** Mantenimiento riguroso de los Sprints como unidades de trabajo atómicas y protección del MVP (Foundation Rule).
- **Owner:** Product Owner.

### Infraestructura
**Riesgo:** Desplome de la base de datos por lecturas ineficientes en modelos anidados.
- **Probabilidad:** Media.
- **Impacto:** Alto.
- **Mitigación:** Diseño de base de datos denormalizada (NoSQL-friendly) basándose en las lecciones del Domain Model.
- **Owner:** Architecture Team.

### IA
**Riesgo:** Alucinaciones de autoridad o consejos perjudiciales.
- **Probabilidad:** Alta.
- **Impacto:** Crítico.
- **Mitigación:** Implementar el Decision Engine, AI Contract estricto y obligar a mantener "Human-in-the-Loop".
- **Owner:** AI Engineering.

### Operación
**Riesgo:** Rechazo por parte de las educadoras por exceso de fricción en la UI.
- **Probabilidad:** Media.
- **Impacto:** Crítico.
- **Mitigación:** Diseño centrado en el usuario, interfaces claras y simplificación máxima en procesos cognitivamente demandantes (como planeación).
- **Owner:** UX/UI Team.

### Escalabilidad
**Riesgo:** Limitaciones de observabilidad que impidan entender problemas complejos en producción.
- **Probabilidad:** Baja.
- **Impacto:** Alto.
- **Mitigación:** Arquitectura orientada a eventos, registros inmutables de interacciones y observabilidad desde el diseño (ADR-0008).
- **Owner:** DevOps / Architecture.
