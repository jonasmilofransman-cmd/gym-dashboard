/**
 * Eén bron voor gym-accentkleuren: rooster, Gym Data-sidebar, Concurrentie.
 * ATC = rood, EttakiGym = geel; overige gyms vaste of hash-kleuren zonder rood/geel.
 */

export const ATC_RED = "#E63946";
export const ETTAKI_YELLOW = "#ffb703";

/** Zelfde hash als voorheen in ScheduleDashboard (stabiel per naam). */
export function hashName(s) {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) h = (((h << 5) - h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function isAtcName(name) {
  return String(name || "").trim().toLowerCase() === "atc";
}

export function isEttakiName(name) {
  return String(name || "").toLowerCase().replace(/\s/g, "") === "ettakigym";
}

/** Palet voor gyms zonder vaste mapping: geen rood/geel (merk gereserveerd). */
const COMPETITOR_PALETTE = [
  "#3a86ff",
  "#06d6a0",
  "#8338ec",
  "#2ec4b6",
  "#4cc9f0",
  "#80b918",
  "#9d4edd",
  "#023e8a",
  "#b5179e",
  "#264653",
  "#2d6a4f",
  "#7209b7",
  "#3c096c",
  "#8ac926",
  "#1982c4",
  "#6a4c93",
  "#06ffa5",
  "#7b2cbf",
  "#2a9d8f",
  "#3d5a80",
  "#457b9d",
  "#5c4d7d",
  "#1d3557",
  "#0077b6",
  "#588157",
  "#6c757d",
  "#d4a373",
  "#bc6c25",
  "#5c6bc0",
  "#0d9488",
  "#6366f1",
  "#0891b2",
  "#0ea5e9",
  "#8b5cf6",
  "#64748b",
  "#22c55e",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#fb5607",
];

/**
 * Exacte `Naam` uit CSV / rooster → vaste kleur (geen rood/geel behalve ATC/Ettaki hierboven).
 */
const GYM_COLORS_BY_NAME = {
  ATC: ATC_RED,
  EttakiGym: ETTAKI_YELLOW,
  "Amsterdam Airlines": "#4a90e2",
  "Amsterdam BJJ": "#14b8a6",
  "Amsterdam Grappling Academy": "#8b5cf6",
  "Arena Gym": "#0ea5e9",
  Boogieland: "#f97316",
  "Bensy Gym": "#3a86ff",
  "Dojo Doorjé": "#2a9d8f",
  "Eastbound Gym": "#06d6a0",
  "El Otmani Gym": "#8338ec",
  "Focus Jiujitsu": "#457b9d",
  "Elite Training Center": "#fb5607",
  "FIGHT DISTRICT": "#2ec4b6",
  "Fight IQ": "#0891b2",
  "Gym Royale": "#4cc9f0",
  "Gym Southpaw": "#80b918",
  "Kimekai Gym": "#bc6c25",
  "Kops Gym": "#9d4edd",
  "Martial Arts Center Amsterdam": "#5c6bc0",
  "MOUSID GYM": "#023e8a",
  "Patrick's Gym": "#b5179e",
  "Royal Gym Amsterdam": "#264653",
  "Sin City Boxing": "#0d9488",
  "Sport City": "#2d6a4f",
  "Carlson Gracie Amsterdam": "#6366f1",
  "DODO Jiu Jitsu": "#588157",
  "Mike's Gym": "#6c757d",
  "NDSM Fightclub": "#0077b6",
  "Team Ramzi": "#7209b7",
  "Tribe Grappling": "#1d3557",
  "Vos Gym": "#d4a373",
  "10th Planet Jiu-Jitsu Amsterdam": "#5c4d7d",
  "Monster Gym": "#64748b",
  "Vondel Gym Zuid": "#22c55e",
  "Vondel Gym Oost": "#a855f7",
  "Vondel Gym West": "#06b6d4",
};

function lookupFixedColor(name) {
  const n = String(name ?? "").trim();
  if (!n) return undefined;
  if (GYM_COLORS_BY_NAME[n] !== undefined) return GYM_COLORS_BY_NAME[n];
  const lower = n.toLowerCase();
  for (const [k, v] of Object.entries(GYM_COLORS_BY_NAME)) {
    if (k.trim().toLowerCase() === lower) return v;
  }
  return undefined;
}

/**
 * @param {{ name?: string, isAtc?: boolean, owner?: string | null }} gym — `owner` uit gymCostMasterData ("atc" / "ettaki")
 */
export function getGymAccentColor(gym) {
  const name = gym?.name;
  const atc = gym?.isAtc === true || isAtcName(name) || gym?.owner === "atc";
  const ettaki = isEttakiName(name) || gym?.owner === "ettaki";
  if (atc) return ATC_RED;
  if (ettaki) return ETTAKI_YELLOW;
  const fixed = lookupFixedColor(name);
  if (fixed !== undefined) return fixed;
  const h = hashName(name || "");
  return COMPETITOR_PALETTE[h % COMPETITOR_PALETTE.length] || "#378ADD";
}

/** Tekstkleur: ATC rood, Ettaki geel, anders `fallback` (typ. thema) of accent. */
export function getGymNameColor(gym, fallback) {
  const name = gym?.name;
  if (gym?.isAtc === true || isAtcName(name) || gym?.owner === "atc") return ATC_RED;
  if (isEttakiName(name) || gym?.owner === "ettaki") return ETTAKI_YELLOW;
  return fallback ?? getGymAccentColor(gym);
}

/** Alias voor bestaande ScheduleDashboard-imports. */
export const getGymColor = getGymAccentColor;
