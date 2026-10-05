import { summary, type Criteria, type Deal } from "./deals.mts";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const fmt = (s: string) => new Date(s + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const gbp = (n: number) => "£" + Math.round(n).toLocaleString("en-GB");
const NAVY = "#0F3D57", GOLD = "#F4B23E", INK = "#13212B", MUTED = "#4A5B67", LINE = "#D3DEE5", SEA = "#E8F3F1";

// Shared branded wrapper for every email (deal alerts now, welcome and tips emails later)
export function brandedEmail(o: { site: string; preheader: string; title: string; intro: string; body: string; footerNote?: string; unsubscribeUrl?: string; manageUrl?: string }) {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.title)}</title></head>
<body style="margin:0;background:#F2F6F8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:${INK}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F6F8"><tr><td align="center" style="padding:20px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${LINE}">
  <tr><td style="background:${NAVY};padding:18px 22px">
    <table role="presentation" width="100%"><tr>
      <td style="vertical-align:middle"><img src="${o.site}/img/shaz.jpg" width="52" height="52" alt="Shaz" style="border-radius:50%;border:3px solid ${GOLD};display:block"></td>
      <td style="vertical-align:middle;padding-left:12px;color:#ffffff;font-size:20px;font-weight:800">Shaz does holidays<div style="font-size:13px;font-weight:400;color:#CFE6E3">Planned by holiday lovers. Priced for bargain hunters.</div></td>
    </tr></table></td></tr>
  <tr><td style="padding:22px 22px 6px">
    <h1 style="margin:0 0 8px;font-size:22px;line-height:1.25;color:${NAVY}">${esc(o.title)}</h1>
    <p style="margin:0;color:${MUTED};font-size:15px;line-height:1.5">${o.intro}</p></td></tr>
  <tr><td style="padding:12px 22px 6px">${o.body}</td></tr>
  <tr><td style="padding:16px 22px 22px;border-top:1px solid ${LINE};color:${MUTED};font-size:12px;line-height:1.6">
    ${o.footerNote ? `<p style="margin:0 0 8px">${o.footerNote}</p>` : ""}
    <p style="margin:0 0 8px">Some links are affiliate links: if you book through them we may earn a small commission, at no extra cost to you. Prices change quickly, so always check the final price before booking.</p>
    <p style="margin:0">${o.manageUrl ? `<a href="${esc(o.manageUrl)}" style="color:${NAVY}">Manage your alerts</a>` : ""}${o.unsubscribeUrl ? ` · <a href="${esc(o.unsubscribeUrl)}" style="color:${NAVY}">Stop these emails</a>` : ""}</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

