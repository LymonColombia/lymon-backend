# Cart & Experience Purchases — Guía de Implementación

> Para las decisiones de diseño, ver [ADR-017](adr/017-guest-cart-and-experience-purchases.md).

---

## Estructura de archivos

```
src/
  domain/
    cart/
      entities/
        cart.entity.ts
        cart.types.ts
      value-objects/
        cart-id.vo.ts
        cart-item.vo.ts              # experienceId, quantity, unitPriceCopSnapshot, selectedDate?, reservationId?
        cart-reservation-item.vo.ts  # reservationId, totalPriceCopSnapshot
        cart-status.vo.ts            # OPEN | CHECKED_OUT | EXPIRED
      repositories/
        cart.repository.ts           # ICartRepository + CART_REPOSITORY token

    experience-purchase/
      entities/
        experience-purchase.entity.ts
        experience-purchase.types.ts
      value-objects/
        experience-purchase-id.vo.ts
        experience-purchase-status.vo.ts  # PENDING | CONFIRMED | CANCELLED
      services/
        experience-capacity-checker.domain-service.ts
      repositories/
        experience-purchase.repository.ts  # EXPERIENCE_PURCHASE_REPOSITORY token

    reservation/
      services/
        guest-reservation-overlap-checker.domain-service.ts
      # reservation.entity.ts modificado — agrega pay()

    shared/
      payment-gateway.interface.ts  # IPaymentGateway + PAYMENT_GATEWAY token (sin impl activa)

  application/
    cart/
      commands/
        add-experience-to-cart/
        remove-experience-from-cart/
        set-cart-reservation/
        remove-cart-reservation/
        clear-cart/
        checkout-cart/
      queries/
        get-guest-cart/
      cart-application.module.ts

    experience-purchase/
      queries/
        get-experience-purchases-by-guest/
        get-experience-purchase-by-id/
      experience-purchase-application.module.ts

  infrastructure/
    persistence/
      schemas/
        cart.schema.ts
        experience-purchase.schema.ts
      repositories/
        mongo-cart.repository.ts
        mongo-experience-purchase.repository.ts
      # persistence.module.ts modificado — agrega providers de Cart y ExperiencePurchase

  presentation/
    controllers/
      guest-cart.controller.ts
      guest-experience-purchases.controller.ts

test/
  application/
    cart/
      add-experience-to-cart.handler.spec.ts
      set-cart-reservation.handler.spec.ts
      checkout-cart.handler.spec.ts
  shared/
    fixtures/
      cart.fixture.ts
      experience-purchase.fixture.ts
    mocks/
      repositories/
        cart-repository.mock.ts
        experience-purchase-repository.mock.ts
```

---

## Flujo del guest

```
POST /guest-reservations          → Reservation PENDING
POST /guest/cart/reservation      → SetCartReservationCommand
POST /guest/cart/items            → AddExperienceToCartCommand
POST /guest/cart/checkout         → CheckoutCartCommand
  ├── Reservation → CONFIRMED (reservation.pay())
  ├── ExperiencePurchase → PENDING (por cada item)
  └── Cart → CHECKED_OUT

GET  /guest/experience-purchases  → GetExperiencePurchasesByGuestQuery
```

---

## Validaciones por operación

### AddExperienceToCart
| Validación | Error |
|-----------|-------|
| Experience existe | NotFoundException |
| Experience.status = ACTIVE | DomainException |
| Experience.allowStandalonePurchase (si no lleva reservationId) | DomainException |
| Cart está OPEN | DomainException (Cart.assertOpen) |

### SetCartReservation
| Validación | Error |
|-----------|-------|
| Guest profile existe | NotFoundException |
| Reservation.guestId = guest.id | DomainException |
| Reservation.status = PENDING | DomainException |
| Sin solapamiento de fechas en misma propiedad | DomainException |
| Cart está OPEN | DomainException (Cart.assertOpen) |

