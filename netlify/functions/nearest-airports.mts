import type { Context, Config } from "@netlify/functions";
import { airports, kmBetween } from "../lib/geo.mts";

// Nearest airports with scheduled flights to any point, e.g. a beach resort with no airport
export default async (req: Request, context: Context) => {
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat")), lon = Number(q.get("lon")), cc = (q.get("cc") || "").toUpperCase();
  if (!isFinite(lat) || !isFinite(lon)) return Response.json({ error: "Missing coordinates." }, { status: 400 });
  try {
    const list = await airports();
    const near = list.map(a => ({ a, km: kmBetween(lat, lon, a.coordinates.lat, a.coordinates.lon) }))
      .filter(x => x.km <= 300 && (!cc || x.a.country_code === cc))
      // prefer international airports: they have far more flights than small local airfields nearby
      .sort((x, y) => { const ix = /international/i.test(x.a.name || "") && x.km < 90, iy = /international/i.test(y.a.name || "") && y.km < 90; return (iy ? 1 : 0) - (ix ? 1 : 0) || x.km - y.km; }).slice(0, 3)
      .map(({ a, km }) => {
        const road = Math.round(km * 1.3);
        return { code: a.code, city: a.city_code, name: a.name_translations?.en || a.name, lat: a.coordinates.lat, lon: a.coordinates.lon,
          km: Math.round(km), roadKm: road, hours: +(road / 55 + 0.2).toFixed(1) };
      });
    return Response.json({ airports: near }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    return Response.json({ airports: [], error: "Airport lookup unavailable." }, { status: 502 });
  }
};
export const config: Config = { path: "/api/nearest-airports" };
