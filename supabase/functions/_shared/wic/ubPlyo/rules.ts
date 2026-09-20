/**
 * Upper-Body Plyometric System v1 — pure rule engine (§2–§5).
 *
 * Pure and deterministic: no clock, no database, no network. NOT wired into
 * generation; wiring happens with TCS stage S4 behind `training_intel_v1`.
 */

import {
  type GateFamily,
  type Letter,
  type Plane,
  type UbMovement,
  type UbTier,
  PLANE_GATE,
  QUALITY_GATE_CUE,
  U1_ANCHOR,
  UB_MOVEMENTS,
  effectiveSlug,
  regressionSlug,
} from "./families.ts";

export type Phase = "os_q1" | "os_q2" | "os_q3" | "os_q4" | "pre_season" | "in_season" | "post_season";
export type Block = "B1" | "B2" | "B3" | "B4" | "B5";
export type TrainingAge = "beginner" | "developing" | "intermediate" | "advanced" | "elite" | "professional";
export type Role = "position" | "catcher" | "starting_pitcher" | "reliever";

export interface UbProfile {
  ageYears: number;
  trainingAge: TrainingAge;
  growthMode: boolean;
  role: Role;
  /** Baseball pitcher or softball windmill pitcher. */
  throwingArmAthlete: boolean;
  phase: Phase;
  block: Block;
  bodyWeightLb?: number;
}

export interface UbHistory {
  /** U1 sessions in the last 8 weeks. */
  u1SessionsLast8w: number;
  /** U2 sessions in the last 10 weeks. */
  u2SessionsLast10w: number;
  /** U2/U3 sessions already done this week. */
  u2u3SessionsThisWeek: number;
  /** Logged strength results — never asked, read from logs (§3). */
  strictPushUps?: number;
  strictInvertedRows?: number;
  strictPullUps?: number;
  benchEstimatedMaxLb?: number;
  /** Consecutive weeks of landmine pressing with no pain flag. */
  landmineWeeksNoPain?: number;
  /** Landmine press logged at 3 x 8 or better (Step 6 decision 5, U3 overhead gate). */
  landminePress3x8Logged?: boolean;
  /** Days relative to today (0 = today, negative = past, positive = upcoming). */
  startDayOffsets: number[];
  bullpenDayOffsets: number[];
  highIntentThrowDayOffsets: number[];
  painFlag?: boolean;
}

export const TIER_ORDER: UbTier[] = ["U1", "U2", "U3"];

/** §2 dose ceilings, per session. */
export function doseCap(tier: UbTier, letter: Letter): number {
  if (tier === "U1") return 40;
  if (tier === "U2") return 20;
  return letter === "B" || letter === "C" ? 12 : 15;
}

export const WEEKLY_U2_U3_SESSION_CAP = 2;
export const EXPOSURE_CHANNEL = "UB_PLYO";

/** §2 phase legality. In-season and post-season are U1 only. */
export function tierPhaseLegal(tier: UbTier, phase: Phase): boolean {
  if (tier === "U1") return true;
  const competitive = phase === "in_season" || phase === "post_season" || phase === "pre_season";
  if (competitive) return false;
  if (tier === "U2") return true;
  return phase === "os_q3" || phase === "os_q4"; // U3 builds in B4, maintains in B5
}

/** §7 block plan. */
export function tierBlockLegal(tier: UbTier, block: Block): boolean {
  if (tier === "U1") return true;
  if (tier === "U2") return true; // B1–B2 build, B3–B5 maintain
  return block === "B4" || block === "B5";
}

/** §2 age and training-age gates. */
export function tierAgeLegal(tier: UbTier, p: UbProfile): boolean {
  if (p.growthMode && tier !== "U1") return false;
  if (tier === "U1") return p.ageYears >= 13;
  const rank: Record<TrainingAge, number> = {
    beginner: 0, developing: 1, intermediate: 2, advanced: 3, elite: 4, professional: 5,
  };
  if (tier === "U2") return p.ageYears >= 14 && rank[p.trainingAge] >= 2;
  return p.ageYears >= 16 && rank[p.trainingAge] >= 3;
}

/** §2 earned-by history gates. */
export function tierHistoryLegal(tier: UbTier, h: UbHistory): boolean {
  if (tier === "U1") return true;
  if (tier === "U2") return h.u1SessionsLast8w >= 6;
  return h.u2SessionsLast10w >= 6;
}

/** §3 strength gates, read from logs. Missing data = gate not met. */
export function strengthGateMet(gate: GateFamily, tier: UbTier, p: UbProfile, h: UbHistory): boolean {
  if (tier === "U1" || gate === "none") return true;
  const bwRatio = h.benchEstimatedMaxLb && p.bodyWeightLb ? h.benchEstimatedMaxLb / p.bodyWeightLb : 0;
  switch (gate) {
    case "push":
      return tier === "U2" ? (h.strictPushUps ?? 0) >= 10 : (h.strictPushUps ?? 0) >= 20 || bwRatio >= 1.0;
    case "row":
      return tier === "U2" ? (h.strictInvertedRows ?? 0) >= 10 : (h.strictInvertedRows ?? 0) >= 15;
    case "pullup":
      return tier === "U2" ? (h.strictPullUps ?? 0) >= 6 : (h.strictPullUps ?? 0) >= 10;
    case "overhead":
      return tier === "U2" ? (h.landmineWeeksNoPain ?? 0) >= 4 && !h.painFlag : !h.painFlag;
    case "bench_catch":
      return tier === "U3" ? bwRatio >= 1.0 : true;
    default:
      return false;
  }
}

