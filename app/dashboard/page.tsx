import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBDT, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const [bookings, upcoming] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: user.id },
      include: { trip: { include: { route: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.booking.count({
      where: { userId: user.id, status: "CONFIRMED" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hi, {user.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-slate-500">Here&rsquo;s your travel snapshot.</p>
        </div>
        <Link href="/routes" className="btn-primary">
          Book a trip
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Wallet balance" value={formatBDT(user.balance)} href="/wallet" />
        <StatCard label="Confirmed tickets" value={String(upcoming)} href="/tickets" />
        <StatCard label="Role" value={user.role} href={user.role === "ADMIN" ? "/admin" : "/routes"} />
      </div>

      <section className="card">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="font-semibold">Recent bookings</h2>
          <Link href="/tickets" className="text-sm font-medium text-brand-600">
            View all
          </Link>
        </div>
        {bookings.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No bookings yet. <Link href="/routes" className="text-brand-600">Book your first trip.</Link>
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {bookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{b.trip.route.name}</p>
                  <p className="text-xs text-slate-500">
                    {b.reference} · {formatDateTime(b.trip.departure)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatBDT(b.totalFare)}</span>
                  <StatusBadge status={b.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="card p-5 transition hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </Link>
  );
}
