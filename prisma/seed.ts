import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { TransportMode } from "../lib/enums";

const prisma = new PrismaClient();

type SeatDef = { label: string; compartment: string };

function seatLayout(mode: TransportMode): SeatDef[] {
  const seats: SeatDef[] = [];
  if (mode === "BUS") {
    // 10 rows x 4 (A B | C D)
    const cols = ["A", "B", "C", "D"];
    for (let row = 1; row <= 10; row++) {
      for (const c of cols) seats.push({ label: `${c}${row}`, compartment: "Cabin" });
    }
  } else if (mode === "TRAIN") {
    const coaches: [string, string][] = [
      ["Coach Ka", "Ka"],
      ["Coach Kha", "Kha"],
      ["Coach Ga", "Ga"],
    ];
    for (const [coach, prefix] of coaches) {
      for (let i = 1; i <= 16; i++) seats.push({ label: `${prefix}${i}`, compartment: coach });
    }
  } else {
    // METRO
    const cars: [string, string][] = [
      ["Car 1", "A"],
      ["Car 2", "B"],
      ["Car 3", "C"],
      ["Car 4", "D"],
    ];
    for (const [coach, prefix] of cars) {
      for (let i = 1; i <= 12; i++) seats.push({ label: `${prefix}${i}`, compartment: coach });
    }
  }
  return seats;
}

const routes = [
  {
    code: "MRT6",
    name: "MRT Line-6 (Metro Rail)",
    mode: "METRO" as TransportMode,
    origin: "Uttara North",
    destination: "Motijheel",
    distanceKm: 21.3,
    baseFare: 100,
  },
  {
    code: "BUS-GZ",
    name: "BRTC City Express",
    mode: "BUS" as TransportMode,
    origin: "Gazipur Chowrasta",
    destination: "Motijheel",
    distanceKm: 32,
    baseFare: 60,
  },
  {
    code: "BUS-CTG",
    name: "Green Line Intercity",
    mode: "BUS" as TransportMode,
    origin: "Dhaka (Kalabagan)",
    destination: "Chattogram",
    distanceKm: 264,
    baseFare: 900,
  },
  {
    code: "TRN-TURNA",
    name: "Turna Express",
    mode: "TRAIN" as TransportMode,
    origin: "Dhaka (Kamalapur)",
    destination: "Chattogram",
    distanceKm: 320,
    baseFare: 505,
  },
  {
    code: "TRN-EKOTA",
    name: "Ekota Express",
    mode: "TRAIN" as TransportMode,
    origin: "Dhaka (Kamalapur)",
    destination: "Dinajpur",
    distanceKm: 483,
    baseFare: 620,
  },
];

// Departure hours to schedule per route each day.
const DAILY_HOURS = [7, 9, 13, 17, 19, 21];

// Rough occupancy prior by hour (0..1) — heavier in the AM/PM rush.
function occupancyFor(hour: number): number {
  if (hour >= 7 && hour <= 10) return 0.85;
  if (hour >= 17 && hour <= 20) return 0.9;
  if (hour >= 11 && hour <= 15) return 0.35;
  return 0.2;
}

