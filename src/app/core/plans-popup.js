/* ---------- Plans and today's deals pop-up ---------- */
const PAYMENT_LINKS={monthly:"",annual:""}; // paste the Stripe payment links here when ready
let topDeals=null;
async function openPlans(){
  const m=$("#plansModal");m.hidden=false;$("#pmLaunch").hidden=true;
  if(!topDeals){try{topDeals=await (await fetch("/api/top-deals")).json()}catch(e){topDeals={deals:[]}}}
  const list=topDeals.deals||[];
  $("#pmDeals").innerHTML=list.length?list.map(d=>`<div class="pm-deal"><h3>${esc(d.destName)}</h3><div class="small muted">From ${esc(d.originName||"London")} · ${fmtDate(d.depart)} – ${fmtDate(d.ret)} · ${d.nights} nights</div>
    <div style="display:flex;justify-content:space-between;align-items:end;margin-top:6px"><span class="n">${gbp(d.price)}</span><span class="small muted" style="text-align:right">return pp${d.usual?`<br><s>usually ${gbp(d.usual)}</s>`:""}</span></div>
    ${d.dropPct?`<span class="tag ok" style="margin-top:6px">${gbp(d.drop)} below usual (−${d.dropPct}%)</span>`:""}</div>`).join(""):`<p class="muted small">Today's deals are still being checked. Try again shortly.</p>`;
}
function closePlans(){$("#plansModal").hidden=true}
function initPlans(){
  $("#openPlans").addEventListener("click",openPlans);
  $$("[data-pay]").forEach(a=>{const l=PAYMENT_LINKS[a.dataset.pay];if(l){a.href=l;a.target="_blank";a.rel="noopener"}});
  $("#plansModal").addEventListener("click",e=>{
    if(e.target.id==="plansModal"||e.target.closest("[data-pm-close]"))return closePlans();
    const p=e.target.closest("[data-pay]");if(p&&!PAYMENT_LINKS[p.dataset.pay]){e.preventDefault();$("#pmLaunch").hidden=false;$("#pmLaunch").dataset.plan=p.dataset.pay;$("#pm-email").focus()}
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#plansModal").hidden)closePlans()});
  $("#pmLaunch").addEventListener("submit",async()=>{
    const email=$("#pm-email").value.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return toast("Please enter your email");if(!$("#pm-consent").checked)return toast("Please tick the box so we can email you");
    try{const r=await fetch("/api/waitlist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,plan:$("#pmLaunch").dataset.plan||"annual",consent:true,source:"app-deals"})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"");
      $("#pmLaunch").innerHTML=`<h3 style="margin:0 0 4px">You're on the list</h3><p class="small muted" style="margin:0">We'll email you as soon as deal alerts open.</p>`}catch(e){toast(e.message||"That didn't work. Please try again.")}
  });
}
function maybeShowPlans(){let seen=false;try{seen=sessionStorage.getItem("sdh-plans")==="1";sessionStorage.setItem("sdh-plans","1")}catch(e){}if(!seen)setTimeout(()=>{if(location.hash==="#deals")openPlans()},1200)}

