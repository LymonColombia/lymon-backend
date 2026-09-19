# ADR-017: Guest Cart, Compra de Experiencias y Pago de Reservación

**Fecha:** 2026-05-12  
**Estado:** Aceptado

---

## Contexto

Los huéspedes necesitan poder comprar experiencias ofrecidas por el tenant (tours, transporte, actividades) y pagar su reservación de alojamiento. Estas dos acciones pueden ocurrir de forma independiente o combinada en un mismo flujo de checkout.

Las preguntas de diseño claves fueron:

1. ¿Debería el pago de la reservación ir por un endpoint separado o unificarse con el carrito?
2. ¿Puede el huésped comprar experiencias sin tener una reservación?
3. ¿Puede el huésped pagar su reservación sin agregar experiencias?
4. ¿Dónde validar solapamiento de reservaciones?
5. ¿Cómo preparar la integración futura con pasarela de pagos (Wompi/Bancolombia) sin bloquear el flujo actual?

---

## Decisiones

### 1. Carrito unificado como punto único de checkout

El `Cart` aggregate cubre ambos casos: experiencias y reservación en el mismo checkout. El guest construye su carrito y hace un único `POST /guest/cart/checkout`.

**Descartado:** Endpoint separado `POST /guest-reservations/:id/pay`. Habría duplicado lógica de validación (capacidad, solapamiento, ownership), creado dos flujos de pago paralelos, y complicado la integración futura con Wompi donde un solo payment intent debe cubrir el total.

### 2. Carrito flexible — cualquier combinación es válida

| Contenido del carrito | Válido |
|----------------------|--------|
| Solo experiencias (sin reservación) | ✓ |
| Solo reservación (sin experiencias) | ✓ |
| Experiencias + reservación | ✓ |
| Vacío | ✗ — DomainException en checkout |

La verificación de vacío en `CheckoutCartHandler`: `experienceItems.length === 0 && !reservationItem`.

### 3. Validación de solapamiento en dos puntos

La validación de que el huésped no tenga una reservación activa (CONFIRMED o CHECKED_IN) en la misma propiedad con fechas solapadas se aplica en **dos momentos**:

1. **`SetCartReservationHandler`** — falla rápido cuando el huésped agrega la reservación al carrito
2. **`CheckoutCartHandler`** — re-valida antes de confirmar (el tiempo transcurre entre agregar y pagar)

**Razón:** Solo validar en checkout significa que el huésped construye todo el carrito para recibir el error al final. Solo validar al agregar significa que una reservación externa que llegue después no se detecta.

### 4. IPaymentGateway — abstracción preparada, sin implementar

Se define la interfaz `IPaymentGateway` con `createPaymentIntent()` y `confirmPayment()` pero **ningún handler la invoca actualmente**. El checkout confirma la reservación y crea `ExperiencePurchase` en estado PENDING sin procesar pago real.

**Razón:** El equipo aún no tiene acceso a credenciales de Wompi. La interfaz está lista para inyectarse en `CheckoutCartHandler` cuando llegue la integración. El token de inyección `PAYMENT_GATEWAY` está definido en `src/domain/shared/payment-gateway.interface.ts`.


### 5. ExperiencePurchase como aggregate separado (no subdocumento de Cart)

Las compras de experiencias son entidades de larga vida con su propio ciclo: PENDING → CONFIRMED → CANCELLED. Deben ser consultables independientemente del carrito (endpoint `/guest/experience-purchases`).

**Descartado:** Embeber `ExperiencePurchase` como subdocumento de `Cart`. El carrito tiene vida corta (OPEN → CHECKED_OUT); las compras necesitan persistir y ser accesibles después del checkout.

### 6. Reservation.pay() en el dominio

Se agrega el método `pay()` a `Reservation` en lugar de usar el `ConfirmReservationCommand` existente. `ConfirmReservationCommand` es para staff; el pago del guest tiene actor y contexto diferente.

```typescript
pay(): void {
  if (!this.status.isPending()) {
    throw new DomainException('Reservation must be PENDING to pay');
  }
  this.status = ReservationStatus.create(ReservationStatusEnum.CONFIRMED);
  this.touch();
}
```

### 7. Validación de flags de compra en la experiencia

Las experiencias tienen dos flags booleanos:
- `allowStandalonePurchase` — puede comprarse sin reservación
- `allowReservationPurchase` — puede comprarse ligada a una reservación

El `CartItem` puede opcionalmente llevar un `reservationId`. Si lo lleva, se valida `allowReservationPurchase` en checkout. Si no lo lleva (compra independiente), se valida `allowStandalonePurchase` en `AddExperienceToCartHandler`.

---

## Consecuencias

**Positivas:**
- Un solo flow de checkout reduce superficie de bugs y simplifica la UX
- Re-validación en checkout hace el sistema robusto a condiciones de carrera
- Abstracciones de dominio limpias (`Cart`, `ExperiencePurchase`, `pay()`) facilitan testing sin mocks de framework
- Wompi se puede inyectar sin tocar la lógica de negocio — solo el handler inyecta el gateway

**Negativas:**
- `CheckoutCartHandler` es el handler más complejo — múltiples agregados, múltiples saves
- Sin transacción distribuida real: si el save de `ExperiencePurchase` falla a mitad del loop, la reservación ya fue confirmada. Mitigación futura: `TransactionManager` o patrón outbox.
- La doble validación de solapamiento agrega una query extra en cada checkout con reservación.
