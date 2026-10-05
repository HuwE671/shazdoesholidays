/* ---------- Router ---------- */
const VIEWS=["plan","stay","travel","itinerary","budget","deals","trips","connect","settings"];
function route(){
  const v=(location.hash||"#plan").slice(1);const view=VIEWS.includes(v)?v:"plan";
  VIEWS.forEach(x=>$("#view-"+x).classList.toggle("active",x===view));
  $$("nav.tabs a").forEach(a=>{if(a.getAttribute("href")==="#"+view)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  if(view==="travel")travelTier=null;
  const act=$("nav.tabs a[aria-current]");if(act&&act.scrollIntoView)try{act.scrollIntoView({inline:"center",block:"nearest"})}catch(e){}
  renderView(view);window.scrollTo(0,0);
}
function renderView(v){
  if(isTour()&&(v==="stay"||v==="itinerary")){const ss=tourStopsDated();let idx=v==="stay"?stayStopIdx:itinStopIdx;if(idx>=ss.length)idx=0;const x=ss[idx];CTX=x?{idx,key:x.key,start:x.start,end:x.end,firstDay:x.firstDay}:null}else CTX=null;
  document.body.classList.toggle("tour-mode",isTour());
  setTimeout(()=>{const dd=dest();if(dd)$$("#view-"+v+" .destName").forEach(e=>e.textContent=dd.name)},0);
  renderNext();if(!ready()&&["stay","travel","itinerary","budget"].includes(v))return;({budget:renderBudget,plan:()=>{renderPass();renderDestinations()},stay:renderStay,travel:renderTravel,itinerary:renderItin,deals:()=>{loadAlerts();maybeShowPlans()},trips:()=>{renderSync();renderTrips()},connect:renderConnect,settings:renderSettings})[v]()}
function renderAll(){renderStrip();const v=(location.hash||"#plan").slice(1);renderView(VIEWS.includes(v)?v:"plan");if(v!=="plan")renderPass()}
function syncNames(){const t=T();if(t.tripType==="tour"){$("#p-origin").value=ORIGINS[t.origin]?ORIGINS[t.origin].name:"";return renderTourBuilder()}$("#p-origin").value=ORIGINS[t.origin]?ORIGINS[t.origin].name:"";$("#p-dest").value=D[t.dest]?D[t.dest].name+(D[t.dest].country?", "+D[t.dest].country:""):""}
function syncForm(){const t=T();syncNames();setTimeout(()=>fillNights(nights(T())),0);$("#f-origin").value=t.origin;$("#f-dest").value=t.dest;$("#f-start").value=t.start;$("#f-end").value=t.end;$("#f-trav").value=t.trav;$("#f-budget").value=t.budget}

const setHdr=()=>document.documentElement.style.setProperty("--hdr",$("header.top").offsetHeight+"px");setHdr();window.addEventListener("resize",setHdr);
if(window.innerWidth<900)$("#filtersBox").open=false;
initForm();initPickers();initStay();initTravel();initItin();initDeals();initPlans();initTrips();initSettings();initHelp();applyProfile();syncNames();initSync();
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("/sw.js").catch(()=>{});
window.addEventListener("hashchange",route);
renderStrip();route();