export function dealEmail(name: string, c: Criteria, deals: Deal[], live: boolean, site: string, opts: { unsubscribeUrl?: string; newKeys?: Set<string> } = {}) {
  const best = deals[0];
  const card = (d: Deal) => {
    const isNew = opts.newKeys?.has(dealKey(d));
    const badge = d.dropPct && d.dropPct >= 15 ? `<span style="display:inline-block;background:#E3F1EA;color:#1E6B4E;font-weight:700;font-size:12px;padding:3px 8px;border-radius:999px">${gbp(d.drop || 0)} below usual (−${d.dropPct}%)</span>` : "";
    const hotel = d.hotel ? `<tr><td colspan="2" style="padding:10px 14px;background:${SEA};border-top:1px solid ${LINE};font-size:13px;color:${INK};line-height:1.5">
        🏨 <b>Stay idea:</b> ${esc(d.hotel.name)}${d.hotel.stars ? " " + "★".repeat(d.hotel.stars) : ""}${d.hotel.rating ? ` · ${d.hotel.rating.toFixed(1)}/10` : ""} · ${gbp(d.hotel.perNight)} a night (${gbp(d.hotel.total)} for ${d.nights} nights)
        <br><b>Flights + hotel for ${c.travellers}: about ${gbp(d.total + d.hotel.total)}</b> · <a href="${esc(d.hotel.link)}" style="color:${NAVY};font-weight:700">See it on Booking.com</a></td></tr>` : "";
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px;margin:0 0 14px;border-collapse:separate;overflow:hidden">
      <tr><td style="padding:14px 14px 10px;vertical-align:top">
        <div style="font-size:18px;font-weight:800;color:${INK}">${esc(d.destName)}${isNew ? ` <span style="font-size:11px;background:${GOLD};color:#2B1C00;padding:2px 7px;border-radius:999px;vertical-align:middle">NEW</span>` : ""}</div>
        <div style="font-size:13px;color:${MUTED};margin:4px 0 6px">${fmt(d.depart)} – ${fmt(d.ret)} · ${d.nights} nights${d.airline ? " · " + esc(d.airline) : ""}${d.stops != null ? " · " + (d.stops ? d.stops + " stop" + (d.stops > 1 ? "s" : "") : "direct") : ""}${d.fromAirport ? " · from " + esc(d.fromAirport) : ""}</div>${badge}
      </td><td style="padding:14px;vertical-align:top;text-align:right;white-space:nowrap">
        <div style="font-size:24px;font-weight:800;color:${NAVY}">${gbp(d.price)}</div><div style="font-size:12px;color:${MUTED}">per person return${d.usual ? `<br><s>usually ${gbp(d.usual)}</s>` : ""}</div>
        <a href="${esc(d.link)}" style="display:inline-block;margin-top:8px;background:${NAVY};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:9px 14px;border-radius:8px">View fare</a>
      </td></tr>${hotel}</table>`;
  };
  const intro = `${live ? "" : "These are estimated fares on typically cheap days. "}Here are the best fares we found for <b>${esc(name)}</b>: ${esc(summary(c))}.`;
  const body = deals.map(card).join("") + `<p style="margin:6px 0 0;text-align:center"><a href="${site}/#deals" style="display:inline-block;background:${GOLD};color:#2B1C00;text-decoration:none;font-weight:800;padding:12px 20px;border-radius:10px">Plan one of these trips</a></p>`;
  const subject = best?.dropPct && best.dropPct >= 15
    ? `${best.destName} from ${gbp(best.price)}pp: ${gbp(best.drop || 0)} below the usual price`
    : `${deals.length} holiday deal${deals.length === 1 ? "" : "s"} from ${c.origin.name}, from ${gbp(best?.price || 0)}pp`;
  const html = brandedEmail({ site, preheader: subject, title: best?.dropPct && best.dropPct >= 15 ? "Prices have dropped" : "Your holiday deals", intro, body,
    footerNote: `You're getting this because you set up the "${esc(name)}" deal alert.`, unsubscribeUrl: opts.unsubscribeUrl, manageUrl: `${site}/#deals` });
  const text = deals.map(d => `${d.destName}: ${d.depart} to ${d.ret} (${d.nights} nights) £${d.price}pp${d.usual ? ` (usually £${d.usual})` : ""} – ${d.link}${d.hotel ? `\n  Stay idea: ${d.hotel.name}, £${d.hotel.perNight}/night – ${d.hotel.link}` : ""}`).join("\n") + (opts.unsubscribeUrl ? `\n\nStop these emails: ${opts.unsubscribeUrl}` : "");
  return { html, text, subject };
}
export const dealKey = (d: Deal) => `${d.dest}|${d.depart}|${d.ret}`;

export async function sendEmail(subject: string, html: string, text: string, replyTo?: string, extra: { to?: string; unsubscribeUrl?: string } = {}) {
  const key = Netlify.env.get("RESEND_API_KEY");
  const to = extra.to || Netlify.env.get("ALERT_EMAIL");
  if (!key || !to) return { ok: false, error: "Email isn't set up yet: add RESEND_API_KEY and ALERT_EMAIL in Netlify environment variables." };
  const from = Netlify.env.get("ALERT_FROM") || "Shaz does holidays <onboarding@resend.dev>";
  const headers = extra.unsubscribeUrl ? { "List-Unsubscribe": `<${extra.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}), ...(headers ? { headers } : {}) })
  });
  if (!r.ok) return { ok: false, error: `Email provider returned ${r.status}: ${(await r.text()).slice(0, 200)}` };
  return { ok: true };
}
