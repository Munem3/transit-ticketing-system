# TransitBD — Mass Transport Ticketing System with Intelligent Transit Analytics

A full-stack ticketing platform for Bangladesh's bus, intercity train, and metro
networks, with real-time seat tracking, a mock digital wallet, QR tickets, and
three AI features powered by Google Gemini (with graceful heuristic fallbacks).

## Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js Server Actions + Route Handlers
- **Database/ORM:** Prisma (SQLite by default; swap to PostgreSQL/MySQL in one line)
- **Auth:** NextAuth.js (Credentials provider, JWT sessions)
- **AI:** Google Gemini API (`@google/generative-ai`)

## Features

| Area | What it does |
|------|--------------|
| Auth | Register / login with hashed passwords via NextAuth.js |
| Booking | Browse trips by mode, live seat maps, **5-minute hold countdown**, multi-seat selection |
| Payments | Mock **bKash / Rocket / Card** wallet charged against a live balance |
| Tickets | Instant **QR-coded** tickets, receipts, and one-tap cancellation + refund |
| AI Predictor | Forecasts route load from booking history, suggests off-peak times & fare multiplier |
| AI Planner | Multi-modal (metro + train + bus) journey planning over the real network |
| AI Support Bot | Conversational FAQ + booking-status + cancellation help |
| Admin | Stats, fare-grid editing (peak multiplier), trip pausing, transaction ledger |

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
copy .env.example .env      # Windows (or: cp .env.example .env)

# 3. Generate client, create the DB, and seed demo data
npm run setup

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000.

### Demo accounts

| Role  | Email               | Password    |
|-------|---------------------|-------------|
| Admin | admin@transit.bd    | admin123    |
| User  | rahim@example.com   | password123 |

New sign-ups start with a ৳1,000 demo wallet balance.

## Enabling live AI (optional)

The three AI features work out of the box using built-in heuristics. To use the
real Gemini model, add a key to `.env`:

```
GEMINI_API_KEY="your-key-from-https://aistudio.google.com/app/apikey"
GEMINI_MODEL="gemini-1.5-flash"
```

## Switching to PostgreSQL

1. In `prisma/schema.prisma` set `provider = "postgresql"`.
2. In `.env` set `DATABASE_URL="postgresql://user:pass@localhost:5432/transit"`.
3. Run `npm run setup` again.

## Project structure

```
app/
  api/
    auth/[...nextauth]/   NextAuth handler
    register/             Sign-up endpoint
    ai/{predict,planner,support}/   AI route handlers
  actions/                Server actions (booking, wallet, admin)
  book/[tripId]/          Seat selection + payment
  tickets/                Ticket list + QR detail
  wallet/                 Balance + top-up + ledger
  assistant/              AI assistant (3 tabs)
  admin/                  Admin control panel
components/               UI (SeatBooking, Countdown, AssistantTabs, …)
lib/                      prisma, auth, gemini, qr, analytics, seats, utils
prisma/                   schema + seed
```

## Notes

- Payments and AI are **simulated** — this is an educational project.
- Seat holds auto-expire; expiry is swept opportunistically on reads/bookings
  (`lib/seats.ts`), so no separate cron is required for the demo.
