# Detailed Use Case Description — Book & Pay for Ticket

> The core use case of the TransitBD Mass Transport Ticketing System.

| Field | Description |
|---|---|
| **Use Case ID** | UC-04 |
| **Use Case Name** | Book & Pay for Ticket |
| **Primary Actor** | Commuter (registered, logged-in user) |
| **Secondary Actors** | Mock Wallet (bKash / Rocket / Card), Database (Prisma) |
| **Goal** | Let a commuter reserve seats on a trip and pay for them, receiving a QR-coded ticket. |
| **Trigger** | Commuter selects a trip and taps "Select seats". |
| **Priority** | High (main functionality) |

## Preconditions
1. The commuter is registered and authenticated (valid NextAuth session).
2. The chosen trip is active and has at least one `AVAILABLE` seat.
3. The commuter has a wallet balance (top-up available if insufficient).

## Postconditions
**Success**
- A `Booking` exists with status `CONFIRMED`.
- The selected `Seat`(s) have status `BOOKED`.
- The commuter's `User.balance` is reduced by the total fare and a `PURCHASE` `Transaction` is recorded.
- A QR-coded ticket is issued and viewable under "My Tickets".

**Failure**
- No seats are booked, no money is deducted, and any temporary hold is released (`EXPIRED`).

## Main Success Scenario
| # | Actor action | System response |
|---|---|---|
| 1 | Commuter selects seats and taps **Hold seats & pay**. | UI calls `holdSeats(tripId, seatIds)`. |
| 2 | — | System re-checks availability in a transaction, creates a `PENDING` booking, marks seats `HELD`, sets a 5-minute `holdExpiresAt`. |
| 3 | — | UI shows a **live countdown** and payment options (bKash / Rocket / Card). |
| 4 | Commuter chooses a provider and confirms payment. | UI calls `confirmBooking(bookingId, provider)`. |
| 5 | — | System verifies `balance ≥ totalFare`. |
| 6 | — | System charges the mock wallet, deducts balance, sets booking `CONFIRMED`, marks seats `BOOKED`, and records a `PURCHASE` transaction — all in one DB transaction. |
| 7 | — | System generates the QR payload and returns the confirmed ticket. |
| 8 | — | UI redirects to "My Tickets" and displays the QR ticket. |

## Alternate & Exception Flows
- **3a. Seat taken during selection:** if another user booked a chosen seat first, the hold fails with *"seat just taken"*; the commuter picks another seat (return to step 1).
- **4a. Hold timer expires:** if the 5-minute timer runs out before payment, the booking is auto-set to `EXPIRED` and the held seats are released (`AVAILABLE`). The commuter must start again.
- **5a. Insufficient balance:** if `balance < totalFare`, the system prompts a **wallet top-up**; after topping up, the commuter retries payment (return to step 4).
- **6a. Payment/DB failure:** the transaction rolls back atomically — no partial charge or half-confirmed booking; an error is shown.

## Business Rules
- A seat can be held by only one booking at a time (DB unique constraint on `(tripId, label)`).
- Seat state transitions: `AVAILABLE → HELD → BOOKED`, or `HELD → AVAILABLE` on expiry/cancel.
- Balance deduction, booking confirmation, seat update, and the ledger entry are **atomic** (single Prisma transaction) to prevent double-booking or balance drift.
- Fare = `Route.baseFare × Trip.fareMultiplier × seatCount`.

## Related Diagrams
- **Sequence:** `sequence-booking.drawio`
- **Activity:** `activity-booking.drawio`
- **Class:** `class-diagram.drawio`
