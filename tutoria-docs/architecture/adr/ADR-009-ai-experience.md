# ADR-009: AI Experience System

**Estado:** Aprobado  
**Contexto:** TutorIA requiere interactuar con el usuario mediante flujos conversacionales, de sugerencia y explicación. Históricamente, las aplicaciones confunden "IA" con "Módulo de Chat".  
**Decisión:** 
La Inteligencia Artificial de TutorIA no se modela como un módulo de conversación.
La Inteligencia Artificial es una capacidad transversal del sistema.
Los componentes del AI Experience System podrán incorporarse a cualquier pantalla sin necesidad de adoptar un paradigma conversacional.
Toda interacción con IA deberá poder representarse mediante paneles, sugerencias, explicaciones, niveles de confianza y recomendaciones, independientemente de que exista o no un chat.

Se crean subdirectorios especializados (`conversation`, `insights`, `reasoning`, `prompts`, `feedback`, `shared`) para manejar el escalamiento (40-60 componentes esperados). Además, ningún componente de IA podrá importar directamente otro componente de IA salvo a través de su API de composición (prop `children` o slots genéricos).

**Consecuencias:** 
- La IA en TutorIA se consolida como una capacidad distribuida (Language Design propio).
- Las vistas complejas no se estancarán acopladas unas a otras.
