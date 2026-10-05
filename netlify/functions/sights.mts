import type { Context, Config } from "@netlify/functions";

// Real places to see near any destination, from Wikipedia (free, no key): castles, museums, beaches, parks…
const GOOD = /museum|castle|cathedral|abbey|priory|church|chapel|temple|wat |mosque|shrine|palace|park|garden|beach|bay|cove|island|nature reserve|national park|forest|waterfall|lake|loch|hill|mountain|viewpoint|gallery|theatre|bridge|harbour|lighthouse|market|zoo|aquarium|monument|memorial|historic|heritage|ruins|fort|tower|stately|country house|manor|national trust|old town|square|pier|promenade|cave|gorge|cliff|trail|railway heritage|steam/i;
const BAD = /railway station|metro station|bus station|school|college|university|electoral|ward|constituency|civil parish|human settlement|village in|town in|city in|suburb|neighbourhood|district|area of|road|street|motorway|company|football club|hospital|prison|council|parliament|postcode|housing|estate|business|airport|record label|band|album|newspaper|radio|television|person|footballer|politician|cricketer/i;

export default async (req: Request, context: Context) => {
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat")), lon = Number(q.get("lon"));
  if (!isFinite(lat) || !isFinite(lon)) return Response.json({ sights: [] });
  const api = new URL("https://en.wikipedia.org/w/api.php");
  Object.entries({ action: "query", generator: "geosearch", ggscoord: `${lat}|${lon}`, ggsradius: "10000", ggslimit: "50",
    prop: "pageimages|description|coordinates", piprop: "thumbnail", pithumbsize: "400", format: "json", origin: "*" }).forEach(([k, v]) => api.searchParams.set(k, v));
  try {
    const r = await fetch(api, { headers: { "User-Agent": "ShazDoesHolidays/1.0 (holiday planner)" } });
    const j: any = await r.json();
    const pages: any[] = Object.values(j?.query?.pages || {});
    const sights = pages.map(p => {
      const text = `${p.title} ${p.description || ""}`;
      const score = (GOOD.test(text) ? 3 : 0) + (p.thumbnail ? 1 : 0) - (BAD.test(p.description || "") ? 10 : 0);
      return { title: p.title, description: p.description || "", image: p.thumbnail?.source || "", score, dist: p.index || 0,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(p.title).replace(/ /g, "_"))}` };
    }).filter(s => s.score >= 3).sort((a, b) => b.score - a.score || a.dist - b.dist);
    let churches = 0;
    const picked = sights.filter(s => { if (/church|chapel/i.test(s.title + s.description)) return ++churches <= 2; return true; }).slice(0, 12);
    return Response.json({ source: "wikipedia", sights: picked }, { headers: { "Cache-Control": "public, max-age=604800" } });
  } catch {
    return Response.json({ sights: [], error: "Sights unavailable right now." }, { status: 502 });
  }
};
export const config: Config = { path: "/api/sights" };
