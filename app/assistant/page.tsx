import { prisma } from "@/lib/prisma";
import { geminiEnabled } from "@/lib/gemini";
import { AssistantTabs } from "@/components/AssistantTabs";

export default async function AssistantPage() {
  const routes = await prisma.route.findMany({
    where: { active: true },
    select: { id: true, name: true, mode: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Transit Assistant</h1>
        <p className="text-sm text-slate-500">
          Demand forecasting, multi-modal route planning, and support — powered by
          Gemini{geminiEnabled ? "" : " (running in heuristic mode — set GEMINI_API_KEY for live AI)"}.
        </p>
      </div>
      <AssistantTabs routes={routes} geminiEnabled={geminiEnabled} />
    </div>
  );
}
