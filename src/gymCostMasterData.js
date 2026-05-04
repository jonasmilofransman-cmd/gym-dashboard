/** Master dataset voor Gym Data — Kosten (contract, €/les, €/uur). */
export const gymData = [
  { name: "ATC", price: 60, contract: 1, price1x: 45, price2x: 55, dropIn: 10, owner: "atc" },
  { name: "EttakiGym", price: 69, contract: 1, price1x: null, price2x: 54, dropIn: null, owner: "ettaki" },
  { name: "Kimekai", price: 35, contract: 1, price1x: null, price2x: null, dropIn: null, owner: null },
  { name: "Mousid", price: 37.5, contract: 12, price1x: null, price2x: null, dropIn: null, owner: null },
  { name: "Sport City", price: 37.99, contract: 1, price1x: null, price2x: null, dropIn: null, owner: null },
  { name: "MACA", price: 40, contract: 1, price1x: null, price2x: null, dropIn: null, owner: null },
  { name: "Royal Gym", price: 55, contract: 12, price1x: null, price2x: null, dropIn: 15, owner: null },
  { name: "Airlines", price: 60, contract: 1, price1x: 40, price2x: null, dropIn: null, owner: null },
  { name: "Southpaw", price: 60, contract: 1, price1x: null, price2x: null, dropIn: null, owner: null },
  { name: "Kops Gym", price: 60, contract: 1, price1x: null, price2x: null, dropIn: 14, owner: null },
  { name: "Grappling Ac.", price: 65, contract: 1, price1x: null, price2x: null, dropIn: null, owner: null },
  { name: "Tribe", price: 65, contract: 1, price1x: null, price2x: null, dropIn: null, owner: null },
  { name: "Arena Gym", price: 69, contract: 24, price1x: null, price2x: null, dropIn: null, owner: null },
  { name: "Fight IQ", price: 69.95, contract: 12, price1x: null, price2x: null, dropIn: null, owner: null },
  { name: "Amst. BJJ", price: 70, contract: 1, price1x: null, price2x: 60, dropIn: null, owner: null },
  { name: "Gym Royale", price: 74.5, contract: 1, price1x: null, price2x: null, dropIn: 15, owner: null },
  { name: "Boogieland", price: 75, contract: 3, price1x: null, price2x: null, dropIn: 15, owner: null },
  { name: "DODO JJ", price: 75, contract: 1, price1x: null, price2x: null, dropIn: 20, owner: null },
  { name: "Patrick's", price: 75, contract: 12, price1x: 55, price2x: 65, dropIn: 20, owner: null },
  { name: "Vos Gym", price: 75, contract: 6, price1x: null, price2x: null, dropIn: null, owner: null },
  { name: "Mike's", price: 75, contract: 1, price1x: null, price2x: null, dropIn: null, owner: null },
  { name: "Elite TC", price: 77.95, contract: 3, price1x: 49.95, price2x: 54.95, dropIn: 15, owner: null },
  { name: "Eastbound", price: 79.5, contract: 3, price1x: null, price2x: null, dropIn: 16.5, owner: null },
  { name: "Dojo Doorje", price: 80, contract: 1, price1x: null, price2x: null, dropIn: 15, owner: null },
  { name: "Vondel Z", price: 84.5, contract: 1, price1x: null, price2x: null, dropIn: 15, owner: null },
  { name: "Vondel O", price: 84.5, contract: 1, price1x: null, price2x: null, dropIn: 15, owner: null },
  { name: "Vondel W", price: 84.5, contract: 1, price1x: null, price2x: null, dropIn: 15, owner: null },
  { name: "Focus JJ", price: 89, contract: 1, price1x: 59, price2x: null, dropIn: null, owner: null },
  { name: "NDSM", price: 89, contract: 1, price1x: null, price2x: null, dropIn: null, owner: null },
  { name: "10th Planet", price: 90, contract: 3, price1x: null, price2x: 60, dropIn: 30, owner: null },
  { name: "Team Ramzi", price: 95, contract: 6, price1x: null, price2x: 75, dropIn: 16.99, owner: null },
  { name: "Carlson", price: 99, contract: 3, price1x: null, price2x: null, dropIn: 25, owner: null },
  { name: "Sin City", price: 125, contract: 1, price1x: null, price2x: null, dropIn: 20, owner: null },
  { name: "Fight District", price: 149.95, contract: 1, price1x: null, price2x: 70, dropIn: null, owner: null },
];

export function isOwnedAtc(g) {
  return g?.owner === "atc" || String(g?.name || "").toLowerCase().trim() === "atc";
}

export function isOwnedEttaki(g) {
  return g?.owner === "ettaki" || String(g?.name || "").toLowerCase().replace(/\s/g, "") === "ettakigym";
}

export function isCompetitor(g) {
  return !isOwnedAtc(g) && !isOwnedEttaki(g);
}

export function minimalInstap(g) {
  if (g == null || !Number.isFinite(g.price) || !Number.isFinite(g.contract)) return 0;
  return g.price * g.contract;
}

export function contractMonthLabel(months) {
  const m = Number(months);
  if (m === 1) return "Maandelijks";
  if (m === 3) return "Kwartaal";
  if (m === 6) return "Halfjaar";
  if (m === 12) return "Jaarlijks";
  if (m === 24) return "24 mnd";
  return `${m} mnd`;
}

export function costPerLesson(g, sessionsPerMonth) {
  if (g == null || !Number.isFinite(g.price) || !Number.isFinite(sessionsPerMonth) || sessionsPerMonth === 0)
    return 0;
  return parseFloat((g.price / sessionsPerMonth).toFixed(2));
}

export function costPerHour(g, sessionsPerMonth, minutesPerClass) {
  if (
    g == null ||
    !Number.isFinite(g.price) ||
    !Number.isFinite(sessionsPerMonth) ||
    sessionsPerMonth === 0 ||
    !Number.isFinite(minutesPerClass) ||
    minutesPerClass === 0
  )
    return 0;
  const costPerSession = g.price / sessionsPerMonth;
  const hoursPerSession = minutesPerClass / 60;
  return parseFloat((costPerSession / hoursPerSession).toFixed(2));
}

/** Grafieken Gym Data — Kosten: ATC rood, Ettaki geel, alle andere gyms één blauw (legenda “Overige”). */
export function barColorForGym(g) {
  if (isOwnedAtc(g)) return "#E63946";
  if (isOwnedEttaki(g)) return "#ffb703";
  return "#378ADD";
}
