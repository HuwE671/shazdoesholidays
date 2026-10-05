/* ---------- Pricing engines ---------- */
function stays(key){
  const d=D[key], out=[];
  d.areas.forEach((area,i)=>{
    STAY_TYPES.forEach((ty,j)=>{
      if(ty.k==="villa" && !d.kinds.some(k=>["beach","nature"].includes(k)) && i>0) return;
      const r=seed(key+area+ty.k);
      const price=Math.round(d.night*ty.mult*(1+(i-1)*.12)*(.92+(r%17)/100)/5)*5;
      const rating=Math.min(4.9,+(ty.rating+((r%7)-3)/20).toFixed(1));
      out.push({id:key+"-"+i+"-"+ty.k,name:ty.label+" in "+area,type:ty.k,typeLabel:ty.label,area,tier:ty.tier,price,rating,
        perks:ty.k==="apartment"?"Kitchen, self check-in":ty.k==="budget"?"Central, no frills":ty.k==="villa"?"Private space, pool or view":ty.k==="hotel5"?"Spa, concierge, breakfast":ty.k==="boutique"?"Design-led, characterful":"Breakfast available"});
    });
  });
  return out;
}
function rooms(type,trav){return type==="villa"?Math.max(1,Math.ceil(trav/6)):Math.max(1,Math.ceil(trav/2))}
function typicalStay(key,tier){
  const pick={economy:"apartment",premium:"hotel4",business:"boutique",luxury:"hotel5"}[tier];
  const s=stays(key).filter(x=>x.type===pick);return s[Math.floor(s.length/2)]||s[0];
}
function departTimes(k){const r=seed(k);const base=[6,8,11,13,16,18,20];const out=[];for(let i=0;i<3;i++){const h=base[(r>>>(i*3))%base.length]+i;const m=[5,15,25,40,50][(r>>>(i*2))%5];out.push(String(Math.min(h,22)).padStart(2,"0")+":"+String(m).padStart(2,"0"))}return Array.from(new Set(out)).sort()}

