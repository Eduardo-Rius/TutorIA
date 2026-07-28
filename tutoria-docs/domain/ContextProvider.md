# Domain Design: ContextProvider

**Status:** ACTIVE

## Definición por Contrato
El `ContextProvider` es un Puerto de Aplicación. Su única responsabilidad definida en el dominio es: *"resolver un conjunto de ContextRequirement y devolver un ContextSnapshot consistente para una ContextCapability"*.

## Límites
El dominio **nunca dictará cómo** este proveedor obtiene los datos. En la capa de infraestructura, este proveedor podrá implementar paralelismo, llamadas asíncronas, consultas a bases de datos relacionales o peticiones a otros microservicios (incluyendo búsqueda semántica), pero todas esas estrategias quedan ocultas detrás del puerto.
