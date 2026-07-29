# TutorIA

## Engineering Constitution

**Version:** 1.0

**Ratified:** 29 July 2026

---

### Ratified by

Chief Architect

Architecture Review Board

Implementation Team

---

### Purpose

> This Constitution defines the permanent engineering principles that govern the evolution of TutorIA.
>
> All architectural decisions, implementations and future waves shall conform to this Constitution.

---

### Amendment Rule

> This Constitution may only be modified through an Architecture Review Board approval and a formally ratified Architectural Decision Record (ADR).

---

## PREÁMBULO

TutorIA no es simplemente software; es la institucionalización del conocimiento pedagógico y operativo. Construir software institucional impulsado por Inteligencia Artificial exige un profundo respeto por la verdad, la responsabilidad humana y la memoria de quienes dan vida a los centros de cuidado y educación.

Nuestra misión técnica no es automatizar por automatizar, ni delegar la autoridad a modelos generativos. Nuestra misión es edificar un sistema donde el conocimiento trascienda a las personas, donde la rotación no detenga la pedagogía, y donde la Inteligencia Artificial actúe como un copiloto incansable que asiste, enriquece y fortalece, pero jamás reemplaza la responsabilidad inalienable del educador.

Esta Constitución establece los fundamentos filosóficos, arquitectónicos y operativos que guiarán a TutorIA durante los próximos años. Estas reglas trascienden frameworks, bases de datos y modelos de lenguaje. Son los cimientos de nuestra plataforma.

---

## TÍTULO I
### Filosofía

Los cimientos de TutorIA no descansan sobre librerías o paradigmas de moda, sino sobre verdades irrefutables. Estos son nuestros Axiomas:

**Axioma I**  
El Dominio es la única fuente de verdad institucional.

**Axioma II**  
La Inteligencia Artificial solamente produce hipótesis.

**Axioma III**  
Toda decisión institucional pertenece a un ser humano.

**Axioma IV**  
El contexto precede a la generación.

**Axioma V**  
Las políticas preceden al contexto.

**Axioma VI**  
La gobernanza precede a la automatización.

**Axioma VII**  
Toda automatización debe poder auditarse.

**Axioma VIII**  
La simplicidad es una obligación arquitectónica.
*Toda nueva capacidad deberá hacer el sistema más claro que antes de existir. Si una nueva funcionalidad incrementa la complejidad sin aumentar proporcionalmente el valor institucional, deberá replantearse antes de implementarse.*

**Axioma IX**  
El conocimiento institucional precede al contexto.
*La cadena arquitectónica superior es inmutable: Knowledge → Policy → Context → Generation → Governance. Ninguna inferencia ni realidad operativa existe sin antes sustentarse en el patrimonio del conocimiento institucional.*

---

## TÍTULO II
### Arquitectura

Para proteger nuestros Axiomas, la plataforma se estructura en capas divisorias inquebrantables, regidas por los principios de Diseño Dirigido por el Dominio (DDD) y Arquitectura Hexagonal (Ports before Adapters):

- **Domain:** El corazón inmutable. Contiene las entidades, agregados (Aggregates) y reglas puras del negocio. Ignora el mundo exterior.
- **Application:** El mediador. Orquesta los casos de uso, conecta los puertos y protege al Dominio.
- **Infrastructure:** El mundo tangible. Bases de datos, APIs y frameworks. Es un detalle de implementación, completamente reemplazable.
- **Policy (Policy Intelligence):** El auditor. Reglas determinísticas que auditan, validan y rigen el comportamiento de la plataforma antes de cualquier otra acción.
- **Context (Context Intelligence):** La realidad. Reúne el historial, la memoria pedagógica y las normativas pertinentes que dan sentido a los datos.
- **Generation (Generative Intelligence):** El motor creativo. Produce inferencias y contenido confinado por el Contexto.
- **Governance (Operational Intelligence):** El supervisor. Monitorea la salud, la trazabilidad y la pertinencia de las operaciones.

---

## TÍTULO III
### Invariantes Arquitectónicas

Para garantizar la estabilidad y escalabilidad en la próxima década, establecemos las siguientes reglas no negociables:

- **El Dominio nunca conoce infraestructura.**
- **Los Aggregates nunca conocen OpenAI ni modelos generativos.**
- **Los Prompts nunca contienen reglas institucionales.**
- **Las reglas de negocio viven exclusivamente en Policy.**
- **El contexto operativo e histórico vive exclusivamente en Context Intelligence.**
- **La Inteligencia Artificial nunca modifica el Dominio.**

---

## TÍTULO IV
### Inteligencia Artificial

La Inteligencia Artificial en TutorIA es asistencial y supeditada al operador humano. Operamos bajo un lenguaje ubicuo para la IA:

