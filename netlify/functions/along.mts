import type { Context, Config } from "@netlify/functions";
import { drivingRoute, parsePts } from "../lib/route.mts";
// Places worth stopping at along a driving route (national parks, viewpoints, landmarks…), from Wikipedia
const GOOD = /tourist|attraction|national park|national monument|state park|canyon|arch|mesa|butte|valley|overlook|viewpoint|scenic|falls|waterfall|geyser|hot spring|dunes|lake|loch|gorge|cave|glacier|peak|mountain|pass|beach|bay|castle|abbey|cathedral|museum|historic|heritage|ruins|monument|memorial|bridge|lighthouse|palace|old town|nature reserve|national trust|garden|zoo|safari|forest|island|cliff|trail/i;
const BAD = /village|hamlet|\btown\b|\bcity\b|community|census|controversy|library|school district|\bhouse\b|building|mission|church|chapel|railroad|railway|store|hotel|motel|ranch house|post office|bank|courthouse|cemetery|railway station|bus station|school|college|university|electoral|ward|constituency|civil parish|census|unincorporated|human settlement|airport|road|street|highway|interstate|route \d|company|club|hospital|prison|council|county seat|neighbourhood|district|suburb|person|band|album|radio|television|newspaper/i;
async function near(lat: number, lon: number) {
  const api = new URL("https://en.wikipedia.org/w/api.php");
  Object.entries({ action: "query", generator: "geosearch", ggscoord: `${lat}|${lon}`, ggsradius: "10000", ggslimit: "30", prop: "pageimages|description|coordinates|pageviews", pvipdays: "30", piprop: "thumbnail", pithumbsize: "320", format: "json", origin: "*" }).forEach(([k, v]) => api.searchParams.set(k, v));
  const r = await fetch(api, { headers: { "User-Agent": "ShazDoesHolidays/1.0 (holiday planner)" } });
  const j: any = await r.json();
  return Object.values(j?.query?.pages || {}) as any[];
}
export default async (req: Request, context: Context) => {
  const pts = parsePts(new URL(req.url).searchParams.get("pts"));
  if (pts.length < 2) return Response.json({ sights: [] });
  let line: [number, number][] = pts;
  try { line = (await drivingRoute(pts)).geometry; } catch { /* fall back to straight line */ }
  // sample up to 7 points along the line, skipping the very start and end (those are the stops themselves)
  const samples: [number, number][] = [];
  const n = Math.min(20, Math.max(3, line.length - 2));
  for (let i = 1; i <= n; i++) samples.push(line[Math.floor((line.length - 1) * i / (n + 1))]);
  try {
    const lists = await Promise.all(samples.map(([la, lo]) => near(la, lo).catch(() => [])));
    const seen = new Set<string>(), out: any[] = [];
    lists.forEach((pages, si) => pages.forEach(p => {
      const text = `${p.title} ${p.description || ""}`;
      if (seen.has(p.title) || !GOOD.test(text) || BAD.test(text) || !p.coordinates?.[0]) return;
      seen.add(p.title);
      const strong = /national park|national monument|state park|canyon|arch|overlook|viewpoint|scenic|falls|geyser|castle|abbey|monument/i.test(text);
      const views = Object.values(p.pageviews || {}).reduce((a: number, v: any) => a + (Number(v) || 0), 0) as number;
      out.push({ title: p.title, description: p.description || "", image: p.thumbnail?.source || "", lat: p.coordinates[0].lat, lon: p.coordinates[0].lon, order: si, views, score: (strong ? 2 : 0) + (p.thumbnail ? 0.5 : 0) + Math.log10(views + 10),
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(p.title).replace(/ /g, "_"))}` });
    }));
    out.sort((a, b) => b.score - a.score || a.order - b.order);
    return Response.json({ sights: out.slice(0, 10).sort((a, b) => a.order - b.order) }, { headers: { "Cache-Control": "public, max-age=2592000" } });
  } catch {
    return Response.json({ sights: [] }, { status: 502 });
  }
};
export const config: Config = { path: "/api/along" };
