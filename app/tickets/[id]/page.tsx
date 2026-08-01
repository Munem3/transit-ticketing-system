import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { makeQrDataUrl, buildQrPayload } from "@/lib/qr";
import { formatBDT, formatDateTime, formatTime } from "@/lib/utils";
import { ModeBadge } from "@/components/ModeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { CancelButton } from "@/components/CancelButton";

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/tickets/${params.id}`);

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { trip: { include: { route: true } }, seats: true },
  });
  if (!booking || booking.userId !== user.id) notFound();

  const isConfirmed = booking.status === "CONFIRMED";
  const payload =
    booking.qrPayload ??
    buildQrPayload({
      reference: booking.reference,
      tripId: booking.tripId,
      userId: booking.userId,
    });
  const qr = isConfirmed ? await makeQrDataUrl(payload) : null;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/tickets" className="text-sm text-brand-600">
        ← All tickets
      </Link>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-brand-800 p-5 text-white">
          <div>
            <div className="flex items-center gap-2">
              <ModeBadge mode={booking.trip.route.mode} />
            </div>
            <h1 className="mt-2 text-lg font-bold">{booking.trip.route.name}</h1>
            <p className="text-xs text-brand-100">
              {booking.trip.route.origin} → {booking.trip.route.destination}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 p-5 text-sm">
          <Field label="Reference" value={booking.reference} mono />
          <Field label="Vehicle" value={booking.trip.vehicleLabel} />
          <Field label="Departs" value={formatDateTime(booking.trip.departure)} />
          <Field label="Arrives" value={formatTime(booking.trip.arrival)} />
          <Field
            label="Seats"
            value={booking.seats.map((s) => s.label).join(", ") || "—"}
          />
          <Field label="Total paid" value={formatBDT(booking.totalFare)} />
        </div>

        {isConfirmed && qr && (
          <div className="flex flex-col items-center gap-2 border-t border-dashed border-slate-200 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR for ${booking.reference}`} className="h-48 w-48" />
            <p className="text-xs text-slate-400">Show this QR at the gate to board.</p>
          </div>
        )}

        {booking.status === "PENDING" && (
          <div className="border-t border-slate-100 bg-amber-50 p-4 text-sm text-amber-700">
            This booking is awaiting payment.{" "}
            <Link href={`/book/${booking.tripId}`} className="font-semibold underline">
              Complete it
            </Link>
            .
          </div>
        )}
      </div>

      {(isConfirmed || booking.status === "PENDING") && (
        <CancelButton bookingId={booking.id} confirmed={isConfirmed} />
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={mono ? "font-mono font-semibold" : "font-medium text-slate-800"}>
        {value}
      </p>
    </div>
  );
}
