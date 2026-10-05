/* ---------- Deals and alerts ---------- */
let SERVER={passcodeRequired:false,emailReady:false,liveFares:false,alerts:[]};
function renderDealChips(sel){const ks=Object.keys(D).filter(k=>D[k].air);$("#d-dests").innerHTML=ks.length?ks.map(k=>`<button type="button" class="chip" data-d="${k}" aria-pressed="${sel.includes(k)}">${esc(D[k].name)}</button>`).join(""):`<span class="small muted">No places yet. Add destinations with the search below.</span>`}
function critOriginName(c){return typeof c.origin==="string"?(ORIGINS[c.origin]||{name:c.origin}).name:c.origin.name}
function critDestNames(c){return c.dests.map(d=>typeof d==="string"?((D[d]||LIB[d]||{name:d}).name):d.name)}
function dealCriteria(){
  const o=ORIGINS[$("#d-origin").value];
  const dests=$$("#d-dests .chip[aria-pressed=true]").map(c=>{const k=c.dataset.d,d=D[k];return {key:k,name:d.name,country:d.country,code:d.air.city||d.air.code,fare:Math.round(d.air.fare*(o.factor||1))}});
  return {origin:{code:o.code,name:o.name},dests,from:$("#d-from").value,to:$("#d-to").value,minNights:+$("#d-minn").value,maxNights:+$("#d-maxn").value,maxPrice:+$("#d-max").value,travellers:+$("#d-trav").value,directOnly:$("#d-direct").checked};
}
function fillDealForm(c,name,freq){
  const ok=typeof c.origin==="string"?c.origin:addOrigin(c.origin);fillSelects();$("#d-origin").value=ok;
  renderDealChips(c.dests.map(d=>{if(typeof d!=="string")return ensureDest(d);if(!D[d]&&LIB[d]){D[d]=S.custom[d]=libClone(d);save()}return d}).filter(k=>D[k]));
  $("#d-from").value=c.from;$("#d-to").value=c.to;$("#d-minn").value=c.minNights;$("#d-maxn").value=c.maxNights;$("#d-max").value=c.maxPrice;$("#d-trav").value=c.travellers;$("#d-direct").checked=!!c.directOnly;
  if(name!=null)$("#d-name").value=name; if(freq)$("#d-freq").value=freq;
}
async function api(path,opts){
  opts=opts||{};opts.headers=Object.assign({"Content-Type":"application/json"},opts.headers||{});
  const pass=$("#d-pass").value;if(pass)opts.headers["x-passcode"]=pass;
  const r=await fetch(path,opts);let j={};try{j=await r.json()}catch(e){}
  if(!r.ok&&!j.error)j.error="The server returned "+r.status+".";
  return j;
}
function initDeals(){
  const t=T();
  $("#d-origin").innerHTML=placeOptions(ORIGINS);
  $("#d-dests").addEventListener("click",e=>{const b=e.target.closest(".chip");if(b)b.setAttribute("aria-pressed",b.getAttribute("aria-pressed")!=="true")});
  fillDealForm({origin:t.origin||"LON",dests:t.dest&&D[t.dest]&&D[t.dest].air?[t.dest]:[],from:iso(addDays(today,14)),to:iso(addDays(today,120)),minNights:3,maxNights:7,maxPrice:200,travellers:t.trav,directOnly:false},"","daily");
  $("#d-search").addEventListener("click",searchDeals);
  $("#d-save").addEventListener("click",saveAlert);
  $("#dealResults").addEventListener("click",e=>{
    const b=e.target.closest("[data-plan-deal]");if(!b)return;
    const d=JSON.parse(b.dataset.planDeal);
    const ok=addOrigin({code:d.origin,name:d.originName});d.dest=ensureDest({key:d.dest,name:d.destName,country:d.country,code:d.destCode,fare:d.price});fillSelects();
    Object.assign(T(),{origin:ok,dest:d.dest,start:d.depart,end:d.ret,trav:+$("#d-trav").value||T().trav,stay:null,transport:null,plan:[]});
    save();syncForm();renderStrip();location.hash="#stay";toast(D[d.dest].name+" loaded into the planner");
  });
  $("#alertList").addEventListener("click",async e=>{
    const id=(e.target.closest("[data-alert]")||{}).dataset;if(!id||!id.alert)return;
    const a=SERVER.alerts.find(x=>x.id===id.alert);if(!a)return;
    if(id.act==="load"){fillDealForm(a.criteria,a.name,a.frequency);window.scrollTo({top:0,behavior:"smooth"});toast("Alert loaded into the form");return}
    if(id.act==="del"){if(!confirm("Delete this alert?"))return;const j=await api("/api/alerts?id="+enc(a.id),{method:"DELETE"});if(j.error)return toast(j.error);toast("Alert deleted");loadAlerts();return}
    if(id.act==="send"){const j=await api("/api/alerts?action=send",{method:"POST",body:JSON.stringify({id:a.id})});toast(j.ok?"Finding deals and hotel ideas. Your email will arrive in a minute or two.":j.error||"Couldn't send");setTimeout(loadAlerts,90000)}
    if(id.act==="pause"){const j=await api("/api/alerts?action=pause",{method:"POST",body:JSON.stringify({id:a.id,paused:!a.paused})});if(j.error)return toast(j.error);toast(a.paused?"Emails resumed":"Emails paused");loadAlerts()}
  });
}
function dealStatus(){
  const items=[];
  items.push(SERVER.liveFares?"Live fares are connected.":"Live fares aren't connected yet, so deals are estimates on typically cheap days. Add a TRAVELPAYOUTS_TOKEN in Netlify to switch on real prices.");
  items.push(SERVER.emailReady?"Email alerts are switched on.":"Email isn't set up yet. Add RESEND_API_KEY and ALERT_EMAIL in Netlify so alerts can be sent.");
  $("#dealStatus").innerHTML=`<p class="note">${items.join(" ")}</p>`;
  $("#d-passWrap").hidden=!SERVER.passcodeRequired;
}
async function loadAlerts(){
  renderDealChips($$("#d-dests .chip[aria-pressed=true]").map(c=>c.dataset.d));
  try{const j=await api("/api/alerts");if(j.error)throw new Error(j.error);SERVER=j}catch(e){SERVER.offline=true}
  dealStatus();
  if(SERVER.offline){$("#alertList").innerHTML=`<div class="empty">Alerts are available on the live site, where the email service runs.</div>`;return}
  $("#alertList").innerHTML=SERVER.alerts.length?SERVER.alerts.map(a=>{const c=a.criteria;return `<div class="result"><div><h3>${esc(a.name)}</h3>
    <div class="meta"><span>${esc(critOriginName(c))} to ${critDestNames(c).map(esc).join(", ")}</span><span>${fmtDate(c.from)} – ${fmtDate(c.to)}</span><span>${c.minNights}–${c.maxNights} nights</span><span>Up to ${gbp(c.maxPrice)} pp</span><span>${({weekly:"Weekly round-up",bigdrop:"Big drops only",daily:"Every morning"})[a.frequency]||"Every morning"}</span>${a.hotels!==false?"<span>With hotel ideas</span>":""}${a.paused?'<span class="tag warn">Paused</span>':""}</div>
    <p class="small muted" style="margin:.4em 0 0">${a.lastSent?"Last emailed "+fmtDate(a.lastSent.slice(0,10))+(a.lastBest?", best "+gbp(a.lastBest)+" pp":"")+(a.lastDrop>=15?` (${a.lastDrop}% below usual)`:""):"Not emailed yet"}</p></div>
    <div class="actions"><div class="links"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" data-alert="${a.id}" data-act="load" type="button">Edit criteria</button><button class="btn ghost sm" data-alert="${a.id}" data-act="send" type="button">Email deals now</button><button class="btn ghost sm" data-alert="${a.id}" data-act="pause" type="button">${a.paused?"Resume emails":"Pause emails"}</button><button class="btn ghost sm" data-alert="${a.id}" data-act="del" type="button" style="color:var(--warn)">Delete</button></div></div></div>`}).join(""):`<div class="empty">No alerts yet. Set your criteria above and save one.</div>`;
}
async function searchDeals(){
  const c=dealCriteria();if(!c.dests.length)return toast("Pick at least one destination");
  $("#dealHead").hidden=false;$("#dealResults").innerHTML=`<p class="muted">Searching ${c.dests.length} destination${c.dests.length>1?"s":""}…</p>`;
  let j;try{j=await api("/api/deals",{method:"POST",body:JSON.stringify(c)})}catch(e){j={error:"Deal search runs on the live site. Open it from Netlify to search."}}
  if(j.error){$("#dealResults").innerHTML=`<div class="empty">${esc(j.error)}</div>`;return}
  $("#dealResults").innerHTML=j.deals.length?j.deals.map(d=>`<div class="result"><div><h3>${esc(d.destName)} <span class="small muted">${esc(d.country)}</span></h3>
    <div class="meta"><span class="tag ${d.live?"economy":""}">${d.live?"Live fare":"Estimate"}</span>${d.dropPct>=15?`<span class="tag ok">${gbp(d.drop)} below usual (−${d.dropPct}%)</span>`:""}<span>${fmtDate(d.depart)} – ${fmtDate(d.ret)}</span><span>${d.nights} nights</span>${d.airline?`<span>${esc(d.airline)}</span>`:""}${d.fromAirport?`<span>From ${esc(d.fromAirport)}</span>`:""}${d.stops!=null?`<span>${d.stops?d.stops+" stop"+(d.stops>1?"s":""):"Direct"}</span>`:""}</div></div>
    <div class="cost"><span class="n">${gbp(d.price)}</span><span class="small muted">pp return · ${gbp(d.total)} for ${c.travellers}${d.usual?`<br><s>usually ${gbp(d.usual)}</s>`:""}</span></div>
    <div class="actions"><div class="links"><a href="${esc(d.link)}" target="_blank" rel="noopener">${d.live?"View this fare":"Check live price"}</a>${airlineLink(d.airlineCode)}</div>
    <button class="btn sm" type="button" data-plan-deal='${esc(JSON.stringify({dest:d.dest,destName:d.destName,country:d.country,destCode:d.destCode,origin:d.origin,originName:d.originName,depart:d.depart,ret:d.ret,price:d.price}))}'>Plan this trip</button></div></div>`).join(""):`<div class="empty">Nothing under ${gbp(c.maxPrice)} per person for those dates. Try a higher maximum, more destinations or a wider date window.</div>`;
}
async function saveAlert(){
  const c=dealCriteria();if(!c.dests.length)return toast("Pick at least one destination");
  const name=$("#d-name").value.trim()||c.dests.map(d=>d.name).join(", ");
  let j;try{j=await api("/api/alerts",{method:"POST",body:JSON.stringify({name,frequency:$("#d-freq").value,hotels:$("#d-hotels").checked,criteria:c})})}catch(e){j={error:"Alerts can only be saved on the live site."}}
  if(j.error)return toast(j.error);
  toast("Alert saved. "+({daily:"New deals will be emailed in the morning",weekly:"You'll get a weekly round-up",bigdrop:"You'll only hear from us when prices drop a lot"})[$("#d-freq").value]);loadAlerts();
}