- **Explicabilidad Obligatoria:** Todo resultado generativo debe estar respaldado por un *rationale* o justificación clara. Las "cajas negras" son inadmisibles.
- **Degradación Elegante:** Si la IA falla, la plataforma sostiene su operatividad apoyándose en sus validaciones determinísticas (Policy Intelligence).
- **RAG y Fuentes Explícitas:** El conocimiento de la IA no proviene de su pre-entrenamiento, sino exclusivamente de los documentos, normativas y memoria inyectados mediante Context Intelligence.
- **Tipado Estricto (DTOs):** Los Modelos Generativos jamás responden en texto libre no estructurado hacia el sistema interno. Toda salida se restringe a esquemas parseables y determinísticos (JSON/XML).
- **Prohibición Normativa:** La IA tiene estrictamente prohibido inventar, deducir o alterar reglamentos. Ante la falta de contexto, su deber es abstenerse.

---

## TÍTULO V
### Gobernanza

El control de la evolución técnica reside en mecanismos institucionales precisos:

- **Architecture Review Board (ARB):** Única autoridad capaz de aprobar alteraciones arquitectónicas, dictaminar sobre implementaciones y modificar esta Constitución.
- **Regla Primera del ARB:** Ninguna revisión arquitectónica comenzará analizando código. Comenzará obligatoriamente verificando si la propuesta respeta la Constitución. Si la respuesta es negativa, la revisión se rechaza inmediatamente.
- **Protocolos y Dictámenes:** Toda propuesta técnica presentada al ARB concluye en uno de estos estados definitivos: `APPROVED`, `APPROVED WITH RECOMMENDATIONS`, `IMPLEMENTATION AUTHORIZED`, o `IMPLEMENTATION NOT AUTHORIZED`.
- **ADRs (Architecture Decision Records):** Las decisiones técnicas se documentan, se aprueban vía ARB y se vuelven vinculantes e inmutables.

---

## TÍTULO VI
### Ingeniería

El desarrollo sobre TutorIA no es libre; obedece a un flujo estructurado de calidad y seguridad extrema:

- **Engineering Pipeline:** Discovery → Domain Review → Architecture Review → Refinement → Consolidation → Implementation Authorization → Implementation → Validation → ARB Final Review → Commit → Tag → Push.
- **Quality Gates:** Toda implementación requiere superar obligatoriamente la cadena de validación: `architecture:check`, `typecheck`, `lint`, `tests`, `build`.
- **Commits y Push:** El código sube al repositorio principal (*Push*) exclusivamente cuando cuenta con autorización expresa del ARB (`IMPLEMENTATION AUTHORIZED` o dictamen final).

---

## TÍTULO VII
### Evolución y Arquitectura Viva

La arquitectura de TutorIA es un ente vivo, pero rígidamente estructurado. Esta Constitución es la norma suprema.

**Declaración de Jerarquía Absoluta**
Ningún documento tiene prioridad sobre la Constitución. Esto incluye PRDs, ADRs, Sprints, READMEs o cualquier otra documentación técnica. Todos deben alinearse a la Constitución, nunca al revés.

**Declaración de Toma de Decisiones**
Toda decisión técnica (modificación, nueva funcionalidad o adopción tecnológica) deberá ser evaluada respondiendo afirmativamente a la siguiente pregunta rectora:
> *"¿Viola esta decisión algún axioma de la Constitución?"*

**Proceso de Modificación**
La evolución de Waves (Draft → Released), el nacimiento de ADRs y, excepcionalmente, las enmiendas a esta Constitución, requieren la aprobación unánime del Architecture Review Board.

---

## TÍTULO VIII: Identidad de Producto y Documentación Operativa

La arquitectura es el motor, pero el producto es la institución. Para garantizar que TutorIA jamás pierda su rumbo hacia una mera automatización, se establece el siguiente mandato documental inquebrantable.

**Mandato de Justificación Institucional**  
A partir de la Fase II de desarrollo, ninguna nueva capacidad, funcionalidad o documento táctico podrá ser integrado al sistema a menos que responda, en su misma definición y de manera explícita, a las siguientes tres preguntas fundacionales:

1. **¿Qué capacidad institucional fortalece?** *(No qué tarea automatiza).*
2. **¿Qué actor institucional beneficia?** *(Directora, Docente, Supervisor).*
3. **¿Cómo contribuye a que la institución aprenda y evolucione?** *(Aprendizaje Organizacional).*

Si una propuesta no puede responder a estas tres preguntas, no pertenece al núcleo de TutorIA y será rechazada por el Architecture Review Board.

---

## ANEXOS

- **Glosario y Lenguaje Ubicuo:** (Espacio reservado para las definiciones de agregados, entidades y dominios, asegurando un lenguaje unificado entre desarrollo y pedagogía).
- **Definiciones Institucionales:** (Términos oficiales que operan como puente entre normatividad infantil y desarrollo de software).

---
> **"Las tecnologías evolucionan. El conocimiento perdura. Nuestra responsabilidad como ingenieros es construir sistemas que preserven ese conocimiento y lo pongan al servicio de las personas."**