### CheckoutCart
| Validación | Error |
|-----------|-------|
| Cart abierto existe | NotFoundException |
| Guest profile existe | NotFoundException |
| Cart no está vacío | DomainException |
| **Si hay reservationItem:** | |
| &nbsp;&nbsp;Reservation.status = PENDING | DomainException |
| &nbsp;&nbsp;Reservation.guestId = guest.id | DomainException |
| &nbsp;&nbsp;Sin solapamiento de fechas (re-validación) | DomainException |
| **Por cada experienceItem:** | |
| &nbsp;&nbsp;Experience.status = ACTIVE | DomainException |
| &nbsp;&nbsp;allowStandalonePurchase o allowReservationPurchase según item.reservationId | DomainException |
| &nbsp;&nbsp;Capacidad disponible | DomainException |

---

## Capacidad de experiencias

`ExperienceCapacityChecker.check(experience, requestedQty, alreadyConfirmed)`:

```
disponible = experience.capacity - alreadyConfirmed
si requestedQty > disponible → DomainException
```

`alreadyConfirmed` viene de `experiencePurchaseRepository.countConfirmedByExperienceAndDate(experienceId, selectedDate)`.
`selectedDate` puede ser `null` si la experiencia no tiene fecha específica.

---

## Solapamiento de reservaciones

`GuestReservationOverlapChecker.check(guestReservations, propertyId, dateRange, excludeReservationId?)`:

1. Filtra reservaciones del guest ignorando CANCELLED y NO_SHOW
2. Filtra las que son de la misma propiedad (`propertyId`)
3. Filtra las que se solapan en fechas (`checkIn < targetCheckOut && checkOut > targetCheckIn`)
4. Excluye `excludeReservationId` (evita auto-colisión al re-validar en checkout)
5. Si queda alguna → `DomainException('Guest already has an overlapping reservation at this property')`

Se llama en `SetCartReservationHandler` Y en `CheckoutCartHandler` (doble punto para cubrir condiciones de carrera).

---

## Endpoints (GuestJwtAuthGuard)

### Cart — `/guest/cart`

| Método | Path | Command/Query |
|--------|------|---------------|
| GET | `/guest/cart` | GetGuestCartQuery |
| POST | `/guest/cart/items` | AddExperienceToCartCommand |
| DELETE | `/guest/cart/items/:experienceId` | RemoveExperienceFromCartCommand |
| POST | `/guest/cart/reservation` | SetCartReservationCommand |
| DELETE | `/guest/cart/reservation` | RemoveCartReservationCommand |
| DELETE | `/guest/cart` | ClearCartCommand |
| POST | `/guest/cart/checkout` | CheckoutCartCommand |

### Experience Purchases — `/guest/experience-purchases`

| Método | Path | Query |
|--------|------|-------|
| GET | `/guest/experience-purchases` | GetExperiencePurchasesByGuestQuery |
| GET | `/guest/experience-purchases/:id` | GetExperiencePurchaseByIdQuery |

---

## Integración futura con Wompi

La interfaz `IPaymentGateway` está definida en `src/domain/shared/payment-gateway.interface.ts`:

```typescript
export interface IPaymentGateway {
  createPaymentIntent(amountCop: number, metadata: Record<string, string>): Promise<{ reference: string }>;
  confirmPayment(reference: string): Promise<{ success: boolean }>;
}
export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';
```

Para integrar Wompi:
1. Crear `src/infrastructure/payment/gateways/wompi.payment-gateway.ts` implementando `IPaymentGateway`
2. Crear `src/infrastructure/payment/payment.module.ts` con `{ provide: PAYMENT_GATEWAY, useClass: WompiPaymentGateway }`
3. Importar `PaymentModule` en `app.module.ts`
4. Inyectar `@Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway` en `CheckoutCartHandler`
5. Llamar `paymentGateway.createPaymentIntent(cart.getTotalCop(), metadata)` antes de confirmar reservation/purchases
6. Almacenar la referencia en `ExperiencePurchase.paymentReference` via `confirm(reference)`

El `Cart.getTotalCop()` ya suma todos los items + reservationItem.

---

## Ejecutar tests

```bash
pnpm test -- --testPathPattern="cart|experience-purchase"
```

Tests existentes:
- `test/application/cart/add-experience-to-cart.handler.spec.ts` — 5 casos
- `test/application/cart/set-cart-reservation.handler.spec.ts` — 5 casos
- `test/application/cart/checkout-cart.handler.spec.ts` — 7 casos
