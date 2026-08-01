"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFareMultiplier, toggleTripActive } from "@/app/actions/admin";
import { formatBDT, formatDateTime, classNames } from "@/lib/utils";
import { ModeBadge } from "@/components/ModeBadge";

type Trip = {
  id: string;
  routeName: string;
  mode: string;
  vehicleLabel: string;
  departure: string;
  baseFare: number;
  fareMultiplier: number;
  active: boolean;
  booked: number;
  total: number;
};

export function AdminTripRow({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [mult, setMult] = useState(trip.fareMultiplier);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateFareMultiplier(trip.id, mult);
      setMsg(res.ok ? "Saved" : res.error);
      if (res.ok) router.refresh();
    });
  }

  function toggle() {
    startTransition(async () => {
      await toggleTripActive(trip.id);
      router.refresh();
    });
  }

  const load = trip.total ? Math.round((trip.booked / trip.total) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-[200px] space-y-1">
        <div className="flex items-center gap-2">
          <ModeBadge mode={trip.mode} />
          <span className="font-semibold">{trip.routeName}</span>
          {!trip.active && (
            <span className="badge bg-slate-100 text-slate-500">paused</span>
          )}
        </div>
        <p className="text-xs text-slate-400">
          {trip.vehicleLabel} · {formatDateTime(trip.departure)} · {trip.booked}/{trip.total} booked ({load}%)
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right text-xs text-slate-500">
          <p>base {formatBDT(trip.baseFare)}</p>
          <p className="font-semibold text-slate-700">
            now {formatBDT(Math.round(trip.baseFare * mult))}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">×</span>
          <input
            type="number"
            step="0.05"
            min="0.5"
            max="3"
            value={mult}
            onChange={(e) => setMult(Number(e.target.value))}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
        <button onClick={save} disabled={pending} className="btn-primary px-3 py-1.5 text-xs">
          Save
        </button>
        <button
          onClick={toggle}
          disabled={pending}
          className={classNames(
            "rounded-lg px-3 py-1.5 text-xs font-semibold",
            trip.active
              ? "border border-slate-300 text-slate-600 hover:bg-slate-50"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          )}
        >
          {trip.active ? "Pause" : "Activate"}
        </button>
        {msg && <span className="text-xs text-slate-400">{msg}</span>}
      </div>
    </div>
  );
}
