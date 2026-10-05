/* ---------- Links ---------- */
function L(){
  const t=ST(),d=dest(),o=ORIGINS[t.origin],trav=+t.trav||1;
  const place=d.name+", "+d.country;
  return {
    booking:(area)=>`https://www.booking.com/searchresults.en-gb.html?ss=${enc((area?area+", ":"")+place)}&checkin=${t.start}&checkout=${t.end}&group_adults=${trav}&no_rooms=${rooms("hotel",trav)}&selected_currency=GBP${affBooking(area?"stay-area":"stay")}`,
    airbnb:(area)=>`https://www.airbnb.co.uk/s/${enc((area?area+"--":"")+d.name)}/homes?checkin=${t.start}&checkout=${t.end}&adults=${trav}`,
    bookingHomes:(area)=>`https://www.booking.com/searchresults.en-gb.html?ss=${enc((area?area+", ":"")+place)}&checkin=${t.start}&checkout=${t.end}&group_adults=${trav}&no_rooms=1&selected_currency=GBP&nflt=${enc("ht_id=201;ht_id=220;ht_id=213")}${affBooking("homes")}`,
    bookingHotel:(name)=>`https://www.booking.com/searchresults.en-gb.html?ss=${enc(name+", "+d.name)}&checkin=${t.start}&checkout=${t.end}&group_adults=${trav}&no_rooms=${rooms("hotel",trav)}&selected_currency=GBP${affBooking("hotel")}`,
    expediaHotel:(name)=>affExpedia(`https://www.expedia.co.uk/Hotel-Search?destination=${enc(name+", "+d.name)}&startDate=${t.start}&endDate=${t.end}&adults=${trav}&rooms=${rooms("hotel",trav)}`,"hotel"),
    expedia:(area)=>affExpedia(`https://www.expedia.co.uk/Hotel-Search?destination=${enc((area?area+", ":"")+place)}&startDate=${t.start}&endDate=${t.end}&adults=${trav}&rooms=${rooms("hotel",trav)}`,area?"stay-area":"stay"),
    sky:(tier)=>d.air?`https://www.skyscanner.net/transport/flights/${o.sky}/${d.air.code.toLowerCase()}/${yymmdd(t.start)}/${yymmdd(t.end)}/?adultsv2=${trav}&cabinclass=${SKY_CABIN[tier]}&rtn=1`:null,
    gflights:(tier)=>d.air?`https://www.google.com/travel/flights?q=${enc(`Flights from ${o.name} to ${d.air.code} on ${t.start} returning ${t.end}${GF_CABIN[tier||t.tier]||""}`)}&curr=GBP`:null,
    r2r:()=>`https://www.rome2rio.com/map/${enc(o.name)}/${enc(d.name)}`,
    gyg:(q)=>`https://www.getyourguide.co.uk/s/?q=${enc(q)}&date_from=${t.start}&date_to=${t.end}`,
    viator:(q)=>`https://www.viator.com/searchResults/all?text=${enc(q)}`,
    maps:(q)=>`https://www.google.com/maps/search/${enc(q+" "+d.name)}`,
    fcdo:()=>!d.country||["England","Scotland","Wales","United Kingdom"].includes(d.country)?null:`https://www.gov.uk/foreign-travel-advice/${d.country.toLowerCase().replace(/\s+/g,"-").replace("uae","united-arab-emirates").replace("united-states","usa")}`
  };
}

