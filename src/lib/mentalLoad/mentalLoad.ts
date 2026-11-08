// Release A2 (owner Nov 8): mental load = "How mentally draining was it?" (1–10) × the card's minutes.
// Minutes are the tracked time when the app recorded one, else the prescribed time. With neither,
// the mental load is unknown (the rating is still kept) — never guessed. Skipping saves nothing.

export const MENTAL_MINUTES_SETTING_KEY = "mental_load_prescribed_minutes_v1";

export type MentalActivity = "mind_item" | "royal_timing" | "baserunning_iq";

/** Non-exercise cards whose prescribed minutes the owner can set in the Coaching Console. */
export const MENTAL_KINDS = [
  ["situations", "Game situations"],
  ["film_study", "Film study"],
  ["tex_vision", "Tex Vision"],
  ["breathing", "Breathing reset"],
  ["focus_routine", "Focus routine"],
  ["journaling", "Journal"],
  ["owner_mind", "Your Mind drills (when no time is set on the drill)"],
  ["royal_timing", "Royal timing study"],
  ["baserunning_iq", "Baserunning IQ daily decisions"],
] as const;
export type MentalKind = (typeof MENTAL_KINDS)[number][0];

export type PrescribedMinutes = Partial<Record<MentalKind, number>>;

export function prescribedMinutesFrom(saved: unknown): PrescribedMinutes {
  const out: PrescribedMinutes = {};
  if (!saved || typeof saved !== "object") return out;
  for (const [k] of MENTAL_KINDS) {
    const v = Number((saved as Record<string, unknown>)[k]);
    if ((saved as Record<string, unknown>)[k] != null && Number.isFinite(v) && v > 0 && v <= 600) out[k] = v;
  }
  return out;
}

export interface MinutesPick { minutes: number; source: "tracked" | "prescribed" }

/** Tracked time wins, then a time set on the owner's drill, then the owner's prescribed minutes. */
export function resolveMinutes(opts: { trackedMinutes?: number | null; drillWorkSeconds?: number | null; kind: MentalKind; prescribed: PrescribedMinutes }): MinutesPick | null {
  const t = Number(opts.trackedMinutes);
  if (opts.trackedMinutes != null && Number.isFinite(t) && t > 0) return { minutes: Math.round(t * 100) / 100, source: "tracked" };
  const w = Number(opts.drillWorkSeconds);
  if (opts.drillWorkSeconds != null && Number.isFinite(w) && w > 0) return { minutes: Math.round((w / 60) * 100) / 100, source: "prescribed" };
  const p = opts.prescribed[opts.kind];
  return p != null && p > 0 ? { minutes: p, source: "prescribed" } : null;
}

/** Rating × minutes; unknown (null) without both. */
export function mentalLoadValue(rating: number | null | undefined, minutes: MinutesPick | null): number | null {
  if (rating == null || !Number.isInteger(rating) || rating < 1 || rating > 10 || !minutes) return null;
  return Math.round(rating * minutes.minutes * 100) / 100;
}
