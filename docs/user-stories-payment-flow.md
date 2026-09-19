# Cart-First Payment Flow — User Stories

**Epic:** LYMON-099 — Wompi Payment Gateway Integration  
**Labels:** backend, frontend, payment, cart, wompi  
**Team:** Lymon Squad

---

## Story 1: Guest adds reservation draft to cart

**As a** guest  
**I want to** select dates and a unit and add them to my cart without creating a real reservation  
**So that** I can review my booking details before committing to payment  

### Acceptance Criteria

- `POST /guest/cart/reservation` receives tenantId, propertyId, unitId, checkIn, checkOut, guestsCount, pricePerNight from the frontend
- Backend validates unit availability for the requested dates using `AvailabilityChecker`
- Backend calculates `totalPrice = pricePerNight × nights`
- Backend stores a **draft** `CartReservationItem` in the cart (with `reservationId: null`)
- **No** `Reservation` entity is created in the database
- If unit is unavailable, returns `409 Conflict`
- If unit not found, returns `404 Not Found`

### Gherkin Scenarios

```gherkin
Feature: Reservation Draft in Cart

  Scenario: Guest adds available unit to cart
    Given the guest is authenticated with a valid GuestJWT
    And the unit "Villa del Mar" is available from 2026-06-01 to 2026-06-05
    When the guest sends POST /guest/cart/reservation with
      | tenantId    | "abc"                           |
      | propertyId  | "prop-123"                      |
      | unitId      | "unit-456"                      |
      | checkIn     | "2026-06-01"                    |
      | checkOut    | "2026-06-05"                    |
      | guestsCount | 2                               |
      | pricePerNight | 200000                        |
    Then the response status is 201
    And the cart contains a reservation draft with:
      | propertyId | "prop-123" |
      | unitId     | "unit-456" |
      | checkIn    | "2026-06-01" |
      | checkOut   | "2026-06-05" |
      | totalPriceCop | 800000 |
      | reservationId | null |

  Scenario: Guest adds unavailable unit to cart
    Given the unit "Villa del Mar" is already booked from 2026-06-01 to 2026-06-03
    When the guest sends POST /guest/cart/reservation with overlapping dates
    Then the response status is 409 Conflict
    And an error message "Unit is not available for the requested dates"

  Scenario: Guest adds non-existent unit to cart
    When the guest sends POST /guest/cart/reservation with a non-existent unitId
    Then the response status is 404 Not Found
  
  Scenario: Guest adds reservation draft without pricePerNight
    When the guest sends POST /guest/cart/reservation without "pricePerNight"
    Then the response status is 400 Bad Request
```

---

## Story 2: Guest adds experiences to cart

**As a** guest  
**I want to** add experience purchases to my cart  
**So that** I can combine accommodation and activities in a single payment

### Acceptance Criteria

- `POST /guest/cart/items` receives tenantId, experienceId, quantity, selectedDate
- Backend validates experience exists and is `ACTIVE`
- Backend validates purchase rules (standalone vs reservation add-on)
- Backend validates capacity is not exceeded
- Item is added to the cart with unit price snapshot
- If no open cart exists, one is created

### Gherkin Scenarios

```gherkin
Feature: Cart Experience Items

  Scenario: Guest adds an available experience to cart
    Given the experience "Sunset Boat Tour" has capacity for 10 guests
    When the guest sends POST /guest/cart/items with
      | tenantId     | "abc"          |
      | experienceId | "exp-789"      |
      | quantity     | 2              |
      | selectedDate | "2026-06-03"   |
    Then the response status is 201
    And the cart contains the experience item with:
      | quantity | 2 |
      | unitPriceCop | 50000 |

  Scenario: Guest adds experience exceeding capacity
    Given the experience "Sunset Boat Tour" has remaining capacity of 1
    When the guest sends POST /guest/cart/items with quantity 5
    Then the response status is 400 Bad Request
    And an error indicates capacity exceeded

  Scenario: Guest adds inactive experience
    Given the experience "Old Tour" is no longer active
    When the guest sends POST /guest/cart/items for that experience
    Then the response status is 400 Bad Request
```

---

