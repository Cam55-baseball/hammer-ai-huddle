// Off-season goal → sets/reps (owner approved 2026-10-07, docs/owner/goal-reps-sets-proposal.md).
// Exception to "reps never change", used only when needed: HT's dose already
// inside the goal range is kept; otherwise it moves the smallest step into the
// range. Never in-season/pre/post, never on deload or trend-lighter weeks, and
// a result outside HT's phase envelope is dropped (HT's dose kept).
import { isWithinEnvelope, doseGroupFor } from "../dosage/doctrine.ts";

export const GOAL_DOSE_VERSION = "wic_goal_dose_v1";

export type GoalDoseKey = "strength" | "size" | "power" | "skill" | "durability";
type Range = { sets: [number, number]; reps: [number, number] };

// [accumulate (wk1), intensify (wk2), peak (wk3)]
export const GOAL_DOSE_TABLE: Record<GoalDoseKey, [Range, Range, Range]> = {
  strength: [{ sets: [4, 4], reps: [5, 6] }, { sets: [5, 5], reps: [3, 5] }, { sets: [4, 4], reps: [2, 3] }],
  size: [{ sets: [4, 4], reps: [8, 10] }, { sets: [4, 4], reps: [6, 8] }, { sets: [3, 3], reps: [5, 6] }],
  power: [{ sets: [5, 5], reps: [3, 5] }, { sets: [5, 5], reps: [2, 4] }, { sets: [6, 6], reps: [1, 3] }],
  skill: [{ sets: [4, 4], reps: [4, 6] }, { sets: [5, 5], reps: [3, 5] }, { sets: [5, 5], reps: [2, 3] }],
  durability: [{ sets: [3, 3], reps: [10, 12] }, { sets: [3, 3], reps: [8, 10] }, { sets: [3, 3], reps: [6, 8] }],
};

const APPLIES_TO = new Set(["main_compound", "unilateral", "upper"]);

/** Top goal → table row. Training-preference "hypertrophy/size" wins for size. */
export function goalDoseKey(topDomain: string | null | undefined, trainingGoal?: string | null): GoalDoseKey | null {
  const tg = String(trainingGoal ?? "").toLowerCase();
  if (/hypertroph|size|muscle|mass/.test(tg)) return "size";
  switch (topDomain) {
    case "strength": return "strength";
    case "power": case "speed": return "power";
    case "hitting": case "throwing": return "skill";
    case "durability": case "conditioning": return "durability";
    default: return null;
  }
}

const nearest = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

export interface GoalDoseInput {
  seasonPhase: string | null | undefined;
  key: GoalDoseKey | null;
  weekInBlock: number | null | undefined;
  isDeloadWeek: boolean;
  trendLighter: boolean;
  role: string | null | undefined;
  category: string | null | undefined;
  sets: number | null | undefined;
  reps: number | null | undefined;
  method?: any;
}

export function goalDose(i: GoalDoseInput): { sets: number; reps: number } | null {
  const p = String(i.seasonPhase ?? "").toLowerCase();
  if (!(p === "off_season" || p === "offseason" || p.startsWith("os_q"))) return null;
  if (!i.key || i.isDeloadWeek || i.trendLighter) return null;
  if (i.sets == null || i.reps == null) return null;
  const wk = Number(i.weekInBlock);
  if (!(wk >= 1 && wk <= 3)) return null;
  if (!APPLIES_TO.has(doseGroupFor(i.role, i.category))) return null;
  const r = GOAL_DOSE_TABLE[i.key][wk - 1];
  const sets = nearest(i.sets, r.sets);
  const reps = nearest(i.reps, r.reps);
  if (sets === i.sets && reps === i.reps) return null; // already fits — no change needed
  if (!isWithinEnvelope(i.seasonPhase, i.role, i.category, sets, reps, i.method)) return null;
  return { sets, reps };
}
