# User Story: Guest Reservation Cancellation

## Metadata

| Field | Value |
|---|---|
| **ID** | US-001 |
| **Title** | Reservation cancellation with refund request |
| **Story Points** | 8 |
| **Priority** | High |
| **Iteration** | Sprint X |
| **Analyst** | Felipe |
| **Developer** | Backend |
| **Date** | 2026-05-15 |

---

## Story

**As** an authenticated guest on the portal  
**I want** to cancel my direct booking (DIRECT) from the portal  
**So that** I don't have to contact staff by phone/email and, if applicable per policy, receive a refund managed by hotel staff

---

## Description

Currently reservations can only be cancelled by staff via the `POST /reservations/:id/cancel` endpoint. Guests have no access to this functionality, forcing them to contact the hotel for any cancellation.

We need to implement a public endpoint (authenticated with GuestJWT) that allows guests to cancel their own reservation when:
- The reservation was created directly on the portal (source = DIRECT)
- The reservation is in PENDING (unpaid) or CONFIRMED (paid) status

On cancellation:
- If the reservation is PENDING → it cancels without refund
- If the reservation is CONFIRMED → the STANDARD policy is applied to calculate the refund, and a refund request (RefundRequest) is created in PENDING status for staff review

Staff reviews pending refund requests, approves or denies them, and processes the payment manually outside the system.

---

## Acceptance Criteria

### AC-01: Successful cancellation with refund (CONFIRMED, ≥ 5 days before check-in)

- **Given** an authenticated guest with a DIRECT reservation in CONFIRMED status
- **And** 7 days remain until check-in
- **When** the guest sends `POST /guest/reservations/:id/cancel`
- **Then** the system responds with `200 OK`
- **And** `refundAmount` equals the reservation's `totalPrice` (100%)
- **And** `refundRequestId` is not null
- **And** the reservation transitions to CANCELLED status
- **And** a RefundRequest is created with status PENDING and amount = totalPrice
- **And** a RESERVATION_CANCELLED audit event is emitted
- **And** a ChannexAvailabilityUpdate event is emitted to free the dates

### AC-02: Cancellation without refund (CONFIRMED, < 5 days before check-in)

- **Given** an authenticated guest with a DIRECT reservation in CONFIRMED status
- **And** 1 day remains until check-in
- **When** the guest sends `POST /guest/reservations/:id/cancel`
- **Then** the system responds with `200 OK`
- **And** `refundAmount` is 0
- **And** `refundRequestId` is null
- **And** the reservation transitions to CANCELLED status
- **And** NO RefundRequest is created

### AC-03: PENDING reservation cancellation (no refund)

- **Given** an authenticated guest with a DIRECT reservation in PENDING status
- **When** the guest sends `POST /guest/reservations/:id/cancel`
- **Then** the system responds with `200 OK`
- **And** `refundAmount` is 0
- **And** `refundRequestId` is null
- **And** the reservation transitions to CANCELLED status

### AC-04: Rejection for non-DIRECT reservation

- **Given** an authenticated guest with an AIRBNB reservation in CONFIRMED status
- **When** the guest sends `POST /guest/reservations/:id/cancel`
- **Then** the system responds with `400 Bad Request`
- **And** the message states "Only direct bookings can be cancelled from the portal"

### AC-05: Rejection for non-owned reservation

- **Given** an authenticated guest with ID "A"
- **And** a reservation exists that belongs to guestAccount "B"
- **When** guest "A" sends `POST /guest/reservations/:id/cancel` with that reservation's ID
- **Then** the system responds with `403 Forbidden`
- **And** the message states "You do not have access to this reservation"

### AC-06: Rejection for invalid status

- **Given** an authenticated guest with a DIRECT reservation in CHECKED_IN status
- **When** the guest sends `POST /guest/reservations/:id/cancel`
- **Then** the system responds with `400 Bad Request`
- **And** the message states "Reservation cannot be cancelled in its current state"

### AC-07: Rejection for non-existent reservation

- **Given** an authenticated guest
- **When** the guest sends `POST /guest/reservations/:id/cancel` with a non-existent ID
- **Then** the system responds with `404 Not Found`

### AC-08: View refundPolicy in reservation detail (CONFIRMED, eligible)

- **Given** an authenticated guest with a DIRECT reservation in CONFIRMED status
- **And** 7 days remain until check-in
- **When** the guest requests `GET /guest/reservations/:id`
- **Then** the response includes:
  ```json
  {
    "refundPolicy": {
      "eligible": true,
      "refundAmount": <totalPrice>,
      "policy": "STANDARD",
      "daysBeforeCheckIn": 7,
      "refundRequestId": null
    }
  }
  ```

### AC-09: View refundPolicy in reservation detail (CONFIRMED, not eligible)

