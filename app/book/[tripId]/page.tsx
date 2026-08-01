import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sweepExpiredHolds } from "@/lib/seats";
import { formatBDT, formatDateTime, formatTime } from "@/lib/utils";
import { ModeBadge } from "@/components/ModeBadge";
import { SeatBooking } from "@/components/SeatBooking";

export default async function BookPage({ params }: { params: { tripId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/book/${params.tripId}`);

  await sweepExpiredHolds(params.tripId);

  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      route: true,
      seats: { orderBy: [{ compartment: "asc" }, { label: "asc" }] },
    },
  });
  if (!trip) notFound();

  const farePerSeat = Math.round(trip.route.baseFare * trip.fareMultiplier);

  const seats = trip.seats.map((s) => ({
    id: s.id,
    label: s.label,
    compartment: s.compartment,
    status: s.status,
  }));

  return (
    <div className="space-y-6">
      <Link href="/routes" className="text-sm text-brand-600">
        ← Back to trips
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ModeBadge mode={trip.route.mode} />
              <h1 className="text-xl font-bold">{trip.route.name}</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {trip.route.origin} → {trip.route.destination} · {trip.vehicleLabel}
            </p>
            <p className="text-xs text-slate-400">
              {formatDateTime(trip.departure)} — arrives {formatTime(trip.arrival)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Fare / seat</p>
            <p className="text-2xl font-bold">{formatBDT(farePerSeat)}</p>
            <p className="text-xs text-slate-400">
              Your balance: {formatBDT(user.balance)}
            </p>
          </div>
        </div>
      </div>

      <SeatBooking
        tripId={trip.id}
        seats={seats}
        farePerSeat={farePerSeat}
        balance={user.balance}
      />
    </div>
  );
}
