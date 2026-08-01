import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askGemini } from "@/lib/gemini";
import { routeDemandByHour, labelHour, isPeakHour } from "@/lib/analytics";

// AI Peak Demand & Fare Predictor
export async function POST(req: Request) {
  const { routeId } = await req.json().catch(() => ({ routeId: undefined }));
  if (!routeId) {
    return NextResponse.json({ error: "routeId is required" }, { status: 400 });
  }

  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }

  const demand = await routeDemandByHour(routeId);
  const peak = [...demand].sort((a, b) => b.load - a.load)[0];
  const offPeak = [...demand]
    .filter((d) => d.capacity > 0)
    .sort((a, b) => a.load - b.load)[0];

  // Ask Gemini for a commuter-facing recommendation; fall back to a heuristic.
  const prompt = `You are a transit demand analyst for ${route.name} (${route.mode}) in Dhaka, Bangladesh.
Hourly seat occupancy data (hour: load%):
${demand.map((d) => `${labelHour(d.hour)}: ${d.load}% (${d.booked}/${d.capacity})`).join("\n")}
Base fare: BDT ${route.baseFare}.
In 2-3 short sentences, advise a commuter on the best off-peak time to travel and whether to expect a peak surcharge. Be concrete and friendly.`;

  const aiText = await askGemini(prompt);

  const advice =
    aiText ??
    heuristicAdvice(route.name, peak, offPeak);

  const suggestedMultiplier = peak && peak.load > 80 ? 1.25 : peak && peak.load > 60 ? 1.1 : 1.0;

  return NextResponse.json({
    route: { id: route.id, name: route.name, mode: route.mode, baseFare: route.baseFare },
    demand,
    peakHour: peak ? { ...peak, label: labelHour(peak.hour) } : null,
    offPeakHour: offPeak ? { ...offPeak, label: labelHour(offPeak.hour) } : null,
    suggestedFareMultiplier: suggestedMultiplier,
    advice,
    source: aiText ? "gemini" : "heuristic",
  });
}

function heuristicAdvice(
  name: string,
  peak?: { hour: number; load: number },
  offPeak?: { hour: number; load: number }
): string {
  if (!peak) return `Not enough booking history yet for ${name}.`;
  const peakLabel = labelHour(peak.hour);
  const offLabel = offPeak ? labelHour(offPeak.hour) : "mid-day";
  const surcharge = peak.load > 80 ? "expect a peak surcharge" : "fares should stay near base";
  const peakNote = isPeakHour(peak.hour) ? " (typical rush hour)" : "";
  return `Demand on ${name} peaks around ${peakLabel}${peakNote} at ${peak.load}% occupancy — ${surcharge}. For a calmer ride and likely lower fare, travel around ${offLabel}.`;
}
