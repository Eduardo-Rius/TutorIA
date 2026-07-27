# ADR-001: Rich Domain

**Estado:** Aprobado  
**Contexto:** El modelo de negocio de TutorIA es complejo y evoluciona independientemente de la interfaz o infraestructura técnica. Necesitábamos garantizar la inmutabilidad y encapsulación del negocio.  
**Decisión:** Adoptar un diseño de Rich Domain. Todo el dominio estará completamente aislado sin conocimiento de librerías externas ni detalles de infraestructura (Firebase/React).  
**Consecuencias:** Mayor predictibilidad en pruebas, escalabilidad, pero se requiere mayor disciplina al escribir los modelos (no se permiten modelos anémicos).
