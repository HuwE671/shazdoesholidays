import type { Context, Config } from "@netlify/functions";

// Search towns, cities, UK postcodes and airports worldwide.
// Towns come first (so "Southampton" finds the city itself, not just its airport), then airports.
export default async (req: Request, context: Context) => {
  const term = (new URL(req.url).searchParams.get("term") || "").trim().slice(0, 60);
  if (term.length < 2) return Response.json({ places: [] });
  const towns: any[] = [], airports: any[] = [];

  // 1. UK postcodes (full or district), via postcodes.io
  const pc = term.toUpperCase().replace(/\s+/g, " ");
  try {
    if (/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(pc)) {
      const r: any = await (await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`)).json();
      const x = r?.result;
      if (x) towns.push({ type: "town", code: "", airport: "", name: x.postcode, label: [x.admin_district, x.country].filter(Boolean).join(", "), country: "United Kingdom", cc: "GB", lat: x.latitude, lon: x.longitude });
    } else if (/^[A-Z]{1,2}\d[A-Z\d]?$/.test(pc)) {
      const r: any = await (await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(pc)}`)).json();
      const x = r?.result;
      if (x) towns.push({ type: "town", code: "", airport: "", name: x.outcode, label: [(x.admin_district || [])[0], "postcode area"].filter(Boolean).join(", "), country: "United Kingdom", cc: "GB", lat: x.latitude, lon: x.longitude });
    }
  } catch { /* optional */ }

  // 2. Towns, villages and cities (Open-Meteo geocoding), UK first then by population.
  //    Supports hints like "Page, Arizona" or "Springdale Utah".
  try {
    const geo = async (name: string) => { const g: any = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=20&language=en`)).json(); return g.results || []; };
    let name = term, hint = "";
    if (term.includes(",")) { [name, hint] = [term.split(",")[0].trim(), term.split(",").slice(1).join(" ").trim()]; }
    let results = await geo(name);
    if (!results.length && !hint && name.includes(" ")) {
      const words = name.split(/\s+/);
      for (let k = words.length - 1; k >= 1 && !results.length; k--) { results = await geo(words.slice(0, k).join(" ")); if (results.length) { name = words.slice(0, k).join(" "); hint = words.slice(k).join(" "); } }
    }
    const US: Record<string, string> = { al:"alabama",ak:"alaska",az:"arizona",ar:"arkansas",ca:"california",co:"colorado",ct:"connecticut",de:"delaware",fl:"florida",ga:"georgia",hi:"hawaii",id:"idaho",il:"illinois",in:"indiana",ia:"iowa",ks:"kansas",ky:"kentucky",la:"louisiana",me:"maine",md:"maryland",ma:"massachusetts",mi:"michigan",mn:"minnesota",ms:"mississippi",mo:"missouri",mt:"montana",ne:"nebraska",nv:"nevada",nh:"new hampshire",nj:"new jersey",nm:"new mexico",ny:"new york",nc:"north carolina",nd:"north dakota",oh:"ohio",ok:"oklahoma",or:"oregon",pa:"pennsylvania",ri:"rhode island",sc:"south carolina",sd:"south dakota",tn:"tennessee",tx:"texas",ut:"utah",vt:"vermont",va:"virginia",wa:"washington",wv:"west virginia",wi:"wisconsin",wy:"wyoming",uk:"united kingdom",usa:"united states",us:"united states" };
    const h0 = hint.toLowerCase().trim(), h = US[h0] || h0;
    const plain = (x: any) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matchesHint = (t: any) => !h || [t.admin1, t.admin2, t.country].some((x: any) => x && plain(x).split(/[\s,\-]+/).some((w: string) => w.startsWith(h) || plain(x).startsWith(h))) || plain(t.country_code) === h;
    const t3 = name.toLowerCase().slice(0, 3);
    const score = (t: any) => Math.log10((t.population || 0) + 1) + (t.country_code === "GB" ? 1.5 : 0) + (/^PPLC|^PPLA$/.test(t.feature_code || "") ? 0.5 : 0);
    const list = results.filter((t: any) => /^PPL|^ADM|^PRK|^AREA|^RES|^VAL|^LK|^MT|^CNYN/.test(t.feature_code || "") && plain(t.name).startsWith(plain(t3)) && matchesHint(t))
      .sort((a: any, b: any) => (plain(b.name) === plain(name) ? 1 : 0) - (plain(a.name) === plain(name) ? 1 : 0) || score(b) - score(a));
    for (const t of list.slice(0, 6)) {
      const region = t.country_code === "GB" ? (t.admin2 || t.admin1) : (t.admin1 || t.admin2);
      if (towns.some(x => x.name === t.name && x.cc === t.country_code && x.region === region)) continue;
      towns.push({ type: "town", code: "", airport: "", name: t.name, region, label: [region && region !== t.name ? region : "", t.country].filter(Boolean).join(", "),
        country: t.country || "", cc: t.country_code || "", lat: t.latitude, lon: t.longitude });
    }
  } catch { /* optional */ }

  // 3. Airports and airport cities (Travelpayouts)
  try {
    const u = new URL("https://autocomplete.travelpayouts.com/places2");
    u.searchParams.set("term", term); u.searchParams.set("locale", "en");
    u.searchParams.append("types[]", "city"); u.searchParams.append("types[]", "airport");
    const r = await fetch(u);
    const list: any[] = r.ok ? await r.json() : [];
    const q = term.toLowerCase(), q3 = q.slice(0, 3);
    const relevant = (p: any) => String(p.code || "").toLowerCase() === q || [p.name, p.city_name, p.main_airport_name].some((x: any) => x && String(x).toLowerCase().split(/[\s\-\/]/).some((w: string) => w.startsWith(q3)));
    for (const p of list.filter(relevant).slice(0, 5)) airports.push({
      type: p.type, code: p.type === "airport" ? (p.city_code || p.code) : p.code, airport: p.code,
      name: p.type === "airport" ? (p.city_name || p.name) : p.name, label: p.type === "airport" ? p.name : (p.main_airport_name || "All airports"),
      country: p.country_name || "", cc: p.country_code || "", lat: p.coordinates?.lat, lon: p.coordinates?.lon
    });
  } catch { /* optional */ }

  return Response.json({ places: [...towns, ...airports].slice(0, 12) }, { headers: { "Cache-Control": "public, max-age=86400" } });
};

export const config: Config = { path: "/api/places" };