- **Given** an authenticated guest with a DIRECT reservation in CONFIRMED status
- **And** 1 day remains until check-in
- **When** the guest requests `GET /guest/reservations/:id`
- **Then** the response includes:
  ```json
  {
    "refundPolicy": {
      "eligible": true,
      "refundAmount": 0,
      "policy": "STANDARD",
      "daysBeforeCheckIn": 1,
      "refundRequestId": null
    }
  }
  ```

### AC-10: View refundPolicy in reservation detail (PENDING)

- **Given** an authenticated guest with a DIRECT reservation in PENDING status
- **When** the guest requests `GET /guest/reservations/:id`
- **Then** `refundPolicy.eligible` is `false`
- **And** `refundPolicy.refundAmount` is 0

### AC-11: Staff approves refund request

- **Given** an authenticated staff member with CRM_MANAGE permission
- **And** a RefundRequest exists in PENDING status
- **When** the staff sends `PATCH /refund-requests/:id/approve`
- **Then** the system responds with `200 OK`
- **And** the RefundRequest transitions to APPROVED status
- **And** `reviewedBy` and `reviewedAt` are recorded

### AC-12: Staff denies refund request

- **Given** an authenticated staff member with CRM_MANAGE permission
- **And** a RefundRequest exists in PENDING status
- **When** the staff sends `PATCH /refund-requests/:id/deny`
- **Then** the system responds with `200 OK`
- **And** the RefundRequest transitions to DENIED status
- **And** `reviewedBy` and `reviewedAt` are recorded

### AC-13: Staff lists refund requests

- **Given** an authenticated staff member with CRM_VIEW permission
- **When** the staff requests `GET /refund-requests?status=PENDING`
- **Then** the response includes a paginated list of RefundRequests in PENDING status
- **And** each item contains: id, reservationId, guestId, amount, status, createdAt

### AC-14: Staff cannot approve/deny an already processed RefundRequest

- **Given** an authenticated staff member with CRM_MANAGE permission
- **And** a RefundRequest exists in APPROVED status
- **When** the staff tries to approve again via `PATCH /refund-requests/:id/approve`
- **Then** the system responds with `400 Bad Request`

### AC-15: RefundRequestId visible in detail after cancellation

- **Given** a guest who cancelled a CONFIRMED reservation with a refund
- **When** the guest requests `GET /guest/reservations/:id`
- **Then** `refundPolicy.refundRequestId` contains the ID of the created RefundRequest

---

## Subtasks (Backend)

### Domain Layer

- [ ] **SUB-01**: Create domain model for RefundRequest (entity, value objects, repository interface)
- [ ] **SUB-02**: Implement CancellationRefundService with STANDARD policy rule

### Infrastructure Layer

- [ ] **SUB-03**: Create Mongoose schema, repository implementation, and wire DI for RefundRequest persistence

### Application Layer

- [ ] **SUB-04**: Implement CancelGuestReservation command (validate ownership, source, status; calculate refund; cancel; create RefundRequest if applicable; emit events)
- [ ] **SUB-05**: Implement staff refund management (approve/deny/list RefundRequests)
- [ ] **SUB-06**: Wire new modules (RefundApplicationModule, register CancelGuestReservationHandler)

### Presentation Layer

- [ ] **SUB-07**: Add guest cancel endpoint to GuestReservationController
- [ ] **SUB-08**: Create RefundController with staff endpoints (list, approve, deny) + DTOs

### Query Detail Enhancement

- [ ] **SUB-09**: Add refundPolicy field to reservation detail endpoint (eligible, refundAmount, daysBeforeCheckIn, refundRequestId)

### Testing

- [ ] **SUB-10**: Unit tests for domain service, handlers, and query changes

---

## Technical Notes

### RefundRequest Entity

```
RefundRequest {
  id: RefundRequestId | null
  tenantId: TenantId
  reservationId: ReservationId
  guestId: GuestId
  amount: number
  status: RefundRequestStatus (PENDING | APPROVED | DENIED)
  requestedBy: string (always "guest")
  reviewedBy: string | null (staff userId)
  reviewedAt: Date | null
  reason: string | null
  createdAt: Date
  updatedAt: Date
}
```

### STANDARD Rule (hardcoded)

```
daysUntilCheckIn = floor(checkIn - now)
if daysUntilCheckIn >= 5 → refundAmount = totalPrice
if daysUntilCheckIn < 5  → refundAmount = 0
```

### Frontend Considerations

- Show "Cancel reservation" button only if `source === "DIRECT"` and `status === "PENDING" | "CONFIRMED"`
- Before cancelling, display refund information using `refundPolicy` from the GET detail
- If `refundAmount > 0`, indicate the refund will be reviewed by staff
- After cancelling, redirect to detail where `refundRequestId` is now visible

### Dependencies

- None external. The payment gateway (Wompi) already exists but is NOT integrated in this story — refunds are manual.
