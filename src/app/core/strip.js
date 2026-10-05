/* ---------- Trip strip ---------- */
function renderStrip(){
  const t=T(),d=dest();
  document.body.classList.toggle("no-dest",!ready());
  if(!ready()){$("#strip").innerHTML=`<span class="item">Choose where you're travelling from and to on <a href="#plan">the Plan page</a> to start planning.</span>`;return}
  const n=nights(t),est=tripEstimate(),b=+t.budget||0;
  const cls=b? (est>b?"over":"under"):"";
  const tour=isTour(),ss=tour?tourStopsDated():[],chosen=ss.filter(x=>x.stay).length;
  const dd=D[t.dest];
  $("#strip").innerHTML=`
    <span class="item"><b>${esc(ORIGINS[t.origin].name)} → ${esc(dd.name)}${tour&&ss.length>1?` + ${ss.length-1} more stop${ss.length>2?"s":""}`:""}</b></span>
    <span class="item muted">${fmtDate(t.start)} – ${fmtDate(t.end)} · ${n} night${n===1?"":"s"}</span>
    <span class="item muted">${t.trav} traveller${t.trav==1?"":"s"} · ${TIERS[t.tier]}</span>
    <span class="item">Stay: <b>${tour?(chosen?gbp(ss.reduce((a,x)=>a+(x.stay?x.stay.total:0),0))+` <span class="small muted">(${chosen} of ${ss.length})</span>`:"—"):t.stay?gbp(t.stay.total):"—"}</b></span>
    <span class="item">Travel: <b>${tour?gbp(computeTour().total):t.transport?gbp(t.transport.total):"—"}</b></span>
    <span class="item total ${cls}"><a href="#budget" style="color:inherit;text-decoration:none">${gbp(est)}${b?` <span class="small muted">of ${gbp(b)} budget</span>`:""}</a></span>
    ${planCost()?`<span class="item muted">+ activities ${gbp(planCost())}</span>`:""}`;
  $$(".destName").forEach(e=>e.textContent=d.name);
}

