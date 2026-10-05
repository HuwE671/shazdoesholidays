import { alertStore } from "../lib/store.mts";
import { runAlert } from "../lib/alerts-run.mts";
import { computeTopDeals, cacheStore } from "../lib/topdeals.mts";
// Background worker (up to 15 minutes): checks every alert, or one alert when { id, force } is posted
export default async (req: Request) => {
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body = run all */ }
  const store = alertStore();
  const site = Netlify.env.get("URL") || "https://shaz-does-holidays.netlify.app";
  const token = Netlify.env.get("TRAVELPAYOUTS_TOKEN") || undefined;
  if (body.key !== (Netlify.env.get("ALERTS_RUN_KEY") || "shaz-run")) return;
  // refresh "today's best deals" for the website once a day
  if (!body.id && !body.topOnly && token) { try { const t = await computeTopDeals(token); if (t.deals.length) await cacheStore().setJSON("top-deals", t); } catch (e) { console.log("top deals failed", String(e)); } }
  if (body.topOnly) { if (token) { const t = await computeTopDeals(token); if (t.deals.length) await cacheStore().setJSON("top-deals", t); } return; }
  const ids: string[] = body.id ? [String(body.id)] : (await store.list()).blobs.map((b: any) => b.key);
  for (const id of ids) {
    const alert: any = await store.get(id, { type: "json" });
    if (!alert) continue;
    try { console.log(id, JSON.stringify(await runAlert(store, alert, { force: !!body.force, site, token }))); } catch (e) { console.log("alert failed", id, String(e)); }
  }
};
