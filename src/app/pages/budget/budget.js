/* ---------- Budget ---------- */
const STOP_COLORS=["#F4B23E","#E8913A","#D9A441","#F0C76A","#C9862C","#E5B85C"];
function partColor(l){if(l.startsWith("Accommodation")){const i=Math.max(0,tourStopsDated().findIndex(x=>D[x.key]&&l.endsWith(D[x.key].name)));return STOP_COLORS[i%STOP_COLORS.length]}return {"Car hire":"#3D7EA6","Fuel":"#6FB3A5","Trains and coaches":"#5B6FA8"}[l]||PART_COLORS[l]||"#8DA9C4"}
const PART_COLORS={"International flights":"#0F3D57","Flights":"#0F3D57","Internal flights":"#3D7EA6","Airport transfers":"#6FB3A5","Accommodation":"#F4B23E","Rail tickets":"#0F3D57","Coach tickets":"#0F3D57","Fuel and parking":"#0F3D57","Chauffeur":"#0F3D57","Travel":"#0F3D57"};
function renderBudget(){
  if(!window.__hBudget)window.__hBudget=$("#h-budget").innerHTML;
  if(isTour())$("#h-budget").textContent="Budget for your tour";else $("#h-budget").innerHTML=window.__hBudget;
  const t=T(),b=+t.budget||0,n=Math.max(1,nights(t)),trav=+t.trav||1,lines=budgetLines();
  const total=lines.reduce((a,l)=>a+l.amount,0),chosen=lines.filter(l=>l.chosen).reduce((a,l)=>a+l.amount,0);
  const base=Math.max(b,total)||1,left=b-total;
  const bar=`<div class="bbar" role="img" aria-label="Budget split">${lines.map(l=>`<span style="width:${(l.amount/base*100).toFixed(2)}%;background:${partColor(l.label)}${l.chosen?"":";opacity:.55"}" title="${esc(l.label)} ${gbp(l.amount)}"></span>`).join("")}${b&&left>0?`<span class="free" style="width:${(left/base*100).toFixed(2)}%" title="Remaining ${gbp(left)}"></span>`:""}</div>
    <div class="legend">${lines.map(l=>`<span><i style="background:${partColor(l.label)}"></i>${esc(l.label)}</span>`).join("")}${b&&left>0?`<span><i class="free"></i>Remaining</span>`:""}</div>`;
  const acts=planCost();
  $("#budgetBody").innerHTML=`<div class="kv">
      <div><span class="small muted">Budget</span><b>${b?gbp(b):"Not set"}</b></div>
      <div><span class="small muted">Planned spend</span><b>${gbp(total)}</b></div>
      <div><span class="small muted">${!b||left>=0?"Remaining":"Over budget by"}</span><b class="${b?(left>=0?"under":"over"):""}">${b?gbp(Math.abs(left)):"—"}</b></div>
      <div><span class="small muted">Per person</span><b>${gbp(total/trav)}</b></div></div>
    ${b?"":`<p class="note">Add your budget for flights and accommodation on the <a href="#plan">Plan page</a> to see how much is left.</p>`}
    <div class="panel">${bar}
    <div class="tbl-wrap" style="margin-top:14px"><table><thead><tr><th>Item</th><th class="col-what">What</th><th>Status</th><th class="num">Amount</th><th class="num col-pp">Per person</th><th class="num">${b?"Of budget":"Share"}</th></tr></thead><tbody>
      ${lines.map(l=>`<tr><td><b>${esc(l.label)}</b><div class="small muted col-what-m">${esc(l.detail||"")}</div></td><td class="col-what" style="white-space:normal;min-width:180px">${esc(l.detail||"")}</td><td><span class="tag ${l.chosen?"ok":""}">${l.chosen?"Chosen":"Estimate"}</span></td><td class="num">${gbp(l.amount)}</td><td class="num col-pp">${gbp(l.amount/trav)}</td><td class="num">${Math.round(l.amount/(b||total||1)*100)}%</td></tr>`).join("")}
      <tr><td><b>Total</b></td><td class="col-what"></td><td></td><td class="num"><b>${gbp(total)}</b></td><td class="num col-pp"><b>${gbp(total/trav)}</b></td><td class="num"><b>${Math.round(total/(b||total||1)*100)}%</b></td></tr>
    </tbody></table></div>
    <p class="small muted" style="margin-top:10px">Accommodation works out at ${gbp(lines.filter(l=>l.label.startsWith("Accommodation")).reduce((a,l)=>a+l.amount,0)/n)} a night for ${n} nights. ${chosen<total?`Choose your <a href="#travel">flights</a> and <a href="#stay">accommodation</a> to replace the estimates.`:"Everything in your budget has been chosen."}</p></div>
    <div class="panel" style="margin-top:16px"><h3>Outside the budget</h3><p class="small muted" style="margin:0">Activities and extras in your itinerary: <b>${gbp(acts)}</b>${acts?` (${t.plan.length} item${t.plan.length===1?"":"s"})`:""}. <a href="#itinerary">View itinerary</a></p></div>`;
}

