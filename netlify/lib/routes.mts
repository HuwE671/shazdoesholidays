import { airports } from "./geo.mts";
// Which airlines fly a route non-stop (Travelpayouts route list, cached per server instance)
let ROUTES: Map<string, { a: string; cs: boolean }[]> | null = null;
async function routeIndex() {
  if (ROUTES) return ROUTES;
  const r = await fetch("https://api.travelpayouts.com/data/routes.json");
  const list: any[] = await r.json();
  const m = new Map<string, { a: string; cs: boolean }[]>();
  for (const x of list) {
    if (x.transfers !== 0 || !x.airline_iata) continue;
    const k = x.departure_airport_iata + "-" + x.arrival_airport_iata;
    const arr = m.get(k) || [];
    if (!arr.some(y => y.a === x.airline_iata)) arr.push({ a: x.airline_iata, cs: !!x.codeshare });
    m.set(k, arr);
  }
  ROUTES = m;
  return m;
}
async function expand(code: string) {
  const list = await airports();
  const own = list.filter((a: any) => a.code === code || a.city_code === code).map((a: any) => a.code);
  return own.length ? own : [code];
}
export async function directAirlines(origin: string, dest: string, names: Record<string, string>) {
  const [idx, from, to] = await Promise.all([routeIndex(), expand(origin), expand(dest)]);
  const out: { code: string; name: string; from: string; to: string; codeshare: boolean }[] = [];
  for (const f of from) for (const t of to) for (const r of idx.get(f + "-" + t) || [])
    out.push({ code: r.a, name: names[r.a] || r.a, from: f, to: t, codeshare: r.cs });
  // airlines that operate the flight first, then partners selling it
  return out.sort((a, b) => Number(a.codeshare) - Number(b.codeshare)).slice(0, 12);
}