async function main() {
  console.log("Seeding database…");

  // Wipe (order matters for FKs).
  await prisma.transaction.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.route.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const adminPass = await bcrypt.hash("admin123", 10);
  const userPass = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Transit Admin",
      email: "admin@transit.bd",
      passwordHash: adminPass,
      role: "ADMIN",
      balance: 5000,
    },
  });

  const rahim = await prisma.user.create({
    data: {
      name: "Rahim Uddin",
      email: "rahim@example.com",
      phone: "017xxxxxxxx",
      passwordHash: userPass,
      role: "USER",
      balance: 1500,
    },
  });

  await prisma.user.create({
    data: {
      name: "Karima Akter",
      email: "karima@example.com",
      passwordHash: userPass,
      role: "USER",
      balance: 1200,
    },
  });

  for (const u of [admin, rahim]) {
    await prisma.transaction.create({
      data: {
        userId: u.id,
        type: "TOPUP",
        amount: u.balance,
        balanceAfter: u.balance,
        note: "Opening balance (demo)",
      },
    });
  }

  const now = new Date();

  for (const r of routes) {
    const route = await prisma.route.create({ data: r });
    const layout = seatLayout(r.mode);

    // Schedule trips from 2 days ago (history) through 3 days ahead.
    for (let dayOffset = -2; dayOffset <= 3; dayOffset++) {
      for (const hour of DAILY_HOURS) {
        const departure = new Date(now);
        departure.setDate(now.getDate() + dayOffset);
        departure.setHours(hour, 0, 0, 0);

        // Intercity routes run fewer times a day.
        const intercity = r.mode !== "METRO" && r.distanceKm > 100;
        if (intercity && ![7, 21].includes(hour)) continue;

        const durationH = r.mode === "METRO" ? 0.7 : intercity ? 6 : 1.5;
        const arrival = new Date(departure.getTime() + durationH * 3600_000);

        const isRush = occupancyFor(hour) > 0.8;
        const fareMultiplier = isRush ? 1.2 : 1.0;

        const trip = await prisma.trip.create({
          data: {
            routeId: route.id,
            departure,
            arrival,
            vehicleLabel:
              r.mode === "METRO"
                ? `Metro Set-${(hour % 9) + 1}`
                : r.mode === "TRAIN"
                ? r.name
                : `Coach ${r.code}-${hour}`,
            fareMultiplier,
            active: true,
          },
        });

        await prisma.seat.createMany({
          data: layout.map((s) => ({
            tripId: trip.id,
            label: s.label,
            compartment: s.compartment,
            status: "AVAILABLE" as const,
          })),
        });

        // For past trips, mark a realistic share of seats BOOKED to give the
        // AI demand predictor historical signal.
        if (dayOffset < 0) {
          const occ = occupancyFor(hour);
          const seatRows = await prisma.seat.findMany({
            where: { tripId: trip.id },
            select: { id: true },
          });
          const takeCount = Math.floor(seatRows.length * occ);
          const toBook = seatRows.slice(0, takeCount).map((s) => s.id);
          if (toBook.length) {
            await prisma.seat.updateMany({
              where: { id: { in: toBook } },
              data: { status: "BOOKED" },
            });
          }
        }
      }
    }
  }

  // Give Rahim one real confirmed upcoming booking so tickets/ledger show data.
  const upcoming = await prisma.trip.findFirst({
    where: { departure: { gt: now } },
    include: { route: true, seats: { where: { status: "AVAILABLE" }, take: 2 } },
    orderBy: { departure: "asc" },
  });

  if (upcoming && upcoming.seats.length >= 1) {
    const fare = Math.round(upcoming.route.baseFare * upcoming.fareMultiplier);
    const booking = await prisma.booking.create({
      data: {
        reference: "TKT-DEMO01",
        userId: rahim.id,
        tripId: upcoming.id,
        status: "CONFIRMED",
        totalFare: fare,
        confirmedAt: new Date(),
        qrPayload: JSON.stringify({ v: 1, ref: "TKT-DEMO01", trip: upcoming.id, uid: rahim.id, ts: Date.now() }),
      },
    });
    await prisma.seat.update({
      where: { id: upcoming.seats[0].id },
      data: { status: "BOOKED", bookingId: booking.id },
    });
    const balanceAfter = rahim.balance - fare;
    await prisma.user.update({ where: { id: rahim.id }, data: { balance: balanceAfter } });
    await prisma.transaction.create({
      data: {
        userId: rahim.id,
        bookingId: booking.id,
        type: "PURCHASE",
        provider: "BKASH",
        amount: -fare,
        balanceAfter,
        note: "Ticket TKT-DEMO01",
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    routes: await prisma.route.count(),
    trips: await prisma.trip.count(),
    seats: await prisma.seat.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
