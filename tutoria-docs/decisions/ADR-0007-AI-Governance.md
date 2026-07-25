# ADR-0007: AI Governance

## Contexto
Los Modelos Fundacionales (LLMs) son probabilísticos. Sin barreras (guardrails) de seguridad y normativas (AI Governance), pueden sugerir a una educadora acciones ilegales, peligrosas o que van en contra de la visión del Centro, comprometiendo a la Institución.

## Decisión
Toda respuesta e inferencia de la IA en TutorIA se sujeta a un protocolo estricto de Gobernanza, anclaje documental (RAG) y trazabilidad inmutable.

## Alternativas consideradas
- *Chatbot libre "Wrapper" de OpenAI:* Permitir que el educador pregunte cualquier cosa al LLM base. Completamente rechazado por el altísimo riesgo operativo y de privacidad.

## Ventajas
- Elimina casi a cero el riesgo de alucinaciones normativas.
- Mantiene a la Inteligencia Artificial dentro de una "caja de arena" funcional segura.

## Riesgos
- Si las reglas son demasiado estrictas, el sistema parecerá "tonto" o robótico.

## Consecuencias
- La IA no actúa por la libre. Su rol es *procesar* información pre-validada por el KOS, no inventar o inferir regulaciones que no se encuentren en la base vectorial.
