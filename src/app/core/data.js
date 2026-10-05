/* ---------- Data ---------- */
const ORIGINS = {
  SOU:{name:"Southampton",sky:"sou",factor:1.12,lat:50.91,lon:-1.4,cc:"GB"},
  LON:{name:"London",sky:"lond",factor:1.0,lat:51.51,lon:-0.13,cc:"GB"},
  BRS:{name:"Bristol",sky:"brs",factor:1.08,lat:51.45,lon:-2.59,cc:"GB"},
  BHX:{name:"Birmingham",sky:"bhx",factor:1.08,lat:52.48,lon:-1.9,cc:"GB"},
  MAN:{name:"Manchester",sky:"man",factor:1.05,lat:53.48,lon:-2.24,cc:"GB"}
};
Object.keys(ORIGINS).forEach(k=>ORIGINS[k].code=k);
/* Affiliate programme IDs (not secret: they appear in every tracked link) */
const AFF={
  expediaCamref:"1100l6v3Ey",   // Expedia UK via Partnerize (camref)
  bookingAid:"8089451",          // Booking.com Affiliate ID (aid)
  civitatisAid:""                // Civitatis affiliate ID (awaiting approval)
};
function affBooking(ref){return AFF.bookingAid?`&aid=${AFF.bookingAid}&label=${encodeURIComponent("app-"+(ref||"stay"))}`:""}
function affExpedia(url,ref){return AFF.expediaCamref?`https://prf.hn/click/camref:${AFF.expediaCamref}${ref?"/pubref:"+ref:""}/destination:${encodeURIComponent(url)}`:url}
const TIERS = {economy:"Economy",premium:"Premium",business:"Business",luxury:"Luxury"};
const KINDS = {custom:"Your places",weekend:"Weekend breaks",city:"City",beach:"Sun & beach",nature:"Nature",uk:"UK",long:"Long haul"};

