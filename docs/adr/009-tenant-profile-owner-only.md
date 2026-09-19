# ADR-009: Gestión de Perfil del Tenant — Acceso OWNER-only (US-004)

**Fecha:** 2026-03-02  
**Estado:** Aceptado

---

## Contexto

Se implementó la capacidad de leer y actualizar el perfil del tenant (`GET /tenant/profile`, `PATCH /tenant/profile`). Surgieron decisiones sobre qué campos son editables, quién puede editarlos, y cómo modelar el acceso exclusivo del Owner sin introducir un rol nuevo.

---

## Decisión 1 — Campos editables del perfil

### Campos incluidos

| Campo          | Tipo            | Razón                                                            |
|----------------|-----------------|------------------------------------------------------------------|
| `name`         | `string`        | Nombre del negocio — puede cambiar por rebranding                |
| `contactPhone` | `string\|null`  | Teléfono de contacto operativo                                   |
| `address`      | `string\|null`  | Dirección física del negocio                                     |
| `description`  | `string\|null`  | Descripción libre del negocio                                    |
| `theme`        | `object\|null`  | Variables de color de branding (primary, secondary, accent) |
| `logoKey`      | `string\|null`  | Key R2 del logo subido (ver nota); `null` para quitarlo          |

> **Actualización (LYMON-1096):** se eliminó `website`. El logo se sube reutilizando el endpoint genérico `POST /storage/presigned-url` (con `category: "logos"`) y su key se envía en el `PATCH /tenant/profile` como `logoKey` (mismo patrón que `mediaKeys` de units/experiences: el handler valida el prefijo del tenant y borra el objeto reemplazado en R2). Se persiste **solo la key** de R2 (`logoKey`) en la colección `tenants`; el `logoUrl` de la respuesta se construye en el backend con `getPublicUrl(logoKey)` al leer, para mantener el dominio/CDN fuera de la base de datos.

### Campos excluidos

| Campo        | Razón de exclusión                                                |
|--------------|-------------------------------------------------------------------|
| `ownerEmail` | Cambio de email requiere verificación y rehashing de credenciales |
| `plan`       | Cambio de plan es operación de billing con implicaciones de límites|

---

## Decisión 2 — OWNER-only via permiso existente, sin rol nuevo

### Problema

`PATCH /tenant/profile` debe ser accesible únicamente por el Owner. La forma de restringir acceso en este sistema es mediante `@RequirePermission(Permission.X)`. Se podría:

- **Opción A:** Crear un nuevo permiso `TENANT_PROFILE_UPDATE` no asignado a nadie más
- **Opción B:** Reutilizar el permiso existente `TENANT_SETTINGS_EDIT` que ya existe en el enum y no está asignado a `ADMIN_PERMISSIONS` ni `STAFF_PERMISSIONS`

### Decisión

Se eligió la **Opción B**. El endpoint usa `@RequirePermission(Permission.TENANT_SETTINGS_EDIT)`.

### Razón

`TENANT_SETTINGS_EDIT` fue definido desde el inicio con exactamente esta semántica. No tiene sentido introducir otro permiso con el mismo significado. El `PermissionGuard` otorga acceso implícito a `isOwner = true` sin revisar permisos, por lo que el flujo es:

```
Owner     → PermissionGuard ve isOwner=true → acceso concedido
ADMIN     → PermissionGuard revisa permissions[] → no contiene TENANT_SETTINGS_EDIT → 403
STAFF     → PermissionGuard revisa permissions[] → no contiene TENANT_SETTINGS_EDIT → 403
```

---

## Decisión 3 — GET profile accesible a todos los usuarios del tenant

### Problema

¿Quién puede leer el perfil del tenant?

- **Opción A:** Solo el Owner
- **Opción B:** Cualquier usuario autenticado del tenant (sin `@RequirePermission`)

### Decisión

Se eligió la **Opción B**. `GET /tenant/profile` usa solo `JwtAuthGuard`.

### Razón

El nombre del negocio, dirección y datos de contacto son información operativa que el STAFF necesita para su trabajo diario. No hay riesgo de exposición — el tenant ID en el JWT garantiza que cada usuario solo accede al perfil de su propio tenant.

---

## Consecuencias

- `TENANT_SETTINGS_EDIT` permanece sin asignar en `ADMIN_PERMISSIONS` y `STAFF_PERMISSIONS` — cualquier intento futuro de asignarlo a ADMIN rompería el acceso exclusivo del Owner
- Los campos opcionales se inicializan como `null` en `Tenant.create()` — los tenants existentes no requieren migración de datos gracias a `@Prop({ default: null })`
- Si en el futuro se requiere que ADMIN gestione el perfil, basta con agregar `TENANT_SETTINGS_EDIT` a `ADMIN_PERMISSIONS` — no requiere cambio de código en controllers ni handlers
