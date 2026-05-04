import { findGymScheduleByName, getCat, isOpenGym, tdur } from "./ScheduleDashboard.jsx";

/**
 * Korte namen uit gymCostMasterData → exacte `name` in BASE_GYMS (findGymScheduleByName).
 * Alleen entries waar de kosten-naam afwijkt van het rooster.
 */
export const GYM_COST_NAME_TO_SCHEDULE_NAME = {
  Kimekai: "Kimekai Gym",
  Mousid: "MOUSID GYM",
  MACA: "Martial Arts Center Amsterdam",
  "Royal Gym": "Royal Gym Amsterdam",
  Airlines: "Amsterdam Airlines",
  Southpaw: "Gym Southpaw",
  "Grappling Ac.": "Amsterdam Grappling Academy",
  Tribe: "Tribe Grappling",
  "Amst. BJJ": "Amsterdam BJJ",
  "DODO JJ": "DODO Jiu Jitsu",
  "Patrick's": "Patrick's Gym",
  "Elite TC": "Elite Training Center",
  Eastbound: "Eastbound Gym",
  "Dojo Doorje": "Dojo Doorjé",
  "Vondel Z": "Vondel Gym Zuid",
  "Vondel O": "Vondel Gym Oost",
  "Vondel W": "Vondel Gym West",
  "Focus JJ": "Focus Jiujitsu",
  "10th Planet": "10th Planet Jiu-Jitsu Amsterdam",
  Carlson: "Carlson Gracie Amsterdam",
  "Fight District": "FIGHT DISTRICT",
};

/** Fallback als er geen roosterregels zijn (0 lessen). */
export const FALLBACK_SESSIONS_PER_MONTH = 8;
export const FALLBACK_AVG_MINUTES = 60;

/**
 * @returns {{
 *   lessonsPerWeek: number,
 *   avgMinutes: number,
 *   sessionsPerMonth: number,
 *   fromSchedule: boolean
 * }}
 */
export function getScheduleTrainingStats(costGymName) {
  const raw = String(costGymName ?? "").trim();
  const scheduleName = GYM_COST_NAME_TO_SCHEDULE_NAME[raw] ?? raw;
  const g = findGymScheduleByName(scheduleName);
  const lessons = (g.schedule || []).filter((s) => !isOpenGym(s.cls));
  return computeStatsFromLessons(lessons);
}

/**
 * Statistieken alleen voor lessen waarvan `getCat(cls).key` in `categoryKeys` zit.
 * Bij volledige selectie (`categoryKeys.length === allKeys.length`) gelijk aan alle niet–Open Mat lessen.
 * Lege `categoryKeys` → geen lessen (fallback, fromSchedule: false).
 */
export function getScheduleTrainingStatsForCategoryKeys(costGymName, categoryKeys, allKeys) {
  const raw = String(costGymName ?? "").trim();
  const scheduleName = GYM_COST_NAME_TO_SCHEDULE_NAME[raw] ?? raw;
  const g = findGymScheduleByName(scheduleName);
  const all = (g.schedule || []).filter((s) => !isOpenGym(s.cls));
  const keysArr = Array.isArray(categoryKeys) ? categoryKeys : [];
  const activeSet = new Set(keysArr);
  const full =
    allKeys && keysArr.length > 0 && allKeys.length > 0 && keysArr.length === allKeys.length;
  const lessons =
    full ? all : keysArr.length === 0 ? [] : all.filter((s) => activeSet.has(getCat(s.cls).key));
  return computeStatsFromLessons(lessons);
}

function computeStatsFromLessons(lessons) {
  const lessonsPerWeek = lessons.length;
  const totalMin = lessons.reduce((a, s) => a + tdur(s.time, s.end), 0);
  const avgMinutes =
    lessonsPerWeek > 0 ? Math.max(1, Math.round((totalMin / lessonsPerWeek) * 10) / 10) : FALLBACK_AVG_MINUTES;
  const sessionsPerMonth =
    lessonsPerWeek > 0
      ? Math.max(1, Math.round((lessonsPerWeek * 52) / 12))
      : FALLBACK_SESSIONS_PER_MONTH;
  return {
    lessonsPerWeek,
    avgMinutes,
    sessionsPerMonth,
    fromSchedule: lessonsPerWeek > 0,
  };
}

export function costPerLessonFromSchedule(price, stats) {
  const s = stats.sessionsPerMonth || FALLBACK_SESSIONS_PER_MONTH;
  return parseFloat((price / s).toFixed(2));
}

export function costPerHourFromSchedule(price, stats) {
  const spm = stats.sessionsPerMonth || FALLBACK_SESSIONS_PER_MONTH;
  const mins = stats.avgMinutes || FALLBACK_AVG_MINUTES;
  const costPerSession = price / spm;
  const hoursPerSession = mins / 60;
  return parseFloat((costPerSession / hoursPerSession).toFixed(2));
}

/** Unieke `getCat(cls).key`-waarden voor niet–Open Mat lessen in het rooster van deze kosten-gym. */
export function getLessonCategoryKeysForCostGym(costGymName) {
  const raw = String(costGymName ?? "").trim();
  const scheduleName = GYM_COST_NAME_TO_SCHEDULE_NAME[raw] ?? raw;
  const g = findGymScheduleByName(scheduleName);
  const keys = new Set();
  for (const s of g.schedule || []) {
    if (isOpenGym(s.cls)) continue;
    keys.add(getCat(s.cls).key);
  }
  return keys;
}

/**
 * @param {string[]} activeKeys — geselecteerde roostercategorie-keys
 * @param {string[]} allKeys — alle keys (typisch CATEGORIES.map(c => c.key))
 */
export function gymPassesScheduleCategoryFilter(costGymName, activeKeys, allKeys) {
  if (!activeKeys || activeKeys.length === 0) return false;
  if (allKeys && activeKeys.length === allKeys.length) return true;
  const lessonKeys = getLessonCategoryKeysForCostGym(costGymName);
  for (const k of activeKeys) {
    if (lessonKeys.has(k)) return true;
  }
  return false;
}
