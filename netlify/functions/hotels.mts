import type { Context, Config } from "@netlify/functions";
import { searchHotels } from "../lib/hotels.mts";
export default async (req: Request, context: Context) => {
  const q = new URL(req.url).searchParams;
  const checkin = q.get("checkin") || "", checkout = q.get("checkout") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkin) || !/^\d{4}-\d{2}-\d{2}$/.test(checkout) || checkout <= checkin)
    return Response.json({ error: "Choose valid dates." }, { status: 400 });
  const lat = q.get("lat") ? Number(q.get("lat")) : undefined, lon = q.get("lon") ? Number(q.get("lon")) : undefined;
  try {
    const r = await searchHotels({ q: q.get("q") || "", lat, lon, area: q.get("area") || "", checkin, checkout, adults: Number(q.get("adults")) || 2, rooms: Number(q.get("rooms")) || undefined });
    return Response.json({ live: true, source: "trivago", ...r }, { headers: { "Cache-Control": "public, max-age=1800" } });
  } catch {
    return Response.json({ live: false, hotels: [], error: "Live hotel prices are unavailable right now." }, { status: 502 });
  }
};
export const config: Config = { path: "/api/hotels" };