const GATEWAYS={TH:["BKK","Bangkok",13.69,100.75],VN:["SGN","Ho Chi Minh City",10.82,106.66],KH:["PNH","Phnom Penh",11.55,104.84],MY:["KUL","Kuala Lumpur",2.74,101.7],ID:["CGK","Jakarta",-6.13,106.66],PH:["MNL","Manila",14.51,121.02],IN:["DEL","Delhi",28.56,77.1],LK:["CMB","Colombo",7.18,79.88],JP:["HND","Tokyo",35.55,139.78],CN:["PEK","Beijing",40.08,116.58],AU:["SYD","Sydney",-33.94,151.18],NZ:["AKL","Auckland",-37.0,174.79],US:["JFK","New York",40.64,-73.78],CA:["YYZ","Toronto",43.68,-79.63],MX:["MEX","Mexico City",19.44,-99.07],BR:["GRU","São Paulo",-23.43,-46.47],AR:["EZE","Buenos Aires",-34.82,-58.54],PE:["LIM","Lima",-12.02,-77.11],ZA:["JNB","Johannesburg",-26.14,28.25],KE:["NBO","Nairobi",-1.32,36.93],TZ:["DAR","Dar es Salaam",-6.88,39.2],EG:["CAI","Cairo",30.12,31.41],MA:["CMN","Casablanca",33.37,-7.59],AE:["DXB","Dubai",25.25,55.36],OM:["MCT","Muscat",23.59,58.28],CR:["SJO","San José",9.99,-84.2],CO:["BOG","Bogotá",4.7,-74.14],CL:["SCL","Santiago",-33.39,-70.79]};
function transportOptions(key,tier){
  const t=T(), d=D[key], o=ORIGINS[t.origin], trav=+t.trav||1, out=[];
  const tr=d.transfer, cars=Math.ceil(trav/3), transferBoth=tr?tr.perCar*cars*2*(tier==="luxury"?1.8:1):0;
  const roadLeg=tr?{icon:"🚗",text:`${tr.name.replace(/ International Airport| Airport/,"")} airport → ${d.name} by road, ${tr.roadKm} km (private transfer)`,hrs:tr.hours}:null;
  const addTransfer=(x)=>{if(tr){x.legs.push(roadLeg);x.hours+=tr.hours;x.parts.push({label:"Airport transfers",amount:transferBoth})}return x};
  const arrive=d.air?(d.air.name?d.air.name.replace(/ International Airport| Airport/,""):d.name)+" ("+d.air.code+")":"";
  const canFly=!!o.code;
  if(canFly&&d.air&&d.air.hrs>7.5){
    const pp=d.air.fare*o.factor*TIER_MULT.flight[tier];
    const via=["TH","VN","KH","LA","MY","ID","PH","SG","LK","MV","IN","JP","KR","CN","HK","TW","AU","NZ","BD","NP"].includes(d.cc)?"Doha, Dubai, Abu Dhabi, Bangkok or Singapore":"a Gulf, European or US hub";
    out.push(addTransfer({id:"fly-direct",mode:"Flight",label:"International flight to "+arrive+", one connection",hours:d.air.hrs+2,cabin:CABIN.flight[tier],
      note:"Booked as one ticket that connects via "+via+". Qatar Airways (Avios), Emirates, Etihad and Thai are typical choices from London.",times:departTimes(key+t.origin+"a"),
      legs:[{icon:"✈",text:`${o.name} → ${arrive}, one connection via ${via.split(",")[0]} or similar`,hrs:d.air.hrs+2}],parts:[{label:"International flights",amount:pp*trav}]}));
    const g=GATEWAYS[d.cc];
    if(g&&g[0]!==d.air.code&&g[0]!==d.air.city&&d.air.lat!=null){
      const gkm=kmBetween(51.47,-0.45,g[2],g[3]),dkm=kmBetween(g[2],g[3],d.air.lat,d.air.lon);
      const intl=Math.round((60+gkm*0.085)/5)*5*o.factor*TIER_MULT.flight[tier],dom=Math.round((30+dkm*0.06)*2*({economy:1,premium:1.4,business:2,luxury:3}[tier]||1));
      out.push(addTransfer({id:"fly-gateway",mode:"Flight",label:`Fly to ${g[1]} (${g[0]}), then internal flight to ${arrive}`,hours:+(gkm/780+0.6).toFixed(1)+3+dkm/650,cabin:CABIN.flight[tier],
        note:`Two separate tickets: an international flight to ${g[1]} and a domestic flight on to ${arrive}. Can work out cheaper or allow a stopover; leave at least 3 hours between flights.`,times:departTimes(key+t.origin+"g"),gateway:g[0],
        legs:[{icon:"✈",text:`${o.name} → ${g[1]} (${g[0]}), international flight`,hrs:+(gkm/780+0.6).toFixed(1)},{icon:"🛫",text:`${g[1]} (${g[0]}) → ${arrive}, internal flight, ${Math.round(dkm)} km`,hrs:+(dkm/650+0.5).toFixed(1)}],
        parts:[{label:"International flights",amount:intl*trav},{label:"Internal flights",amount:dom*trav}]}));
    }
    out.push(addTransfer({id:"fly-value",mode:"Flight",label:"Best-value flight (one or two stops)",hours:d.air.hrs+6,cabin:CABIN.flight[tier],note:"Cheaper fares often mean two stops or a long layover. Check the total journey time.",times:departTimes(key+t.origin+"b"),
      legs:[{icon:"✈",text:`${o.name} → ${arrive}, one or two connections`,hrs:d.air.hrs+6}],parts:[{label:"International flights",amount:pp*.75*trav}]}));
  } else if(canFly&&d.air&&!(ccOf(d)==="GB"&&o.cc==="GB"&&d.lat!=null&&kmBetween(o.lat||51.5,o.lon||-0.1,d.lat,d.lon)<250)){
    const pp=d.air.fare*o.factor*TIER_MULT.flight[tier];
    const regional=t.origin!=="LON";
    out.push(addTransfer({id:"fly-direct",mode:"Flight",label:"Direct flight to "+arrive,hours:d.air.hrs+(regional&&d.air.hrs>5?2.5:0),cabin:CABIN.flight[tier],
      note:regional&&d.air.hrs>5?"From "+o.name+" this usually connects via a hub; time includes the connection.":(regional?"Direct services from "+o.name+" vary by season; check live.":"Direct from Heathrow or Gatwick."),times:departTimes(key+t.origin+"a"),
      legs:[{icon:"✈",text:`${o.name} → ${arrive}`,hrs:d.air.hrs}],parts:[{label:"Flights",amount:pp*trav}]}));
    out.push(addTransfer({id:"fly-value",mode:"Flight",label:"Best-value flight (one stop or off-peak)",hours:d.air.hrs+2.5,cabin:CABIN.flight[tier],note:"Cheaper fares usually mean a stop, an early start or a less central airport.",times:departTimes(key+t.origin+"b"),
      legs:[{icon:"✈",text:`${o.name} → ${arrive}, one stop or off-peak`,hrs:d.air.hrs+2.5}],parts:[{label:"Flights",amount:pp*.8*trav}]}));
  }
  const roadOpts=genericRoad(o,d,tier,trav,key);
  if(d.rail){
    let h=d.rail.hrs[t.origin], extra=0, via="";
    if(h==null && d.rail.hrs.LON){h=d.rail.hrs.LON+1.6;extra=45;via=" via London"}
    if(h!=null){
      const pp=(d.rail.fare+extra)*TIER_MULT.rail[tier]*(t.origin==="LON"?1:1.05);
      out.push({id:"rail",mode:"Rail",label:d.rail.provider+via,hours:h,cabin:CABIN.rail[tier],note:"City centre to city centre, no airport transfers or baggage fees.",times:departTimes(key+t.origin+"r"),url:d.rail.url,
        legs:[{icon:"🚆",text:`${o.name} → ${d.name} by train${via}`,hrs:h}],parts:[{label:"Rail tickets",amount:pp*trav}]});
    }
  }
  if(!(d.drive&&d.drive[t.origin]!=null))out.push(...roadOpts.filter(x=>!(x.mode==="Rail"&&out.some(y=>y.mode==="Rail"))));
  if(d.drive && d.drive[t.origin]!=null){
    const h=d.drive[t.origin], miles=h*52, fuel=miles*2*0.17, lux=tier==="luxury";
    const amt=lux?miles*2*2.2:fuel*Math.ceil(trav/5)+(tier==="business"?60:0);
    out.push({id:"drive",mode:lux?"Chauffeur":"Drive",label:lux?"Private chauffeur, door to door":"Drive yourself",hours:h,cabin:lux?"Executive car":tier==="business"?"Your car plus parking":"Your car",note:lux?"Indicative executive car rate, both ways.":"Fuel both ways at roughly 17p a mile, per car; parking extra.",times:["Flexible"],
      legs:[{icon:"🚗",text:`${o.name} → ${d.name} by road`,hrs:h}],parts:[{label:lux?"Chauffeur":"Fuel and parking",amount:amt}]});
    if(tier==="economy") out.push({id:"coach",mode:"Coach",label:"National Express coach",hours:h*1.35,cabin:"Standard seat",note:"Lowest cost, longest journey.",times:departTimes(key+t.origin+"c"),url:"https://www.nationalexpress.com/",
      legs:[{icon:"🚌",text:`${o.name} → ${d.name} by coach`,hrs:h*1.35}],parts:[{label:"Coach tickets",amount:45*trav}]});
  }
  out.forEach(x=>{x.total=x.parts.reduce((a,p)=>a+p.amount,0);x.pp=x.total/trav});
  const m=t.mode||"any",ok={any:()=>true,fly:x=>x.mode==="Flight",drive:x=>x.mode==="Drive"||x.mode==="Chauffeur",train:x=>x.mode==="Rail"||x.mode==="Coach"}[m]||(()=>true);
  return out.filter(ok).sort((a,b)=>a.total-b.total);
}
const EUROPE=new Set(["GB","IE","FR","BE","NL","LU","DE","CH","AT","IT","ES","PT","AD","MC","DK","CZ","PL","SI","HR","SK","HU","LI"]);
const UKC=["England","Scotland","Wales","Northern Ireland","United Kingdom"];
function ccOf(x){if(!x)return "";if(x.cc)return x.cc;if(UKC.includes(x.country))return "GB";return ({France:"FR",Spain:"ES",Portugal:"PT",Italy:"IT",Netherlands:"NL",Belgium:"BE",Germany:"DE",Ireland:"IE",Switzerland:"CH",Austria:"AT",Croatia:"HR"})[x.country]||""}
function genericRoad(o,d,tier,trav,key){
  const olat=o.lat,olon=o.lon,dlat=d.lat!=null?d.lat:(d.air&&d.air.lat),dlon=d.lon!=null?d.lon:(d.air&&d.air.lon);
  if(olat==null||dlat==null)return [];
  const occ=o.cc||"GB",dcc=ccOf(d),km=kmBetween(olat,olon,dlat,dlon);
  if(km<15||km>1800||!EUROPE.has(occ)||!EUROPE.has(dcc))return [];
  const road=Math.round(km*1.25),cross=(occ==="GB")!==(dcc==="GB")||(occ==="IE")!==(dcc==="IE");
  const hrsDrive=+(road/78+0.3+(cross?2:0)).toFixed(1),cars=Math.ceil(trav/5),lux=tier==="luxury";
  const res=[];
  const fuel=road*2*0.186*cars,parking=tier==="business"?40:0,crossCost=cross?200*cars:0;
  const dparts=[{label:lux&&!cross?"Chauffeur":"Fuel"+(parking?" and parking":""),amount:lux&&!cross?road*2*1.4:fuel+parking}];if(cross)dparts.push({label:"Channel crossing (ferry or Eurotunnel)",amount:crossCost});
  res.push({id:"drive",mode:lux&&!cross?"Chauffeur":"Drive",label:lux&&!cross?"Private chauffeur, door to door":"Drive"+(cross?" (with Channel crossing)":""),hours:hrsDrive,cabin:lux&&!cross?"Executive car":"Your car",
    note:(lux&&!cross?"Indicative executive car rate, both ways. ":`About ${Math.round(road*0.621)} miles each way. Fuel at roughly 15p a mile, per car. `)+(cross?"Includes an estimated return crossing for one car.":"Add parking if needed."),times:["Flexible"],
    legs:[{icon:"🚗",text:`${o.name} → ${d.name} by road, about ${Math.round(road*0.621)} miles${cross?" including a Channel crossing":""}`,hrs:hrsDrive}],parts:dparts});
  if(occ==="GB"&&dcc==="GB"&&km>40){
    const pp=Math.max(25,road*0.22)*TIER_MULT.rail[tier],h=+(road/95+0.6).toFixed(1);
    res.push({id:"rail",mode:"Rail",label:"Train",hours:h,cabin:CABIN.rail[tier],note:"Prices vary a lot by time of day; booking ahead and railcards save money. You may need a taxi from the nearest station.",times:departTimes(key+"r"),url:"https://www.thetrainline.com/",
      legs:[{icon:"🚆",text:`${o.name} → ${d.name} by train (may include changes)`,hrs:h}],parts:[{label:"Rail tickets",amount:pp*trav}]});
    if(tier==="economy")res.push({id:"coach",mode:"Coach",label:"National Express coach",hours:+(road/65+0.5).toFixed(1),cabin:"Standard seat",note:"Lowest cost, longest journey.",times:departTimes(key+"c"),url:"https://www.nationalexpress.com/",
      legs:[{icon:"🚌",text:`${o.name} → ${d.name} by coach`,hrs:+(road/65+0.5).toFixed(1)}],parts:[{label:"Coach tickets",amount:Math.max(20,road*0.09)*trav}]});
  }
  return res;
}
function bestTravel(key,tier){if(!ORIGINS[T().origin])return null;const o=transportOptions(key,tier);return o.length?o.reduce((a,b)=>a.total<b.total?a:b):null}

