import { findDeals, cleanCriteria } from "./deals.mts";
import { getStore, getDeployStore } from "@netlify/blobs";

// Popular destinations from London, checked daily to find the two best deals right now
const POPULAR: [string, string, string, number][] = [
  ["Barcelona", "Spain", "BCN", 130], ["Lisbon", "Portugal", "LIS", 140], ["Rome", "Italy", "ROM", 140], ["Amsterdam", "Netherlands", "AMS", 110],
  ["Paris", "France", "PAR", 120], ["Malaga", "Spain", "AGP", 140], ["Faro", "Portugal", "FAO", 140], ["Palma", "Spain", "PMI", 140],
  ["Tenerife", "Spain", "TFS", 200], ["Lanzarote", "Spain", "ACE", 200], ["Athens", "Greece", "ATH", 180], ["Prague", "Czech Republic", "PRG", 120],
  ["Budapest", "Hungary", "BUD", 120], ["Venice", "Italy", "VCE", 140], ["Nice", "France", "NCE", 140], ["Dubrovnik", "Croatia", "DBV", 170],
  ["Marrakech", "Morocco", "RAK", 160], ["Malta", "Malta", "MLA", 160], ["Reykjavík", "Iceland", "REK", 190], ["New York", "United States", "NYC", 520],
  ["Dubai", "United Arab Emirates", "DXB", 480], ["Bangkok", "Thailand", "BKK", 650]
];
export function cacheStore() {
  if (Netlify.context?.deploy?.context === "production") return getStore({ name: "site-cache", consistency: "strong" });
  return getDeployStore("site-cache");
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
export async function computeTopDeals(token: string) {
  const from = iso(new Date(Date.now() + 7 * 864e5)), to = iso(new Date(Date.now() + 75 * 864e5));
  const results: any[] = [];
  // a few destinations at a time to stay polite to the fares service
  for (let i = 0; i < POPULAR.length; i += 6) {
    const batch = POPULAR.slice(i, i + 6);
    const lists = await Promise.all(batch.map(([name, country, code, fare]) =>
      findDeals(cleanCriteria({ origin: { code: "LON", name: "London" }, dests: [{ key: code.toLowerCase(), name, country, code, fare }], from, to, minNights: 3, maxNights: 10, maxPrice: 2000, travellers: 2 }), token).then(r => r.deals).catch(() => [])));
    lists.forEach(l => results.push(...l));
  }
  const real = results.filter(d => (d.dropPct || 0) >= 15).sort((a, b) => (b.dropPct || 0) - (a.dropPct || 0) || a.price - b.price);
  const picked: any[] = [];
  for (const d of real) { if (!picked.some(p => p.dest === d.dest)) picked.push(d); if (picked.length === 2) break; }
  return { updated: new Date().toISOString(), origin: "London", deals: picked };
}
export async function getTopDeals(token?: string, maxAgeHours = 12) {
  const store = cacheStore();
  const cached: any = await store.get("top-deals", { type: "json" });
  if (cached && Date.now() - Date.parse(cached.updated) < maxAgeHours * 36e5 && cached.deals?.length) return cached;
  // Out of date or missing: refresh in the background (it takes longer than a page request allows)
  const site = Netlify.env.get("URL");
  const lastKick: any = await store.get("top-deals-kick", { type: "json" });
  if (site && token && (!lastKick || Date.now() - Date.parse(lastKick.at) > 10 * 60000)) {
    await store.setJSON("top-deals-kick", { at: new Date().toISOString() });
    await fetch(`${site}/.netlify/functions/deal-alerts-background`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: Netlify.env.get("ALERTS_RUN_KEY") || "shaz-run", topOnly: true }) }).catch(() => null);
  }
  return cached || { deals: [], pending: true };
}
