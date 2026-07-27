# ADR 005: Membership ID como UUID Independiente

**Date:** 2026-07-27
**Status:** Approved
**Wave:** WAVE 5

## Contexto
Inicialmente se contemplaba que la identidad de una membresía fuera un hash determinístico derivado de la tupla `[IdentityID + TenantID + CenterID + RoleID]`. Esto garantizaba la unicidad estructural, pero limitaba la evolución en el tiempo de la membresía.

## Decisión
Se decide que la clave primaria de la membresía (`MembershipID`) debe ser un **UUID independiente y opaco**.

## Consecuencias
- **Trazabilidad temporal:** Un mismo usuario puede ser Director del Centro A en el ciclo 2025, renunciar, y volver a ser contratado como Director del Centro A en el ciclo 2027. Al usar UUIDs independientes, podemos tener dos registros históricos de membresía distintos (con diferentes fechas `ValidFrom` y `ValidUntil`), en lugar de sobrescribir el estado de un único hash.
- **Auditoría:** Cada UUID de membresía puede asociarse a un único `MembershipAssignment` que indique quién y cuándo la autorizó.
