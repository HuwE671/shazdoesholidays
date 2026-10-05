import type { Context, Config } from "@netlify/functions";
import { cleanCriteria, findDeals } from "../lib/deals.mts";
import { alertStore, checkPasscode } from "../lib/store.mts";
import { randomBytes } from "node:crypto";

export default async (req: Request, context: Context) => {
  const store = alertStore();
  const url = new URL(req.url);

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const alerts = (await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })))).filter(Boolean);
    return Response.json({
      alerts,
      passcodeRequired: !!Netlify.env.get("APP_PASSCODE"),
      emailReady: !!(Netlify.env.get("RESEND_API_KEY") && Netlify.env.get("ALERT_EMAIL")),
      liveFares: !!Netlify.env.get("TRAVELPAYOUTS_TOKEN")
    });
  }

  if (!checkPasscode(req)) return Response.json({ error: "That passcode isn't right." }, { status: 401 });

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id || !/^[\w-]{4,40}$/.test(id)) return Response.json({ error: "Missing alert id." }, { status: 400 });
    await store.delete(id);
    return Response.json({ ok: true });
  }

  if (req.method === "POST") {
    let body: any = {};
    try { body = await req.json(); } catch { return Response.json({ error: "Alert must be JSON." }, { status: 400 }); }

    // Send an alert's email straight away (done in the background so hotel ideas have time to load)
    if (url.searchParams.get("action") === "send") {
      const id = String(body.id || "");
      if (!(await store.get(id, { type: "json" }))) return Response.json({ error: "Alert not found." }, { status: 404 });
      if (!(Netlify.env.get("RESEND_API_KEY") && Netlify.env.get("ALERT_EMAIL"))) return Response.json({ ok: false, error: "Email isn't set up yet." }, { status: 400 });
      const site = Netlify.env.get("URL") || url.origin;
      await fetch(`${site}/.netlify/functions/deal-alerts-background`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, force: true, key: Netlify.env.get("ALERTS_RUN_KEY") || "shaz-run" }) });
      return Response.json({ ok: true, queued: true });
    }
    // Pause or resume
    if (url.searchParams.get("action") === "pause") {
      const id = String(body.id || ""); const a: any = await store.get(id, { type: "json" });
      if (!a) return Response.json({ error: "Alert not found." }, { status: 404 });
      a.paused = !!body.paused; await store.setJSON(id, a); return Response.json({ ok: true, alert: a });
    }

    const { blobs } = await store.list();
    if (blobs.length >= 20 && !body.id) return Response.json({ error: "You already have 20 alerts. Delete one first." }, { status: 400 });
    const id = body.id && /^[\w-]{4,40}$/.test(body.id) ? body.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const alert = {
      id,
      name: String(body.name || "My holiday alert").slice(0, 80),
      frequency: ["weekly", "bigdrop"].includes(body.frequency) ? body.frequency : "daily",
      hotels: body.hotels !== false,
      paused: false,
      unsubToken: randomBytes(12).toString("hex"),
      criteria: cleanCriteria(body.criteria),
      created: new Date().toISOString(),
      lastSent: null, lastBest: null
    };
    await store.setJSON(id, alert);
    return Response.json({ ok: true, alert });
  }

  return Response.json({ error: "Method not allowed." }, { status: 405 });
};

export const config: Config = { path: "/api/alerts" };
