// Shared deal search used by the on-demand API and the scheduled email alerts.
export type Place = { code: string; name: string };
export type DestIn = { key: string; name: string; country: string; code: string; fare: number };
export type Criteria = {
  origin: Place; dests: DestIn[]; from: string; to: string;
  minNights: number; maxNights: number; maxPrice: number; travellers: number; directOnly?: boolean;
};
export type Deal = {
  dest: string; destName: string; country: string; destCode: string;
  origin: string; originName: string; depart: string; ret: string; nights: number;
  price: number; total: number; airline?: string; airlineCode?: string; stops?: number;
  fromAirport?: string; toAirport?: string; link: string; live: boolean;
  usual?: number; drop?: number; dropPct?: number; hotel?: any;
  departAt?: string; returnAt?: string; durTo?: number; durBack?: number; flightNo?: string;
};

// Built-in destinations (used to upgrade older saved alerts that stored keys only)
const LEGACY: Record<string, DestIn> = {
  paris: { key: "paris", name: "Paris", country: "France", code: "PAR", fare: 120 },
  amsterdam: { key: "amsterdam", name: "Amsterdam", country: "Netherlands", code: "AMS", fare: 110 },
  barcelona: { key: "barcelona", name: "Barcelona", country: "Spain", code: "BCN", fare: 130 },
  lisbon: { key: "lisbon", name: "Lisbon", country: "Portugal", code: "LIS", fare: 140 },
  rome: { key: "rome", name: "Rome", country: "Italy", code: "ROM", fare: 140 },
  edinburgh: { key: "edinburgh", name: "Edinburgh", country: "Scotland", code: "EDI", fare: 90 },
  cornwall: { key: "cornwall", name: "Cornwall", country: "England", code: "NQY", fare: 110 },
  dubrovnik: { key: "dubrovnik", name: "Dubrovnik", country: "Croatia", code: "DBV", fare: 170 },
  santorini: { key: "santorini", name: "Santorini", country: "Greece", code: "JTR", fare: 230 },
  marrakech: { key: "marrakech", name: "Marrakech", country: "Morocco", code: "RAK", fare: 160 },
  reykjavik: { key: "reykjavik", name: "Reykjavík", country: "Iceland", code: "REK", fare: 190 },
  newyork: { key: "newyork", name: "New York", country: "USA", code: "NYC", fare: 520 },
  dubai: { key: "dubai", name: "Dubai", country: "UAE", code: "DXB", fare: 480 }
};
const LEGACY_ORIGINS: Record<string, string> = { SOU: "Southampton", LON: "London", BRS: "Bristol", BHX: "Birmingham", MAN: "Manchester" };

const DAY = 864e5;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const yymmdd = (s: string) => s.slice(2).replace(/-/g, "");
const isCode = (s: unknown) => typeof s === "string" && /^[A-Z]{3}$/.test(s);
const txt = (s: unknown, n = 60) => String(s ?? "").replace(/[<>]/g, "").slice(0, n);

export function cleanCriteria(c: any): Criteria {
  const today = iso(new Date());
  let origin: Place = { code: "LON", name: "London" };
  if (typeof c?.origin === "string" && LEGACY_ORIGINS[c.origin]) origin = { code: c.origin, name: LEGACY_ORIGINS[c.origin] };
  else if (c?.origin && isCode(c.origin.code)) origin = { code: c.origin.code, name: txt(c.origin.name) || c.origin.code };

  const dests: DestIn[] = [];
  for (const d of Array.isArray(c?.dests) ? c.dests : []) {
    if (typeof d === "string" && LEGACY[d]) dests.push(LEGACY[d]);
    else if (d && isCode(d.code)) dests.push({
      key: txt(d.key, 40).replace(/[^\w-]/g, "") || d.code.toLowerCase(),
      name: txt(d.name) || d.code, country: txt(d.country), code: d.code,
      fare: Math.max(20, Math.min(3000, Number(d.fare) || 150))
    });
    if (dests.length >= 15) break;
  }
  let from = /^\d{4}-\d{2}-\d{2}$/.test(c?.from) ? c.from : today;
  if (from < today) from = today;
  let to = /^\d{4}-\d{2}-\d{2}$/.test(c?.to) ? c.to : iso(new Date(Date.parse(from) + 90 * DAY));
  if (to < from) to = from;
  const maxTo = iso(new Date(Date.parse(from) + 330 * DAY));
  if (to > maxTo) to = maxTo;
  const minNights = Math.max(1, Math.min(30, Number(c?.minNights) || 2));
  const maxNights = Math.max(minNights, Math.min(30, Number(c?.maxNights) || 7));
  return {
    origin, dests: dests.length ? dests : [LEGACY.lisbon], from, to, minNights, maxNights,
    maxPrice: Math.max(10, Math.min(10000, Number(c?.maxPrice) || 200)),
    travellers: Math.max(1, Math.min(9, Number(c?.travellers) || 2)),
    directOnly: !!c?.directOnly
  };
}

