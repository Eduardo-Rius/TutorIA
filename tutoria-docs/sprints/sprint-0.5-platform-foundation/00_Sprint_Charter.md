# Sprint 0.5 — Platform Foundation

## Estado

ACTIVO

## Misión

Zero Legacy.

Transformar `tutoria-app` en una base técnica limpia, compilable, neutral y mantenible, eliminando dependencias funcionales, referencias visuales y acoplamientos heredados del prototipo GuarderiasIMSS.

## Objetivo

Preparar la aplicación para que Sprint 0.6 pueda implementar Core Domain, identidad institucional, tenant y permisos sin construir sobre deuda técnica heredada.

## Alcance incluido

- Auditoría técnica inicial.
- Inventario completo de archivos y dependencias.
- Identificación de componentes reutilizables.
- Identificación y eliminación de componentes obsoletos.
- Eliminación de rutas heredadas.
- Eliminación de referencias a GuarderiasIMSS.
- Saneamiento de imports.
- Saneamiento de assets.
- Revisión de Vite.
- Revisión de Tailwind.
- Revisión del gestor de paquetes y lockfile.
- Shell neutral de TutorIA.
- Build exitoso.
- Documentación técnica del trabajo realizado.

## Fuera de alcance

- MultiTenant.
- RBAC.
- Firestore Domain Model.
- Roles.
- Asignaciones.
- Centros.
- Salas.
- Grupos.
- Knowledge Registry.
- RAG.
- Agentes de IA.
- Planeaciones.
- Observaciones.
- Flujos de aprobación.
- Despliegue productivo.
- Diseño visual definitivo.

## Criterios de éxito

1. `npm run build` finaliza correctamente.
2. No existen imports rotos.
3. No existen referencias funcionales a GuarderiasIMSS.
4. No existen rutas activas hacia páginas obsoletas.
5. No existen componentes huérfanos activos.
6. No existen secretos versionados.
7. La aplicación presenta una shell neutral de TutorIA.
8. Todas las dependencias conservadas tienen un propósito identificado.
9. La versión permanece en 0.9.0.
10. No se implementan capacidades del Sprint 0.6.
11. Existe un reporte técnico de limpieza.
12. La rama queda lista para revisión humana antes del push.

## Riesgos

- Eliminar infraestructura genérica reutilizable.
- Confundir saneamiento con rediseño funcional.
- Introducir dependencias innecesarias.
- Modificar Firebase o configuraciones productivas.
- Copiar nuevamente código del prototipo.
- Ocultar errores mediante mocks.
- Dejar código muerto.
- Sobrepasar el alcance hacia Core Domain.

## Dependencias

- Sprint 0 aprobado.
- Architecture Board aprobado.
- Rama `develop` sincronizada.
- Lockfile válido.
- Node disponible.
- Gestor de paquetes identificado.
- Ausencia de secretos versionados.

## Definition of Done

- Auditoría inicial completada.
- Build inicial documentado.
- Limpieza Zero Legacy completada.
- Build final exitoso.
- Lint ejecutado cuando exista.
- Cambios documentados.
- Commit local creado.
- No se realiza push sin autorización.
- Sprint Retrospective preparada únicamente al cierre.

## Entregables

- Sprint Charter.
- Baseline Technical Audit.
- Zero Legacy Cleanup Report.
- Inventario de dependencias.
- Registro de archivos eliminados.
- Evidencia del build.
- Aplicación neutral de TutorIA.
- Recomendación para Sprint 0.6.

## Regla de oro

Este Sprint no agrega funcionalidades de negocio.

Su calidad se mide por la deuda eliminada, la claridad obtenida y la estabilidad técnica alcanzada.

## Foundation Rule

Sprint 0 está cerrado.

Cualquier corrección o mejora descubierta durante este Sprint debe registrarse como una nueva decisión, deuda o aprendizaje. No se debe reescribir el historial del Sprint 0.