## Story 3: Guest checks out and pays with Wompi

**As a** guest  
**I want to** check out my cart and pay via Wompi  
**So that** my reservation and experiences are confirmed

### Acceptance Criteria

- `POST /guest/cart/checkout` receives the **current cart state** from the frontend (reservationItem + experienceItems)
- Backend **updates the cart** with the frontend data before processing
- Backend validates unit availability again (race condition protection)
- Backend validates experience capacity again
- A **new** `Reservation` entity is created in `PENDING` status
- A **new** `PaymentSession` is created with unique `reference`
- Any **existing** pending `PaymentSession` for this cart is expired and replaced
- Cart status changes to `PENDING_PAYMENT`
- `amountInCents = cartTotalCop × 100` (converted to centavos)
- If no guest profile exists for this tenant, it is auto-created
- Returns `PaymentCheckoutResponse` with `publicKey`, `reference`, `amountInCents`, `signatureIntegrity`, `currency`

### Gherkin Scenarios

```gherkin
Feature: Checkout

  Scenario: Guest checks out cart with reservation draft
    Given the guest has an open cart with a reservation draft
    And the unit is still available for the requested dates
    When the guest sends POST /guest/cart/checkout with
      | reservationItem.propertyId | "prop-123" |
      | reservationItem.checkIn    | "2026-06-01" |
      | reservationItem.pricePerNight | 200000 |
    Then the response status is 201
    And the response contains:
      | publicKey | "pub_test_xxx" |
      | reference | "checkout_..._..." |
      | amountInCents | 80000000 |
      | signatureIntegrity | "<sha256-hash>" |
      | currency | "COP" |
    And a Reservation is created with status "PENDING"
    And the cart status is "PENDING_PAYMENT"

  Scenario: Guest checks out cart with accommodation and experiences
    Given the guest has a cart with a reservation draft and 2 experience items
    When the guest sends POST /guest/cart/checkout with full cart state
    Then a single PaymentSession is created with:
      | amountInCents | <sum of all items in cents> |

  Scenario: Guest re-checks out after cart changed
    Given the guest has an existing PENDING PaymentSession
    And the cart was modified (different price)
    When the guest sends POST /guest/cart/checkout with the updated cart state
    Then the old PaymentSession is expired
    And a new PaymentSession is created with the current amount
    And the response contains the new reference

  Scenario: Guest checks out unit that became unavailable
    Given the cart has a reservation draft
    But the unit was booked by another guest in the meantime
    When the guest sends POST /guest/cart/checkout
    Then the response status is 400 Bad Request
    And the error indicates "Unit is no longer available"

  Scenario: Guest checks out with empty cart
    Given the guest has an empty cart
    When the guest sends POST /guest/cart/checkout
    Then the response status is 400 Bad Request
```

---

## Story 4: Wompi processes approved payment

**As a** Wompi webhook  
**I want to** notify the backend of an approved transaction  
**So that** the reservation and experience purchases are confirmed

### Acceptance Criteria

- Webhook endpoint `POST /payments/wompi/webhook` validates the event checksum
- Only processes `transaction.updated` events with status `APPROVED`
- Validates `amountInCents` and `currency` match the stored `PaymentSession`
- In a database transaction:
  - `PaymentSession` status changes to `APPROVED`
  - `Reservation` status changes to `CONFIRMED`
  - `ExperiencePurchase` entities are created and confirmed for each experience item
  - Cart status changes to `PAID`
- Ignores duplicate webhooks (session already approved)
- Emits `wompi.payment.approved` event

### Gherkin Scenarios