let AIRLINES: Record<string, string> | null = null;
export async function airlineNames() {
  if (AIRLINES) return AIRLINES;
  try {
    const r = await fetch("https://api.travelpayouts.com/data/en/airlines.json");
    const list: any[] = await r.json();
    AIRLINES = {};
    for (const a of list) if (a?.code && a?.name) AIRLINES[a.code] = a.name_translations?.en || a.name;
  } catch { AIRLINES = {}; }
  return AIRLINES;
}

export function skyLink(origin: string, dest: string, depart: string, ret: string, travellers: number, cabin = "economy") {
  const o = origin === "LON" ? "lond" : origin.toLowerCase();
  return `https://www.skyscanner.net/transport/flights/${o}/${dest.toLowerCase()}/${yymmdd(depart)}/${yymmdd(ret)}/?adultsv2=${travellers}&cabinclass=${cabin}&rtn=1`;
}

function monthsBetween(from: string, to: string) {
  const out: string[] = [];
  const d = new Date(from.slice(0, 7) + "-01T00:00:00Z");
  while (iso(d).slice(0, 7) <= to.slice(0, 7) && out.length < 12) { out.push(iso(d).slice(0, 7)); d.setUTCMonth(d.getUTCMonth() + 1); }
  return out;
}

// Raw call to the Travelpayouts (Aviasales) cached prices API
export async function pricesForDates(p: { origin: string; destination: string; departure_at: string; return_at?: string; direct?: boolean; limit?: number; oneWay?: boolean }, token: string) {
  const u = new URL("https://api.travelpayouts.com/aviasales/v3/prices_for_dates");
  const q: Record<string, string> = {
    origin: p.origin, destination: p.destination, departure_at: p.departure_at, one_way: p.oneWay ? "true" : "false",
    currency: "gbp", sorting: "price", limit: String(p.limit || 30), direct: String(!!p.direct), token
  };
  if (p.return_at) q.return_at = p.return_at;
  u.search = new URLSearchParams(q).toString();
  try {
    const r = await fetch(u, { headers: { Accept: "application/json" } });
    if (!r.ok) return [];
    const j: any = await r.json();
    return Array.isArray(j?.data) ? j.data : [];
  } catch { return []; }
}

export function toDeal(f: any, c: { origin: Place; travellers: number }, d: DestIn, names: Record<string, string>): Deal | null {
  const depart = String(f.departure_at || "").slice(0, 10);
  const ret = String(f.return_at || "").slice(0, 10);
  const price = Math.round(Number(f.price));
  if (!depart || !price) return null;
  return {
    dest: d.key, destName: d.name, country: d.country, destCode: d.code, origin: c.origin.code, originName: c.origin.name,
    depart, ret, nights: ret ? Math.round((Date.parse(ret) - Date.parse(depart)) / DAY) : 0, price, total: price * c.travellers,
    airlineCode: f.airline, airline: names[f.airline] || f.airline, stops: (f.transfers || 0) + (f.return_transfers || 0),
    fromAirport: f.origin_airport, toAirport: f.destination_airport,
    departAt: String(f.departure_at || ""), returnAt: String(f.return_at || ""),
    durTo: Number(f.duration_to) || 0, durBack: Number(f.duration_back) || 0, flightNo: f.flight_number ? String(f.airline || "") + f.flight_number : "",
    link: f.link ? "https://www.aviasales.com" + f.link : skyLink(c.origin.code, d.code, depart, ret || depart, c.travellers), live: true
  };
}

