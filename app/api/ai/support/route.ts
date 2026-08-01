import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askGemini } from "@/lib/gemini";
import { getCurrentUser } from "@/lib/session";
import { formatBDT, formatDateTime } from "@/lib/utils";

// AI Customer Support Bot
export async function POST(req: Request) {
  const { message } = await req.json().catch(() => ({ message: "" }));
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const user = await getCurrentUser();

  // Pull the user's recent bookings so the bot can answer status questions.
  const bookings = user
    ? await prisma.booking.findMany({
        where: { userId: user.id },
        include: { trip: { include: { route: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  const bookingContext = bookings
    .map(
      (b) =>
        `${b.reference}: ${b.status}, ${b.trip.route.name}, departs ${formatDateTime(
          b.trip.departure
        )}, ${formatBDT(b.totalFare)}`
    )
    .join("\n");

  const system = `You are TransitBD's friendly customer support assistant for a Bangladesh bus/train/metro ticketing app.
Answer FAQs about booking, seat holds (5-minute timer), payments (bKash/Rocket/Card demo wallet), QR tickets, and cancellations (confirmed tickets are refunded to the wallet).
Be concise (2-4 sentences). If asked to actually cancel, explain they can tap "Cancel" on the ticket in "My Tickets". Never invent booking data beyond what is provided.`;

  const prompt = `User ${user ? user.name : "(guest)"} asks: "${message}"

${
  bookingContext
    ? `Their recent bookings:\n${bookingContext}`
    : "They have no bookings on record (or are not logged in)."
}`;

  const aiText = await askGemini(prompt, system);
  const reply = aiText ?? heuristicReply(message, bookings);

  return NextResponse.json({ reply, source: aiText ? "gemini" : "heuristic" });
}

function heuristicReply(
  message: string,
  bookings: Array<{
    reference: string;
    status: string;
    totalFare: number;
    trip: { departure: Date; route: { name: string } };
  }>
): string {
  const m = message.toLowerCase();

  // Reference lookup, e.g. "TKT-8F3K2Q"
  const refMatch = message.match(/TKT-[A-Z0-9]{6}/i);
  if (refMatch) {
    const b = bookings.find(
      (x) => x.reference.toLowerCase() === refMatch[0].toLowerCase()
    );
    if (b) {
      return `Booking ${b.reference} is ${b.status} — ${b.trip.route.name}, departing ${formatDateTime(
        b.trip.departure
      )}, ${formatBDT(b.totalFare)}.`;
    }
    return `I couldn't find booking ${refMatch[0]} on your account.`;
  }

  if (m.includes("cancel")) {
    return "You can cancel from “My Tickets” — tap Cancel on the booking. Confirmed tickets are refunded to your wallet automatically.";
  }
  if (m.includes("refund")) {
    return "Refunds for cancelled confirmed tickets go straight back to your in-app wallet balance, usually instantly.";
  }
  if (m.includes("hold") || m.includes("timer") || m.includes("expire")) {
    return "Selected seats are held for 5 minutes while you pay. If the timer runs out, the seats are released and you'll need to pick again.";
  }
  if (m.includes("pay") || m.includes("bkash") || m.includes("rocket") || m.includes("wallet")) {
    return "Pay from your in-app wallet using bKash, Rocket, or Card (all simulated). Top up anytime from the Wallet page.";
  }
  if (m.includes("qr") || m.includes("ticket")) {
    return "After payment you get a QR ticket in “My Tickets” — show it at the gate to board.";
  }
  if (m.includes("status")) {
    if (bookings.length === 0) return "You have no bookings on record yet.";
    const latest = bookings[0];
    return `Your latest booking ${latest.reference} is ${latest.status} (${latest.trip.route.name}).`;
  }
  return "I can help with bookings, seat holds, payments, QR tickets, and cancellations. What would you like to know?";
}
