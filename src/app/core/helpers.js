/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const gbp = n => "£"+Math.round(n).toLocaleString("en-GB");
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const enc = encodeURIComponent;
function nights(t){const a=new Date(t.start),b=new Date(t.end);const n=Math.round((b-a)/864e5);return isNaN(n)||n<0?0:n}
function fmtDate(s){if(!s)return"";const d=new Date(s+"T12:00");return d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
function yymmdd(s){return s?s.slice(2).replace(/-/g,""):""}
function hrs(h){const H=Math.floor(h),M=Math.round((h-H)*60);return H+"h"+(M?" "+String(M).padStart(2,"0")+"m":"")}
function seed(str){let h=0;for(const c of str)h=(h*31+c.charCodeAt(0))>>>0;return h}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),2400)}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
const T = ()=>S.trip;
let CTX=null; // in a tour: which stop the Stay / Itinerary page is showing
const isTour=()=>T().tripType==="tour"&&!!T().tour&&T().tour.stops.length>0;
const dest = ()=>D[(isTour()&&CTX)?CTX.key:T().dest];
const ready = ()=>!!(D[T().dest]&&ORIGINS[T().origin]);
function ST(){const t=T();if(!(isTour()&&CTX))return t;const st=t.tour.stops[CTX.idx];return Object.assign({},t,{dest:CTX.key,start:CTX.start,end:CTX.end,stay:st?st.stay:null})}
function setStay(v){if(isTour()&&CTX){const st=T().tour.stops[CTX.idx];if(st)st.stay=v}else T().stay=v}

