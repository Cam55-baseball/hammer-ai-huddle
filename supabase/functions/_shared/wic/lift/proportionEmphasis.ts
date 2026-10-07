// Limb-proportion emphasis (owner rule 2026-10-07).
//
// Proportions shift EMPHASIS, never legality. This module only adds a small
// bonus to candidates that already passed every gate (injury, season, age,
// equipment). It never removes a candidate, so only an injury gate can rule an
// exercise out. Doses (sets/reps/%) are untouched; HT's phase scheme decides
// which slots exist.
//
// Lever research basis (summarised in docs/wic/limb-size-report.md §d):
//  - Femur long relative to torso → more forward trunk lean and hip moment in
//    bilateral back squats; split squats, lunges and trap-bar pulls keep the
//    trunk upright and load the legs with less spinal shear.
//  - Long arms (arm span > height) → longer pressing range on barbell bench
//    and overhead press; dumbbell / neutral / landmine presses fit better.
//    Long arms shorten deadlift range, so pulls and rows favour them.
//
// Frequency, not exclusion: on each day the favoured class gets the bonus with
// probability `share` (deterministic from the day seed); otherwise the
// bilateral / barbell class gets it. A long-femur athlete therefore sees
// single-limb and trap-bar work most days and bilateral squats on the rest.

export const PROPORTION_EMPHASIS_VERSION = "limb_emph_v1";
export const PROPORTION_BONUS = 0.3;
/** Most an athlete can ever lean to one side — the other side still appears. */
export const MAX_SHARE = 0.8;

export interface Anthro {
  height_in?: number | null;
  wingspan_in?: number | null;
  femur_in?: number | null;
  torso_in?: number | null;
  leg_length_in?: number | null;
}

export interface ProportionProfile {
  readonly version: string;
  /** -1 (short legs/femur) .. +1 (long). 0 = average or unknown. */
  readonly legTilt: number;
  /** -1 (short arms) .. +1 (long). 0 = average or unknown. */
  readonly armTilt: number;
  readonly femurTorso: number | null;
  readonly apeIndex: number | null;
  readonly source: { leg: "femur_torso" | "leg_height" | null; arm: "ape_index" | null };
}

const pos = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const clamp1 = (x: number) => Math.max(-1, Math.min(1, Math.round(x * 1000) / 1000));

/** Reads athlete_context.anthropometrics (any extra keys ignored). */
export function proportionProfile(a: Anthro | Record<string, unknown> | null | undefined): ProportionProfile {
  const r = (a ?? {}) as Record<string, unknown>;
  const h = pos(r.height_in), ws = pos(r.wingspan_in);
  const fe = pos(r.femur_in), to = pos(r.torso_in), leg = pos(r.leg_length_in);
  let legTilt = 0; let legSrc: ProportionProfile["source"]["leg"] = null;
  const femurTorso = fe && to ? fe / to : null;
  if (femurTorso) {
    // ~1.0 is typical; ±0.2 is a clearly long / short femur.
    legTilt = clamp1((femurTorso - 1.0) / 0.2); legSrc = "femur_torso";
  } else if (leg && h) {
    legTilt = clamp1((leg / h - 0.5) / 0.05); legSrc = "leg_height";
  }
  const apeIndex = ws && h ? ws / h : null;
  const armTilt = apeIndex ? clamp1((apeIndex - 1.0) / 0.05) : 0;
  return {
    version: PROPORTION_EMPHASIS_VERSION,
    legTilt, armTilt,
    femurTorso: femurTorso ? Math.round(femurTorso * 1000) / 1000 : null,
    apeIndex: apeIndex ? Math.round(apeIndex * 1000) / 1000 : null,
    source: { leg: legSrc, arm: apeIndex ? "ape_index" : null },
  };
}

export type LeverClass =
  | "bilateral_squat" | "single_limb_lower" | "trap_bar"
  | "barbell_press" | "db_neutral_press" | "pull" | null;

export function leverClass(m: { slug?: string | null; name?: string | null }): LeverClass {
  const t = `${m.slug ?? ""} ${m.name ?? ""}`.toLowerCase().replace(/[_-]/g, " ");
  if (/trap bar|hex bar/.test(t)) return "trap_bar";
  if (/lunge|split squat|bulgarian|step up|single leg|pistol|skater squat|rfess/.test(t)) return "single_limb_lower";
  if (/squat/.test(t)) return "bilateral_squat";
  if (/press|bench|push up/.test(t)) {
    if (/dumbbell|\bdb\b|neutral|landmine|single arm|kettlebell|floor press|push up/.test(t)) return "db_neutral_press";
    return "barbell_press";
  }
  if (/row|pull up|chin up|pulldown|deadlift|rdl/.test(t)) return "pull";
  return null;
}

/** Share of days the favoured class wins for a tilt magnitude. */
export function shareFor(tilt: number): number {
  return Math.min(MAX_SHARE, 0.5 + Math.abs(tilt) * (MAX_SHARE - 0.5));
}

function unit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return (h >>> 0) / 4294967296;
}

/**
 * Bonus for one already-legal candidate. `daySeed` must be the same for every
 * candidate in a slot on a given day so the draw is shared.
 */
export function proportionBonus(p: ProportionProfile, m: { slug?: string | null; name?: string | null }, daySeed: string): number {
  const c = leverClass(m);
  if (!c) return 0;
  if (c === "bilateral_squat" || c === "single_limb_lower" || c === "trap_bar") {
    if (p.legTilt === 0) return 0;
    const favourUnilateral = p.legTilt > 0;
    const win = unit(`${daySeed}|leg`) < shareFor(p.legTilt);
    const favoured = favourUnilateral ? c !== "bilateral_squat" : c === "bilateral_squat";
    return (win ? favoured : !favoured) ? PROPORTION_BONUS * Math.abs(p.legTilt) : 0;
  }
  if (c === "barbell_press" || c === "db_neutral_press") {
    if (p.armTilt === 0) return 0;
    const win = unit(`${daySeed}|press`) < shareFor(p.armTilt);
    const favoured = p.armTilt > 0 ? c === "db_neutral_press" : c === "barbell_press";
    return (win ? favoured : !favoured) ? PROPORTION_BONUS * Math.abs(p.armTilt) : 0;
  }
  // Pulls: a mild nudge only for long arms (shorter deadlift range).
  return p.armTilt > 0 ? 0.1 * p.armTilt : 0;
}

/** Plain line for the card when proportions shaped the pick. */
export function proportionWhy(p: ProportionProfile, m: { slug?: string | null; name?: string | null }): string {
  const c = leverClass(m);
  if ((c === "single_limb_lower" || c === "trap_bar") && p.legTilt > 0.25)
    return " Your legs are long for your body, so one-leg and trap-bar work show up more often — they keep your back upright under load.";
  if (c === "db_neutral_press" && p.armTilt > 0.25)
    return " Your arms are long for your height, so dumbbell and neutral-grip presses show up more often — easier on the shoulder over a long range.";
  return "";
}
