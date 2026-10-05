import type { Context, Config } from "@netlify/functions";
// Typical weather for the trip dates, from the same dates last year (Open-Meteo archive)
export default async (req: Request, context: Context) => {
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat")), lon = Number(q.get("lon")), start = q.get("start") || "", end = q.get("end") || "";
  if (!isFinite(lat) || !isFinite(lon) || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return Response.json({ error: "Missing place or dates." }, { status: 400 });
  // Use the most recent full year that has these dates in the past
  const today = new Date().toISOString().slice(0, 10);
  let y = Number(start.slice(0, 4)) - 1;
  while (`${y}${end.slice(4)}` >= today) y--;
  const s = `${y}${start.slice(4)}`, e = `${y + (end.slice(0, 4) > start.slice(0, 4) ? 1 : 0)}${end.slice(4)}`;
  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${s}&end_date=${e}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration&timezone=auto`;
    let r = await fetch(url).catch(() => null);
    if (!r || !r.ok) r = await fetch(url);
    const j: any = await r.json();
    const d = j?.daily; if (!d?.time?.length) throw new Error();
    const avg = (a: number[]) => a.filter(x => x != null).reduce((p, c) => p + c, 0) / Math.max(1, a.filter(x => x != null).length);
    const wet = d.precipitation_sum.filter((x: number) => x >= 1).length;
    return Response.json({ year: y, days: d.time.length, high: Math.round(avg(d.temperature_2m_max)), low: Math.round(avg(d.temperature_2m_min)),
      wetDays: wet, sunHours: Math.round(avg(d.sunshine_duration) / 360) / 10 }, { headers: { "Cache-Control": "public, max-age=604800" } });
  } catch { return Response.json({ error: "Weather unavailable." }, { status: 502 }); }
};
export const config: Config = { path: "/api/weather" };
