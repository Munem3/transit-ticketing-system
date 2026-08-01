import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sweepExpiredHolds } from "@/lib/seats";
import { formatBDT, formatDateTime } from "@/lib/utils";
import { ModeBadge } from "@/components/ModeBadge";
import { StatusBadge } from "@/components/StatusBadge";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/tickets");

  await sweepExpiredHolds();

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { trip: { include: { route: true } }, seats: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My tickets</h1>

      {searchParams.ref && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✅ Booking <span className="font-mono font-semibold">{searchParams.ref}</span>{" "}
          confirmed. Your QR ticket is ready below.
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          No tickets yet.{" "}
          <Link href="/routes" className="text-brand-600">
            Book a trip.
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/tickets/${b.id}`}
              className="card flex items-center justify-between p-5 transition hover:shadow-md"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ModeBadge mode={b.trip.route.mode} />
                  <h3 className="font-semibold">{b.trip.route.name}</h3>
                </div>
                <p className="text-sm text-slate-500">
                  {b.reference} · {b.seats.length} seat(s) ·{" "}
                  {b.seats.map((s) => s.label).join(", ") || "—"}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDateTime(b.trip.departure)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatBDT(b.totalFare)}</span>
                <StatusBadge status={b.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
