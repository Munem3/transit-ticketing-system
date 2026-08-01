import { classNames } from "@/lib/utils";

const config: Record<string, { label: string; cls: string; icon: string }> = {
  BUS: { label: "Bus", cls: "bg-orange-50 text-orange-700", icon: "🚌" },
  TRAIN: { label: "Train", cls: "bg-violet-50 text-violet-700", icon: "🚆" },
  METRO: { label: "Metro", cls: "bg-sky-50 text-sky-700", icon: "🚇" },
};

export function ModeBadge({ mode }: { mode: string }) {
  const c = config[mode] ?? { label: mode, cls: "bg-slate-100 text-slate-600", icon: "•" };
  return (
    <span className={classNames("badge gap-1", c.cls)}>
      <span aria-hidden>{c.icon}</span>
      {c.label}
    </span>
  );
}
