import type { Context, Config } from "@netlify/functions";
import { drivingRoute, parsePts } from "../lib/route.mts";
// Driving distance, time and route line between two or more points (lat,lon;lat,lon…)
export default async (req: Request, context: Context) => {
  const pts = parsePts(new URL(req.url).searchParams.get("pts"));
  if (pts.length < 2) return Response.json({ error: "Need at least two points." }, { status: 400 });
  try {
    const r = await drivingRoute(pts);
    return Response.json({ km: Math.round(r.km), hours: +(r.hours * 1.08).toFixed(2), geometry: r.geometry }, { headers: { "Cache-Control": "public, max-age=2592000" } });
  } catch {
    return Response.json({ error: "No driving route found." }, { status: 404 });
  }
};
export const config: Config = { path: "/api/route" };