// air: {code, hrs, fare (econ return pp from London)}; rail: {hrs:{origin:h}, fare, provider, url}; drive: {origin:h}
const LIB = {
 paris:{name:"Paris",country:"France",kinds:["weekend","city"],colors:["#2E4A7D","#C2526B"],night:140,areas:["Le Marais","Saint-Germain","Montmartre"],best:"Apr–Jun, Sep–Oct",
  air:{code:"CDG",hrs:1.25,fare:120},rail:{hrs:{LON:2.4},fare:150,provider:"Eurostar",url:"https://www.eurostar.com/uk-en"},
  acts:[["Louvre timed entry",19,"3h","Culture","Louvre Museum tickets"],["Seine river cruise",16,"1h","Sightseeing","Seine river cruise"],["Eiffel Tower summit by lift",30,"2h","Sightseeing","Eiffel Tower summit"],["Montmartre walking tour",20,"2h","Walks","Montmartre walking tour"],["Versailles day trip",45,"Half day","Day trips","Versailles day trip from Paris"],["Le Marais food tour",85,"3h","Food & drink","Le Marais food tour"]]},
 amsterdam:{name:"Amsterdam",country:"Netherlands",kinds:["weekend","city"],colors:["#1F5F7A","#E07A2E"],night:150,areas:["Jordaan","De Pijp","Canal Ring"],best:"Apr–May, Sep",
  air:{code:"AMS",hrs:1.2,fare:110},rail:{hrs:{LON:4},fare:160,provider:"Eurostar",url:"https://www.eurostar.com/uk-en"},
  acts:[["Rijksmuseum entry",20,"3h","Culture","Rijksmuseum tickets"],["Anne Frank House",14,"1.5h","Culture","Anne Frank House"],["Canal cruise",18,"1h","Sightseeing","Amsterdam canal cruise"],["Van Gogh Museum",20,"2h","Culture","Van Gogh Museum tickets"],["City bike tour",30,"3h","Active","Amsterdam bike tour"],["Zaanse Schans windmills trip",40,"Half day","Day trips","Zaanse Schans tour"]]},
 barcelona:{name:"Barcelona",country:"Spain",kinds:["weekend","city","beach"],colors:["#C2410C","#1D6FA3"],night:120,areas:["Gothic Quarter","Eixample","Barceloneta"],best:"May–Jun, Sep",
  air:{code:"BCN",hrs:2.1,fare:130},
  acts:[["Sagrada Família entry",28,"2h","Culture","Sagrada Familia tickets"],["Park Güell",12,"2h","Sightseeing","Park Guell tickets"],["Casa Batlló",30,"1.5h","Culture","Casa Batllo tickets"],["Tapas and wine tour",75,"3h","Food & drink","Barcelona tapas tour"],["Montserrat day trip",55,"Half day","Day trips","Montserrat day trip"],["Catamaran sail",35,"2h","On the water","Barcelona catamaran"]]},
 lisbon:{name:"Lisbon",country:"Portugal",kinds:["weekend","city"],colors:["#D9822B","#2C6E8F"],night:105,areas:["Alfama","Chiado","Príncipe Real"],best:"Mar–Jun, Sep–Oct",
  air:{code:"LIS",hrs:2.6,fare:140},
  acts:[["Belém Tower and Jerónimos",15,"3h","Culture","Belem Tower Jeronimos tickets"],["Tram 28 and transport day pass",6,"Day","Getting around","Lisbon 24h transport pass"],["Sintra day trip",55,"Day","Day trips","Sintra day trip from Lisbon"],["Fado dinner show",60,"3h","Food & drink","Lisbon fado dinner"],["Food and wine walk",70,"3h","Food & drink","Lisbon food tour"],["Sunset sail on the Tagus",35,"2h","On the water","Lisbon sunset sailing"]]},
 rome:{name:"Rome",country:"Italy",kinds:["weekend","city"],colors:["#9A3B26","#C9A227"],night:125,areas:["Trastevere","Monti","Centro Storico"],best:"Apr–Jun, Sep–Oct",
  air:{code:"FCO",hrs:2.5,fare:140},
  acts:[["Colosseum and Roman Forum",22,"3h","Culture","Colosseum Roman Forum tickets"],["Vatican Museums and Sistine Chapel",30,"3h","Culture","Vatican Museums tickets"],["Trastevere food tour",75,"3h","Food & drink","Trastevere food tour"],["Borghese Gallery",20,"2h","Culture","Borghese Gallery tickets"],["Pasta-making class",60,"3h","Food & drink","Rome pasta making class"],["Appian Way bike ride",45,"3h","Active","Appian Way bike tour"]]},
 edinburgh:{name:"Edinburgh",country:"Scotland",kinds:["weekend","city","uk"],colors:["#3B3F6B","#7A8C5A"],night:120,areas:["Old Town","New Town","Leith"],best:"May–Sep, Dec",
  air:{code:"EDI",hrs:1.2,fare:90},rail:{hrs:{LON:4.5,MAN:3.3,BHX:4,BRS:6,SOU:6.5},fare:110,provider:"LNER / Avanti / CrossCountry",url:"https://www.thetrainline.com/"},drive:{SOU:8,LON:8,BRS:6.5,BHX:5.5,MAN:3.5},
  acts:[["Edinburgh Castle",20,"2.5h","Culture","Edinburgh Castle tickets"],["Arthur's Seat hike",0,"2h","Active","Arthur's Seat walk"],["Royal Yacht Britannia",20,"2h","Culture","Royal Yacht Britannia"],["Scotch whisky experience",22,"1h","Food & drink","Scotch Whisky Experience"],["Highlands and Loch Ness tour",55,"Day","Day trips","Loch Ness Highlands tour from Edinburgh"],["Old Town ghost tour",15,"1.5h","Walks","Edinburgh ghost tour"]]},
 cornwall:{name:"Cornwall",country:"England",kinds:["weekend","beach","nature","uk"],colors:["#1C7C8C","#E8B04B"],night:130,areas:["St Ives","Padstow","Falmouth"],best:"May–Sep",
  air:{code:"NQY",hrs:1.1,fare:110},rail:{hrs:{LON:5,SOU:5,BRS:3.5,BHX:5,MAN:6.5},fare:90,provider:"GWR",url:"https://www.gwr.com/"},drive:{SOU:4,LON:5,BRS:3,BHX:4.5,MAN:6},
  acts:[["Eden Project",36,"Half day","Nature","Eden Project tickets"],["Tate St Ives",10,"2h","Culture","Tate St Ives"],["Minack Theatre visit",8,"1.5h","Culture","Minack Theatre"],["Surf lesson",45,"2h","Active","Cornwall surf lesson"],["St Michael's Mount",20,"Half day","Day trips","St Michael's Mount"],["South West Coast Path walk",0,"Half day","Nature","South West Coast Path Cornwall"]]},
 lakes:{name:"Lake District",country:"England",kinds:["weekend","nature","uk"],colors:["#2F5D50","#8DA9C4"],night:115,areas:["Windermere","Ambleside","Keswick"],best:"Apr–Oct",
  rail:{hrs:{LON:3.5,MAN:1.7,BHX:2.8,BRS:4.2,SOU:5},fare:85,provider:"Avanti West Coast / Northern",url:"https://www.thetrainline.com/"},drive:{SOU:5.5,LON:5,BRS:4,BHX:3,MAN:1.5},
  acts:[["Windermere lake cruise",15,"1.5h","On the water","Windermere lake cruise"],["Beatrix Potter's Hill Top",15,"1.5h","Culture","Hill Top Beatrix Potter"],["Guided Scafell Pike ascent",60,"Day","Active","Scafell Pike guided walk"],["Kayak or canoe hire",30,"2h","On the water","Lake District kayak hire"],["Honister Slate Mine tour",25,"1.5h","Culture","Honister Slate Mine"],["Catbells walk",0,"3h","Nature","Catbells walk Keswick"]]},
 dubrovnik:{name:"Dubrovnik",country:"Croatia",kinds:["city","beach"],colors:["#B5532E","#2A7FA8"],night:150,areas:["Old Town","Lapad","Ploče"],best:"May–Jun, Sep",
  air:{code:"DBV",hrs:2.7,fare:170},
  acts:[["City walls walk",30,"2h","Sightseeing","Dubrovnik city walls"],["Cable car to Mount Srđ",24,"1h","Sightseeing","Dubrovnik cable car"],["Sea kayak and snorkel",40,"3h","On the water","Dubrovnik sea kayaking"],["Elaphiti islands boat trip",45,"Day","On the water","Elaphiti islands tour"],["Game of Thrones locations walk",25,"2h","Walks","Dubrovnik Game of Thrones tour"],["Lokrum island ferry",24,"Half day","Nature","Lokrum island ferry"]]},
 santorini:{name:"Santorini",country:"Greece",kinds:["beach"],colors:["#2B5DA8","#E9EEF5"],night:180,areas:["Oia","Fira","Imerovigli"],best:"May–Jun, Sep",
  air:{code:"JTR",hrs:4,fare:230},
  acts:[["Caldera sunset cruise",100,"5h","On the water","Santorini caldera sunset cruise"],["Winery tour and tasting",70,"4h","Food & drink","Santorini wine tour"],["Akrotiri archaeological site",17,"2h","Culture","Akrotiri Santorini"],["Fira to Oia clifftop hike",0,"3h","Active","Fira to Oia hike"],["Greek cooking class",90,"4h","Food & drink","Santorini cooking class"],["Red Beach and south coast boat",45,"Half day","On the water","Santorini Red Beach boat"]]},
 marrakech:{name:"Marrakech",country:"Morocco",kinds:["weekend","city"],colors:["#B33A2B","#D99A3E"],night:90,areas:["Medina","Gueliz","Palmeraie"],best:"Mar–May, Oct–Nov",
  air:{code:"RAK",hrs:3.5,fare:160},
  acts:[["Jardin Majorelle",15,"1.5h","Nature","Jardin Majorelle tickets"],["Atlas Mountains day trip",35,"Day","Day trips","Atlas Mountains day trip Marrakech"],["Traditional hammam",30,"2h","Wellbeing","Marrakech hammam"],["Street food tour",45,"3h","Food & drink","Marrakech food tour"],["Sunrise hot-air balloon",150,"4h","Sightseeing","Marrakech hot air balloon"],["Agafay desert dinner",60,"Evening","Food & drink","Agafay desert dinner"]]},
 reykjavik:{name:"Reykjavík",country:"Iceland",kinds:["nature"],colors:["#2D4B5E","#6FB3A5"],night:160,areas:["Downtown","Laugardalur","Golden Circle"],best:"Jun–Aug; Sep–Mar for aurora",
  air:{code:"KEF",hrs:3,fare:190},
  acts:[["Golden Circle tour",70,"Day","Day trips","Golden Circle tour"],["Blue Lagoon entry",75,"3h","Wellbeing","Blue Lagoon tickets"],["Northern Lights tour",60,"4h","Nature","Northern Lights tour Reykjavik"],["Whale watching",80,"3h","On the water","Reykjavik whale watching"],["Sky Lagoon",65,"2h","Wellbeing","Sky Lagoon"],["Hallgrímskirkja tower",8,"1h","Sightseeing","Hallgrimskirkja tower"]]},
 newyork:{name:"New York",country:"USA",kinds:["city","long"],colors:["#22313F","#E3A72F"],night:230,areas:["Midtown","SoHo","Brooklyn"],best:"Apr–Jun, Sep–Dec",
  air:{code:"JFK",hrs:8,fare:520},
  acts:[["Top of the Rock",35,"1.5h","Sightseeing","Top of the Rock tickets"],["Statue of Liberty and Ellis Island",20,"Half day","Culture","Statue of Liberty ferry"],["Broadway show",100,"3h","Culture","Broadway tickets"],["MoMA entry",22,"2.5h","Culture","MoMA tickets"],["Central Park bike hire",25,"2h","Active","Central Park bike rental"],["Greenwich Village food tour",60,"3h","Food & drink","Greenwich Village food tour"]]},
 dubai:{name:"Dubai",country:"UAE",kinds:["beach","long"],colors:["#B07A2A","#2E6F86"],night:170,areas:["Downtown","Dubai Marina","Jumeirah"],best:"Nov–Mar",
  air:{code:"DXB",hrs:7,fare:480},
  acts:[["Burj Khalifa At the Top",35,"1.5h","Sightseeing","Burj Khalifa At the Top"],["Desert safari with dinner",45,"6h","Day trips","Dubai desert safari"],["Dubai Frame",12,"1h","Sightseeing","Dubai Frame tickets"],["Museum of the Future",32,"2h","Culture","Museum of the Future tickets"],["Dhow dinner cruise",30,"2h","On the water","Dubai dhow cruise"],["Creek abra ride and souks",1,"2h","Walks","Dubai souks walking tour"]]}
};

