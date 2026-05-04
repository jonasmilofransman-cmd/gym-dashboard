import { gymData } from "./gymCostMasterData.js";
import { labelToCsvNaamLower } from "./gymSidebarCsvMap.js";

/** Vind `gymCostMasterData`-entry bij CSV-`Naam` (sidebar / gym-data.csv). */
export function masterGymForCsvName(csvName) {
  const n = String(csvName || "").toLowerCase().trim();
  const byLabel = gymData.find((g) => labelToCsvNaamLower(g.name) === n);
  if (byLabel) return byLabel;
  return gymData.find((g) => g.name.toLowerCase().trim() === n) ?? null;
}
