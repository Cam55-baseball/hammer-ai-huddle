/**
 * Upper-Body Plyo v1 — live legality filter (E2E WP4 item 1).
 *
 * Filter-only: removes U2/U3 catalog rows the athlete is not cleared for today.
 * It can never add a movement or change a dose, so it can only make a day
 * stricter than before. U1 is never removed (floor work stays available).
 * Unknown age or training age fails closed for U2/U3 and leaves U1 open.
 */
import {
  type Phase, type TrainingAge, type UbProfile, type UbHistory,
  tierPhaseLegal, tierAgeLegal, tierHistoryLegal, WEEKLY_U2_U3_SESSION_CAP,
} from "./rules.ts";
import type { UbTier } from "./families.ts";

export const UB_LIVE_FILTER_VERSION = "ub_live_filter_v1";

export function trainingAgeBand(years: number | null, proProspect: boolean): TrainingAge | null {
  if (years == null || !Number.isFinite(years)) return null;
  if (proProspect && years >= 4) return "professional";
  if (years < 1) return "beginner";
  if (years < 2) return "developing";
  if (years < 4) return "intermediate";
  if (years < 6) return "advanced";
  return "elite";
}

export interface UbLiveInput {
  phase: Phase;
  ageYears: number | null;
  trainingAge: TrainingAge | null;
  growthMode: boolean;
  throwingArmAthlete: boolean;
  /** Day offsets of starts relative to today (0 = today). */
  startDayOffsets: number[];
  history: Pick<UbHistory, "u1SessionsLast8w" | "u2SessionsLast10w" | "u2u3SessionsThisWeek">;
  painFlag: boolean;
}

export type UbBlockReason =
  | "phase" | "age_unknown" | "age" | "history" | "weekly_cap" | "start_window" | "pain";

export function ubTierBlocked(tier: UbTier, i: UbLiveInput): UbBlockReason | null {
  if (tier === "U1") return null;
  if (i.painFlag) return "pain";
  if (!tierPhaseLegal(tier, i.phase)) return "phase";
  if (i.ageYears == null || i.trainingAge == null) return "age_unknown";
  const p: UbProfile = {
    ageYears: i.ageYears, trainingAge: i.trainingAge, growthMode: i.growthMode,
    role: i.throwingArmAthlete ? "starting_pitcher" : "position",
    throwingArmAthlete: i.throwingArmAthlete, phase: i.phase, block: "B1",
  };
  if (!tierAgeLegal(tier, p)) return "age";
  if (!tierHistoryLegal(tier, { ...i.history, startDayOffsets: [], bullpenDayOffsets: [], highIntentThrowDayOffsets: [] })) return "history";
  if (i.history.u2u3SessionsThisWeek >= WEEKLY_U2_U3_SESSION_CAP) return "weekly_cap";
  if (i.throwingArmAthlete && i.startDayOffsets.some((o) => o >= -1 && o <= 1)) return "start_window";
  return null;
}

export function filterUbCatalog<T extends { ub_tier?: string | null }>(rows: T[], i: UbLiveInput): { rows: T[]; removed: number } {
  const out: T[] = [];
  let removed = 0;
  for (const r of rows) {
    const t = r.ub_tier as UbTier | null | undefined;
    if (t === "U2" || t === "U3") {
      if (ubTierBlocked(t, i)) { removed++; continue; }
    }
    out.push(r);
  }
  return { rows: out, removed };
}
