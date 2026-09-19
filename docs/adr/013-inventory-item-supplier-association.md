# ADR-013: Asociación de Supplier en InventoryItem

**Fecha:** 2026-04-10  
**Estado:** Aceptado

---

## Contexto

El módulo de inventario necesitaba soportar la asociación opcional entre un `InventoryItem` y un `Supplier` para poder rastrear qué proveedor abastece cada producto.

Además de persistir la relación, el flujo debía permitir:

1. Asociar un supplier existente al item.
2. Remover la asociación sin eliminar ni el item ni el supplier.
3. Consultar los items asociados a un supplier desde la vista de detalle del supplier.
4. Registrar validación de tenant/property/item/supplier antes de mutar el estado.

Había dos posibles modelos:

- Guardar la relación en `InventoryItem` como un campo nullable `supplierId`.
- Modelar una relación separada o una colección intermedia para representar el vínculo.

---

## Decisión

Se decidió modelar la asociación como una relación opcional en `InventoryItem` mediante el campo nullable `supplierId`.

La relación se persiste en la colección de inventario y se maneja desde la capa de aplicación con comandos explícitos:

- `AssociateSupplierToItemCommand`
- `RemoveSupplierFromItemCommand`

El endpoint para mutar la relación es propiedad-scoped:

```http
PATCH /properties/:propertyId/inventory/items/:itemId/supplier
```

La vista de detalle del supplier obtiene sus items asociados mediante una query dedicada:

- `GetItemsBySupplierQuery`

### Regla de sincronización adicional

Cuando la relación cambia, también se sincroniza el supplier de forma no destructiva:

1. Se vuelve a persistir el supplier con el mismo contenido funcional.
2. Se actualiza `updatedAt`.
3. Se emite un evento de auditoría para registrar el cambio.

No se mantiene una lista denormalizada de items dentro de `Supplier`.

---

## Razones

### 1. La relación pertenece naturalmente al item

Un item puede existir sin supplier asignado, pero si existe una relación activa, el item es el lugar más estable para representarla.

### 2. Se evita duplicación de verdad

Mantener `supplierId` en `InventoryItem` evita duplicar el vínculo en dos agregados y reduce el riesgo de inconsistencias.

### 3. El dominio sigue siendo fácil de consultar

La consulta por supplier se resuelve con un filtro indexado sobre la colección de inventario, sin necesidad de joins o estructuras intermedias.

### 4. El unlink no elimina datos

La eliminación de la relación solo nulifica `supplierId`. Eso conserva el historial del item y permite reasignar el supplier después.

### 5. La sincronización del supplier es mínima y explícita

Actualizar solo `updatedAt` y emitir auditoría conserva trazabilidad sin introducir contadores, listas de ids o estado derivado que luego haya que reconciliar.

---

## Consecuencias

**Positivas:**

- La asociación es simple de entender y persistir.
- El item puede tener o no supplier sin romper el modelo.
- El supplier detail view puede listar items asociados de forma directa.
- El unlink es seguro y no destructivo.

**Negativas:**

- La vista de item no expone automáticamente datos completos del supplier; si se necesita nombre/contacto en el detalle del item, habrá que extender el read model.
- La integridad referencial depende de validación en la capa de aplicación, no de la base de datos.
- La sincronización de supplier es intencionalmente liviana; si en el futuro se necesita estado agregado como conteos, habrá que diseñarlo aparte.

---

## Alternativas descartadas

### 1. Colección intermedia o relación many-to-many

Se descartó porque el caso de uso actual no necesita múltiples suppliers por item ni historial de asignaciones.

### 2. Denormalizar items dentro de Supplier

Se descartó porque agrega complejidad de consistencia y requiere mantener listas sincronizadas en cada alta/baja de relación.

### 3. Eliminar la asociación mediante borrado físico

Se descartó porque el requerimiento explícitamente pide desasociar sin eliminar el item.

---

## Notas de implementación

- La relación se agregó al schema de inventario como `supplierId` nullable.
- La capa de dominio de `InventoryItem` expone métodos para asociar y remover supplier.
- La capa de aplicación valida tenant, property, item y supplier antes de mutar el estado.
- La mutación de supplier se registra con auditoría para mantener trazabilidad operativa.
