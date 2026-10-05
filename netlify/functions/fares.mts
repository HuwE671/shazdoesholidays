import type { Context, Config } from "@netlify/functions";
import { airlineNames, pricesForDates, toDeal, cleanCriteria } from "../lib/deals.mts";
import { directAirlines } from "../lib/routes.mts";

// Live cached fares for one route and exact dates, with nearby-date fallback
export default async (req: Request, context: Context) => {
  const token = Netlify.env.get("TRAVELPAYOUTS_TOKEN");
  if (!token) return Response.json({ live: false, fares: [] });
  const q = new URL(req.url).searchParams;
  const origin = (q.get("origin") || "").toUpperCase(), dest = (q.get("dest") || "").toUpperCase();
  const depart = q.get("depart") || "", ret = q.get("ret") || "", oneWay = q.get("oneway") === "1";
  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(dest) || !/^\d{4}-\d{2}-\d{2}$/.test(depart) || (!oneWay && !/^\d{4}-\d{2}-\d{2}$/.test(ret)))
    return Response.json({ error: "Missing route or dates." }, { status: 400 });
  const c = cleanCriteria({ origin: { code: origin, name: q.get("originName") || origin }, dests: [{ code: dest, name: q.get("destName") || dest, key: "x" }], travellers: Number(q.get("travellers")) || 1 });
  const names = await airlineNames();
  let exact = true;
  const q1 = { origin, destination: dest, departure_at: depart, return_at: oneWay ? undefined : ret, oneWay };
  // cheapest fares overall, plus the cheapest direct fares (direct flights are often pricier, so they get pushed out of a price-only list)
  const [any, direct, routeAirlines] = await Promise.all([
    pricesForDates({ ...q1, limit: 30 }, token),
    pricesForDates({ ...q1, direct: true, limit: 10 }, token),
    directAirlines(origin, dest, names).catch(() => [])
  ]);
  let data = [...any, ...direct];
  if (!data.length) {
    exact = false;
    const q2 = { origin, destination: dest, departure_at: depart.slice(0, 7), oneWay };
    const [a2, d2] = await Promise.all([pricesForDates({ ...q2, limit: 10 }, token), pricesForDates({ ...q2, direct: true, limit: 6 }, token)]);
    data = [...a2, ...d2];
  }
  const seen = new Set<string>();
  const all = data.map((f: any) => toDeal(f, c, c.dests[0], names)).filter((f: any) => {
    if (!f) return false; const k = [f.airlineCode, f.departAt, f.returnAt, f.price, f.stops].join("|"); if (seen.has(k)) return false; seen.add(k); return true;
  }) as any[];
  // keep the cheapest few of each kind so direct flights always show when they exist
  const directs = all.filter(f => !f.stops).sort((a, b) => a.price - b.price).slice(0, 5);
  const others = all.filter(f => f.stops).sort((a, b) => a.price - b.price).slice(0, 9);
  const fares = [...directs, ...others].sort((a, b) => a.price - b.price);
  return Response.json({ live: true, exact, fares, directAirlines: routeAirlines });
};

export const config: Config = { path: "/api/fares" };
