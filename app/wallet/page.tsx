import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBDT, formatDateTime } from "@/lib/utils";
import { TopUpPanel } from "@/components/TopUpPanel";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/wallet");

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wallet</h1>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="card bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white">
            <p className="text-sm text-brand-100">Available balance</p>
            <p className="mt-1 text-4xl font-bold">{formatBDT(user.balance)}</p>
            <p className="mt-4 text-xs text-brand-100">{user.name} · {user.email}</p>
          </div>
          <TopUpPanel />
        </div>

        <section className="card">
          <div className="border-b border-slate-100 p-4">
            <h2 className="font-semibold">Transaction history</h2>
          </div>
          {transactions.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{t.note || t.type}</p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(t.createdAt)}
                      {t.provider ? ` · ${t.provider}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        "text-sm font-semibold " +
                        (t.amount >= 0 ? "text-emerald-600" : "text-rose-600")
                      }
                    >
                      {t.amount >= 0 ? "+" : "−"}
                      {formatBDT(Math.abs(t.amount))}
                    </p>
                    <p className="text-xs text-slate-400">
                      bal {formatBDT(t.balanceAfter)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
