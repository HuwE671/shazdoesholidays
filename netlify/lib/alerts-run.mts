import { findDeals, type Deal } from "./deals.mts";
import { dealEmail, dealKey, sendEmail } from "./email.mts";
import { searchHotels, stayIdea } from "./hotels.mts";
import { bookingSearch } from "./aff.mts";

const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T) => Promise.race([p, new Promise<T>(r => setTimeout(() => r(fallback), ms))]);

// Work out what to send for one alert, add hotel ideas, email it, and remember what was sent
export async function runAlert(store: any, alert: any, opts: { force?: boolean; site: string; token?: string }) {
  if (alert.paused && !opts.force) return { skipped: "paused" };
  const now = Date.now();
  if (!opts.force && alert.frequency === "weekly" && alert.lastSent && now - Date.parse(alert.lastSent) < 6.5 * 864e5) return { skipped: "weekly" };
  const { live, deals } = await findDeals(alert.criteria, opts.token);
  let pick: Deal[] = alert.frequency === "bigdrop" ? deals.filter(d => (d.dropPct || 0) >= 25) : deals;
  const prev: Record<string, number> = alert.sentKeys || {};
  const newKeys = new Set(pick.filter(d => !prev[dealKey(d)] || d.price < prev[dealKey(d)] * 0.95).map(dealKey));
  if (!pick.length) return { skipped: "no deals" };
  if (!opts.force && !newKeys.size) return { skipped: "nothing new" };
  pick = pick.slice(0, 6);
  // hotel ideas for the top three destinations
  if (alert.hotels !== false && live) {
    const seen = new Set<string>();
    const targets = pick.filter(d => !seen.has(d.dest) && seen.add(d.dest)).slice(0, 3);
    await Promise.all(targets.map(async d => {
      const r = await withTimeout(searchHotels({ q: `${d.destName}${d.country ? ", " + d.country : ""}`, checkin: d.depart, checkout: d.ret, adults: alert.criteria.travellers }).catch(() => null), 25000, null);
      const h = r && stayIdea(r.hotels);
      if (h) d.hotel = { name: h.name, stars: h.stars, rating: h.rating, perNight: h.perNight, total: h.total, link: bookingSearch(`${h.name}, ${d.destName}`, d.depart, d.ret, alert.criteria.travellers, "email-hotel") };
    }));
  }
  const unsub = `${opts.site}/api/unsubscribe?id=${encodeURIComponent(alert.id)}&t=${encodeURIComponent(alert.unsubToken || "")}`;
  const mail = dealEmail(alert.name, alert.criteria, pick, live, opts.site, { unsubscribeUrl: alert.unsubToken ? unsub : undefined, newKeys });
  const sent = await sendEmail(mail.subject, mail.html, mail.text, undefined, { to: alert.email || undefined, unsubscribeUrl: alert.unsubToken ? unsub : undefined });
  if (sent.ok) {
    const keys: Record<string, number> = { ...prev };
    pick.forEach(d => keys[dealKey(d)] = d.price);
    const trimmed = Object.fromEntries(Object.entries(keys).slice(-200));
    Object.assign(alert, { lastSent: new Date().toISOString(), lastBest: pick[0].price, lastDrop: pick[0].dropPct || 0, sentKeys: trimmed });
    await store.setJSON(alert.id, alert);
  }
  return { sent: sent.ok, error: sent.ok ? undefined : sent.error, count: pick.length };
}
