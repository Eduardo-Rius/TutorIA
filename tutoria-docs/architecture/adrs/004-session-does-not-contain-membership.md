# ADR 004: La Sesión no contiene la Membresía

**Date:** 2026-07-27
**Status:** Approved
**Wave:** WAVE 5

## Contexto
En los sistemas tradicionales, es común inyectar los roles, permisos y contexto del usuario (claims) directamente dentro del objeto de sesión o en el JWT al momento de iniciar sesión.

## Decisión
Se establece como regla estricta de arquitectura que **la `Session` NUNCA debe contener la `Membership`**. 
- La sesión (`Authentication`) será responsable única y exclusivamente de comprobar **quién** es el usuario (Identity ID).
- La obtención y resolución del contexto institucional (dónde trabaja, qué rol tiene) recae sobre el `InstitutionContext` o `MembershipProvider` en una capa separada, la cual buscará las membresías disponibles *después* de que la sesión sea válida.

## Consecuencias
- **Desacoplamiento:** Firebase Auth (u otro proveedor) no necesita saber nada de nuestras guarderías ni roles (se evita sobrecargar custom claims).
- **Escalabilidad:** Si cambian los permisos de un usuario, no se necesita invalidar su sesión, solo su contexto en memoria/caché.
- **Complejidad UI:** Requiere un sistema de dos pasos al cargar la app: 1) Validar sesión, 2) Validar y seleccionar membresía (Active Context).
