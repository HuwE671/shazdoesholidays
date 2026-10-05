import type { Context, Config } from "@netlify/functions";
import { getStore, getDeployStore } from "@netlify/blobs";
import { createHash } from "node:crypto";

// Cloud save for trips and places, shared between devices that use the same private sync code.
function store() {
  if (Netlify.context?.deploy?.context === "production") return getStore({ name: "planner-sync", consistency: "strong" });
  return getDeployStore("planner-sync");
}
type Wire = { trips: any[]; places: Record<string, { v: any; u: number }>; origins: Record<string, { v: any; u: number }>; tomb: Record<string, number>; profile?: { v: any; u: number } };
const empty = (): Wire => ({ trips: [], places: {}, origins: {}, tomb: {} });

function clean(x: any): Wire {
  const w = empty();
  if (!x || typeof x !== "object") return w;
  if (Array.isArray(x.trips)) w.trips = x.trips.filter((t: any) => t && typeof t.id === "string").slice(0, 500);
  for (const k of ["places", "origins"] as const) if (x[k] && typeof x[k] === "object") for (const [key, val] of Object.entries<any>(x[k]).slice(0, 300)) if (val && val.v) w[k][key.slice(0, 80)] = { v: val.v, u: Number(val.u) || 0 };
  if (x.profile && x.profile.v && typeof x.profile.v === "object" && JSON.stringify(x.profile.v).length < 400000) w.profile = { v: x.profile.v, u: Number(x.profile.u) || 0 };
  if (x.tomb && typeof x.tomb === "object") for (const [k, t] of Object.entries(x.tomb).slice(0, 2000)) w.tomb[k.slice(0, 100)] = Number(t) || 0;
  return w;
}
function merge(a: Wire, b: Wire): Wire {
  const out = empty();
  const cutoff = Date.now() - 180 * 864e5;
  for (const src of [a.tomb, b.tomb]) for (const [k, t] of Object.entries(src)) if (t > cutoff) out.tomb[k] = Math.max(out.tomb[k] || 0, t);
  const trips = new Map<string, any>();
  for (const t of [...a.trips, ...b.trips]) { const cur = trips.get(t.id); if (!cur || (Number(t.updatedAt) || 0) > (Number(cur.updatedAt) || 0)) trips.set(t.id, t); }
  out.trips = [...trips.values()].filter(t => !(out.tomb["t:" + t.id] >= (Number(t.updatedAt) || 0)))
    .sort((x, y) => String(y.created || "").localeCompare(String(x.created || "")));
  for (const [k, pre] of [["places", "p:"], ["origins", "o:"]] as const) {
    for (const src of [a[k], b[k]]) for (const [key, val] of Object.entries(src)) { const cur = out[k][key]; if (!cur || val.u > cur.u) out[k][key] = val; }
    for (const key of Object.keys(out[k])) if (out.tomb[pre + key] >= out[k][key].u) delete out[k][key];
  }
  const pa = a.profile, pb = b.profile;
  if (pa || pb) out.profile = !pa ? pb : !pb ? pa : (pb.u > pa.u ? pb : pa);
  return out;
}

export default async (req: Request, context: Context) => {
  const code = (req.headers.get("x-sync-code") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (code.length < 20 || code.length > 64) return Response.json({ error: "That sync code isn't valid." }, { status: 400 });
  const key = "u/" + createHash("sha256").update(code).digest("hex");
  const s = store();
  const current = clean(await s.get(key, { type: "json" }));
  if (req.method === "GET") return Response.json({ ok: true, data: current, exists: current.trips.length > 0 || Object.keys(current.places).length > 0 });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const raw = await req.text();
  if (raw.length > 4_000_000) return Response.json({ error: "Too much data to sync." }, { status: 413 });
  let incoming: Wire;
  try { incoming = clean(JSON.parse(raw)); } catch { return Response.json({ error: "Sync data must be JSON." }, { status: 400 }); }
  const merged = merge(current, incoming);
  await s.setJSON(key, merged);
  return Response.json({ ok: true, data: merged, at: Date.now() });
};
export const config: Config = { path: "/api/sync" };
