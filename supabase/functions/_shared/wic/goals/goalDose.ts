// Off-season goal table v2 (owner approved 2026-10-07 18:41, with the owner's gate).
// On-field play first: runs ONLY in off-season quarters 1–3; quarter 3 tapers
// (no added sets), quarter 4 (the ramp-up to play / pre-season) and every
// pre/in/post-season phase get ZERO change — HT's dose stands.
// Main lifts follow the top goal; accessories follow the second-ranked goal.
// Safety: rep ceiling by prescribed %, never to failure, deload/trend-lighter
// weeks win, readiness < 40 → base dose, growth mode or under 13 → no added
// sets, added sets only where +1 stays ≤ +30% for that lift. A result outside
// HT's phase envelope is dropped (HT's dose kept).
import { isWithinEnvelope, doseGroupFor } from "../dosage/doctrine.ts";

export const GOAL_DOSE_VERSION = "wic_goal_dose_v2";

export type GoalDoseKey = "explode" | "strength" | "size" | "faster" | "healthy" | "lean";

type MainRule = { addSet: boolean; setsMax: number; setsFixed?: [number, number]; reps: [number, number] } | null;
type AccRule = { sets: [number, number]; reps: [number, number] };

export const GOAL_TABLE_V2: Record<GoalDoseKey, { main: MainRule; acc: AccRule; note: string }> = {
  explode: { main: { addSet: true, setsMax: 5, reps: [2, 4] }, acc: { sets: [2, 3], reps: [6, 8] }, note: "Every rep at max speed." },
  strength: { main: { addSet: true, setsMax: 5, reps: [3, 5] }, acc: { sets: [3, 3], reps: [6, 8] }, note: "" },
  size: { main: { addSet: true, setsMax: 4, reps: [6, 10] }, acc: { sets: [3, 3], reps: [8, 12] }, note: "" },
  faster: { main: { addSet: false, setsMax: 4, setsFixed: [3, 4], reps: [3, 5] }, acc: { sets: [2, 3], reps: [6, 8] }, note: "Explosive reps; more single-leg work." },
  healthy: { main: { addSet: false, setsMax: 99, reps: [6, 10] }, acc: { sets: [2, 3], reps: [10, 12] }, note: "Slow lowering; single-leg and trunk." },
  lean: { main: null, acc: { sets: [2, 3], reps: [10, 12] }, note: "60–90 s rest on accessories." },
};

const MAIN = new Set(["main_compound", "unilateral", "upper"]);
const ACC = new Set(["accessory", "trunk"]);

/** Goal source → table row. A stated training goal wins when it is specific. */
export function goalDoseKey(domain: string | null | undefined, trainingGoal?: string | null): GoalDoseKey | null {
  const tg = String(trainingGoal ?? "").toLowerCase();
  if (/hypertroph|size|muscle|mass|weight gain|bulk/.test(tg)) return "size";
  if (/lean|fat|cut|weight loss/.test(tg)) return "lean";
  switch (String(domain ?? "").toLowerCase()) {
    case "power": case "throwing": case "hitting": return "explode";
    case "strength": return "strength";
    case "size": case "hypertrophy": return "size";
    case "speed": return "faster";
    case "durability": return "healthy";
    case "conditioning": case "lean": return "lean";
    default: return null;
  }
}

/** Max reps at the prescribed %. null = that % is not allowed for this player (keep HT's dose). */
export function repCeiling(loadPct: number | null | undefined, age: number | null | undefined, trainingYears: number | null | undefined): number | null {
  const pct = Number(loadPct ?? 0);
  const adult = Number(age ?? 0) >= 18 && Number(trainingYears ?? 0) >= 4;
  if (pct >= 85) { if (adult) return 3; return Number(age ?? 0) >= 16 ? 2 : null; }
  if (pct >= 80) return adult ? 4 : 3;
  if (pct >= 75) return adult ? 6 : 5;
  if (pct >= 70) return adult ? 8 : 6;
  if (pct >= 65) return adult ? 10 : 8;
  return 12;
}

/** 1 = full, 0.5 = taper (no added sets), 0 = HT's dose only. */
export function goalTaper(seasonPhase: string | null | undefined): number {
  const p = String(seasonPhase ?? "").toLowerCase();
  if (p === "os_q1" || p === "os_q2" || p === "off_season" || p === "offseason" || p === "off") return 1;
  if (p === "os_q3") return 0.5;
  return 0; // os_q4 (ramp-up / pre-season), in-season, post-season, unknown
}

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

export interface GoalDoseInput {
  seasonPhase: string | null | undefined;
  /** Top-ranked goal (main lifts). */
  key: GoalDoseKey | null;
  /** Second-ranked goal (accessories). Falls back to the top goal. */
  secondKey?: GoalDoseKey | null;
  isDeloadWeek: boolean;
  trendLighter: boolean;
  role: string | null | undefined;
  category: string | null | undefined;
  sets: number | null | undefined;
  reps: number | null | undefined;
  loadPct?: number | null;
  age?: number | null;
  trainingYears?: number | null;
  readiness?: number | null; // 0–100, null = unknown
  growthMode?: boolean;
  method?: any;
  /** v1 compatibility; unused. */
  weekInBlock?: number | null;
}

export function goalDose(i: GoalDoseInput): { sets: number; reps: number } | null {
  const taper = goalTaper(i.seasonPhase);
  if (taper === 0) return null;
  if (i.isDeloadWeek || i.trendLighter) return null;
  if (i.readiness != null && i.readiness < 40) return null;
  if (i.sets == null || i.reps == null) return null;
  const group = doseGroupFor(i.role, i.category);
  const noAdd = taper < 1 || !!i.growthMode || (i.age != null && i.age < 13);
  let sets = i.sets;
  let reps = i.reps;
  if (MAIN.has(group)) {
    if (!i.key) return null;
    const rule = GOAL_TABLE_V2[i.key].main;
    if (!rule) return null;
    if (rule.setsFixed) sets = clamp(i.sets, rule.setsFixed);
    else if (rule.addSet && i.sets + 1 <= rule.setsMax && i.sets >= 4) sets = i.sets + 1; // +1 on ≥4 stays ≤ +25%
    reps = clamp(i.reps, rule.reps);
  } else if (ACC.has(group)) {
    const k = i.secondKey ?? i.key;
    if (!k) return null;
    const rule = GOAL_TABLE_V2[k].acc;
    sets = clamp(i.sets, rule.sets);
    reps = clamp(i.reps, rule.reps);
  } else return null;
  if (noAdd && sets > i.sets) sets = i.sets;
  if (sets > i.sets && (sets - i.sets) / i.sets > 0.3) sets = i.sets;
  const ceil = repCeiling(i.loadPct, i.age, i.trainingYears);
  if (ceil == null) return null;
  if (reps > ceil) reps = ceil;
  if (sets === i.sets && reps === i.reps) return null;
  if (!isWithinEnvelope(i.seasonPhase, i.role, i.category, sets, reps, i.method)) return null;
  return { sets, reps };
}
