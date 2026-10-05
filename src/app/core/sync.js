/* ---------- Cloud sync across devices ---------- */
const SYNC_KEY="shaz-holidays-sync";
let syncCode=(()=>{try{return localStorage.getItem(SYNC_KEY)||""}catch(e){return ""}})();
let syncTimer=null,syncing=false,lastSynced=0,syncError="";
function newCode(){const a=new Uint8Array(15);crypto.getRandomValues(a);const al="abcdefghjkmnpqrstuvwxyz23456789";return Array.from(a,x=>al[x%al.length]).join("")+Array.from(crypto.getRandomValues(new Uint8Array(9)),x=>al[x%al.length]).join("")}
const fmtCode=c=>c.match(/.{1,4}/g).join("-");
const strip=o=>{const c=Object.assign({},o);delete c.updatedAt;return JSON.stringify(c)};
function syncPayload(){
  const now=Date.now(),snap=S.syncSnap||{trips:{},places:{},origins:{}},tomb={};
  const trips=S.trips.map(t=>{const j=strip(t);if(snap.trips[t.id]!==j||!t.updatedAt)t.updatedAt=now;return t});
  Object.keys(snap.trips).forEach(id=>{if(!S.trips.some(t=>t.id===id))tomb["t:"+id]=now});
  const wrap=(obj,old,pre)=>{const out={};Object.entries(obj).forEach(([k,v])=>{const j=JSON.stringify(v);out[k]={v,u:old[k]&&old[k].j===j?old[k].u:now}});Object.keys(old).forEach(k=>{if(!obj[k])tomb[pre+k]=now});return out};
  const pj=JSON.stringify(S.profile);const profile={v:S.profile,u:snap.profile&&snap.profile.j===pj?snap.profile.u:(S.profile.u||now)};
  return {trips,places:wrap(S.custom,snap.places,"p:"),origins:wrap(S.customOrigins,snap.origins,"o:"),tomb,profile};
}
function applySynced(data){
  S.trips=data.trips||[];
  const places={},origins={};Object.entries(data.places||{}).forEach(([k,x])=>places[k]=x.v);Object.entries(data.origins||{}).forEach(([k,x])=>origins[k]=x.v);
  Object.keys(D).forEach(k=>{if(!places[k]&&k!==T().dest)delete D[k]});Object.assign(D,places);S.custom=places;
  Object.keys(ORIGINS).forEach(k=>{if(ORIGINS[k].custom&&!origins[k]&&k!==T().origin)delete ORIGINS[k]});Object.assign(ORIGINS,origins);S.customOrigins=origins;
  if(T().dest&&D[T().dest]&&!S.custom[T().dest])S.custom[T().dest]=D[T().dest];
  const snap={trips:{},places:{},origins:{}};S.trips.forEach(t=>snap.trips[t.id]=strip(t));
  Object.entries(data.places||{}).forEach(([k,x])=>snap.places[k]={j:JSON.stringify(x.v),u:x.u});Object.entries(data.origins||{}).forEach(([k,x])=>snap.origins[k]={j:JSON.stringify(x.v),u:x.u});
  if(data.profile&&data.profile.v){S.profile=Object.assign({},S.profile,data.profile.v);snap.profile={j:JSON.stringify(S.profile),u:data.profile.u};if(S.profile.home&&!ORIGINS[S.profile.home])ORIGINS[S.profile.home]={name:S.profile.homeName||S.profile.home,sky:S.profile.home.toLowerCase(),factor:1,code:S.profile.home,custom:true};applyProfile()}
  S.syncSnap=snap;
  try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}
}
async function syncNow(quiet){
  if(!syncCode||syncing)return;syncing=true;renderSync();
  try{
    const r=await fetch("/api/sync",{method:"POST",headers:{"Content-Type":"application/json","x-sync-code":syncCode},body:JSON.stringify(syncPayload())});
    const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"Sync failed");
    applySynced(j.data);lastSynced=Date.now();syncError="";
    fillSelects();renderAll();
  }catch(e){syncError=navigator.onLine===false?"You're offline. Changes will sync when you're back online.":"Couldn't sync just now. It will try again.";if(!quiet)toast(syncError)}
  syncing=false;renderSync();
}
function queueSync(){if(!syncCode)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow(true),2500)}
function setCode(c){syncCode=c;try{c?localStorage.setItem(SYNC_KEY,c):localStorage.removeItem(SYNC_KEY)}catch(e){}}
function syncLink(){return location.origin+location.pathname+"#sync="+syncCode}
function renderSync(){
  const el=$("#syncPanel");if(!el)return;
  if(!syncCode){el.innerHTML=`<h3 style="margin-bottom:.3em">Save trips on all your devices</h3>
    <p class="small muted">Turn on sync to save your trip log and places online, so they appear on your phone, laptop and any other device you link.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" id="syncOn">Turn on sync</button><button class="btn gold" type="button" id="syncScan">📷 Scan a code</button><button class="btn ghost" type="button" id="syncJoinBtn">Type a code</button></div>
    <p class="small muted" style="margin:8px 0 0">Already using sync on another device? Scan the QR code it shows, or type its code.</p>
    <form id="syncJoin" hidden style="margin-top:12px" onsubmit="return false"><div class="field"><label for="syncCodeIn">Sync code from your other device</label><input id="syncCodeIn" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"></div><button class="btn" type="submit">Link this device</button></form>`;return}
  const ago=lastSynced?Math.max(0,Math.round((Date.now()-lastSynced)/60000)):null;
  el.innerHTML=`<div class="budget-note"><div><h3 style="margin-bottom:.2em">Sync is on</h3><p class="small muted" style="margin:0">${syncing?"Syncing…":syncError?esc(syncError):ago===null?"Not synced yet on this device.":ago<1?"All trips saved online just now.":`Last synced ${ago} minute${ago===1?"":"s"} ago.`}</p></div>
    <button class="btn ghost sm" type="button" id="syncGo">Sync now</button></div>
    <details style="margin-top:12px" id="syncLinkBox"><summary style="cursor:pointer;font-weight:700">Link another device</summary>
      <div class="qr-wrap"><div id="syncQR" class="qr" aria-label="QR code to link another device"></div>
      <p class="small" style="margin:0"><b>Scan with your phone.</b> Open the app on your phone, go to Trip log and tap <b>Scan a code</b>. Or point the phone's camera at the code to open the site in your browser.</p></div>
      <p class="small" style="margin:10px 0 6px">Or send the link, or type this code on the other device:</p>
      <p style="font-family:var(--display);font-weight:800;font-size:1.15rem;letter-spacing:.04em;word-break:break-all;margin:0 0 10px">${fmtCode(syncCode)}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" type="button" id="syncShare">${navigator.share?"Share link":"Copy link"}</button><button class="btn ghost sm" type="button" id="syncCopyCode">Copy code</button></div>
      <p class="small muted" style="margin:10px 0 0">Keep the code private: anyone with it can see and change your saved trips.</p>
      <button class="btn ghost sm" type="button" id="syncOff" style="margin-top:10px;color:var(--warn)">Stop syncing on this device</button></details>`;
}
function loadScript(src){return new Promise((res,rej)=>{if(document.querySelector(`script[src="${src}"]`))return res();const sc=document.createElement("script");sc.src=src;sc.onload=res;sc.onerror=rej;document.head.appendChild(sc)})}
async function drawQR(){
  const box=$("#syncQR");if(!box||!syncCode)return;box.innerHTML="";
  try{await loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js");new QRCode(box,{text:syncLink(),width:200,height:200,colorDark:"#0F3D57",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M})}
  catch(e){box.innerHTML=`<p class="small muted">QR code unavailable offline. Use the link or code below.</p>`}
}
let scanStream=null;
function stopScan(){if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}const m=$("#scanModal");if(m)m.remove()}
async function startScan(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return toast("This device can't scan here. Use Type a code instead.");
  document.body.insertAdjacentHTML("beforeend",`<div id="scanModal" class="scan-modal" role="dialog" aria-label="Scan a sync code"><div class="scan-box"><h3>Scan the code</h3><p class="small muted">On your other device, open Trip log → Link another device, then point this camera at the QR code.</p><video id="scanVideo" playsinline muted></video><button class="btn ghost" type="button" id="scanClose">Cancel</button></div></div>`);
  $("#scanClose").addEventListener("click",stopScan);
  try{
    await loadScript("https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js");
    scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
  }catch(e){stopScan();return toast("Camera not available. Allow camera access, or use Type a code.")}
  const v=$("#scanVideo");v.srcObject=scanStream;await v.play().catch(()=>{});
  const c=document.createElement("canvas"),ctx=c.getContext("2d",{willReadFrequently:true});
  const tick=async()=>{
    if(!scanStream)return;
    if(v.readyState>=2){c.width=v.videoWidth;c.height=v.videoHeight;ctx.drawImage(v,0,0);const img=ctx.getImageData(0,0,c.width,c.height);const r=window.jsQR&&jsQR(img.data,img.width,img.height,{inversionAttempts:"dontInvert"});
      if(r&&r.data){const m=r.data.match(/#sync=([a-z0-9-]{20,80})/i)||r.data.match(/^([a-z0-9-]{20,80})$/i);
        if(m){stopScan();setCode(m[1].toLowerCase().replace(/[^a-z0-9]/g,""));toast("Code found. Linking…");await syncNow();if(!syncError)toast("This device is linked. Your trips are here.");return}}}
    requestAnimationFrame(tick);
  };tick();
}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast("Copied")}catch(e){prompt("Copy this:",t)}}
function initSync(){
  const el=$("#syncPanel");
  el.addEventListener("click",async e=>{
    const id=(e.target.closest("button")||{}).id;
    if(id==="syncOn"){setCode(newCode());toast("Sync turned on");await syncNow();return}
    if(id==="syncScan")return startScan();
    if(id==="syncJoinBtn"){$("#syncJoin").hidden=false;$("#syncCodeIn").focus();return}
    if(id==="syncGo")return syncNow();
    if(id==="syncShare"){if(navigator.share){try{await navigator.share({title:"Shaz does holidays",text:"Open this to sync your holiday trips",url:syncLink()})}catch(e){}}else copyText(syncLink());return}
    if(id==="syncCopyCode")return copyText(fmtCode(syncCode));
    if(id==="syncOff"){if(confirm("Stop syncing on this device? Your trips stay saved online and on this device.")){setCode("");lastSynced=0;renderSync()}return}
  });
  el.addEventListener("toggle",e=>{if(e.target.id==="syncLinkBox"&&e.target.open)drawQR()},true);
  el.addEventListener("submit",async e=>{
    if(e.target.id!=="syncJoin")return;e.preventDefault();
    const c=$("#syncCodeIn").value.toLowerCase().replace(/[^a-z0-9]/g,"");
    if(c.length<20)return toast("That code looks too short. Check it and try again.");
    setCode(c);await syncNow();if(!syncError)toast("This device is linked. Your trips are here.");
  });
  // Opening a link like …#sync=CODE links this device
  const m=location.hash.match(/^#sync=([a-z0-9-]{20,80})$/i);
  if(m){setCode(m[1].toLowerCase().replace(/[^a-z0-9]/g,""));history.replaceState(null,"",location.pathname+"#trips");setTimeout(async()=>{await syncNow();if(!syncError)toast("This device is linked. Your trips are here.")},50)}
  else if(syncCode)syncNow(true);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&syncCode)syncNow(true)});
  window.addEventListener("online",()=>{if(syncCode)syncNow(true)});
  setInterval(()=>{if(location.hash==="#trips")renderSync()},30000);
}


