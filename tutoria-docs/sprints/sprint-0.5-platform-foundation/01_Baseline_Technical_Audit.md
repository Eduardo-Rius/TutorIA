# Baseline Technical Audit (Sprint 0.5)

## 1. Resumen ejecutivo
Antes de iniciar la fase de limpieza "Zero Legacy", se ejecutó una inspección profunda del código fuente (`tutoria-app`). El repositorio heredado arrastra una cantidad considerable de deuda técnica, dependencias rotas e importaciones huérfanas procedentes de la eliminación de carpetas del MVP anterior. El build está roto y la aplicación es no compilable en su estado actual.

## 2. Estructura técnica actual
El front-end se aloja en `tutoria-app`. Está basado en Vite y React.

## 3. Stack detectado
- React
- Vite
- TailwindCSS
- Firebase
- n8n API (mediante axios)

## 4. Gestor de paquetes
- **npm** (Se detectó la existencia de `package-lock.json`).

## 5. Dependencias principales
- `firebase`: ^12.12.1
- `react`, `react-dom`, `react-router-dom`
- `lucide-react`
- `axios`
- `vite`

## 6. Estado del build
**FALLIDO**. Error con salida `15 errors`.
El motor de compilación (Rolldown) arrojó errores graves por importaciones no resueltas.

## 7. Estado del lint
**FALLIDO**. Existe 1 problema reportado (`no-unused-vars` en `Settings` dentro de `MainLayout.jsx`).

## 8. Errores y warnings
Los principales errores que impiden el build son de tipo `[UNRESOLVED_IMPORT]`:
- `../utils/normalizeData` en `AuthContext.jsx`
- `../services/usuariosService` en `AuthContext.jsx`
- `../services/personalService` en `AuthContext.jsx`
- `../services/usuariosService` en `Login.jsx`
- `../services/personalService` en `Login.jsx`

## 9. Referencias heredadas
Se detectaron múltiples referencias funcionales y visuales a "GuarderiasIMSS":
- Archivos enteros con lógica del IMSS (códigos de guardería, directores, supervisores).
- Imágenes como `imssLogo`.
- Textos explícitos: `Uso exclusivo para personal de Guarderías IMSS.`.
- Correo de ejemplo: `ejemplo@imss.gob.mx`.

## 10. Componentes reutilizables
- La configuración base de Vite y Tailwind.
- Posiblemente el cascarón genérico de ruteo en `AppRoutes.jsx` (aunque requerirá limpieza).
- Envoltura base en `MainLayout.jsx`.

## 11. Componentes obsoletos
- Módulos de autenticación completos y sus utilidades asociadas (que están rotas).
- Servicios atados a la vieja base de datos de usuarios (`usuariosService`, `personalService`).
- Páginas de Dashboard, Login, ResetPassword orientadas al IMSS.
- Servicios específicos de `n8nService.js` atados al MVP anterior.

## 12. Riesgos
- Eliminar la configuración de enrutamiento necesaria para que la app se sostenga.
- Quebrantar el stack de Tailwind al quitar clases base necesarias.
- Mantener variables de Firebase que no aplican a la arquitectura MultiTenant.

## 13. Plan de limpieza
- Eliminar todas las páginas, modales y formularios orientados a negocio (Login, Dashboard, Planeaciones, auth).
- Purgar el `AppRoutes.jsx` para tener únicamente una ruta `/` neutral de bienvenida.
- Remover los servicios heredados (`authService.js`, `n8nService.js`, `firebase.js`).
- Limpiar el `MainLayout.jsx` de elementos de navegación que no existirán todavía.
- Asegurar que `npm run build` sea exitoso al finalizar.

## 14. Límites del Sprint
Esta limpieza **no agregará nuevas funcionalidades**. El resultado final será únicamente una pantalla estática (shell) con el logotipo/texto de TutorIA indicando que los módulos se incorporarán en la fase de Foundation/Core Domain.
