"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { topUp, TOPUP_PRESETS } from "@/app/actions/wallet";
import { formatBDT, classNames } from "@/lib/utils";
import type { WalletProvider } from "@/lib/enums";

const PROVIDERS: { id: WalletProvider; label: string; color: string }[] = [
  { id: "BKASH", label: "bKash", color: "bg-pink-600 hover:bg-pink-700" },
  { id: "ROCKET", label: "Rocket", color: "bg-purple-600 hover:bg-purple-700" },
  { id: "CARD", label: "Card", color: "bg-slate-800 hover:bg-slate-900" },
];

export function TopUpPanel() {
  const router = useRouter();
  const [provider, setProvider] = useState<WalletProvider>("BKASH");
  const [amount, setAmount] = useState<number>(500);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await topUp(provider, amount);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg(`Topped up! New balance ${formatBDT(res.balance)}.`);
      router.refresh();
    });
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold">Top up</h3>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            className={classNames(
              "rounded-lg border px-2 py-2 text-xs font-semibold transition",
              provider === p.id
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {TOPUP_PRESETS.map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className={classNames(
              "rounded-lg border px-1 py-1.5 text-xs font-medium transition",
              amount === v
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            )}
          >
            ৳{v}
          </button>
        ))}
      </div>

      <input
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="input mt-3"
      />

      <button onClick={submit} disabled={pending} className="btn-primary mt-3 w-full">
        {pending ? "Processing…" : `Add ${formatBDT(amount)} via ${provider}`}
      </button>

      {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
