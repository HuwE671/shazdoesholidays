export function kmBetween(a1: number, o1: number, a2: number, o2: number) {
  const r = (x: number) => x * Math.PI / 180, R = 6371;
  const h = Math.sin(r(a2 - a1) / 2) ** 2 + Math.cos(r(a1)) * Math.cos(r(a2)) * Math.sin(r(o2 - o1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
let AIRPORTS: any[] | null = null;
export async function airports() {
  if (AIRPORTS) return AIRPORTS;
  const r = await fetch("https://api.travelpayouts.com/data/en/airports.json");
  const list: any[] = await r.json();
  AIRPORTS = list.filter(a => a.flightable && a.iata_type === "airport" && a.coordinates);
  return AIRPORTS;
}