```gherkin
Feature: Approved Payment Webhook

  Scenario: Wompi sends approved payment for cart with reservation and experiences
    Given a PaymentSession exists with status "PENDING"
    And the associated cart has a reservation draft with reservationId and 2 experience items
    When Wompi sends POST /payments/wompi/webhook with:
      | event   | "transaction.updated" |
      | transaction.status | "APPROVED" |
      | transaction.reference | "<matches session reference>" |
      | transaction.amount_in_cents | 80000000 |
      | transaction.currency | "COP" |
    Then the response is { "accepted": true, "processed": true }
    And the PaymentSession status is "APPROVED"
    And the Reservation status is "CONFIRMED"
    And 2 ExperiencePurchase entities are created with status "CONFIRMED"
    And the Cart status is "PAID"

  Scenario: Wompi sends duplicate approved event
    Given the PaymentSession is already "APPROVED"
    When Wompi sends an identical webhook again
    Then the webhook is ignored
    And no duplicate resources are created

  Scenario: Wompi sends event with mismatched amount
    Given the PaymentSession has amountInCents 80000000
    When Wompi sends webhook with amount_in_cents 50000000
    Then the webhook is ignored

  Scenario: Wompi sends invalid checksum
    When Wompi sends webhook with invalid `x-event-checksum` header
    Then the response is { "accepted": true, "processed": false }
```

---

## Story 5: Wompi processes declined/failed payment

**As a** Wompi webhook  
**I want to** notify the backend of a declined or failed transaction  
**So that** the cart can be reopened and the guest can retry

### Acceptance Criteria

- When `transaction.status` is `DECLINED`, `ERROR`, `VOIDED`, or `EXPIRED`:
  - `PaymentSession` status is updated accordingly
  - If the cart has an associated `Reservation` in `PENDING` status, it is cancelled with reason `"Payment failed"`
  - Cart status changes back to `OPEN` (reopened)
- Guest can immediately retry checkout with the same cart

### Gherkin Scenarios

```gherkin
Feature: Failed Payment Webhook

  Scenario: Wompi sends declined payment
    Given a PaymentSession exists with status "PENDING"
    And a Reservation exists with status "PENDING" linked to the cart
    When Wompi sends POST /payments/wompi/webhook with transaction.status "DECLINED"
    Then the PaymentSession status is "DECLINED"
    And the Reservation status is "CANCELLED"
    And the cart status is "OPEN"
    And the guest can retry checkout

  Scenario: Wompi sends expired payment
    Given a PaymentSession exists with status "PENDING"
    And the payment window expired
    When Wompi sends POST /payments/wompi/webhook with transaction.status "EXPIRED"
    Then the PaymentSession status is "EXPIRED"
    And the Reservation is cancelled
    And the cart is reopened to "OPEN"

  Scenario: Wompi sends voided payment
    When Wompi sends POST /payments/wompi/webhook with transaction.status "VOIDED"
    Then the PaymentSession status is "CANCELLED"
    And any PENDING reservation is cancelled
    And the cart is reopened to "OPEN"
```

---

## Story 6: Stale pending reservations are automatically expired

**As a** system  
**I want to** automatically cancel reservations that were created during checkout but never paid  
**So that** inventory is not indefinitely blocked by abandoned bookings

### Acceptance Criteria

- A scheduled job runs every 5 minutes
- Finds all carts in `PENDING_PAYMENT` status with `updatedAt < now - 10 minutes`
- For each such cart:
  - If there is no `PENDING` `PaymentSession`, cancel the associated `Reservation` with reason `"Expired: no payment initiated"`
  - Cart status reverts to `OPEN`
- If the payment was later completed (race condition), the cronjob skips that cart

### Gherkin Scenarios

```gherkin
Feature: Stale Reservation Cleanup

  Scenario: Cron job cancels expired pending reservation
    Given a cart in "PENDING_PAYMENT" status for 12 minutes
    And it has no active PaymentSession
    When the cleanup cron job runs
    Then the associated Reservation is cancelled with reason "Expired: no payment initiated"
    And the cart status is "OPEN"

  Scenario: Cron job skips cart with active payment session
    Given a cart in "PENDING_PAYMENT" status for 12 minutes
    But it has an active PENDING PaymentSession
    When the cleanup cron job runs
    Then the cart and reservation are not touched

  Scenario: Cron job skips recently modified carts
    Given a cart in "PENDING_PAYMENT" status for 3 minutes
    When the cleanup cron job runs
    Then the cart is skipped (within the 10-minute grace period)
```

---

## Story 7: Guest views cart status and retries payment

**As a** guest  
**I want to** view my cart status after checkout  
**So that** I know whether my payment succeeded, failed, or is processing

