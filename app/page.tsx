import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const features = [
  {
    title: "Real-time seat tracking",
    body: "Live seat maps for buses, train compartments, and metro sets with 5-minute hold timers.",
  },
  {
    title: "Mock digital wallet",
    body: "Pay with bKash, Rocket, or Card against your in-app balance — instant QR tickets on purchase.",
  },
  {
    title: "AI Peak & Fare Predictor",
    body: "Forecasts route load from booking history and nudges you toward cheaper off-peak trips.",
  },
  {
    title: "AI Multi-Modal Planner",
    body: "Chains metro, train, and bus into one optimal route, adjusting for traffic and weather.",
  },
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-16">
      <section className="animate-fade-in rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-16 text-white">
        <p className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          Bus · Train · Metro — one ticket app
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Smart ticketing for Bangladesh&rsquo;s mass transit.
        </h1>
        <p className="mt-4 max-w-xl text-brand-50">
          Book seats in real time, pay from your wallet, and let AI plan your
          route and dodge the rush-hour crush.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {session ? (
            <Link href="/routes" className="btn bg-white text-brand-700 hover:bg-brand-50">
              Book a trip
            </Link>
          ) : (
            <>
              <Link href="/register" className="btn bg-white text-brand-700 hover:bg-brand-50">
                Get started
              </Link>
              <Link
                href="/login"
                className="btn border border-white/40 text-white hover:bg-white/10"
              >
                Log in
              </Link>
            </>
          )}
          <Link
            href="/assistant"
            className="btn border border-white/40 text-white hover:bg-white/10"
          >
            Try the AI assistant
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
