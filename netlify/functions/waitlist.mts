import type { Context, Config } from "@netlify/functions";
import { getStore, getDeployStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import { sendEmail } from "../lib/email.mts";
// Launch list: people who want to know when paid plans open
const store = () => Netlify.context?.deploy?.context === "production" ? getStore({ name: "waitlist", consistency: "strong" }) : getDeployStore("waitlist");
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  let b: any = {}; try { b = await req.json(); } catch { return Response.json({ error: "Please try again." }, { status: 400 }); }
  if (b.website) return Response.json({ ok: true });
  const email = String(b.email || "").trim().toLowerCase().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!b.consent) return Response.json({ error: "Please tick the box so we can email you." }, { status: 400 });
  const plan = ["monthly", "annual", "free"].includes(b.plan) ? b.plan : "any";
  const key = createHash("sha256").update(email).digest("hex").slice(0, 32);
  const s = store();
  const existing: any = await s.get(key, { type: "json" });
  await s.setJSON(key, { email, plan, source: String(b.source || "").slice(0, 40), created: existing?.created || new Date().toISOString(), updated: new Date().toISOString() });
  if (!existing) await sendEmail(`New launch-list sign-up (${plan})`, `<p>${email.replace(/</g, "&lt;")} joined the launch list from ${String(b.source || "the site").replace(/</g, "&lt;")}, interested in: ${plan}.</p>`, `${email} joined the launch list (${plan}).`).catch(() => null);
  return Response.json({ ok: true, already: !!existing });
};
export const config: Config = { path: "/api/waitlist" };
