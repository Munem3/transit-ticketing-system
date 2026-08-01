"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { holdSeats, confirmBooking } from "@/app/actions/booking";
import { Countdown } from "@/components/Countdown";
import { formatBDT, classNames } from "@/lib/utils";
import type { WalletProvider } from "@/lib/enums";

type Seat = {
  id: string;
  label: string;
  compartment: string;
  status: string;
};

const PROVIDERS: { id: WalletProvider; label: string; color: string }[] = [
  { id: "BKASH", label: "bKash", color: "bg-pink-600 hover:bg-pink-700" },
  { id: "ROCKET", label: "Rocket", color: "bg-purple-600 hover:bg-purple-700" },
  { id: "CARD", label: "Card", color: "bg-slate-800 hover:bg-slate-900" },
];

type Held = {
  bookingId: string;
  reference: string;
  holdExpiresAt: string;
  totalFare: number;
};

export function SeatBooking({
  tripId,
  seats,
  farePerSeat,
  balance,
}: {
  tripId: string;
  seats: Seat[];
  farePerSeat: number;
  balance: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [held, setHeld] = useState<Held | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const compartments = useMemo(() => {
    const map = new Map<string, Seat[]>();
    for (const s of seats) {
      const arr = map.get(s.compartment) ?? [];
      arr.push(s);
      map.set(s.compartment, arr);
    }
    return [...map.entries()];
  }, [seats]);

  function toggle(seat: Seat) {
    if (seat.status !== "AVAILABLE" || held) return;
    setError(null);
    setSelected((prev) =>
      prev.includes(seat.id)
        ? prev.filter((x) => x !== seat.id)
        : prev.length >= 6
        ? prev
        : [...prev, seat.id]
    );
  }

  function onHold() {
    setError(null);
    startTransition(async () => {
      const res = await holdSeats(tripId, selected);
      if (!res.ok) {
        setError(res.error);
        router.refresh();
        return;
      }
      setHeld(res.data!);
    });
  }

  function onPay(provider: WalletProvider) {
    if (!held) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmBooking(held.bookingId, provider);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/tickets?ref=${held.reference}`);
      router.refresh();
    });
  }

  function onExpire() {
    setHeld(null);
    setSelected([]);
    setError("Your seat hold expired. Please select again.");
    router.refresh();
  }

  const total = held ? held.totalFare : selected.length * farePerSeat;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Seat map */}
      <div className="card p-6">
        <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-500">
          <Legend cls="border-slate-300 bg-white" label="Available" />
          <Legend cls="border-brand-600 bg-brand-600 text-white" label="Selected" />
          <Legend cls="border-amber-400 bg-amber-100" label="Held" />
          <Legend cls="border-slate-200 bg-slate-200" label="Booked" />
        </div>

        <div className="space-y-6">
          {compartments.map(([name, list]) => (
            <div key={name}>
              <p className="mb-2 text-sm font-semibold text-slate-700">{name}</p>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {list.map((seat) => {
                  const isSelected = selected.includes(seat.id);
                  const booked = seat.status === "BOOKED";
                  const heldSeat = seat.status === "HELD";
                  return (
                    <button
                      key={seat.id}
                      onClick={() => toggle(seat)}
                      disabled={booked || heldSeat || !!held}
                      className={classNames(
                        "aspect-square rounded-lg border text-xs font-semibold transition",
                        isSelected
                          ? "border-brand-600 bg-brand-600 text-white"
                          : booked
                          ? "cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400"
                          : heldSeat
                          ? "cursor-not-allowed border-amber-400 bg-amber-100 text-amber-700"
                          : "border-slate-300 bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50"
                      )}
                    >
                      {seat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary / payment */}
      <div className="space-y-4">
        <div className="card p-5">
          <h3 className="font-semibold">Your selection</h3>
          {selected.length === 0 && !held ? (
            <p className="mt-2 text-sm text-slate-500">
              Tap seats to select (up to 6).
            </p>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Seats" value={String(held ? "held" : selected.length)} />
              <Row label="Fare / seat" value={formatBDT(farePerSeat)} />
              <div className="border-t border-slate-100 pt-2">
                <Row label="Total" value={formatBDT(total)} strong />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          {!held ? (
            <button
              onClick={onHold}
              disabled={selected.length === 0 || pending}
              className="btn-primary mt-4 w-full"
            >
              {pending ? "Holding…" : "Hold seats & pay"}
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
                <span className="text-amber-700">Seats held — pay within</span>
                <Countdown expiresAt={held.holdExpiresAt} onExpire={onExpire} />
              </div>
              <p className="text-xs text-slate-500">
                Booking ref <span className="font-mono font-semibold">{held.reference}</span>
              </p>
              {balance < held.totalFare && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  Balance too low. Top up in the Wallet page, then retry.
                </p>
              )}
              <p className="text-sm font-medium text-slate-700">Pay with</p>
              <div className="grid grid-cols-3 gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPay(p.id)}
                    disabled={pending}
                    className={classNames(
                      "rounded-lg px-2 py-2 text-xs font-semibold text-white transition disabled:opacity-50",
                      p.color
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="px-1 text-xs text-slate-400">
          Payments are simulated. Confirming charges your in-app wallet balance
          and issues a QR ticket instantly.
        </p>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={classNames("h-4 w-4 rounded border", cls)} />
      {label}
    </span>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? "font-bold text-slate-900" : "text-slate-700"}>{value}</span>
    </div>
  );
}
