// Driving routes via OSRM (free public server for the beta; set OSRM_URL to switch provider later)
export async function drivingRoute(pts: [number, number][]) {
  const base = Netlify.env.get("OSRM_URL") || "https://router.project-osrm.org";
  const coords = pts.map(([la, lo]) => `${lo.toFixed(5)},${la.toFixed(5)}`).join(";");
  const r = await fetch(`${base}/route/v1/driving/${coords}?overview=simplified&geometries=geojson&steps=false`, { headers: { "User-Agent": "ShazDoesHolidays/1.0" } });
  if (!r.ok) throw new Error("route " + r.status);
  const j: any = await r.json();
  const rt = j?.routes?.[0];
  if (!rt) throw new Error("no route");
  return { km: rt.distance / 1000, hours: rt.duration / 3600, geometry: (rt.geometry?.coordinates || []).map((c: number[]) => [c[1], c[0]]) as [number, number][] };
}
export function parsePts(s: string | null) {
  return (s || "").split(";").map(p => p.split(",").map(Number)).filter(p => p.length === 2 && p.every(isFinite) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180).slice(0, 12) as [number, number][];
}
