"use client";

import { useEffect, useState } from "react";

/**
 * Live MM:SS countdown to a target time. Calls onExpire once when it hits zero.
 */
export function Countdown({
  expiresAt,
  onExpire,
}: {
  expiresAt: string | Date;
  onExpire?: () => void;
}) {
  const target = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const left = target - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const clamped = Math.max(0, remaining);
  const mm = Math.floor(clamped / 60000);
  const ss = Math.floor((clamped % 60000) / 1000);
  const danger = clamped < 60000;

  return (
    <span
      className={classNamesLocal(
        "font-mono tabular-nums",
        danger ? "text-rose-600" : "text-slate-700"
      )}
    >
      {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
    </span>
  );
}

function classNamesLocal(...p: Array<string | false>) {
  return p.filter(Boolean).join(" ");
}
