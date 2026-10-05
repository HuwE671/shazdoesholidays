/* Shaz does holidays – public website behaviour */
(function(){
"use strict";
// Payment links for the paid plans. Paste the Stripe payment links here when they're ready;
// until then the buttons open the launch list instead.
const PAYMENT_LINKS = { monthly: "", annual: "" };

const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const gbp = n => "£" + Math.round(n).toLocaleString("en-GB");
const fmt = s => new Date(s + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// Header: border on scroll, mobile menu
const head = $(".site-head");
if (head) { const on = () => head.classList.toggle("scrolled", window.scrollY > 8); on(); window.addEventListener("scroll", on, { passive: true }); }
const menu = $(".menu-btn"), nav = $(".site-nav");
if (menu && nav) {
  menu.addEventListener("click", () => { const open = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", open); });
  nav.addEventListener("click", e => { if (e.target.closest("a")) { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); } });
}

// Today's best deals (shared by the hero pass, the deals section and the pop-up)
let deals = null;
const dealCard = d => `<article class="deal">
  <div><h3>${esc(d.destName)}</h3></div>
  <div><div class="price">${gbp(d.price)}</div><div class="was">return, per person${d.usual ? `<br><s>usually ${gbp(d.usual)}</s>` : ""}</div></div>
  <div class="meta">From ${esc(d.originName || "London")}${d.fromAirport ? " (" + esc(d.fromAirport) + ")" : ""} · ${fmt(d.depart)} – ${fmt(d.ret)} · ${d.nights} nights${d.airline ? " · " + esc(d.airline) : ""}</div>
  ${d.dropPct ? `<span class="tag ok">${gbp(d.drop)} below the usual price (−${d.dropPct}%)</span>` : ""}
</article>`;
function renderDeals() {
  const list = (deals && deals.deals) || [];
  $$("[data-topdeals]").forEach(el => {
    el.innerHTML = list.length ? list.map(dealCard).join("") : `<div class="deal-empty">Today's deals are being checked. Have a look again shortly, or start planning now and set up your own alerts.</div>`;
  });
  const pass = $("[data-pass]"), d = list[0];
  if (pass && d) {
    pass.innerHTML = `<div class="pass-main"><div class="pass-k">Today's best find</div><div class="pass-dest">${esc(d.destName)}</div>
      <div class="pass-meta">${esc(d.originName || "London")} · ${fmt(d.depart)} – ${fmt(d.ret)}</div>${d.dropPct ? `<span class="pass-save">${d.dropPct}% below usual</span>` : ""}</div>
      <div class="pass-stub"><div class="pass-price">${gbp(d.price)}</div><div class="pass-was">return pp${d.usual ? `<br><s>${gbp(d.usual)}</s>` : ""}</div></div>`;
    pass.hidden = false;
  }
  const upd = $("[data-deals-updated]");
  if (upd && deals && deals.updated) upd.textContent = "Checked " + new Date(deals.updated).toLocaleString("en-GB", { weekday: "long", hour: "numeric", minute: "2-digit" }) + ".";
}
if ($("[data-topdeals]") || $("[data-pass]")) {
  const load = (n) => fetch("/api/top-deals").then(r => r.json()).then(j => { deals = j; if (j.pending && !(j.deals || []).length && n < 3) { setTimeout(() => load(n + 1), 25000); return; } renderDeals(); }).catch(() => { deals = { deals: [] }; renderDeals(); });
  load(0);
}

// Modals
function openModal(id) { const m = document.getElementById(id); if (!m) return; m.hidden = false; document.body.style.overflow = "hidden"; const f = m.querySelector("input,button:not(.modal-close)"); if (f) setTimeout(() => f.focus(), 50); }
function closeModal(m) { m.hidden = true; document.body.style.overflow = ""; }
document.addEventListener("click", e => {
  const c = e.target.closest(".modal-close,[data-close]"); if (c) { closeModal(c.closest(".modal")); return; }
  if (e.target.classList && e.target.classList.contains("modal")) { closeModal(e.target); return; }
  const p = e.target.closest("[data-plan]");
  if (p) {
    const plan = p.dataset.plan, link = PAYMENT_LINKS[plan];
    if (link) return; // real payment link: let it go through
    e.preventDefault();
    const dealsModal = $("#dealsModal"); if (dealsModal && !dealsModal.hidden) closeModal(dealsModal);
    const sel = $("#wl-plan"); if (sel) sel.value = plan;
    openModal("launchModal");
  }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") $$(".modal:not([hidden])").forEach(closeModal); });
$$("[data-plan]").forEach(a => { const link = PAYMENT_LINKS[a.dataset.plan]; if (link) a.href = link; });

// Deals pop-up on the landing page: once per visit, after 15 seconds or most of the way down
if (document.body.dataset.popup === "deals" && $("#dealsModal")) {
  let shown = false; try { shown = sessionStorage.getItem("sdh-deals-popup") === "1"; } catch (e) {}
  const show = () => {
    if (shown || !deals || !(deals.deals || []).length) return; shown = true;
    try { sessionStorage.setItem("sdh-deals-popup", "1"); } catch (e) {}
    if (!$$(".modal:not([hidden])").length) openModal("dealsModal");
  };
  setTimeout(show, 15000);
  window.addEventListener("scroll", () => { if (window.scrollY + innerHeight > document.body.scrollHeight * 0.6) show(); }, { passive: true });
}

// Postcards on the story page
const pcBox = $("#postcards");
if (pcBox && window.POSTCARDS) {
  const tilt = [-2.2, 1.6, -1.2, 2, -1.6, 1.1, -0.8, 1.8];
  const icons = { "Utah": "🏜️", "Colorado": "🏔️", "Portugal": "🍊", "Spain": "🏰", "Santorini": "⛵", "Alps": "✈️", "Devon": "⚓" };
  const icon = c => { for (const k in icons) if (c.includes(k)) return icons[k]; return "🌿"; };
  pcBox.innerHTML = window.POSTCARDS.map((p, i) => `<button type="button" class="postcard" style="--r:${tilt[i % tilt.length]}deg" data-i="${i}" aria-label="${esc(p.caption)}, ${esc(p.stamp)}. Open larger">
    <img src="${p.src}" alt="${esc(p.alt)}" width="720" height="${p.shape === "l" ? 480 : 900}" loading="lazy">
    <span class="pc-cap">${esc(p.caption)}</span><span class="pc-mark" aria-hidden="true">${esc(p.stamp.split(" ")[0]).toUpperCase()}<br>${esc(p.stamp.split(" ")[1])}</span><span class="pc-stamp" aria-hidden="true">${icon(p.caption)}</span></button>`).join("");
  pcBox.addEventListener("click", e => {
    const b = e.target.closest(".postcard"); if (!b) return;
    const p = window.POSTCARDS[+b.dataset.i];
    $("#pcLightImg").src = p.big; $("#pcLightImg").alt = p.alt; $("#pcLightCap").textContent = p.caption + " · " + p.stamp;
    openModal("pcLight");
  });
}

// Launch list form
const wl = $("#launchForm");
if (wl) wl.addEventListener("submit", async e => {
  e.preventDefault();
  const msg = $("#wl-msg"), btn = wl.querySelector("button[type=submit]");
  const body = { email: $("#wl-email").value, plan: $("#wl-plan").value, consent: $("#wl-consent").checked, website: $("#wl-web").value, source: document.body.dataset.page || "site" };
  btn.disabled = true; btn.textContent = "Adding you…";
  try {
    const r = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok || !j.ok) throw new Error(j.error || "That didn't work. Please try again.");
    wl.innerHTML = `<h3>You're on the list</h3><p class="muted">${j.already ? "You were already on it, so no need to sign up again." : "We'll email you the moment paid plans open."} In the meantime, the planner is free to use now.</p><a class="btn primary" href="/app/">Open the planner</a>`;
  } catch (err) { msg.textContent = err.message; btn.disabled = false; btn.textContent = "Join the launch list"; }
});
})();
