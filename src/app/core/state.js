/* ---------- State ---------- */
const KEY = "shaz-holidays-v1";
const today = new Date();
const iso = d => d.toISOString().slice(0,10);
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
const defaultState = {
  trip:{origin:"SOU",dest:"",start:iso(addDays(today,30)),end:iso(addDays(today,34)),trav:2,tier:"economy",budget:1500,stay:null,transport:null,plan:[]},
  trips:[], kind:"all", stayF:{max:400,tier:"all",type:"all",area:"all",rating:"0",sort:"price"}
};
let S;
try{S=JSON.parse(localStorage.getItem(KEY))||null}catch(e){S=null}
if(S&&S.custom)Object.assign(D,S.custom);
if(S&&S.customOrigins)Object.assign(ORIGINS,S.customOrigins);
if(!S||!S.trip) S=JSON.parse(JSON.stringify(defaultState));
S.custom=S.custom||{};S.customOrigins=S.customOrigins||{};
// carry over a trip planned with an older built-in destination
if(S.trip.dest&&!D[S.trip.dest]&&LIB[S.trip.dest]){D[S.trip.dest]=S.custom[S.trip.dest]=libClone(S.trip.dest)}
S.profile=Object.assign({name:"Shaz",appName:"Shaz does holidays",photo:"",home:"",homeName:"",prefill:false,trav:2,tier:"economy"},S.profile||{});
if(S.profile.home&&!ORIGINS[S.profile.home]){ORIGINS[S.profile.home]=S.customOrigins[S.profile.home]={name:S.profile.homeName||S.profile.home,sky:S.profile.home==="LON"?"lond":S.profile.home.toLowerCase(),factor:1,code:S.profile.home,custom:true}}
// Start fresh each visit: saved trips and your places are kept
Object.assign(S.trip,{origin:S.profile.prefill&&S.profile.home&&ORIGINS[S.profile.home]?S.profile.home:"",dest:"",start:iso(addDays(today,30)),end:iso(addDays(today,34)),trav:S.profile.trav||2,tier:S.profile.tier||"economy",mode:"any",tripType:"single",tour:null,budget:0,stay:null,transport:null,plan:[]});
S.stayF = Object.assign({},defaultState.stayF,S.stayF||{});
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}if(typeof queueSync==="function")queueSync()}