### Acceptance Criteria

- `GET /guest/cart` returns the cart if status is `OPEN` or `PENDING_PAYMENT`
- If cart is `PAID`, returns `null` (guest should see their confirmed reservations elsewhere)
- Response includes `reservationItem` (with `reservationId` if created) and `experienceItems`
- `GET /guest/cart/checkout/status/:reference` returns payment session status:
  - `isTerminal: true` when status is APPROVED, DECLINED, EXPIRED, VOIDED, ERROR
  - Allows polling until terminal state

### Gherkin Scenarios

```gherkin
Feature: Cart Status

  Scenario: Guest views open cart
    Given the guest has an open cart with a reservation draft and 2 experience items
    When the guest sends GET /guest/cart
    Then the response contains:
      | status | "OPEN" |
      | reservationItem.reservationId | null |
      | totalCop | <calculated total> |

  Scenario: Guest views cart during payment
    Given the guest checked out and cart is "PENDING_PAYMENT"
    When the guest sends GET /guest/cart
    Then the response contains:
      | status | "PENDING_PAYMENT" |
      | reservationItem.reservationId | "<created reservation id>" |

  Scenario: Guest views cart after successful payment
    Given the payment was approved and cart is "PAID"
    When the guest sends GET /guest/cart
    Then the response is null

  Scenario: Guest polls checkout status
    Given a PaymentSession is processing
    When the guest sends GET /guest/cart/checkout/status/<reference>
    And the payment is approved
    Then the response contains:
      | status | "APPROVED" |
      | isTerminal | true |
```

---

## Story 8: Guest retries checkout after failed payment

**As a** guest  
**I want to** retry the checkout after a payment failure  
**So that** I can complete my booking

### Acceptance Criteria

- After a failed payment, the cart is automatically reopened to `OPEN`
- Guest can modify the cart (change dates, add/remove items) before retrying
- On retry, a new `PaymentSession` is created with a unique reference
- The old (failed) `PaymentSession` is preserved for audit

### Gherkin Scenarios

```gherkin
Feature: Retry Checkout

  Scenario: Guest retries checkout after declined payment
    Given the payment was declined
    And the cart is back to "OPEN"
    When the guest sends POST /guest/cart/checkout with updated cart state
    Then a new PaymentSession is created
    And the response contains a new reference
    And the old PaymentSession status remains "DECLINED"

  Scenario: Guest changes dates after failure and retries
    Given the payment was declined
    And the guest updates checkIn and checkOut
    When the guest sends POST /guest/cart/checkout with new dates
    Then the new reservation is created with the updated dates
    And availability is re-validated

  Scenario: Guest retries after unit became unavailable
    Given the first checkout failed
    And the unit was booked by another guest
    When the guest sends POST /guest/cart/checkout again
    Then the response is 400 Bad Request
    And the guest is informed the unit is no longer available
```

---

## Story 9: Frontend sends cart state as source of truth

**As a** backend  
**I want to** receive the full cart state from the frontend on every checkout  
**So that** the payment amount always matches what the guest sees

### Acceptance Criteria

- `POST /guest/cart/checkout` accepts optional `reservationItem` and `experienceItems` in the request body
- Backend **updates** the cart with the frontend data before processing checkout
- Backend re-validates availability and capacity against the received data
- If the frontend data differs from the stored cart, the stored cart is overwritten
- This ensures the "source of truth" is what the guest sees in the browser

### Gherkin Scenarios

```gherkin
Feature: Frontend Source of Truth

  Scenario: Guest changes dates in frontend and checks out
    Given the cart has a reservation draft for June 1-5
    When the guest modifies dates to June 10-15 in the frontend
    And sends POST /guest/cart/checkout with the new dates
    Then the backend updates the cart with June 10-15
    And the PaymentSession is created for the updated dates

  Scenario: Guest modifies price locally and sends tampered data
    Given the unit price is 200000
    When the guest sends POST /guest/cart/checkout with pricePerNight 1
    Then the backend recalculates using 1 × nights
    And the amountInCents reflects the tampered price
    Note: Price validation against the listing is a future enhancement
```

---
