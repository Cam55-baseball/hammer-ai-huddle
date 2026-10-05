/**
 * Clean-clip fade (Stage 2, owner-authorised 2026-10-05).
 *
 * When a NEWER clip of the SAME skill genuinely checked a fault and did not
 * see it, that fault's weight eases right away — on top of the existing
 * 21-day timer, never instead of it.
 *
 * "Genuinely checked" is literal: the analyzer stores one yes/no answer per
 * fault it was asked to judge (`ai_analysis.violations_detected`). Only an
 * explicit `false` for a fault this skill actually assesses counts as clean.
 * A missing answer, a null, a refused clip or a clip of another skill is not
 * evidence of anything and leaves the weight unchanged.
 *
 * A fault seen again resets everything: the newer finding moves the signal's
 * `observed_at` past every earlier clean clip, so it is back at full weight.
 *
 * DEPENDENCY-FREE ON PURPOSE. This file is copied byte-for-byte to
 * `supabase/functions/_shared/wic/faultLedger/cleanClipFade.ts`;
 * `src/test/cleanClipFade.test.ts` fails the build if the two differ.
 */

export const CLEAN_CLIP_FADE_VERSION = "clean_clip_fade_v1";

/**
 * OWNER RULING PENDING — proposed default: one clean clip halves the fault's
 * weight, two clean clips in a row (with no repeat between) clear it.
 */
export const ONE_CLEAN_CLIP_WEIGHT = 0.5;
export const CLEAN_CLIPS_TO_CLEAR = 2;

/** Only analyzer findings can be cleared by a clip. Other sources keep their timer. */
export const FADEABLE_SOURCE = "video_analysis";

/**
 * The faults each analysis type is actually asked to judge. Mirrors the
 * per-skill buckets in `_shared/faultFindings.ts`. Hitting is told to always
 * answer `false` for shoulder alignment and back-leg direction, so those two
 * answers are not assessments and are deliberately absent here.
 */
export const ASSESSED_FAULTS: Readonly<Record<string, readonly string[]>> = {
  hitting: ["early_shoulder_rotation", "hands_pass_elbow_early", "front_shoulder_opens_early"],
  throwing: ["early_shoulder_rotation", "shoulders_not_aligned", "back_leg_not_facing_target"],
  pitching: ["early_shoulder_rotation", "shoulders_not_aligned", "back_leg_not_facing_target"],
};

/** Plain names the athlete reads. Keyed by skill, then fault. */
const PLAIN_NAME: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  hitting: {
    early_shoulder_rotation: "your shoulders turning early",
    hands_pass_elbow_early: "your hands getting out front early",
    front_shoulder_opens_early: "your front shoulder opening early",
  },
  throwing: {
    early_shoulder_rotation: "your shoulders turning early",
    shoulders_not_aligned: "your shoulders lining up off target",
    back_leg_not_facing_target: "your back leg pointing off target",
  },
  pitching: {
    early_shoulder_rotation: "your body turning early",
    shoulders_not_aligned: "your shoulders lining up off target",
    back_leg_not_facing_target: "your back leg not driving to the target",
  },
};

export interface ClipEvidence {
  readonly video_id: string;
  /** Analysis type: hitting | throwing | pitching. */
  readonly module: string | null;
  readonly created_at: string;
  /** The stored yes/no answers for this clip, exactly as saved. */
  readonly violations: Record<string, unknown> | null;
}

export interface FadeableSignal {
  readonly source: string;
  readonly discipline: string;
  readonly fault_key: string;
  readonly observed_at: string;
}

export interface FadeState {
  readonly version: typeof CLEAN_CLIP_FADE_VERSION;
  /** Clean clips in a row since the fault was last seen. */
  readonly cleanClips: number;
  /** 1 = untouched, ONE_CLEAN_CLIP_WEIGHT = eased, 0 = cleared. */
  readonly multiplier: number;
  readonly status: "none" | "eased" | "cleared";
  /** The dated clip(s) the fade traces to, oldest first. */
  readonly cleanClipIds: readonly string[];
  readonly latestCleanClipAt: string | null;
}

const NONE: FadeState = {
  version: CLEAN_CLIP_FADE_VERSION,
  cleanClips: 0,
  multiplier: 1,
  status: "none",
  cleanClipIds: [],
  latestCleanClipAt: null,
};

export function isAssessedBy(skill: string, faultKey: string): boolean {
  return (ASSESSED_FAULTS[skill] ?? []).includes(faultKey);
}

/** Deterministic: same signal and clips in, same state out. */
export function fadeForSignal(signal: FadeableSignal, clips: readonly ClipEvidence[]): FadeState {
  if (signal.source !== FADEABLE_SOURCE) return NONE;
  if (!isAssessedBy(signal.discipline, signal.fault_key)) return NONE;
  const seenAt = new Date(signal.observed_at).getTime();
  if (!Number.isFinite(seenAt)) return NONE;

  const later = clips
    .filter((c) => c.module === signal.discipline)
    .filter((c) => {
      const t = new Date(c.created_at).getTime();
      return Number.isFinite(t) && t > seenAt;
    })
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.video_id.localeCompare(b.video_id));

  let clean: ClipEvidence[] = [];
  for (const clip of later) {
    const answer = clip.violations ? clip.violations[signal.fault_key] : undefined;
    if (answer === true) clean = []; // seen again: back to full weight
    else if (answer === false) clean.push(clip); // genuinely checked, not seen
    // anything else: the clip could not judge it — not evidence either way
  }
  if (clean.length === 0) return NONE;
  const cleared = clean.length >= CLEAN_CLIPS_TO_CLEAR;
  return {
    version: CLEAN_CLIP_FADE_VERSION,
    cleanClips: clean.length,
    multiplier: cleared ? 0 : ONE_CLEAN_CLIP_WEIGHT,
    status: cleared ? "cleared" : "eased",
    cleanClipIds: clean.map((c) => c.video_id),
    latestCleanClipAt: clean[clean.length - 1].created_at,
  };
}

/** The line the athlete reads. Coach language, no numbers. */
export function fadeMessage(skill: string, faultKey: string, status: FadeState["status"]): string | null {
  if (status === "none") return null;
  const name = PLAIN_NAME[skill]?.[faultKey] ?? "what we were working on";
  return status === "cleared"
    ? `Your recent ${skill} clips haven't shown ${name}, so we've moved on from it. Nice work.`
    : `Your last ${skill} clip didn't show ${name}, so we've eased off it.`;
}
