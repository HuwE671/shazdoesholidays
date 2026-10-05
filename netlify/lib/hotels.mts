import { mcpSession } from "./mcp.mts";
// Live hotel prices via trivago's public accommodation search (shared by the Stay page and deal emails)
const num = (s: unknown) => Number(String(s ?? "").replace(/[^\d.]/g, "")) || 0;
export type HotelQuery = { q?: string; lat?: number; lon?: number; area?: string; checkin: string; checkout: string; adults: number; rooms?: number };
export async function searchHotels(o: HotelQuery) {
  const adults = Math.max(1, Math.min(12, o.adults || 2)), rooms = Math.max(1, Math.min(adults, o.rooms || Math.ceil(adults / 2)));
  const base = { arrival: o.checkin, departure: o.checkout, adults, rooms, currency: "GBP", country: "GB", language: "EN_GB" };
  const call = await mcpSession("https://mcp.trivago.com/mcp");
  const parse = (res: any): any[] => { try { const txt: string = res?.content?.[0]?.text || ""; const obj = JSON.parse(txt.slice(txt.indexOf("{"))); return typeof obj.output === "string" ? JSON.parse(obj.output) : (obj.output || []); } catch { return []; } };
  const hasPoint = o.lat != null && o.lon != null && isFinite(o.lat) && isFinite(o.lon);
  const query = (o.q || "").slice(0, 80);
  let list: any[] = query ? parse(await call("trivago-accommodation-search", { ...base, query })) : [];
  const merge = (more: any[]) => { const seen = new Set(list.map(h => h.accommodation_id)); list = list.concat(more.filter(h => !seen.has(h.accommodation_id))); };
  let areaFound = false;
  const area = (o.area || "").trim().slice(0, 60);
  if (list.length < 8 && area) {
    try {
      const g: any = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(area)}&count=10&language=en`)).json();
      const pts = (g.results || []).filter((r: any) => !hasPoint || Math.abs(r.latitude - o.lat!) + Math.abs(r.longitude - o.lon!) < 1.5);
      if (pts[0]) { areaFound = true; merge(parse(await call("trivago-accommodation-radius-search", { ...base, latitude: pts[0].latitude, longitude: pts[0].longitude }))); }
    } catch { /* optional */ }
  }
  if (list.length < 8 && hasPoint) merge(parse(await call("trivago-accommodation-radius-search", { ...base, latitude: o.lat, longitude: o.lon })));
  const hotels = list.map(h => ({
    id: String(h.accommodation_id || h.accommodation_name), name: h.accommodation_name, stars: Number(h.hotel_rating) || 0,
    rating: Number(h.review_rating) || 0, reviews: num(h.review_count), perNight: num(h.price_per_night), total: num(h.price_per_stay),
    amenities: String(h.top_amenities || "").split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, 6),
    url: h.accommodation_url, image: h.main_image, distance: h.distance, lat: h.latitude, lon: h.longitude, seller: h.advertisers
  })).filter(h => h.name && h.perNight);
  return { hotels, areaFound };
}
// A sensible "stay idea" for an email: well rated, 3★ or better, best value
export function stayIdea(hotels: any[]) {
  const good = hotels.filter(h => h.rating >= 8 && (h.stars >= 3 || !h.stars)).sort((a, b) => a.perNight - b.perNight);
  return good[0] || hotels.slice().sort((a, b) => b.rating - a.rating || a.perNight - b.perNight)[0] || null;
}
