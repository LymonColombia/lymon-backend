# ADR 001: Guest Cancellation and Refund Requests

**Status:** Accepted  
**Date:** 2026-05-15  
**Deciders:** Felipe (Product Owner)

---

## Context

Guests need to cancel their own reservations from the portal. When a guest cancels a paid (CONFIRMED) reservation, a refund may be due depending on how close to check-in the cancellation happens. There is no existing guest-facing cancel endpoint — only staff can cancel via `POST /reservations/:id/cancel` (requires `RESERVATION_EDIT` permission). Payment refunds are not yet automated; staff manually processes refunds outside the system.

The `CancellationPolicy` enum (`FLEXIBLE`, `STANDARD`, `STRICT`) already exists on the `Property` entity but has zero enforcement logic.

## Decision

### Scope
- Only `DIRECT`-source reservations (portal self-bookings) can be cancelled by the guest.
- External/OTA reservations (`AIRBNB`, `BOOKING`, `VRBO`) are excluded — guest must cancel via the OTA.
- Only one cancellation policy is used: **STANDARD**.

### Cancellation Policy (STANDARD)
- **≥ 5 days before check-in:** Full refund (100% of `totalPrice`).
- **< 5 days before check-in:** No refund (0%).

The policy is hardcoded in the `CancellationRefundService` domain service rather than read from the `Property.cancellationPolicy`, since the product explicitly requires a single STANDARD policy for all properties.

### Cancel Flow
1. Guest calls `POST /guest/reservations/:id/cancel`.
2. Handler validates:
   - Reservation exists.
   - Reservation belongs to the guest (via `Guest → guestAccountId` chain).
   - Source is `DIRECT`.
   - Status is `PENDING` or `CONFIRMED`.
3. Reservation transitions to `CANCELLED` immediately.
4. If status was `PENDING` (unpaid) → no refund. Done.
5. If status was `CONFIRMED` (paid) → a `RefundRequest` entity is created with `status = PENDING` and the calculated amount.
6. Events emitted: `ChannexAvailabilityUpdateEvent`, `AuditLoggedEvent`.
7. Staff reviews pending `RefundRequest`s and manually approves/denies via `PATCH /refund-requests/:id/approve|deny`.

### Ownership
- Guest can only cancel reservations linked to their `GuestAccount`.
- Walk-in reservations (`guestAccountId = null`) cannot be cancelled from portal — no portal account exists.

### Refund Request States
```
PENDING → APPROVED (staff)
PENDING → DENIED (staff)
```
Both are terminal. No re-processing.

### Refund amount visible in GET detail
The `GET /guest/reservations/:id` endpoint includes a `refundPolicy` field showing:
- `eligible`: whether a refund applies (true for CONFIRMED, false otherwise)
- `refundAmount`: calculated amount at the moment of the request
- `policy`: always `"STANDARD"`
- `daysBeforeCheckIn`: days remaining until check-in
- `refundRequestId`: if a refund request was already created

## Consequences

### Positive
- Guest gets instant cancellation confirmation (no pending-approval state).
- Staff retains full control over actual money movement — no automated payouts.
- Refund paper trail via `RefundRequest` entity + audit log.
- Consistent with Airbnb Moderate policy, familiar to users.

### Negative
- Staff must manually process refunds outside the system (no Wompi API integration yet).
- Policy is hardcoded — if business changes to support FLEXIBLE/STRICT, the service must be updated.

## Technical Architecture

### New files

| Layer | File |
|---|---|
| Domain | `refund/value-objects/refund-request-status.vo.ts` |
| Domain | `refund/value-objects/refund-request-id.vo.ts` |
| Domain | `refund/entities/refund-request.entity.ts` |
| Domain | `refund/repositories/refund-request.repository.ts` |
| Domain | `reservation/services/cancellation-refund.service.ts` |
| Infra | `persistence/schemas/refund-request.schema.ts` |
| Infra | `persistence/repositories/mongo-refund-request.repository.ts` |
| App | `reservation/commands/cancel-guest-reservation/*` |
| App | `refund/commands/approve-refund/*` |
| App | `refund/commands/deny-refund/*` |
| App | `refund/queries/get-refund-requests/*` |
| Pres | `controllers/refund.controller.ts` |
| Pres | `dtos/refund/*` |

### Modified files

- `presentation/controllers/guest-reservation.controller.ts` — add `POST :id/cancel`
- `application/reservation/queries/get-guest-reservation/*` — add `refundPolicy` to result
- `application/application.module.ts` — import `RefundApplicationModule`
- `infrastructure/persistence/persistence.module.ts` — register schema + repository
- `presentation/presentation.module.ts` — register `RefundController`

### Sequence

```
Guest                     GuestReservationController          CancelGuestReservationHandler
  |                                |                                      |
  | POST /guest/reservations/:id/cancel                                   |
  |------------------------------->|                                      |
  |                                |  CancelGuestReservationCommand       |
  |                                |-------------------------------------->|
  |                                |                                      |-- find reservation
  |                                |                                      |-- find guest → check guestAccountId
  |                                |                                      |-- validate source === DIRECT
  |                                |                                      |-- validate status PENDING|CONFIRMED
  |                                |                                      |-- calculate refund via CancellationRefundService
  |                                |                                      |-- reservation.cancel()
  |                                |                                      |-- if refund > 0: RefundRequest.create()
  |                                |                                      |-- save reservation + refund request
  |                                |                                      |-- emit events
  |                                |<--------------------------------------|
  |<-------------------------------|
```
