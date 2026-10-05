import { getStore, getDeployStore } from "@netlify/blobs";

export function alertStore() {
  if (Netlify.context?.deploy?.context === "production") return getStore({ name: "deal-alerts", consistency: "strong" });
  return getDeployStore("deal-alerts");
}

export function checkPasscode(req: Request) {
  const need = Netlify.env.get("APP_PASSCODE");
  if (!need) return true;
  return req.headers.get("x-passcode") === need;
}
