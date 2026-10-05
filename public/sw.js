// Keeps the planner and saved trips available with a weak or no connection (e.g. abroad)
const CACHE = "shaz-holidays-v2";
const CORE = ["/app/", "/", "/manifest.webmanifest", "/apple-touch-icon.png", "/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); const key = e.request.mode === "navigate" ? (u.pathname.startsWith("/app") ? "/app/" : u.pathname) : e.request; caches.open(CACHE).then(c => c.put(key, copy)); return r; })
    .catch(() => caches.match(e.request.mode === "navigate" ? (u.pathname.startsWith("/app") ? "/app/" : u.pathname) : e.request)));
});
