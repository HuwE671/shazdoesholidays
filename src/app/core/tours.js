/* ---------- Multi-centre tours ---------- */
let stayStopIdx=0,itinStopIdx=0;
const routeCache={},alongCache={};
function ptOf(key){const d=D[key];if(!d)return null;const la=d.lat!=null?d.lat:(d.air&&d.air.lat),lo=d.lon!=null?d.lon:(d.air&&d.air.lon);return la==null?null:[+la,+lo]}
function tourStopsDated(){
  const t=T();if(!t.tour)return [];let off=0;
  return t.tour.stops.map(x=>{const n=Math.max(1,+x.nights||1);const r=Object.assign({},x,{nights:n,offset:off,firstDay:off+1,start:iso(addDays(new Date(t.start+"T12:00"),off)),end:iso(addDays(new Date(t.start+"T12:00"),off+n))});off+=n;r.stay=x.stay;return r});
}
function stopStayCost(x){if(x.stay)return {amount:x.stay.total,detail:x.stay.name+(x.stay.kind?" ("+x.stay.kind+")":"")};const st=typicalStay(x.key,T().tier);return {amount:st.price*x.nights*rooms(st.type,T().trav),detail:st.typeLabel+" (typical price)"}}
function setTripType(type){
  const t=T();if((t.tripType||"single")===type)return;
  if(type==="tour"){t.tour=t.tour||{stops:[],homeFrom:"last"};if(!t.tour.stops.length&&t.dest&&D[t.dest]){const o=ORIGINS[t.origin],p=ptOf(t.dest);const far=!o||o.lat==null||!p||kmBetween(o.lat,o.lon,p[0],p[1])>600;t.tour.stops.push({id:uid(),key:t.dest,nights:Math.max(1,nights(t)),arrive:far?"fly":"drive",via:[],stay:t.stay})}t.tripType="tour";stayStopIdx=0;itinStopIdx=0;toast("Multi-centre tour: add your stops in order")}
  else{t.tripType="single";const f=t.tour&&t.tour.stops[0];if(f){t.dest=f.key;t.stay=f.stay||null;t.end=iso(addDays(new Date(t.start+"T12:00"),f.nights))}}
  t.transport=null;save();syncForm();renderAll();
}
function addStop(key){
  const t=T();t.tour=t.tour||{stops:[],homeFrom:"last"};const ss=t.tour.stops;
  let arrive="drive";if(!ss.length){const o=ORIGINS[t.origin],p=ptOf(key);arrive=(!o||o.lat==null||!p||kmBetween(o.lat,o.lon,p[0],p[1])>600)?"fly":"drive"}
  else{const a=ptOf(ss[ss.length-1].key),b=ptOf(key);if(a&&b&&kmBetween(a[0],a[1],b[0],b[1])>900)arrive="fly"}
  ss.push({id:uid(),key,nights:2,arrive,via:[],stay:null});tourChanged();
}
function tourChanged(){const t=T();t.dest=(t.tour.stops[0]||{}).key||"";const tn=Math.max(1,t.tour.stops.reduce((a,x)=>a+(+x.nights||1),0));t.end=iso(addDays(new Date(t.start+"T12:00"),tn));save();syncForm();renderAll()}
function renderTourBuilder(){
  const t=T(),tour=t.tripType==="tour";
  $$("#typeSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.type===(t.tripType||"single")));
  $("#tourBuilder").hidden=!tour;
  $("#toLbl").textContent=tour?"Tour":"To";$("#p-dest").readOnly=tour;
  if(tour){const ss0=(t.tour&&t.tour.stops)||[];$("#p-dest").value=ss0.length?`${ss0.length} stop${ss0.length>1?"s":""}: ${ss0.map(x=>(D[x.key]||{}).name).join(", ")}`:"";$("#p-dest").placeholder="Add stops below"}else $("#p-dest").placeholder="Anywhere in the world";
  ["#modeLbl","#modeSeg"].forEach(s=>$(s).hidden=tour);
  $("#f-nights").disabled=tour;$("#f-end").readOnly=tour;
  if(!tour)return;
  const ss=tourStopsDated();$("#t-home").value=(t.tour&&t.tour.homeFrom)||"last";
  $("#stopList").innerHTML=ss.length?ss.map((x,i)=>{const d=D[x.key]||{name:"?"};const opts=(i===0?[["fly","Fly from home"],["drive","Drive from home"],["train","Train from home"]]:[["drive","Drive"],["train","Train"],["fly","Fly"]]);
    let nopt="";for(let k=1;k<=21;k++)nopt+=`<option value="${k}"${k===x.nights?" selected":""}>${k} night${k===1?"":"s"}</option>`;
    return `<li class="stop-row"><span class="num">${i+1}</span><div class="sr-main"><b>${esc(d.name)}</b> <span class="small muted">${esc(d.country||"")} · ${fmtDate(x.start)} – ${fmtDate(x.end)}</span>
      <div class="sr-ctrls"><label>Nights<select data-stop="${x.id}" data-f="nights">${nopt}</select></label><label>${i===0?"Getting there":"From the previous stop"}<select data-stop="${x.id}" data-f="arrive">${opts.map(([v,l])=>`<option value="${v}"${v===x.arrive?" selected":""}>${l}</option>`).join("")}</select></label></div>
      ${(x.via||[]).length?`<div class="sr-via">${x.via.map((v,vi)=>`<span class="via-chip">📍 ${esc(v.title)}<button type="button" data-stop="${x.id}" data-act="unvia" data-v="${vi}" aria-label="Remove ${esc(v.title)}">✕</button></span>`).join("")}</div>`:""}</div>
      <div class="sr-btns"><button type="button" data-stop="${x.id}" data-act="up" aria-label="Move up">↑</button><button type="button" data-stop="${x.id}" data-act="down" aria-label="Move down">↓</button><button type="button" data-stop="${x.id}" data-act="del" aria-label="Remove stop">✕</button></div></li>`}).join("")
    :`<li class="small muted">No stops yet. Add your first stop below, for example the city you fly into.</li>`;
  const tn=ss.reduce((a,x)=>a+x.nights,0);if(tn){const sel=$("#f-nights");if(!sel.querySelector(`option[value="${tn}"]`))sel.insertAdjacentHTML("beforeend",`<option value="${tn}">${tn} nights</option>`);sel.value=String(tn)}
}
function routeKey(pts){return pts.map(p=>p[0].toFixed(3)+","+p[1].toFixed(3)).join(";")}
function getRoute(pts){
  const k=routeKey(pts);const c=routeCache[k];if(c)return c.loading?null:c;
  routeCache[k]={loading:true};
  fetch("/api/route?pts="+k).then(r=>r.json()).then(j=>{routeCache[k]=j.error?{error:1}:j;rerenderTour()}).catch(()=>{routeCache[k]={error:1}});
  return null;
}
let tourRerenderTimer=null;
function rerenderTour(){clearTimeout(tourRerenderTimer);tourRerenderTimer=setTimeout(()=>{if(isTour())renderAll()},150)}
function airFareOneWay(key,o,tier){const d=D[key];if(!d||!d.air)return null;const km=d.air.lat!=null&&o.lat!=null?kmBetween(o.lat,o.lon,d.air.lat,d.air.lon):(d.km||1500);return Math.round((60+km*0.085)*0.55*(o.factor||1)*TIER_MULT.flight[tier])}
function computeTour(){
  const t=T(),o=ORIGINS[t.origin],trav=+t.trav||1,tier=t.tier,ss=tourStopsDated(),total=ss.reduce((a,x)=>a+x.nights,0);
  const res={legs:[],parts:[],total:0,driveKm:0,car:null};
  if(!o||!ss.length)return res;
  const cars=Math.ceil(trav/5),domMult={economy:1,premium:1.4,business:2,luxury:3}[tier]||1;
  let intl=0,dom=0,trains=0,transfers=0,homeFuel=0,driveKm=0,firstDriveStop=-1,lastDriveStop=-1;
  const roadLeg=(a,b,via)=>{const pts=[a,...(via||[]).map(v=>[v.lat,v.lon]),b];const r=getRoute(pts);const straight=kmBetween(a[0],a[1],b[0],b[1]);
    return r&&!r.error?{km:r.km,hours:r.hours+(via||[]).length*1.25,geometry:r.geometry,exact:true}:{km:Math.round(straight*1.3),hours:straight*1.3/75+(via||[]).length*1.25,geometry:pts,exact:false}};
  // 1. from home to the first stop
  const s0=ss[0],d0=D[s0.key],p0=ptOf(s0.key);
  if(s0.arrive==="fly"&&d0&&d0.air){const f=airFareOneWay(s0.key,o,tier);intl+=f*trav;
    res.legs.push({day:1,mode:"fly",icon:"✈",from:o.name,to:d0.name,text:`${o.name} → ${(d0.air.name||d0.name).replace(/ International Airport| Airport/,"")} (${d0.air.code})${d0.air.hrs>7.5?", usually one connection":""}`,hours:d0.air.hrs+(d0.air.hrs>7.5?2:0),cost:f*trav,idx:0});
  }else if(p0&&o.lat!=null){const r=roadLeg([o.lat,o.lon],p0,s0.via);
    if(s0.arrive==="train"){const c=Math.max(25,r.km*0.22)*TIER_MULT.rail[tier]*trav;trains+=c;res.legs.push({day:1,mode:"train",icon:"🚆",from:o.name,to:d0.name,text:`${o.name} → ${d0.name} by train`,hours:r.km/95+0.6,cost:c/2,idx:0,km:r.km})}
    else{const c=r.km*2*0.186*cars;homeFuel+=c;res.legs.push({day:1,mode:"drive",icon:"🚗",from:o.name,to:d0.name,text:`${o.name} → ${d0.name}, ${Math.round(r.km*0.621)} miles`,hours:r.hours,cost:c/2,idx:0,km:r.km,via:s0.via,geometry:r.geometry,exact:r.exact});driveKm+=0}}
  // 2. between stops
  for(let i=1;i<ss.length;i++){const a=ptOf(ss[i-1].key),b=ptOf(ss[i].key),da=D[ss[i-1].key],db=D[ss[i].key],x=ss[i];if(!a||!b)continue;
    if(x.arrive==="fly"){const km=kmBetween(a[0],a[1],b[0],b[1]);const c=Math.round((30+km*0.06)*domMult)*trav;dom+=c;res.legs.push({day:x.firstDay,mode:"fly",icon:"🛫",from:da.name,to:db.name,text:`${da.name} → ${db.name}, flight`,hours:km/650+2.5,cost:c,idx:i,km})}
    else if(x.arrive==="train"){const r=roadLeg(a,b,[]);const c=Math.max(15,r.km*0.15)*TIER_MULT.rail[tier]*trav;trains+=c;res.legs.push({day:x.firstDay,mode:"train",icon:"🚆",from:da.name,to:db.name,text:`${da.name} → ${db.name} by train`,hours:r.km/90+0.7,cost:c,idx:i,km:r.km})}
    else{const r=roadLeg(a,b,x.via);driveKm+=r.km;if(firstDriveStop<0)firstDriveStop=i-1;lastDriveStop=i;res.legs.push({day:x.firstDay,mode:"drive",icon:"🚗",from:da.name,to:db.name,text:`${da.name} → ${db.name}, ${Math.round(r.km*0.621)} miles`,hours:r.hours,cost:0,idx:i,km:r.km,via:x.via,geometry:r.geometry,exact:r.exact})}}
  // 3. home
  const homeFirst=(t.tour.homeFrom||"last")==="first",hs=homeFirst?ss[0]:ss[ss.length-1],dh=D[hs.key],ph=ptOf(hs.key),lastDay=total+1;
  if(homeFirst&&ss.length>1){const a=ptOf(ss[ss.length-1].key);if(a&&ph){const r=roadLeg(a,ph,[]);driveKm+=r.km;lastDriveStop=0;res.legs.push({day:lastDay,mode:"drive",icon:"🚗",from:D[ss[ss.length-1].key].name,to:dh.name,text:`${D[ss[ss.length-1].key].name} → ${dh.name}, ${Math.round(r.km*0.621)} miles`,hours:r.hours,cost:0,idx:ss.length,km:r.km,geometry:r.geometry,exact:r.exact})}}
  if(s0.arrive==="fly"&&dh&&dh.air){const f=airFareOneWay(hs.key,o,tier)*(hs.key!==s0.key?1.1:1);intl+=f*trav;res.legs.push({day:lastDay,mode:"fly",icon:"✈",from:dh.name,to:o.name,text:`${(dh.air.name||dh.name).replace(/ International Airport| Airport/,"")} (${dh.air.code}) → ${o.name}`,hours:dh.air.hrs+(dh.air.hrs>7.5?2:0),cost:f*trav,idx:-1})}
  else if(ph&&o.lat!=null&&s0.arrive!=="fly"){const r=roadLeg(ph,[o.lat,o.lon],[]);if(s0.arrive==="train"){res.legs.push({day:lastDay,mode:"train",icon:"🚆",from:dh.name,to:o.name,text:`${dh.name} → ${o.name} by train`,hours:r.km/95+0.6,cost:0,idx:-1})}else{res.legs.push({day:lastDay,mode:"drive",icon:"🚗",from:dh.name,to:o.name,text:`${dh.name} → ${o.name}, ${Math.round(r.km*0.621)} miles`,hours:r.hours,cost:0,idx:-1,km:r.km,geometry:r.geometry})}}
  // 4. car hire for the driving between stops
  const usesCar=res.legs.some(l=>l.mode==="drive"&&l.idx>0)||(homeFirst&&ss.length>1);
  if(usesCar&&s0.arrive!=="drive"){
    const startI=Math.max(0,firstDriveStop),endI=homeFirst?0:Math.max(startI,lastDriveStop);
    const startDay=ss[startI].firstDay,endDay=endI===0&&homeFirst?lastDay:(endI>=ss.length-1?lastDay:ss[endI].firstDay+ss[endI].nights);
    const days=Math.max(1,endDay-startDay);
    const rate={economy:38,premium:52,business:75,luxury:130}[tier]||40;
    const pick=ss[startI],drop=ss[endI],pp=ptOf(pick.key),dp=ptOf(drop.key);
    const oneWay=pp&&dp&&kmBetween(pp[0],pp[1],dp[0],dp[1])>150;
    const dPick=D[pick.key],dDrop=D[drop.key];
    const airportKm=((dPick&&dPick.transfer&&startI===0&&s0.arrive==="fly")?dPick.transfer.roadKm:0)+((dDrop&&dDrop.transfer&&s0.arrive==="fly")?dDrop.transfer.roadKm:0);
    driveKm+=airportKm;
    const hire=(rate*days+(oneWay?150:0))*cars;
    res.car={days,pick:dPick?dPick.name:"",drop:dDrop?dDrop.name:"",pickAir:dPick&&dPick.air?dPick.air.code:"",dropAir:dDrop&&dDrop.air?dDrop.air.code:"",oneWay,amount:hire,rate,startDay,endDay};
    res.parts.push({label:"Car hire",amount:hire,detail:`${days} day${days===1?"":"s"}, ${res.car.pick} to ${res.car.drop}${oneWay?", including an estimated one-way fee":""}`});
  }else if(s0.arrive==="fly"){[s0.key,hs.key].forEach(k=>{const d=D[k];if(d&&d.transfer)transfers+=d.transfer.perCar*cars})}
  const perMile=ss.some(x=>ccOf(D[x.key]||{})==="US")?0.11:0.18;
  const fuel=driveKm*0.621*perMile*cars+homeFuel;
  if(intl)res.parts.push({label:"International flights",amount:intl,detail:s0.arrive==="fly"&&hs.key!==s0.key?`Into ${d0.air?d0.air.code:""}, home from ${dh.air?dh.air.code:""}`:"Return flights"});
  if(dom)res.parts.push({label:"Internal flights",amount:dom,detail:"Flights between stops"});
  if(fuel)res.parts.push({label:"Fuel",amount:fuel,detail:`About ${Math.round((driveKm+(homeFuel?0:0))*0.621)} miles of driving`});
  if(trains)res.parts.push({label:"Trains and coaches",amount:trains,detail:"Rail between stops"});
  if(transfers)res.parts.push({label:"Airport transfers",amount:transfers,detail:"Private transfers"});
  res.driveKm=driveKm;res.total=res.parts.reduce((a,p)=>a+p.amount,0);
  return res;
}
function sortVia(i){const ss=T().tour.stops,o=ORIGINS[T().origin],a=i>0?ptOf(ss[i-1].key):(o&&o.lat!=null?[o.lat,o.lon]:null);if(!a||!ss[i].via)return;ss[i].via.sort((x,y)=>kmBetween(a[0],a[1],x.lat,x.lon)-kmBetween(a[0],a[1],y.lat,y.lon))}
function renderStopTabs(sel,cur){
  const el=$(sel);if(!isTour()){el.hidden=true;return}
  const ss=tourStopsDated();el.hidden=ss.length<1;
  el.innerHTML=ss.map((x,i)=>`<button type="button" data-tab="${i}" aria-pressed="${i===(CTX?CTX.idx:cur)}">${i+1}. ${esc((D[x.key]||{}).name||"")}${sel==="#stayTabs"&&x.stay?'<span class="ok">✓</span>':""} <span class="small" style="font-weight:400;opacity:.8">${x.nights}n</span></button>`).join("");
}
document.addEventListener("click",e=>{
  const tb=e.target.closest(".stop-tabs [data-tab]");if(!tb)return;
  const i=+tb.dataset.tab;if(tb.closest("#stayTabs"))stayStopIdx=i;else itinStopIdx=i;renderAll();
});
let tourMap=null;
async function drawTourMap(tc){
  const el=$("#tourMap");if(!el)return;
  try{
    if(!window.L||!window.L.map){if(!document.querySelector('link[href*="leaflet"]'))document.head.insertAdjacentHTML("beforeend",'<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">');await loadScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js")}
  }catch(e){el.innerHTML='<p class="small muted" style="padding:12px">The map needs a connection.</p>';return}
  const Lf=window.L;if(tourMap){tourMap.remove();tourMap=null}
  tourMap=Lf.map(el,{scrollWheelZoom:false});
  Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap contributors"}).addTo(tourMap);
  const pts=[];
  tourStopsDated().forEach((x,i)=>{const p=ptOf(x.key);if(!p)return;pts.push(p);Lf.marker(p,{icon:Lf.divIcon({className:"",html:`<div style="background:#0F3D57;color:#fff;border:2px solid #F4B23E;border-radius:50%;width:28px;height:28px;display:grid;place-items:center;font:800 13px sans-serif">${i+1}</div>`,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(tourMap).bindPopup(`<b>${esc(D[x.key].name)}</b><br>${x.nights} night${x.nights===1?"":"s"}`);
    (x.via||[]).forEach(v=>{Lf.circleMarker([v.lat,v.lon],{radius:6,color:"#F4B23E",fillColor:"#F4B23E",fillOpacity:1}).addTo(tourMap).bindPopup(esc(v.title));pts.push([v.lat,v.lon])})});
  tc.legs.forEach(l=>{if(l.geometry&&l.geometry.length>1&&l.mode==="drive"&&l.idx>0)Lf.polyline(l.geometry,{color:"#0F3D57",weight:4,opacity:.8,dashArray:l.exact?null:"6 8"}).addTo(tourMap)});
  const ss=tourStopsDated();for(let i=1;i<ss.length;i++){if(ss[i].arrive!=="drive"){const a=ptOf(ss[i-1].key),b=ptOf(ss[i].key);if(a&&b)Lf.polyline([a,b],{color:"#3D7EA6",weight:3,dashArray:"4 8"}).addTo(tourMap)}}
  if(pts.length===1)tourMap.setView(pts[0],9);else if(pts.length)tourMap.fitBounds(pts,{padding:[30,30]});
}
async function loadAlong(i,pts){
  const k=routeKey(pts);if(alongCache[k])return;alongCache[k]={loading:true};renderTourTravel();
  try{const r=await fetch("/api/along?pts="+k);alongCache[k]=await r.json()}catch(e){alongCache[k]={sights:[]}}
  if(location.hash==="#travel")renderTourTravel();
}
function renderTourTravel(){
  const t=T(),o=ORIGINS[t.origin],ss=tourStopsDated(),tc=computeTour(),lk=L(),box=$("#tourTravel");
  if(!ss.length){box.innerHTML=`<div class="empty">Add stops to your tour on the Plan page.</div>`;return}
  const legCard=l=>{
    const st=l.idx>0&&l.idx<ss.length?ss[l.idx]:(l.idx===0?ss[0]:null);
    const pts=st&&l.mode==="drive"?[ptOf(ss[l.idx-1]?ss[l.idx-1].key:null)||[o.lat,o.lon],ptOf(st.key)]:null;
    const ak=pts&&pts[0]&&pts[1]?routeKey(pts):null,al=ak?alongCache[ak]:null;
    const links=[];
    if(l.mode==="fly"&&l.idx===0&&D[ss[0].key].air)links.push(`<a href="https://www.skyscanner.net/transport/flights/${o.sky}/${D[ss[0].key].air.code.toLowerCase()}/${yymmdd(t.start)}/?adultsv2=${t.trav}&cabinclass=${SKY_CABIN[t.tier]}" target="_blank" rel="noopener">Skyscanner (one way)</a>`);
    if(l.mode==="fly"&&l.idx===-1){const hs=(t.tour.homeFrom||"last")==="first"?ss[0]:ss[ss.length-1];const d=D[hs.key];if(d.air)links.push(`<a href="https://www.skyscanner.net/transport/flights/${d.air.code.toLowerCase()}/${o.sky}/${yymmdd(t.end)}/?adultsv2=${t.trav}&cabinclass=${SKY_CABIN[t.tier]}" target="_blank" rel="noopener">Skyscanner (one way)</a>`)}
    if(l.mode==="fly"&&l.idx>0)links.push(`<a href="https://www.google.com/travel/flights?q=${enc(`Flights from ${l.from} to ${l.to} on ${ss[l.idx].start}`)}&curr=GBP" target="_blank" rel="noopener">Google Flights</a>`);
    if(l.mode==="train")links.push(`<a href="https://www.thetrainline.com/" target="_blank" rel="noopener">Trainline</a>`,`<a href="https://www.rome2rio.com/map/${enc(l.from)}/${enc(l.to)}" target="_blank" rel="noopener">Rome2Rio</a>`);
    if(l.mode==="drive")links.push(`<a href="https://www.google.com/maps/dir/${[l.from,...(l.via||[]).map(v=>v.title),l.to].map(enc).join("/")}" target="_blank" rel="noopener">Route in Google Maps</a>`);
    const dateTxt=l.idx===-1?fmtDate(t.end):l.idx===0?fmtDate(t.start):fmtDate(ss[l.idx]?ss[l.idx].start:t.start);
    return `<div class="leg"><div class="leg-head"><div><span class="small muted">Day ${l.day} · ${dateTxt}</span><h4>${l.icon} ${esc(l.text)}</h4>
      <div class="small muted">About ${hrs(l.hours)}${l.mode==="drive"&&!l.exact?" (estimate, checking the road route…)":""}${(l.via||[]).length?` including ${l.via.length} stop${l.via.length>1?"s":""} on the way`:""}</div></div>
      <div class="leg-cost">${l.cost?gbp(l.cost):l.mode==="drive"?"<span class='small muted'>in car hire and fuel</span>":""}</div></div>
      ${(l.via||[]).length?`<div class="sr-via">${l.via.map((v,vi)=>`<span class="via-chip">📍 ${esc(v.title)}<button type="button" data-stop="${st.id}" data-act="unvia2" data-v="${vi}" aria-label="Remove">✕</button></span>`).join("")}</div>`:""}
      <div class="links" style="margin-top:8px">${links.join("")}</div>
      ${pts&&l.idx>0?`<div class="along"><b class="small">Places to visit along the way</b>
        ${!al?`<div><button class="btn ghost sm" type="button" data-along="${l.idx}" style="margin-top:6px">Show places along this drive</button></div>`:al.loading?`<p class="small muted" style="margin:6px 0 0">Looking along the route…</p>`:(al.sights||[]).length?`<div class="along-list">${al.sights.map((x,si)=>`<button type="button" data-addvia="${l.idx}" data-si="${si}" title="${esc(x.description)}">+ ${esc(x.title)}</button>`).join("")}</div>`:`<p class="small muted" style="margin:6px 0 0">Nothing notable found right on the route. Add your own below.</p>`}
        <div class="field pp" style="margin:8px 0 0;max-width:420px"><input data-pp="via" data-leg="${l.idx}" placeholder="Add your own stop on the way, e.g. Monument Valley" autocomplete="off" aria-label="Add a stop on the way"><div class="pp-res"></div></div></div>`:""}
    </div>`;
  };
  const car=tc.car;
  box.innerHTML=`<div class="panel" style="margin-bottom:16px">
      <div class="leg-head"><div><h3 style="margin:0">Your tour route</h3><p class="small muted" style="margin:2px 0 0">${ss.length} stop${ss.length>1?"s":""} · ${nights(t)} nights · ${tc.driveKm?Math.round(tc.driveKm*0.621)+" miles of driving · ":""}${TIERS[t.tier]}</p></div><div class="leg-cost">${gbp(tc.total)} <span class="small muted" style="font-family:var(--body);font-weight:400">travel total</span></div></div>
      <div id="tourMap" aria-label="Map of your tour"></div>
      <div class="chips">${tc.parts.map(p=>`<span class="tag">${esc(p.label)}: ${gbp(p.amount)}</span>`).join("")}</div>
      <p class="small muted" style="margin:8px 0 0">Change stops, nights and how you travel between them on the <a href="#plan">Plan page</a>.</p></div>
    ${car?`<div class="leg"><div class="leg-head"><div><span class="small muted">Day ${car.startDay} to day ${car.endDay}</span><h4>🚙 Car hire: ${esc(car.pick)}${car.pickAir?" ("+car.pickAir+")":""} → ${esc(car.drop)}${car.dropAir?" ("+car.dropAir+")":""}</h4>
      <div class="small muted">${car.days} day${car.days===1?"":"s"} at about ${gbp(car.rate)} a day${car.oneWay?". Dropping off somewhere different usually adds a one-way fee; we've allowed about £150":""}. Check whether your licence needs an International Driving Permit.</div></div><div class="leg-cost">${gbp(car.amount)}</div></div>
      <div class="links" style="margin-top:8px"><a href="${affExpedia("https://www.expedia.co.uk/Cars","tour-car")}" target="_blank" rel="noopener">Expedia car hire</a><a href="https://www.rentalcars.com/" target="_blank" rel="noopener">Rentalcars.com</a><a href="https://www.discovercars.com/" target="_blank" rel="noopener">Discover Cars</a></div></div>`:""}
    <h3 style="margin:22px 0 10px">Day by day travel</h3>
    ${tc.legs.map(legCard).join("")}`;
  initPickersIn(box);drawTourMap(tc);
}
function initPickersIn(root){$$("[data-pp]").filter(i=>root.contains(i)&&!i.dataset.ppInit).forEach(i=>bindPicker(i))}
document.addEventListener("click",e=>{
  const a=e.target.closest("[data-along]");
  if(a){const i=+a.dataset.along,ss=tourStopsDated(),o=ORIGINS[T().origin];const pts=[ptOf(ss[i-1].key),ptOf(ss[i].key)];loadAlong(i,pts);return}
  const av=e.target.closest("[data-addvia]");
  if(av){const i=+av.dataset.addvia,ss=T().tour.stops;const pts=[ptOf(ss[i-1].key),ptOf(ss[i].key)];const x=(alongCache[routeKey(pts)].sights||[])[+av.dataset.si];if(!x)return;ss[i].via=ss[i].via||[];if(ss[i].via.some(v=>v.title===x.title))return toast("Already added");ss[i].via.push({title:x.title,lat:x.lat,lon:x.lon});sortVia(i);save();renderAll();toast(x.title+" added to the drive");return}
  const uv=e.target.closest('[data-act="unvia2"]');
  if(uv){const st=T().tour.stops.find(x=>x.id===uv.dataset.stop);if(st){st.via.splice(+uv.dataset.v,1);save();renderAll()}}
});

