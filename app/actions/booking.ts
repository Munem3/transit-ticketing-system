"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { sweepExpiredHolds } from "@/lib/seats";
import { makeReference, HOLD_MINUTES } from "@/lib/utils";
import { buildQrPayload } from "@/lib/qr";
import type { WalletProvider } from "@/lib/enums";

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Place a transient hold on the selected seats and create a PENDING booking with
 * a countdown timer. Fails if any seat was taken in the meantime.
 */
export async function holdSeats(
  tripId: string,
  seatIds: string[]
): Promise<ActionResult<{ bookingId: string; reference: string; holdExpiresAt: string; totalFare: number }>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Please log in to book." };
  }

  if (seatIds.length === 0) {
    return { ok: false, error: "Select at least one seat." };
  }
  if (seatIds.length > 6) {
    return { ok: false, error: "You can hold at most 6 seats at once." };
  }

  await sweepExpiredHolds(tripId);

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { route: true },
  });
  if (!trip || !trip.active) {
    return { ok: false, error: "This trip is no longer available." };
  }

  const seats = await prisma.seat.findMany({
    where: { id: { in: seatIds }, tripId },
  });
  if (seats.length !== seatIds.length) {
    return { ok: false, error: "Some selected seats were not found." };
  }
  const unavailable = seats.filter((s) => s.status !== "AVAILABLE");
  if (unavailable.length > 0) {
    return {
      ok: false,
      error: `Seat ${unavailable[0].label} was just taken. Please pick another.`,
    };
  }

  const farePerSeat = trip.route.baseFare * trip.fareMultiplier;
  const totalFare = Math.round(farePerSeat * seats.length);
  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
  const reference = makeReference();

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // Re-check availability inside the transaction to avoid double-booking.
      const fresh = await tx.seat.findMany({
        where: { id: { in: seatIds }, status: "AVAILABLE" },
      });
      if (fresh.length !== seatIds.length) {
        throw new Error("SEAT_TAKEN");
      }

      const created = await tx.booking.create({
        data: {
          reference,
          userId: user.id,
          tripId,
          status: "PENDING",
          totalFare,
          holdExpiresAt,
        },
      });

      await tx.seat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: "HELD", holdExpiresAt, bookingId: created.id },
      });

      return created;
    });

    revalidatePath(`/book/${tripId}`);
    return {
      ok: true,
      data: {
        bookingId: booking.id,
        reference: booking.reference,
        holdExpiresAt: holdExpiresAt.toISOString(),
        totalFare,
      },
    };
  } catch (e) {
    if (e instanceof Error && e.message === "SEAT_TAKEN") {
      return { ok: false, error: "One of those seats was just taken." };
    }
    console.error("[holdSeats]", e);
    return { ok: false, error: "Could not hold seats. Try again." };
  }
}

/**
 * Confirm a held booking by charging the user's wallet and issuing the ticket.
 */
export async function confirmBooking(
  bookingId: string,
  provider: WalletProvider
): Promise<ActionResult<{ reference: string }>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Please log in." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { seats: true },
  });
  if (!booking || booking.userId !== user.id) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status === "CONFIRMED") {
    return { ok: true, data: { reference: booking.reference } };
  }
  if (booking.status !== "PENDING") {
    return { ok: false, error: "This booking has expired. Please start again." };
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt.getTime() < Date.now()) {
    await sweepExpiredHolds(booking.tripId);
    return { ok: false, error: "Your seat hold expired. Please start again." };
  }
  if (user.balance < booking.totalFare) {
    return {
      ok: false,
      error: `Insufficient balance. Top up your wallet (need ৳${booking.totalFare}).`,
    };
  }

  const qrPayload = buildQrPayload({
    reference: booking.reference,
    tripId: booking.tripId,
    userId: user.id,
  });

  try {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (fresh.balance < booking.totalFare) throw new Error("INSUFFICIENT");

      const balanceAfter = fresh.balance - booking.totalFare;

      await tx.user.update({
        where: { id: user.id },
        data: { balance: balanceAfter },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          holdExpiresAt: null,
          qrPayload,
        },
      });
      await tx.seat.updateMany({
        where: { bookingId: booking.id },
        data: { status: "BOOKED", holdExpiresAt: null },
      });
      await tx.transaction.create({
        data: {
          userId: user.id,
          bookingId: booking.id,
          type: "PURCHASE",
          provider,
          amount: -booking.totalFare,
          balanceAfter,
          note: `Ticket ${booking.reference}`,
        },
      });
    });

    revalidatePath("/tickets");
    revalidatePath("/wallet");
    return { ok: true, data: { reference: booking.reference } };
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT") {
      return { ok: false, error: "Insufficient balance." };
    }
    console.error("[confirmBooking]", e);
    return { ok: false, error: "Payment failed. Please try again." };
  }
}

/**
 * Cancel a booking. Confirmed bookings are refunded to the wallet; pending holds
 * are simply released.
 */
export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Please log in." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });
  if (!booking || booking.userId !== user.id) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
    return { ok: false, error: "This booking is already closed." };
  }

  const wasConfirmed = booking.status === "CONFIRMED";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.seat.updateMany({
        where: { bookingId: booking.id },
        data: { status: "AVAILABLE", holdExpiresAt: null, bookingId: null },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED", holdExpiresAt: null },
      });

      if (wasConfirmed) {
        const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
        const balanceAfter = fresh.balance + booking.totalFare;
        await tx.user.update({
          where: { id: user.id },
          data: { balance: balanceAfter },
        });
        await tx.transaction.create({
          data: {
            userId: user.id,
            bookingId: booking.id,
            type: "REFUND",
            amount: booking.totalFare,
            balanceAfter,
            note: `Refund for ${booking.reference}`,
          },
        });
      }
    });

    revalidatePath("/tickets");
    revalidatePath("/wallet");
    return { ok: true };
  } catch (e) {
    console.error("[cancelBooking]", e);
    return { ok: false, error: "Could not cancel. Please try again." };
  }
}
