import type { Config } from "@netlify/functions";
// Every morning at 07:00 UTC: hand the work to the background worker, which has time for hotel lookups
export default async () => {
  const site = Netlify.env.get("URL") || "https://shaz-does-holidays.netlify.app";
  await fetch(`${site}/.netlify/functions/deal-alerts-background`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: Netlify.env.get("ALERTS_RUN_KEY") || "shaz-run" }) });
};
export const config: Config = { schedule: "0 7 * * *" };
