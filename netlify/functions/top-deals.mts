import type { Context, Config } from "@netlify/functions";
import { getTopDeals } from "../lib/topdeals.mts";
// The two best deals found from London right now (refreshed at most every 12 hours)
export default async (req: Request, context: Context) => {
  try {
    const r = await getTopDeals(Netlify.env.get("TRAVELPAYOUTS_TOKEN") || undefined);
    return Response.json(r, { headers: { "Cache-Control": "public, max-age=900" } });
  } catch { return Response.json({ deals: [] }); }
};
export const config: Config = { path: "/api/top-deals" };
