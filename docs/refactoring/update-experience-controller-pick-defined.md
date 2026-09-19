# Refactorización: `pickDefined` en controlador de experiencias

**Fecha:** 2026-05-10  
**Archivos afectados:**
- `src/presentation/controllers/experience.controller.ts`
- `src/presentation/common/utils/pick-defined.util.ts` *(nuevo)*

---

## Contexto

El método `PATCH /experiences/:id` construía el objeto `ExperienceChanges` con 14 bloques `if (dto.x !== undefined) changes.x = dto.x;` explícitos antes de delegar al command. Aunque funcionalmente correcto, el patrón tiene tres problemas:

1. **Ruido visual**: la lógica de "filtrar undefined" queda mezclada con la lógica de "convertir tipos" (`new Date()`), haciendo más difícil ver qué hace el método.
2. **Escalabilidad**: cada campo nuevo del DTO requiere un bloque `if` adicional.
3. **Inconsistencia potencial**: es fácil olvidar un campo al agregar nuevas propiedades.

---

## Decisión

Se extrae una función utilitaria `pickDefined<T>(obj: T): Partial<T>` que elimina las claves con valor `undefined` de un objeto, y se aplica al bloque de construcción de `ExperienceChanges`.

Los tres campos que requieren conversión de tipo (`startAt`, `endAt`, `blackoutRanges` → `Date`) se mantienen explícitos con spread condicional para no ocultar esa lógica de transformación.

### Antes

```typescript
const changes: ExperienceChanges = {};
if (dto.name !== undefined) changes.name = dto.name;
if (dto.description !== undefined) changes.description = dto.description;
// ... 12 bloques más
if (dto.blackoutRanges !== undefined) {
  changes.blackoutRanges = dto.blackoutRanges.map((r) => ({
    startAt: new Date(r.startAt),
    endAt: new Date(r.endAt),
  }));
}
```

### Después

```typescript
const changes: ExperienceChanges = {
  ...pickDefined({
    name: dto.name,
    description: dto.description,
    priceCop: dto.priceCop,
    durationHours: dto.durationHours,
    capacity: dto.capacity,
    coverImageUrl: dto.coverImageUrl,
    location: dto.location,
    availabilityType: dto.availabilityType,
    recurrence: dto.recurrence,
    allowStandalonePurchase: dto.allowStandalonePurchase,
    allowReservationPurchase: dto.allowReservationPurchase,
  }),
  ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
  ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
  ...(dto.blackoutRanges !== undefined && {
    blackoutRanges: dto.blackoutRanges.map((r) => ({
      startAt: new Date(r.startAt),
      endAt: new Date(r.endAt),
    })),
  }),
};
```

---

## Ubicación de la utilidad

`src/presentation/common/utils/pick-defined.util.ts`

Se coloca en la capa de presentación porque su único propósito es filtrar campos opcionales de DTOs antes de construir commands. No tiene dependencias de dominio ni de aplicación.

---

## Consecuencias

**Positivas:**
- Separación visual clara entre "filtrar campos ausentes" y "convertir tipos".
- Agregar un nuevo campo al DTO solo requiere una línea en `pickDefined({...})`.
- `pickDefined` es reutilizable para futuros endpoints PATCH en el proyecto.

**Negativas:**
- Un lector nuevo debe conocer `pickDefined` para entender el flujo — mitigado porque la función es trivial y autodescriptiva.
