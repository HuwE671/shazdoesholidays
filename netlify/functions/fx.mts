import type { Context, Config } from "@netlify/functions";
// Exchange rates to GBP (European Central Bank reference rates via Frankfurter)
export default async (req: Request, context: Context) => {
  const q = new URL(req.url).searchParams;
  const from = (q.get("from") || "").toUpperCase(), date = q.get("date") || "latest";
  if (!/^[A-Z]{3}$/.test(from)) return Response.json({ error: "Missing currency." }, { status: 400 });
  if (from === "GBP") return Response.json({ rate: 1, date });
  const when = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= new Date().toISOString().slice(0, 10) ? date : "latest";
  try {
    const r = await fetch(`https://api.frankfurter.app/${when}?from=${from}&to=GBP`);
    const j: any = await r.json();
    if (!j?.rates?.GBP) throw new Error();
    return Response.json({ rate: j.rates.GBP, date: j.date }, { headers: { "Cache-Control": "public, max-age=21600" } });
  } catch { return Response.json({ error: "Exchange rate unavailable." }, { status: 502 }); }
};
export const config: Config = { path: "/api/fx" };
