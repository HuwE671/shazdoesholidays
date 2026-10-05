import type { Context, Config } from "@netlify/functions";
import { cleanCriteria, findDeals } from "../lib/deals.mts";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return Response.json({ error: "Use POST with your search criteria." }, { status: 405 });
  let body: any = {};
  try { body = await req.json(); } catch { return Response.json({ error: "Criteria must be JSON." }, { status: 400 }); }
  const criteria = cleanCriteria(body);
  const result = await findDeals(criteria, Netlify.env.get("TRAVELPAYOUTS_TOKEN") || undefined);
  return Response.json({ criteria, ...result });
};

export const config: Config = { path: "/api/deals" };
