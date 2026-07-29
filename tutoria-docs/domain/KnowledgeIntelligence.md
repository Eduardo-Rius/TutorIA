# Tactical Domain Design: Institutional Knowledge Intelligence

**Status:** ACTIVE
**Wave:** WAVE 9

Este documento rige la conceptualización técnica y arquitectónica de **Knowledge Intelligence** dentro del ecosistema TutorIA.

---

## 1. ¿Qué constituye conocimiento institucional para TutorIA?

TutorIA no es un CMS, no es SharePoint, ni es un repositorio documental. La pregunta central de este dominio no es "¿Dónde está almacenado?" sino **"¿Qué conocimiento necesita TutorIA para tomar mejores decisiones institucionales y pedagógicas?"**

El conocimiento es el sustrato absoluto del proyecto. Antes de que exista una regla (Policy), un escenario (Context) o una inferencia (Generation), debe existir el patrimonio institucional. Este dominio modela la existencia, autoridad y confianza de ese patrimonio, ignorando permanentemente tecnologías de recuperación, indexación o inteligencia artificial.

## 2. Constitutional Vocabulary Check

Ningún concepto en este dominio hereda terminología de infraestructura, bases de datos o motores de búsqueda (ej. embeddings, chunks, RAG). Los conceptos provienen estrictamente del vocabulario institucional.

---

## 3. Tactical Design (Entities y Value Objects)

### A. InstitutionalKnowledge (Aggregate Root)
El núcleo del dominio. Representa el patrimonio cognitivo y normativo del centro o la institución. Es la entidad mayor que rige y agrupa los activos del conocimiento.
```typescript
interface InstitutionalKnowledge {
  readonly id: string;
  readonly origin: KnowledgeOrigin;
  readonly authority: KnowledgeAuthority;
  readonly validity: KnowledgeValidity;
  readonly confidence: KnowledgeConfidence;
  readonly assets: KnowledgeAsset[]; // Las representaciones tangibles del conocimiento
}
```

### B. KnowledgeAsset (Entity)
La expresión pura de la verdad ligada al `InstitutionalKnowledge`. No es un documento ni un archivo (no CMS); es el concepto normativo o pedagógico abstraído.

### C. KnowledgeOrigin
*Value Object* que responde de dónde nace conceptualmente el conocimiento.
- **Ejemplos de Origen:** `ManualOperativo`, `NormaOficial`, `PlaneacionHistorica`, `ObservacionDocente`, `AcuerdoInstitucional`.

### D. KnowledgeAuthority
*Value Object* que dictamina quién o qué respalda esta verdad. No se limita a personas.
- **Dimensiones de Autoridad:** `Normative` (Ley SEP), `Institutional` (Política del corporativo), `Pedagogical` (Comité interno), `Organizational` (Directora del centro).

### E. KnowledgeValidity
*Value Object* que determina si el conocimiento sigue siendo aplicable para la toma de decisiones actuales.
- **Estados de Validez:** `Active`, `Superseded` (Sustituido), `Suspended`, `Revoked`.
- *Diferenciación:* Una guía puede tener la versión más reciente (`KnowledgeVersion`), estar recién verificada (`KnowledgeFreshness`), pero haber sido suspendida cautelarmente (`KnowledgeValidity`).
- *Nota Arquitectónica:* La validez no depende únicamente del tiempo, es una conjunción: `Validity = Time + Authority + Institutional Context`.

### F. KnowledgeConfidence
*Value Object* que rige la fiabilidad institucional del conocimiento. Es ortogonal al *ConfidenceScore* (Capa 3). Aquí evaluamos qué tanto confía la organización en que esta verdad debe guiar el comportamiento.
- **Niveles institucionales:** `Official` (Inquebrantable), `Reviewed` (Verificado), `Historical` (Referencia pasada), `Experimental` (En pilotaje), `Deprecated` (Obsoleto).

### G. KnowledgeReference
*Value Object* utilizado por otras capas para referenciar rígidamente una pieza del patrimonio institucional.
- *Regla de Dominio:* Apunta siempre al concepto institucional puro (`InstitutionalKnowledge`), jamás a una URL, ruta de archivo o puntero técnico.

### H. Dimensiones Adicionales (Value Objects)
- **KnowledgeVersion:** Inmutabilidad del conocimiento en el tiempo (`effectiveFrom`, `deprecatedAt`).
- **KnowledgeFreshness:** Métrica de obsolescencia pasiva (`requiresVerificationAt`).
- **KnowledgeApproval:** Estado de maduración del conocimiento (`Draft`, `UnderReview`, `Approved`).
- **KnowledgeCollection:** Agrupación semántica para metas pedagógicas específicas.

---

## 4. Cadena Arquitectónica Completa (Axioma IX)

La incorporación de esta capa corona la estructura conceptual de TutorIA, permitiendo un flujo cognitivo direccional y puro:

1. **Knowledge** (El Patrimonio Institucional)
2. **Policy** (Las Reglas)
3. **Context** (La Realidad)
4. **Generation** (Las Hipótesis)
5. **Governance** (La Trazabilidad y el Control Humano)
