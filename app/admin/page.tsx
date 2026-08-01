import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBDT, formatDateTime } from "@/lib/utils";
import { AdminTripRow } from "@/components/AdminTripRow";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [userCount, confirmedCount, revenueAgg, trips, ledger] = await Promise.all([
    prisma.user.count(),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "PURCHASE" },
    }),
    prisma.trip.findMany({
      include: {
        route: true,
        seats: { select: { status: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { departure: "asc" },
      take: 30,
    }),
    prisma.transaction.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const revenue = Math.abs(revenueAgg._sum.amount ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin control panel</h1>
        <p className="text-sm text-slate-500">
          Schedules, fare grid, and the transaction ledger.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Users" value={String(userCount)} />
        <Stat label="Confirmed tickets" value={String(confirmedCount)} />
        <Stat label="Ticket revenue" value={formatBDT(revenue)} />
        <Stat label="Active trips" value={String(trips.filter((t) => t.active).length)} />
      </div>

      <section className="card">
        <div className="border-b border-slate-100 p-4">
          <h2 className="font-semibold">Trips & fare grid</h2>
          <p className="text-xs text-slate-500">
            Adjust the peak fare multiplier or pause a trip.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {trips.map((t) => {
            const total = t.seats.length;
            const booked = t.seats.filter((s) => s.status === "BOOKED").length;
            return (
              <AdminTripRow
                key={t.id}
                trip={{
                  id: t.id,
                  routeName: t.route.name,
                  mode: t.route.mode,
                  vehicleLabel: t.vehicleLabel,
                  departure: t.departure.toISOString(),
                  baseFare: t.route.baseFare,
                  fareMultiplier: t.fareMultiplier,
                  active: t.active,
                  booked,
                  total,
                }}
              />
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="border-b border-slate-100 p-4">
          <h2 className="font-semibold">Transaction ledger</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Type</th>
              <th className="p-3">Provider</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ledger.map((tx) => (
              <tr key={tx.id}>
                <td className="p-3">{tx.user.name}</td>
                <td className="p-3">{tx.type}</td>
                <td className="p-3">{tx.provider ?? "—"}</td>
                <td
                  className={
                    "p-3 text-right font-semibold " +
                    (tx.amount >= 0 ? "text-emerald-600" : "text-rose-600")
                  }
                >
                  {tx.amount >= 0 ? "+" : "−"}
                  {formatBDT(Math.abs(tx.amount))}
                </td>
                <td className="p-3 text-slate-400">{formatDateTime(tx.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
