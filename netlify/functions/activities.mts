import type { Context, Config } from "@netlify/functions";
import { mcpSession } from "../lib/mcp.mts";

// Bookable activities with prices via Civitatis
export default async (req: Request, context: Context) => {
  const dest = (new URL(req.url).searchParams.get("dest") || "").trim().slice(0, 80);
  if (dest.length < 2) return Response.json({ activities: [] });
  try {
    const call = await mcpSession("https://civitatis-claude-app.civitatis.com/mcp");
    const list = await call("list-activities", { destination: dest, lang: "en_US", currency: "GBP" });
    const acts: any[] = (list?.structuredContent?.activities || []).slice(0, 12);
    const details = await Promise.all(acts.map(a => call("get-activity-detail", { activityId: a.id, lang: "en_US", currency: "GBP" }).then(r => r?.structuredContent).catch(() => null)));
    const activities = acts.map((a, i) => {
      const d = details[i] || {};
      return { id: a.id, title: a.title, price: Math.round(Number(a.priceAmount) || 0), duration: a.durationText || "",
        category: d.category || "", rating: d.rating || null, reviews: d.reviewCount || 0, url: d.bookingUrl || "https://www.civitatis.com/en/",
        image: d.thumbnailUrl || d.imageUrl || "", freeCancel: !!d.hasFreeCancellation };
    });
    return Response.json({ source: "civitatis", activities }, { headers: { "Cache-Control": "public, max-age=21600" } });
  } catch {
    return Response.json({ activities: [], error: "Activities are unavailable right now." }, { status: 502 });
  }
};
export const config: Config = { path: "/api/activities" };
