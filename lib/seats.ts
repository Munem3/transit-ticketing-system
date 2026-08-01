import { prisma } from "@/lib/prisma";

/**
 * Release any seats/bookings whose hold timer has expired. Called opportunistically
 * whenever a trip's seat map is read or a booking is attempted, so we don't need a
 * separate cron process for the demo. Returns the number of seats released.
 */
export async function sweepExpiredHolds(tripId?: string): Promise<number> {
  const now = new Date();

  // Expire the bookings first so seats detach cleanly.
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: "PENDING",
      holdExpiresAt: { lt: now },
      ...(tripId ? { tripId } : {}),
    },
    select: { id: true },
  });

  if (expiredBookings.length > 0) {
    const ids = expiredBookings.map((b) => b.id);
    await prisma.$transaction([
      prisma.seat.updateMany({
        where: { bookingId: { in: ids } },
        data: { status: "AVAILABLE", holdExpiresAt: null, bookingId: null },
      }),
      prisma.booking.updateMany({
        where: { id: { in: ids } },
        data: { status: "EXPIRED", holdExpiresAt: null },
      }),
    ]);
  }

  // Also release orphaned held seats (defensive).
  const released = await prisma.seat.updateMany({
    where: {
      status: "HELD",
      holdExpiresAt: { lt: now },
      ...(tripId ? { tripId } : {}),
    },
    data: { status: "AVAILABLE", holdExpiresAt: null, bookingId: null },
  });

  return released.count;
}
