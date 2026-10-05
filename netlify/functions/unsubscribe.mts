import type { Context, Config } from "@netlify/functions";
import { alertStore } from "../lib/store.mts";
// One-click "stop these emails": pauses the alert (it can be resumed on the Deals page)
const page = (title: string, msg: string) => new Response(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:Segoe UI,Arial,sans-serif;background:#F2F6F8;color:#13212B;display:grid;place-items:center;min-height:100vh;margin:0"><div style="background:#fff;border:1px solid #D3DEE5;border-radius:16px;padding:28px;max-width:460px;margin:16px"><h1 style="color:#0F3D57;font-size:22px;margin:0 0 8px">${title}</h1><p style="line-height:1.5">${msg}</p><p><a href="/#deals" style="color:#0F3D57;font-weight:700">Go to your deal alerts</a></p></div></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
export default async (req: Request, context: Context) => {
  const q = new URL(req.url).searchParams, id = q.get("id") || "", t = q.get("t") || "";
  const store = alertStore();
  const alert: any = id ? await store.get(id, { type: "json" }) : null;
  if (!alert || !alert.unsubToken || alert.unsubToken !== t) return page("Link not recognised", "This link has expired or isn't valid. You can manage your alerts in the app.");
  alert.paused = true; await store.setJSON(id, alert);
  return page("Emails stopped", `You won't receive any more emails for the alert <b>${String(alert.name).replace(/</g, "&lt;")}</b>. You can turn it back on at any time on the Deals page.`);
};
export const config: Config = { path: "/api/unsubscribe" };
