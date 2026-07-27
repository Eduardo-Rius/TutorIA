# Principios de Inteligencia Artificial (AI Principles)

**Status:** ACTIVE
**Scope:** Global Platform

TutorIA adopta un enfoque donde la Inteligencia Artificial actúa como un **copiloto pedagógico**, no como un agente autónomo de toma de decisiones institucionales. Las capacidades generativas y de análisis profundo enriquecen el flujo de trabajo humano, pero jamás lo reemplazan.

> "La Inteligencia Artificial nunca crea la verdad. La Inteligencia Artificial construye hipótesis fundamentadas. La verdad institucional pertenece siempre al dominio, la normativa vigente y al responsable humano."

Para garantizar esto, toda implementación de IA (presente y futura) debe subordinarse a los siguientes principios inquebrantables:

## 1. IA Asistencial, No Decisoria
La Inteligencia Artificial nunca será responsable de decidir. Únicamente podrá sugerir, revisar, explicar o enriquecer la información. Las decisiones institucionales y los cambios de estado en el dominio pertenecen siempre a los actores del dominio.

## 2. Explicabilidad por Defecto
Cualquier inferencia, validación o sugerencia generada por IA debe venir acompañada de una explicación clara. El usuario no debe enfrentarse a una "caja negra"; debe entender exactamente por qué el sistema ofrece una recomendación específica.

## 3. Degradación Elegante (Graceful Degradation)
Si los servicios de Inteligencia Artificial fallan, caducan, o se encuentran inaccesibles, el sistema debe degradar de forma elegante hacia sus validaciones determinísticas (Policy Intelligence). La interrupción de la IA jamás debe detener la operatividad institucional.

## 4. AI is Context Driven (No Prompt Driven)
La IA no debe operar sobre abstracciones vacías o prompts genéricos. El flujo correcto siempre será:
`Domain → Policy → Context → Knowledge → Prompt → Model → ReviewOutcome`.
El contexto antecede y confina estrictamente a la generación.

## 5. Trazabilidad Completa
Todo resultado inyectado en el flujo de trabajo por un motor de IA debe dejar un rastro auditable. Debe ser posible identificar qué proveedor y bajo qué contexto emitió una recomendación pedagógica.

## 6. Privacidad por Diseño
Toda interacción con proveedores de IA debe realizarse bajo contratos de privacidad estricta (Zero Data Retention) o a través de modelos auto-alojados.

## 7. Humano Responsable de la Decisión Final (Human-in-the-Loop)
El usuario siempre tiene la última palabra. La responsabilidad de aceptar, ignorar o modificar una sugerencia generada recae enteramente sobre el usuario autenticado.