const CITY={paris:"PAR",amsterdam:"AMS",barcelona:"BCN",lisbon:"LIS",rome:"ROM",edinburgh:"EDI",cornwall:"NQY",dubrovnik:"DBV",santorini:"JTR",marrakech:"RAK",reykjavik:"REK",newyork:"NYC",dubai:"DXB"};
Object.entries(CITY).forEach(([k,c])=>{if(LIB[k]&&LIB[k].air)LIB[k].air.city=c});
const D = {}; // only the places you add
function libClone(k){const x=JSON.parse(JSON.stringify(LIB[k]));x.custom=true;x.kinds=["custom"].concat(x.kinds);return x}
const AIRLINES={
 BA:["British Airways","https://www.britishairways.com/",1],IB:["Iberia","https://www.iberia.com/gb/",1],EI:["Aer Lingus","https://www.aerlingus.com/",1],QR:["Qatar Airways","https://www.qatarairways.com/en-gb/homepage.html",1],VY:["Vueling","https://www.vueling.com/en",1],AY:["Finnair","https://www.finnair.com/gb-en",1],
 U2:["easyJet","https://www.easyjet.com/en/"],FR:["Ryanair","https://www.ryanair.com/gb/en"],LS:["Jet2","https://www.jet2.com/"],BY:["TUI","https://www.tui.co.uk/flight/"],W6:["Wizz Air","https://wizzair.com/en-gb"],W9:["Wizz Air UK","https://wizzair.com/en-gb"],
 VS:["Virgin Atlantic","https://www.virginatlantic.com/"],EK:["Emirates","https://www.emirates.com/uk/english/"],EY:["Etihad","https://www.etihad.com/en-gb/"],KL:["KLM","https://www.klm.co.uk/"],AF:["Air France","https://wwws.airfrance.co.uk/"],LH:["Lufthansa","https://www.lufthansa.com/gb/en/homepage"],TP:["TAP Air Portugal","https://www.flytap.com/en-gb/"],TK:["Turkish Airlines","https://www.turkishairlines.com/en-gb/"],AZ:["ITA Airways","https://www.ita-airways.com/en_gb"],LX:["SWISS","https://www.swiss.com/gb/en/homepage"],SK:["SAS","https://www.flysas.com/en/"],A3:["Aegean","https://en.aegeanair.com/"],AA:["American Airlines","https://www.americanairlines.co.uk/"],DL:["Delta","https://www.delta.com/gb/en"],UA:["United","https://www.united.com/en/gb"],TG:["Thai Airways","https://www.thaiairways.com/"],SQ:["Singapore Airlines","https://www.singaporeair.com/en_UK/gb/home"],CX:["Cathay Pacific","https://www.cathaypacific.com/cx/en_GB.html"]
};
const BA_REWARD="https://www.britishairways.com/content/the-british-airways-club/avios/spending-avios/reward-flights";
const PALETTES=[["#2E4A7D","#C2526B"],["#1F5F7A","#E07A2E"],["#2F5D50","#8DA9C4"],["#9A3B26","#C9A227"],["#2B5DA8","#6FB3A5"],["#3B3F6B","#D9822B"],["#1C7C8C","#E8B04B"]];
function kmBetween(a1,o1,a2,o2){const r=x=>x*Math.PI/180,R=6371;const dA=r(a2-a1),dO=r(o2-o1);const h=Math.sin(dA/2)**2+Math.cos(r(a1))*Math.cos(r(a2))*Math.sin(dO/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function transferFor(ap){return {code:ap.code,name:ap.name,roadKm:ap.roadKm,hours:ap.hours,perCar:Math.max(15,Math.round(ap.roadKm*0.45))}}
function setAirport(d,ap){const km=kmBetween(51.47,-0.45,ap.lat,ap.lon);d.air={code:ap.code,city:ap.city||ap.code,name:ap.name,lat:ap.lat,lon:ap.lon,hrs:+(km/780+0.6).toFixed(1),fare:Math.round((60+km*0.085)/5)*5};d.transfer=transferFor(ap);d.km=Math.round(km)}
function makeDest(p){
  const lk=Object.keys(LIB).find(k=>LIB[k].air&&(LIB[k].air.city===p.code||LIB[k].air.code===p.airport||LIB[k].name.toLowerCase()===String(p.name||"").toLowerCase()));
  if(lk){const x=libClone(lk);x.lat=p.lat;x.lon=p.lon;x.cc=p.cc||"";return x}
  const ap=p.nearest&&p.nearest[0];
  const alat=ap?ap.lat:p.lat, alon=ap?ap.lon:p.lon;
  const km=(alat!=null&&alon!=null)?kmBetween(51.47,-0.45,alat,alon):(p.fare?Math.max(300,(p.fare-60)/0.085):1500);
  const long=km>4000, nm=p.name;
  return {name:nm,country:p.country||"",custom:true,lat:p.lat,lon:p.lon,cc:p.cc||"",km:Math.round(km),airports:p.nearest||null,transfer:ap?transferFor(ap):null,kinds:["custom",long?"long":"city"],colors:PALETTES[seed(p.code||nm)%PALETTES.length],night:long?150:115,
    areas:["City centre","Historic quarter","Quieter neighbourhood"],best:"Check seasonal weather",
    air:ap?{code:ap.code,city:ap.city||ap.code,name:ap.name,lat:ap.lat,lon:ap.lon,hrs:+(km/780+0.6).toFixed(1),fare:Math.round((60+km*0.085)/5)*5}:((p.airport||p.code)?{code:(p.airport||p.code),city:p.code,lat:p.lat,lon:p.lon,hrs:+(km/780+0.6).toFixed(1),fare:p.fare||Math.round((60+km*0.085)/5)*5}:null),
    acts:[["Top attractions and tickets",null,"Varies","Sightseeing","top attractions "+nm],["Guided walking tour",null,"2–3h","Walks","walking tour "+nm],["Food and drink tour",null,"3h","Food & drink","food tour "+nm],["Museums and galleries",null,"2–3h","Culture","museum tickets "+nm],["Day trips nearby",null,"Day","Day trips","day trip from "+nm],["Boat trips and cruises",null,"2h","On the water","boat tour "+nm]]};
}
const STAY_TYPES = [
  {k:"budget",label:"Budget hotel or hostel",mult:.5,tier:"economy",rating:3.8},
  {k:"apartment",label:"Self-catering apartment",mult:.85,tier:"economy",rating:4.2},
  {k:"hotel4",label:"4★ hotel",mult:1.15,tier:"business",rating:4.3},
  {k:"boutique",label:"Boutique hotel",mult:1.35,tier:"business",rating:4.5},
  {k:"hotel5",label:"5★ hotel",mult:2.5,tier:"luxury",rating:4.6},
  {k:"villa",label:"Private villa or suite",mult:3.3,tier:"luxury",rating:4.8}
];
const TIER_MULT = {flight:{economy:1,premium:1.8,business:3.2,luxury:6},rail:{economy:1,premium:1.3,business:1.6,luxury:2.6}};
const CABIN = {flight:{economy:"Economy",premium:"Premium economy",business:"Business class",luxury:"First class"},rail:{economy:"Standard",premium:"Standard Premium",business:"First class",luxury:"First class (Business Premier on Eurostar)"}};
const SKY_CABIN = {economy:"economy",premium:"premiumeconomy",business:"business",luxury:"first"};
const GF_CABIN = {economy:"",premium:" premium economy",business:" business class",luxury:" first class"};
const CURRENCIES=["GBP","EUR","USD","THB","AED","AUD","BGN","BRL","CAD","CHF","CNY","CZK","DKK","HKD","HUF","IDR","ILS","INR","ISK","JPY","KRW","MXN","MYR","NOK","NZD","PHP","PLN","RON","SEK","SGD","TRY","ZAR"];
const COUNTRY_CUR={Thailand:"THB","United States":"USD",USA:"USD","United Arab Emirates":"AED",UAE:"AED",Australia:"AUD",Bulgaria:"BGN",Brazil:"BRL",Canada:"CAD",Switzerland:"CHF",China:"CNY","Czech Republic":"CZK",Czechia:"CZK",Denmark:"DKK","Hong Kong":"HKD",Hungary:"HUF",Indonesia:"IDR",Israel:"ILS",India:"INR",Iceland:"ISK",Japan:"JPY","South Korea":"KRW",Mexico:"MXN",Malaysia:"MYR",Norway:"NOK","New Zealand":"NZD",Philippines:"PHP",Poland:"PLN",Romania:"RON",Sweden:"SEK",Singapore:"SGD",Turkey:"TRY","Türkiye":"TRY","South Africa":"ZAR",England:"GBP",Scotland:"GBP",Wales:"GBP","United Kingdom":"GBP",France:"EUR",Spain:"EUR",Portugal:"EUR",Italy:"EUR",Greece:"EUR",Croatia:"EUR",Netherlands:"EUR",Germany:"EUR",Ireland:"EUR",Austria:"EUR",Belgium:"EUR",Cyprus:"EUR",Malta:"EUR",Finland:"EUR"};
const CHECKLIST=["Passports valid (many countries need 6 months left)","Entry rules and visas checked","Travel insurance bought","GHIC card packed (for Europe)","Flights booked","Accommodation booked","Airport transfers or parking booked","Currency or travel card sorted","Online check-in done","Copies of documents saved"];
const SPEND_CATS = ["Accommodation","Transport","Food & drink","Activities","Shopping","Other"];

