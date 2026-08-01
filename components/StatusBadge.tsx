import { classNames } from "@/lib/utils";

const styles: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-rose-50 text-rose-700",
  EXPIRED: "bg-slate-100 text-slate-500",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={classNames("badge", styles[status] ?? "bg-slate-100 text-slate-600")}>
      {status}
    </span>
  );
}
