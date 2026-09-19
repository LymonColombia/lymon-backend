# ADR-012: Validación de `inventoryCount` por pico de reservas activas concurrentes

**Fecha:** 2026-03-22  
**Estado:** Aceptado

---

## Contexto

Al implementar la edición de unidades (`UpdateUnit`), surge una regla crítica de negocio:

> No se debe permitir reducir `inventoryCount` por debajo de la demanda ya comprometida por reservas activas para esa unidad.

La pregunta fue cuál es la forma más simple y correcta de validar esta regla sin introducir complejidad innecesaria.

---

## Decisión

Se valida la reducción de `inventoryCount` calculando el **pico de reservas activas concurrentes** mediante un algoritmo de barrido temporal (_sweep line_) en el servicio de dominio:

- `InventoryCountValidator.getMinimumRequiredInventory(reservations)`

El resultado del método representa el **inventario mínimo requerido** para no generar sobreventa.

Regla aplicada en `UpdateUnitHandler`:

$$
newInventoryCount \ge peakConcurrentActiveReservations
$$

Si no se cumple, se rechaza el cambio con error de conflicto de negocio.

---

## Implementación

1. Se filtran reservas inactivas (`CANCELLED`, `NO_SHOW`).
2. Cada reserva activa genera dos eventos:
   - `checkIn` con `+1`
   - `checkOut` con `-1`
3. Se ordenan eventos por fecha (en empate, primero `-1` y luego `+1`).
4. Se recorre acumulando ocupación actual y registrando el máximo (`peak`).
5. `peak` es el mínimo `inventoryCount` permitido.

---

## Razones

### 1. Correctitud de negocio

Contar solo reservas activas totales no es suficiente, porque no todas se solapan en las mismas fechas. El pico concurrente sí modela la ocupación máxima real.

### 2. Simplicidad razonable

El algoritmo evita comparaciones cuadráticas complejas entre todas las reservas y mantiene una lógica clara de entrada/salida temporal.

### 3. Complejidad adecuada

- Tiempo: $O(n \log n)$ (por ordenamiento de eventos)
- Espacio: $O(n)$

Para el volumen esperado por unidad en el MVP, esta complejidad es adecuada.

### 4. Encapsulación limpia

La regla vive en dominio (`InventoryCountValidator`) y no en controlador/DTO, manteniendo Clean Architecture y testabilidad.

---

## Alternativas descartadas

### A) `newInventoryCount >= activeReservations.length`

**Descartada**: sobre-restringe o sub-restringe según solapamientos; no modela concurrencia real.

### B) Validación directa en base de datos con agregaciones complejas

**Descartada para MVP**: mayor complejidad técnica y menor legibilidad para una regla que hoy se resuelve correctamente en dominio.

---

## Consecuencias

- Se evita sobreventa al reducir `inventoryCount`.
- La validación es consistente y reutilizable desde casos de uso de aplicación.
- El comportamiento queda explícitamente documentado para futuras iteraciones y refactors.

---

## Archivos relacionados

- `src/domain/reservation/services/inventory-count-validator.domain-service.ts`
- `src/application/unit/commands/update-unit.handler.ts`
- `src/domain/reservation/repositories/reservation.repository.ts`
- `src/infrastructure/persistence/repositories/mongo-reservation.repository.ts`
