# ADR-0005: Adopción de Arquitectura Orientada a Eventos (EDA)

## Contexto
Un sistema monolítico fuertemente acoplado que opera de manera sincrónica (ej. El usuario guarda un dato -> El servidor espera la respuesta de OpenAI -> El servidor guarda en BD -> El servidor retorna OK al frontend) será inestable, lento y muy frágil ante fallas de red, timeouts de LLMs o altos volúmenes de datos.

## Decisión
Adoptar Arquitectura Orientada a Eventos (Event-Driven Architecture) para todos los flujos principales. 

## Alternativas consideradas
- *APIs REST / Sincrónicas puras:* Rechazadas para transacciones complejas. Obligarían a las interfaces a quedarse esperando (spinners) por periodos inaceptables mientras la IA procesa.

## Ventajas
- Altísima escalabilidad y resiliencia. Si la API de OpenAI cae, los eventos quedan encolados y se procesan cuando el servicio vuelve, sin que el usuario pierda su trabajo.
- Facilita la auditoría inmutable (Event Sourcing).

## Riesgos
- Mayor complejidad operativa (requiere message brokers, pub/sub o triggers estructurados).
- Consistencia eventual (la UI debe estar preparada para no mostrar la información procesada instantáneamente).

## Consecuencias
- Todos los módulos de inteligencia artificial y generación deben correr de forma asíncrona en *background workers*.
