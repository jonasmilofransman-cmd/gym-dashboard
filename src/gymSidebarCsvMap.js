/**
 * Koppel vaste labels (marketData / gymCostMasterData `name`) aan exacte `Naam` in gym-data.csv
 * voor de gym-sidebar filter (zelfde namen als in App/ConcurrentieView).
 */
export const PRICE_OR_MASTER_LABEL_TO_CSV_NAAM = {
  kimekai: "Kimekai Gym",
  mousid: "MOUSID GYM",
  "sport city": "Sport City",
  maca: "Martial Arts Center Amsterdam",
  "royal gym": "Royal Gym Amsterdam",
  airlines: "Amsterdam Airlines",
  southpaw: "Gym Southpaw",
  "kops gym": "Kops Gym",
  "grappling ac.": "Amsterdam Grappling Academy",
  tribe: "Tribe Grappling",
  "arena gym": "Arena Gym",
  ettakigym: "EttakiGym",
  "fight iq": "Fight IQ",
  "amst. bjj": "Amsterdam BJJ",
  "gym royale": "Gym Royale",
  boogieland: "Boogieland",
  "dodo jj": "DODO Jiu Jitsu",
  "patrick's": "Patrick's Gym",
  "vos gym": "Vos Gym",
  "mike's": "Mike's Gym",
  "elite tc": "Elite Training Center",
  eastbound: "Eastbound Gym",
  "dojo doorje": "Dojo Doorjé",
  "vondel z": "Vondel Gym Zuid",
  "vondel o": "Vondel Gym Oost",
  "vondel w": "Vondel Gym West",
  "focus jj": "Focus Jiujitsu",
  ndsm: "NDSM Fightclub",
  "10th planet": "10th Planet Jiu-Jitsu Amsterdam",
  "team ramzi": "Team Ramzi",
  carlson: "Carlson Gracie Amsterdam",
  "sin city": "Sin City Boxing",
  "fight district": "FIGHT DISTRICT",
};

/** Exacte `Naam` uit CSV, lowercase — voor vergelijken met sidebar-selectie. */
export function labelToCsvNaamLower(label) {
  const lower = String(label || "").toLowerCase().trim();
  const mapped = PRICE_OR_MASTER_LABEL_TO_CSV_NAAM[lower];
  if (mapped) return String(mapped).toLowerCase().trim();
  return lower;
}