/** §4 throwing-arm rules. Returns a blocking reason or null. */
export function pitcherBlock(m: UbMovement, tier: UbTier, p: UbProfile, h: UbHistory): string | null {
  if (!p.throwingArmAthlete) return null;
  if (tier === "U1") return null;
  if (m.plane === "overhead" && m.barbellOverhead) return "barbell_overhead_not_for_pitchers";
  if (p.phase === "in_season" || p.phase === "post_season") return "in_season_pitcher_u1_only";
  if (p.role === "starting_pitcher") {
    if (h.startDayOffsets.some((d) => d === -1 || d === 0 || d === 1)) return "start_day_window";
  }
  if (tier === "U3") {
    if (h.bullpenDayOffsets.includes(0) || h.highIntentThrowDayOffsets.includes(0)) return "bullpen_or_high_intent_day";
    const soon = [...h.bullpenDayOffsets, ...h.startDayOffsets].some((d) => d > 0 && d <= 2);
    if (soon) return "within_48h_of_bullpen_or_start";
  }
  return null;
}

/** §3 family 11 requires Smith machine or safety pins. */
function equipmentSatisfied(m: UbMovement, available: readonly string[]): boolean {
  const have = new Set(available);
  if (m.family === 11 && m.letter === "Base") {
    if (!have.has("smith_machine") && !have.has("safety_pins")) return false;
  }
  return m.equipment.every((e) => e === "bodyweight" || have.has(e));
}

export interface UbDecision {
  slug: string;
  tier: UbTier;
  contactsCap: number;
  /** Populated when the requested movement was swapped for its regression. */
  regressedFrom?: string;
  reason: string;
  /** Athlete-facing label — never a failure message (§3). */
  label: string;
  exposureChannel: string;
  cue: string;
}

const LABEL = "Today's version";

function movementBySlug(slug: string): UbMovement | undefined {
  return UB_MOVEMENTS.find((m) => m.slug === slug || effectiveSlug(m) === slug);
}

function movementLegal(
  m: UbMovement,
  p: UbProfile,
  h: UbHistory,
  equipment: readonly string[],
): string | null {
  if (!tierPhaseLegal(m.tier, p.phase)) return "phase";
  if (!tierBlockLegal(m.tier, p.block)) return "block";
  if (!tierAgeLegal(m.tier, p)) return "age_or_training_age";
  if (!tierHistoryLegal(m.tier, h)) return "not_yet_earned";
  if (m.tier !== "U1" && h.u2u3SessionsThisWeek >= WEEKLY_U2_U3_SESSION_CAP) return "weekly_cap";
  const gate: GateFamily = m.family === 11 ? "bench_catch" : PLANE_GATE[m.plane];
  if (!strengthGateMet(gate, m.tier, p, h)) return "strength_gate";
  const pb = pitcherBlock(m, m.tier, p, h);
  if (pb) return pb;
  if (!equipmentSatisfied(m, equipment)) return "equipment";
  return null;
}

/**
 * Resolves a requested movement to the highest legal option in its chain.
 * Always returns a decision — the U1 anchor is the floor and is legal in every
 * phase for every athlete 13+.
 */
export function resolveUbMovement(
  requestedSlug: string,
  profile: UbProfile,
  history: UbHistory,
  equipment: readonly string[] = [],
): UbDecision {
  const requested = movementBySlug(requestedSlug);
  if (!requested) {
    return anchorDecision(profile, "rotation", "unknown_movement", requestedSlug);
  }
  let current: UbMovement | undefined = requested;
  let blocked: string | null = null;
  let guard = 0;
  while (current && guard++ < 6) {
    const why = movementLegal(current, profile, history, equipment);
    if (!why) {
      return {
        slug: effectiveSlug(current),
        tier: current.tier,
        contactsCap: doseCap(current.tier, current.letter),
        regressedFrom: current.slug === requested.slug ? undefined : requested.slug,
        reason: blocked ?? "legal",
        label: LABEL,
        exposureChannel: EXPOSURE_CHANNEL,
        cue: `${current.cue} ${QUALITY_GATE_CUE}`,
      };
    }
    blocked = blocked ?? why;
    const next = regressionSlug(current);
    current = next ? movementBySlug(next) : undefined;
  }
  return anchorDecision(profile, requested.plane, blocked ?? "blocked", requested.slug);
}

function anchorDecision(p: UbProfile, plane: Plane, reason: string, from: string): UbDecision {
  const anchorSlug = U1_ANCHOR[plane];
  const anchor = movementBySlug(anchorSlug);
  return {
    slug: anchorSlug,
    tier: "U1",
    contactsCap: doseCap("U1", "Base"),
    regressedFrom: from === anchorSlug ? undefined : from,
    reason,
    label: LABEL,
    exposureChannel: EXPOSURE_CHANNEL,
    cue: `${anchor?.cue ?? "Light and fast, never max effort."} ${QUALITY_GATE_CUE}`,
  };
}

/** §5 exposure: contacts by tier, for the UB_PLYO spike governor. */
export function ubExposure(entries: { tier: UbTier; contacts: number }[]) {
  const byTier: Record<UbTier, number> = { U1: 0, U2: 0, U3: 0 };
  for (const e of entries) byTier[e.tier] += Math.max(0, e.contacts);
  return {
    channel: EXPOSURE_CHANNEL,
    byTier,
    total: byTier.U1 + byTier.U2 + byTier.U3,
  };
}
