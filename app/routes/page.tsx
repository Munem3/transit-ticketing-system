import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sweepExpiredHolds } from "@/lib/seats";
import { formatBDT, formatDateTime, formatTime } from "@/lib/utils";
import { ModeBadge } from "@/components/ModeBadge";

const MODES = ["ALL", "BUS", "TRAIN", "METRO"] as const;

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/routes");

  await sweepExpiredHolds();

  const mode = (searchParams.mode || "ALL").toUpperCase();
  const trips = await prisma.trip.findMany({
    where: {
      active: true,
      departure: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      ...(mode !== "ALL" ? { route: { mode } } : {}),
    },
    include: {
      route: true,
      seats: { select: { status: true } },
    },
    orderBy: { departure: "asc" },
    take: 40,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find a trip</h1>
        <p className="text-sm text-slate-500">
          Live availability across bus, train, and metro.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Link
            key={m}
            href={m === "ALL" ? "/routes" : `/routes?mode=${m}`}
            className={
              mode === m
                ? "btn bg-brand-600 text-white"
                : "btn-ghost"
            }
          >
            {m === "ALL" ? "All modes" : m.charAt(0) + m.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {trips.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          No upcoming trips for this filter.
        </div>
      ) : (
        <div className="grid gap-4">
          {trips.map((t) => {
            const available = t.seats.filter((s) => s.status === "AVAILABLE").length;
            const total = t.seats.length;
            const fare = Math.round(t.route.baseFare * t.fareMultiplier);
            const soldOut = available === 0;
            const loadPct = total ? Math.round(((total - available) / total) * 100) : 0;
            return (
              <div key={t.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ModeBadge mode={t.route.mode} />
                    <h3 className="font-semibold">{t.route.name}</h3>
                  </div>
                  <p className="text-sm text-slate-500">
                    {t.route.origin} → {t.route.destination} · {t.vehicleLabel}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(t.departure)} — arrives {formatTime(t.arrival)}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatBDT(fare)}</p>
                    {t.fareMultiplier > 1 && (
                      <p className="text-xs font-medium text-amber-600">
                        peak ×{t.fareMultiplier}
                      </p>
                    )}
                  </div>
                  <div className="w-28">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{available} left</span>
                      <span>{loadPct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className={
                          "h-1.5 rounded-full " +
                          (loadPct > 80 ? "bg-rose-500" : loadPct > 50 ? "bg-amber-500" : "bg-emerald-500")
                        }
                        style={{ width: `${loadPct}%` }}
                      />
                    </div>
                  </div>
                  {soldOut ? (
                    <span className="btn-ghost pointer-events-none opacity-60">Sold out</span>
                  ) : (
                    <Link href={`/book/${t.id}`} className="btn-primary">
                      Select seats
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
