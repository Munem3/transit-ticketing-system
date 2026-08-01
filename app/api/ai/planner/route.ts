import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askGeminiJSON } from "@/lib/gemini";

type PlanLeg = {
  mode: string;
  from: string;
  to: string;
  line: string;
  note: string;
};
type Plan = {
  summary: string;
  legs: PlanLeg[];
  estimatedMinutes: number;
  estimatedFare: number;
};

// AI Multi-Modal Route Planner
export async function POST(req: Request) {
  const { from, to, when } = await req
    .json()
    .catch(() => ({ from: "", to: "", when: "" }));

  if (!from || !to) {
    return NextResponse.json(
      { error: "Both 'from' and 'to' are required" },
      { status: 400 }
    );
  }

  // Give the model the real network so it plans over actual routes.
  const routes = await prisma.route.findMany({
    where: { active: true },
    select: {
      code: true,
      name: true,
      mode: true,
      origin: true,
      destination: true,
      baseFare: true,
    },
  });

  const system =
    "You are a multi-modal transit route planner for Dhaka, Bangladesh, combining Metro, train, and bus. Reply with ONLY a JSON object.";
  const prompt = `Available network:
${routes
  .map(
    (r) =>
      `- [${r.mode}] ${r.name} (${r.origin} -> ${r.destination}), fare BDT ${r.baseFare}`
  )
  .join("\n")}

Plan a journey from "${from}" to "${to}"${when ? ` departing around ${when}` : ""}, considering typical Dhaka traffic and possible weather/rain delays.
Return JSON exactly like:
{"summary":"...","legs":[{"mode":"METRO|TRAIN|BUS|WALK","from":"...","to":"...","line":"route name","note":"transfer/timing tip"}],"estimatedMinutes":45,"estimatedFare":120}`;

  const ai = await askGeminiJSON<Plan>(prompt, system);
  const plan = ai ?? heuristicPlan(from, to, routes);

  return NextResponse.json({
    plan,
    source: ai ? "gemini" : "heuristic",
  });
}

function heuristicPlan(
  from: string,
  to: string,
  routes: Array<{ mode: string; name: string; origin: string; destination: string; baseFare: number }>
): Plan {
  const norm = (s: string) => s.toLowerCase();
  // Try to find a single route that roughly matches.
  const direct = routes.find(
    (r) =>
      norm(r.origin).includes(norm(from)) ||
      norm(r.destination).includes(norm(to)) ||
      norm(r.name).includes(norm(to))
  );

  if (direct) {
    return {
      summary: `Take the ${direct.name} (${direct.mode.toLowerCase()}) from ${from} toward ${to}.`,
      legs: [
        {
          mode: direct.mode,
          from,
          to,
          line: direct.name,
          note: "Direct connection on the available network.",
        },
      ],
      estimatedMinutes: 40,
      estimatedFare: direct.baseFare,
    };
  }

  const metro = routes.find((r) => r.mode === "METRO");
  const bus = routes.find((r) => r.mode === "BUS");
  const legs: PlanLeg[] = [];
  let fare = 0;
  let mins = 15;
  if (metro) {
    legs.push({
      mode: "METRO",
      from,
      to: metro.destination,
      line: metro.name,
      note: "Fastest for the city-centre stretch; avoid 8–10 AM crowds.",
    });
    fare += metro.baseFare;
    mins += 25;
  }
  if (bus) {
    legs.push({
      mode: "BUS",
      from: metro?.destination ?? from,
      to,
      line: bus.name,
      note: "Final leg by bus; add buffer time if it is raining.",
    });
    fare += bus.baseFare;
    mins += 30;
  }
  if (legs.length === 0) {
    legs.push({
      mode: "BUS",
      from,
      to,
      line: "Local service",
      note: "No indexed route matched; take a local bus toward the destination.",
    });
    fare = 40;
    mins = 45;
  }

  return {
    summary: `Suggested multi-modal route from ${from} to ${to}.`,
    legs,
    estimatedMinutes: mins,
    estimatedFare: fare,
  };
}
