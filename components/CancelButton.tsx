"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBooking } from "@/app/actions/booking";

export function CancelButton({
  bookingId,
  confirmed,
}: {
  bookingId: string;
  confirmed: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function doCancel() {
    setError(null);
    startTransition(async () => {
      const res = await cancelBooking(bookingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/tickets");
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="btn-ghost w-full text-rose-600">
        Cancel booking
      </button>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <p className="text-sm text-slate-700">
        Cancel this booking?{" "}
        {confirmed && "The fare will be refunded to your wallet."}
      </p>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={doCancel} disabled={pending} className="btn-danger flex-1">
          {pending ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button onClick={() => setConfirming(false)} className="btn-ghost flex-1">
          Keep it
        </button>
      </div>
    </div>
  );
}