function planCost(){return T().plan.reduce((s,p)=>s+(+p.price||0)*(+T().trav||1),0)}
function tripEstimate(){const t=T();if(isTour())return computeTour().total+tourStopsDated().reduce((a,x)=>a+(x.stay?x.stay.total:0),0);return (t.stay?t.stay.total:0)+(t.transport?t.transport.total:0)}
function budgetLines(){
  const t=T(),d=D[t.dest],n=Math.max(1,nights(t)),lines=[];
  if(isTour()){const tc=computeTour();tc.parts.filter(p=>p.amount>0).forEach(p=>lines.push({label:p.label,amount:p.amount,chosen:false,detail:p.detail||"Tour estimate"}));
    tourStopsDated().forEach(x=>{const c=stopStayCost(x);lines.push({label:"Accommodation: "+(D[x.key]?D[x.key].name:""),amount:c.amount,chosen:!!x.stay,detail:c.detail})});return lines}
  if(t.transport){(t.transport.parts||[{label:t.transport.mode==="Flight"?"Flights":"Travel",amount:t.transport.total}]).forEach(p=>lines.push({label:p.label,amount:p.amount,chosen:true,detail:t.transport.label}))}
  else{const b=bestTravel(t.dest,t.tier);if(b)b.parts.forEach(p=>lines.push({label:p.label,amount:p.amount,chosen:false,detail:b.label}))}
  if(t.stay)lines.push({label:"Accommodation",amount:t.stay.total,chosen:true,detail:t.stay.name+(t.stay.kind?" ("+t.stay.kind+")":"")+` · ${gbp(t.stay.total/n)} a night`});
  else{const st=typicalStay(t.dest,t.tier);const amt=st.price*n*rooms(st.type,t.trav);lines.push({label:"Accommodation",amount:amt,chosen:false,detail:st.typeLabel+" (typical price)"})}
  return lines;
}

