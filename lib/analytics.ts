import { prisma } from "@/lib/prisma";

export type HourLoad = { hour: number; load: number; booked: number; capacity: number };

/**
 * Compute historical seat-occupancy per departure hour for a route, from the
 * seats/bookings tables. This is the raw signal the AI predictor reasons over.
 */
export async function routeDemandByHour(routeId: string): Promise<HourLoad[]> {
  // Only consider trips that have already departed — this is historical demand.
  const trips = await prisma.trip.findMany({
    where: { routeId, departure: { lt: new Date() } },
    include: { _count: { select: { seats: true } } },
  });

  const buckets = new Map<number, { booked: number; capacity: number }>();
  for (const trip of trips) {
    const hour = new Date(trip.departure).getHours();
    const bookedSeats = await prisma.seat.count({
      where: { tripId: trip.id, status: "BOOKED" },
    });
    const cur = buckets.get(hour) ?? { booked: 0, capacity: 0 };
    cur.booked += bookedSeats;
    cur.capacity += trip._count.seats;
    buckets.set(hour, cur);
  }

  return [...buckets.entries()]
    .map(([hour, v]) => ({
      hour,
      booked: v.booked,
      capacity: v.capacity,
      load: v.capacity ? Math.round((v.booked / v.capacity) * 100) : 0,
    }))
    .sort((a, b) => a.hour - b.hour);
}

export function labelHour(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${ampm}`;
}

// Bangladesh commuter peak windows (heuristic prior).
export function isPeakHour(h: number): boolean {
  return (h >= 7 && h <= 10) || (h >= 16 && h <= 20);
}
