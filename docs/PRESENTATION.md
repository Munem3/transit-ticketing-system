---
marp: true
theme: default
paginate: true
size: 16:9
---

<!-- Open in VS Code with the "Marp for VS Code" extension → export to PDF/PPTX.
     Or present the ready-made deck: docs/presentation.html (opens in any browser). -->

# TransitBD
## Mass Transport Ticketing System with Intelligent Transit Analytics

**Group-12** · Progress Presentation · 3 August 2026
Bus · Intercity Train · Metro — one platform
`github.com/Munem3/transit-ticketing-system`

---

## 1 · Problem Statement

Public transport in Bangladesh (bus, intercity train, metro) suffers from scheduling inefficiency, overcrowding, and poor seat allocation.

**For commuters**
- Severe peak-hour congestion
- No dynamic fare transparency
- Hard to plan multi-modal transfers (metro ↔ train ↔ bus)
- No unified booking across modes

**For authorities**
- No prediction of peak passenger spikes
- Cannot manage congestion dynamically
- No real-time, context-aware passenger assistance

➡ **Solution:** a unified ticketing platform + AI-driven transit analytics.

---

## 2 · Requirement Analysis — Functional

- Secure registration & login (NextAuth.js)
- Browse routes/trips by mode with **real-time seat tracking**
- View train compartments / metro cars / bus cabins
- Transient seat holds with **countdown timers**
- Mock wallet payments — bKash / Rocket / Card
- Instant **QR-coded tickets** + receipts
- Cancellation with automatic wallet refund
- **AI** Peak Demand & Fare Predictor
- **AI** Multi-Modal Route Planner
- **AI** Customer Support Bot
- Admin: schedules, fare grid, transaction ledger

---

## 2 · Requirement Analysis — Non-Functional

| Attribute | How we meet it |
|---|---|
| **Security** | bcrypt hashing, JWT sessions, server-side authz, Zod validation |
| **Performance** | Indexed queries, server-rendered pages, sub-second reads |
| **Reliability** | Transactional booking (no double-booking), auto-expiry of holds |
| **Usability** | Responsive, mobile-first UI, clear booking flow |
| **Scalability** | Prisma ORM, SQLite → PostgreSQL, stateless backend |
| **Maintainability** | TypeScript end-to-end, modular App Router |

---

## 3 · Feasibility Analysis

**Technical** — Proven stack (Next.js, Prisma, NextAuth, Gemini); a *working prototype is already built end-to-end*; AI has a heuristic fallback, so no hard dependency.

**Operational** — Familiar bKash/Rocket wallet UX; QR-at-gate already used by Dhaka Metro; admin panel means low operator training.

**Economic** — 100% open-source stack; free tiers (Vercel, Gemini, Postgres); mock payments avoid gateway fees during development.

➡ Practical & achievable: the core already runs; remaining work is polish, live-AI tuning, and deployment.

---

## 4 · UML — Use Case Diagram

![w:640](use-case.png)

<!-- Generate use-case.png from docs/use-case.puml at plantuml.com,
     or see the rendered SVG version inside docs/presentation.html -->

**Actors:** Commuter, Administrator, Gemini AI (external LLM)
**Green use cases** are AI-powered: Support Bot · Route Planner · Demand & Fare Forecast.

---

## 5 · Technology Stack

- **Frontend:** TypeScript · Next.js 14 (App Router) · React 18 · Tailwind CSS
- **Backend:** Next.js Server Actions · API Route Handlers · Zod
- **Database/ORM:** Prisma · SQLite (dev) → PostgreSQL/MySQL (prod)
- **Auth:** NextAuth.js (Credentials, JWT) · bcrypt
- **AI & Analytics:** Google Gemini API · Prisma aggregation over booking/transaction history
- **Tickets & Tooling:** `qrcode` · Node.js · Git/GitHub · Vercel

---

## 6 · Project Timeline (3 weeks left)

| Phase | Wk 0 (Aug 1–3) ✅ | Wk 1 (Aug 4–10) | Wk 2 (Aug 11–17) | Wk 3 (Aug 18–24) |
|---|:--:|:--:|:--:|:--:|
| Requirements & design | ▓▓ | | | |
| Env setup & core prototype | ▓▓ | | | |
| Live Gemini AI + tuning | | ▓▓ | ▒ | |
| Concurrency, real-time, tests | | ▓▓ | | |
| Analytics & UI polish | | | ▓▓ | |
| Mobile / a11y / seed data | | | ▓▓ | |
| QA, deploy, docs | | | | ▓▓ |

**Final delivery target: 24 August 2026**

---

## 7 · Progress So Far

**✅ Completed**
- Requirement analysis & system design; 7-entity data model
- Environment set up; **production build passing**
- Auth, route browsing, live seat maps, 5-min hold timers
- Mock wallet + ledger, QR tickets, cancel/refund
- Admin panel (fare grid, ledger, trip control)
- All 3 AI features (Gemini + heuristic fallback)
- Seeded data: **5 routes · 108 trips · 4,800 seats**; pushed to GitHub

**🔜 Next:** live Gemini key, real-time seat refresh, analytics charts, tests, deploy.

---

## 8 · Prototype Demonstration

**Flow:** Landing → Register/Login → Dashboard → Browse Trips → Seat Map + Hold → Pay (Wallet) → QR Ticket
plus Wallet/Top-up · AI Assistant (3 tabs) · Admin Panel

**Built pages:** Landing, Register, Login, Dashboard, Routes (mode filter + live load), Seat map + countdown, Wallet + ledger, Tickets + QR, AI Assistant, Admin.

**Live demo:** `npm run setup` → `npm run dev` → `localhost:3000`
Admin: `admin@transit.bd / admin123` · User: `rahim@example.com / password123`

---

# Thank you

**TransitBD — Group-12**
Questions & Answers

`github.com/Munem3/transit-ticketing-system`
