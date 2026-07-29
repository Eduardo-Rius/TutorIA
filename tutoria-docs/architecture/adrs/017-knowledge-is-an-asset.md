# ADR 017: Knowledge is an Institutional Asset

## Status
Approved

## Context
Al diseñar la capa superior de inteligencia para TutorIA (Knowledge Intelligence), existía el riesgo de caer en antipatrones de gestión documental (CMS) o recuperación de información puramente técnica (Information Retrieval / RAG). TutorIA no almacena "archivos" para consumo pasivo, sino "conocimiento" para la toma de decisiones activas.
Además, la validez de este conocimiento no depende exclusivamente del tiempo, sino que es una intersección de tiempo, autoridad y contexto institucional (`Validity = Time + Authority + Institutional Context`).

## Decision
Se dictamina que el dominio debe modelar el conocimiento exclusivamente como patrimonio institucional (`InstitutionalKnowledge`), completamente desvinculado del medio en el que fue originalmente plasmado (PDFs, Word, URLs). 
El modelo debe girar en torno a su origen (`KnowledgeOrigin`), su autoridad (`KnowledgeAuthority`), su confianza institucional (`KnowledgeConfidence`) y su vigencia operativa (`KnowledgeValidity`).

## Consequences
1. **Desacoplamiento Tecnológico:** El dominio permanece completamente ignorante respecto a bases de datos vectoriales, chunks o embeddings.
2. **Jerarquía Clara (Axioma IX):** Permite instaurar el Axioma IX en la Constitución: *El conocimiento institucional precede al contexto.*
3. **Complejidad Controlada:** Evita convertir a TutorIA en un Google Drive o SharePoint; el conocimiento que entra a la plataforma lo hace exclusivamente porque su valor rige decisiones, no por simple almacenamiento.

## Future Outlook
En futuras Waves (WAVE 11/12), la arquitectura deberá diferenciar formalmente entre **Institutional Memory** (el patrimonio permanente, normativas, políticas) y **Operational Memory** (lo aprendido durante la operación, revisiones, *Learning Insights*). Esto permitirá que el sistema evolucione de proteger conocimiento estático a gobernar el aprendizaje organizacional dinámico.