// The usual price for a route in a month: median of the cheapest fare on each day of that month
const median = (a: number[]) => { const s = a.filter(x => x > 0).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
export async function usualPrice(origin: string, destination: string, month: string, token: string) {
  try {
    const u = new URL("https://api.travelpayouts.com/aviasales/v3/grouped_prices");
    u.search = new URLSearchParams({ origin, destination, group_by: "departure_at", departure_at: month, currency: "gbp", token }).toString();
    const r = await fetch(u, { headers: { Accept: "application/json" } });
    const j: any = r.ok ? await r.json() : null;
    const prices = Object.values(j?.data || {}).map((x: any) => Number(x?.price) || 0);
    return prices.length >= 4 ? median(prices) : 0;
  } catch { return 0; }
}
async function liveForDest(c: Criteria, d: DestIn, token: string, names: Record<string, string>): Promise<Deal[]> {
  const found: Deal[] = [];
  for (const month of monthsBetween(c.from, c.to).slice(0, 6)) {
    // Return fares for the month (up to 100), then the "usual" price = median of the cheapest return fare on each departure day
    const data = await pricesForDates({ origin: c.origin.code, destination: d.code, departure_at: month, direct: c.directOnly, limit: 100 }, token);
    const byDay: Record<string, number> = {};
    for (const f of data) { const day = String(f.departure_at || "").slice(0, 10), pr = Number(f.price) || 0; if (day && pr && (!byDay[day] || pr < byDay[day])) byDay[day] = pr; }
    const dayMins = Object.values(byDay);
    const usual = dayMins.length >= 4 ? median(dayMins) : 0;
    for (const f of data) {
      const deal = toDeal(f, c, d, names);
      if (deal && usual) { deal.usual = Math.round(usual); deal.drop = Math.max(0, Math.round(usual - deal.price)); deal.dropPct = Math.max(0, Math.round((1 - deal.price / usual) * 100)); }
      if (!deal || deal.depart < c.from || deal.depart > c.to) continue;
      if (deal.nights < c.minNights || deal.nights > c.maxNights || deal.price > c.maxPrice) continue;
      found.push(deal);
    }
  }
  found.sort((a, b) => (b.dropPct || 0) - (a.dropPct || 0) || a.price - b.price);
  const seen = new Set<string>();
  return found.filter(x => { const k = x.depart + x.ret; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3);
}

function estimateForDest(c: Criteria, d: DestIn): Deal[] {
  const out: Deal[] = [];
  const start = Date.parse(c.from), end = Date.parse(c.to);
  for (let t = start; t <= end && out.length < 3; t += DAY) {
    const day = new Date(t).getUTCDay();
    if (day !== 2 && day !== 3) continue;
    const nights = Math.min(c.maxNights, Math.max(c.minNights, 4));
    const depart = iso(new Date(t)), ret = iso(new Date(t + nights * DAY));
    const season = [0.75, 0.75, 0.85, 0.95, 1, 1.15, 1.35, 1.4, 1.05, 0.95, 0.8, 1.1][new Date(t).getUTCMonth()];
    const price = Math.round(d.fare * season * 0.85);
    if (price <= c.maxPrice) {
      out.push({ dest: d.key, destName: d.name, country: d.country, destCode: d.code, origin: c.origin.code, originName: c.origin.name,
        depart, ret, nights, price, total: price * c.travellers, link: skyLink(c.origin.code, d.code, depart, ret, c.travellers), live: false });
      t += 13 * DAY;
    }
  }
  return out;
}

export async function findDeals(c: Criteria, token?: string) {
  const live = !!token;
  const names = live ? await airlineNames() : {};
  const per = await Promise.all(c.dests.map(d => live ? liveForDest(c, d, token!, names) : Promise.resolve(estimateForDest(c, d))));
  return { live, deals: per.flat().sort((a, b) => (b.dropPct || 0) - (a.dropPct || 0) || a.price - b.price).slice(0, 15) };
}

export function summary(c: Criteria) {
  const f = (x: string) => new Date(x + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${c.origin.name} to ${c.dests.map(d => d.name).join(", ")}, leaving between ${f(c.from)} and ${f(c.to)}, ${c.minNights}–${c.maxNights} nights, up to £${c.maxPrice} per person`;
}
