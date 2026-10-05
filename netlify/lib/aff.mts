// Affiliate IDs (not secret; they appear in every tracked link)
export const AFF = { bookingAid: "8089451", expediaCamref: "1100l6v3Ey" };
export const bookingSearch = (q: string, checkin: string, checkout: string, adults: number, label = "email") =>
  `https://www.booking.com/searchresults.en-gb.html?ss=${encodeURIComponent(q)}&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}&no_rooms=${Math.max(1, Math.ceil(adults / 2))}&selected_currency=GBP&aid=${AFF.bookingAid}&label=${encodeURIComponent("app-" + label)}`;
