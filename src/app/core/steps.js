/* ---------- Step-by-step route ---------- */
const STEPS=[["plan","Plan"],["travel","Get there"],["stay","Find a stay"],["itinerary","Things to do"],["budget","Budget"]];
function renderNext(){
  $$(".next-step").forEach(el=>{
    const i=STEPS.findIndex(x=>x[0]===el.dataset.step),prev=STEPS[i-1],nx=STEPS[i+1];
    const dots=STEPS.map((x,k)=>`<a href="#${x[0]}" class="dot${k===i?" on":k<i?" done":""}" aria-label="Step ${k+1}: ${x[1]}">${k+1}</a>`).join("");
    el.innerHTML=`<div class="dots" aria-label="Step ${i+1} of ${STEPS.length}">${dots}</div><div class="ns-btns">${prev?`<a class="btn ghost" href="#${prev[0]}">← ${prev[1]}</a>`:"<span></span>"}${nx?(i===0&&!ready()?`<button class="btn gold" type="button" data-needready>Next: ${nx[1]} →</button>`:`<a class="btn gold" href="#${nx[0]}">Next: ${nx[1]} →</a>`):`<button class="btn gold" type="button" data-savetrip>Save to trip log ✓</button>`}</div>`;
  });
}
document.addEventListener("click",e=>{
  if(e.target.closest("[data-needready]"))return toast("Choose where you're travelling from and to first");
  if(e.target.closest("[data-savetrip]"))return saveTrip();
});


