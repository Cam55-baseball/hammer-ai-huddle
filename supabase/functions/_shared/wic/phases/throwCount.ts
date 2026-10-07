// Round 8 Step 5a — owner's final throw-counting rule (2026-10-07, replaces the 0.75/0.85 version).
// Pure. Every throw becomes "pitch-equivalents" that add into the EXISTING age-based daily and
// weekly limits (youthThrowing.ts checkCaps / restDaysFor). Never a dose, never a new limit.
export const THROW_COUNT_VERSION = "throw_count_v3";

export type ThrowKind =
  | "mound_pitch"          // any pitch on the mound            → 1.0
  | "off_mound_high"       // off-mound high-intent 4-seam/regular throw → 0.75
  | "off_mound_low"        // off-mound low-intensity throw     → 0.6
  | "off_mound_other_pitch"// off-mound throw of any non-4-seam pitch → 0.85
  | "pickoff_high"         // pick-off throw, high intent       → 0.75
  | "pickoff_low"          // pick-off throw, low intent        → 0.6
  | "pickoff_no_throw"     // footwork/timing only              → 0
  | "warmup_catch"         // warm-ups and catch play           → 0.25
  | "pap_max_throw"        // Power Primer max-effort throw (baseball/4 oz/plyo) → 1.5
  | "med_ball_throw";      // med-ball throw                    → 0

export const THROW_WEIGHTS: Readonly<Record<ThrowKind, number>> = {
  mound_pitch: 1.0,
  off_mound_high: 0.75,
  off_mound_low: 0.6,
  off_mound_other_pitch: 0.85,
  pickoff_high: 0.75,
  pickoff_low: 0.6,
  pickoff_no_throw: 0,
  warmup_catch: 0.25,
  pap_max_throw: 1.5,
  med_ball_throw: 0,
};

/** Classify one logged throw. Mound always 1.0; off-mound non-4-seam pitch beats intent. */
export function classifyThrow(t: {
  onMound?: boolean; pickoff?: boolean; noThrow?: boolean;
  pitchType?: string | null; intent?: "high" | "low" | null;
}): ThrowKind {
  if (t.pickoff) return t.noThrow ? "pickoff_no_throw" : t.intent === "low" ? "pickoff_low" : "pickoff_high";
  if (t.onMound) return "mound_pitch";
  const p = (t.pitchType ?? "").toLowerCase().replace(/[\s_-]/g, "");
  const fourSeamOrRegular = p === "" || p === "throw" || p === "regular" || p === "fourseam" || p === "4seam" || p === "fastball4seam";
  if (!fourSeamOrRegular) return "off_mound_other_pitch";
  return t.intent === "low" ? "off_mound_low" : "off_mound_high";
}

/** Total pitch-equivalents for a set of counted throws (rounded to 1 decimal). */
export function pitchEquivalents(throws: ReadonlyArray<{ kind: ThrowKind; count: number }>): number {
  let s = 0;
  for (const t of throws) if (t.count > 0) s += THROW_WEIGHTS[t.kind] * t.count;
  return Math.round(s * 10) / 10;
}
