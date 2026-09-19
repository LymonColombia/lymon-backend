# Refactorización: Reconstitute Param Objects

## Resumen

Refactorización del contrato de reconstitución de 6 entidades de dominio: reemplazo de parámetros posicionales por un objeto de datos tipado.

---

## Problema

El contrato posicional original requería 8–10 parámetros en `Entity.reconstitute()`:

```typescript
static reconstitute(
  id: AuditLogId,
  tenantId: string,
  userId: string,
  userEmail: string,
  action: AuditAction,
  entityType: AuditEntityType,
  entityId?: string,
  metadata?: Record<string, unknown>,
  previousValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
  ipAddress?: string,
  createdAt: Date,
): AuditLog { ... }
```

**Riesgos:**
- SonarQube code smell: función con más de 7 parámetros
- Frágil a cambios de orden (refactorizar es tedioso)
- Difícil de leer en los call-sites (mongo repos, tests)
- Propenso a errores de parámetro mal colocado

---

## Solución

Crear una interfaz tipada en `src/domain/aggregate/interfaces/aggregate.interface.ts`:

```typescript
export interface AuditLogData {
  tenantId: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}
```

Nueva firma:

```typescript
static reconstitute(id: AuditLogId, data: AuditLogData): AuditLog {
  return new AuditLog(
    id,
    data.tenantId,
    data.userId,
    // ...
    data.createdAt,
  );
}
```

Call-site en mongo repo:

```typescript
return AuditLog.reconstitute(
  AuditLogId.createFromString(doc._id),
  {
    tenantId: doc.tenantId,
    userId: doc.userId,
    userEmail: doc.userEmail,
    action: doc.action,
    entityType: doc.entityType,
    entityId: doc.entityId,
    metadata: doc.metadata,
    previousValue: doc.previousValue,
    newValue: doc.newValue,
    ipAddress: doc.ipAddress,
    createdAt: doc.createdAt,
  },
);
```

---

## Entidades Afectadas

1. **AuditLog** — 11 parámetros → `AuditLogData`
2. **GuestEmail** — 9 parámetros → `IGuestEmailData`
3. **GuestNote** — 10 parámetros → `IGuestNoteData`
4. **Guest** — 11 parámetros → `IGuestData`
5. **InventoryMovement** — 8 parámetros → `IInventoryMovementData`
6. **Reservation** — 12 parámetros → `IReservationData`

---

## Cambios Secundarios

**5 MongoDB repositories** (callers):
- `mongo-guest-email.repository.ts`
- `mongo-guest-note.repository.ts`
- `mongo-guest.repository.ts`
- `mongo-inventory-movement.repository.ts`
- `mongo-reservation.repository.ts`

**4 test files** (fixtures y specs):
- `test/application/guest-note/get-guest-notes-by-guest-id.handler.spec.ts`
- `test/guest-reservation/get-reservations-by-guest-id.query-handler.spec.ts`
- `test/shared/fixtures/guest-note.fixture.ts`
- `test/shared/fixtures/reservation.fixture.ts`

---

## Beneficios

✓ Resuelve SonarQube code smell (parámetros ≤ 7)
✓ Más legible: nombres de propiedades en call-sites
✓ Menos frágil a reordenación futura
✓ Más fácil de documentar (interfaz tipada)
✓ Facilita el evolvimiento del dominio (agregar campos es trivial)
