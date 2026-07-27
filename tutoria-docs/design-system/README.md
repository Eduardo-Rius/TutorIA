# TutorIA Design System

Este es el repositorio central del Design System de TutorIA Platform.

## Regla de Fuente Única (Single Source of Truth)

Toda la biblioteca oficial, canónica y maestra de activos gráficos, reglas visuales, y tokens de sistema vive en este directorio.
**Nunca referenciar archivos de este directorio directamente en el código de la aplicación.** 
La aplicación (`tutoria-app/src/assets/brand`) solo debe contener copias optimizadas explícitamente diseñadas para consumo digital, mientras que este directorio contiene las versiones maestras y editables.

## Estructura
- `/brand`: Activos maestros de identidad gráfica (Logos, Colores, Tipografías, etc).
