"use client";

import { useState } from "react";
import { classNames, formatBDT } from "@/lib/utils";

type Route = { id: string; name: string; mode: string };

const TABS = [
  { id: "support", label: "Support Bot" },
  { id: "planner", label: "Route Planner" },
  { id: "predict", label: "Demand & Fare" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AssistantTabs({
  routes,
  geminiEnabled,
}: {
  routes: Route[];
  geminiEnabled: boolean;
}) {
  const [tab, setTab] = useState<TabId>("support");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={classNames(
              "rounded-lg px-4 py-2 text-sm font-semibold transition",
              tab === t.id ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!geminiEnabled && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          No Gemini API key configured — responses use built-in heuristics but the
          flow is identical.
        </p>
      )}

      {tab === "support" && <SupportBot />}
      {tab === "planner" && <RoutePlanner />}
      {tab === "predict" && <DemandPredictor routes={routes} />}
    </div>
  );
}

/* ---------------- Support Bot ---------------- */
function SupportBot() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "Hi! Ask me about bookings, refunds, seat holds, or a ticket reference." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "bot", text: data.reply ?? "Sorry, something went wrong." }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Network error — please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card flex h-[460px] flex-col p-4">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={classNames("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={classNames(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && <p className="text-xs text-slate-400">Assistant is typing…</p>}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="input"
          placeholder="e.g. What's the status of TKT-AB12CD?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} disabled={loading} className="btn-primary">
          Send
        </button>
      </div>
    </div>
  );
}

/* ---------------- Route Planner ---------------- */
type Plan = {
  summary: string;
  legs: { mode: string; from: string; to: string; line: string; note: string }[];
  estimatedMinutes: number;
  estimatedFare: number;
};

function RoutePlanner() {
  const [from, setFrom] = useState("Uttara");
  const [to, setTo] = useState("Motijheel");
  const [when, setWhen] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  async function plan_() {
    setLoading(true);
    setPlan(null);
    try {
      const res = await fetch("/api/ai/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, when }),
      });
      const data = await res.json();
      setPlan(data.plan);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 p-4 sm:grid-cols-4">
        <div>
          <label className="label">From</label>
          <input className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">When (optional)</label>
          <input className="input" placeholder="8:30 AM" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button onClick={plan_} disabled={loading} className="btn-primary w-full">
            {loading ? "Planning…" : "Plan route"}
          </button>
        </div>
      </div>

      {plan && (
        <div className="card p-5">
          <p className="font-medium text-slate-800">{plan.summary}</p>
          <div className="mt-4 space-y-3">
            {plan.legs.map((leg, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {leg.mode} · {leg.line}
                  </p>
                  <p className="text-xs text-slate-500">
                    {leg.from} → {leg.to}
                  </p>
                  <p className="text-xs text-slate-400">{leg.note}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-6 border-t border-slate-100 pt-4 text-sm">
            <span>⏱ ~{plan.estimatedMinutes} min</span>
            <span>💵 ~{formatBDT(plan.estimatedFare)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Demand Predictor ---------------- */
type Predict = {
  demand: { hour: number; load: number }[];
  peakHour: { label: string; load: number } | null;
  offPeakHour: { label: string; load: number } | null;
  suggestedFareMultiplier: number;
  advice: string;
};

function DemandPredictor({ routes }: { routes: Route[] }) {
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const [data, setData] = useState<Predict | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!routeId) return;
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId }),
      });
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  const maxLoad = data ? Math.max(1, ...data.demand.map((d) => d.load)) : 1;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1">
          <label className="label">Route</label>
          <select className="input" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.mode})
              </option>
            ))}
          </select>
        </div>
        <button onClick={run} disabled={loading} className="btn-primary">
          {loading ? "Analyzing…" : "Forecast demand"}
        </button>
      </div>

      {data && (
        <div className="card space-y-4 p-5">
          <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">{data.advice}</p>

          <div className="flex items-end gap-1.5" style={{ height: 140 }}>
            {data.demand.length === 0 && (
              <p className="text-sm text-slate-400">No booking history for this route yet.</p>
            )}
            {data.demand.map((d) => (
              <div key={d.hour} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-end justify-center" style={{ height: 100 }}>
                  <div
                    className={classNames(
                      "w-full rounded-t",
                      d.load > 80 ? "bg-rose-500" : d.load > 50 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ height: `${(d.load / maxLoad) * 100}%` }}
                    title={`${d.load}%`}
                  />
                </div>
                <span className="text-[10px] text-slate-400">{d.hour}h</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric label="Peak" value={data.peakHour ? `${data.peakHour.label} · ${data.peakHour.load}%` : "—"} />
            <Metric label="Best off-peak" value={data.offPeakHour ? `${data.offPeakHour.label} · ${data.offPeakHour.load}%` : "—"} />
            <Metric label="Suggested fare" value={`×${data.suggestedFareMultiplier}`} />
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}
