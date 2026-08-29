/**
 * Throw accuracy scoring — position / play-type aware.
 *
 * This is a direct scoring rubric supplied as domain expertise. It is NOT
 * anchored in `scale_reference` and deliberately does not produce a 20-80
 * scouting grade: it returns a 0-100 accuracy score plus an itemized
 * deduction breakdown, so every point lost is explainable.
 *
 * COORDINATE CONVENTIONS (documented once, enforced everywhere below):
 *
 *   lateral_offset_ft
 *     Signed horizontal miss, in feet, measured from the center of the bag
 *     (or plate). SIGN IS RELATIVE TO THE PLAY:
 *       positive  → the RUNNER's side of the bag
 *       negative  → the DEFENDER's side of the bag
 *     For a force play there is no runner/defender side that matters, so only
 *     the magnitude is used.
 *
 *   vertical_offset_ft
 *     FORCE PLAY: signed deviation from the center of the receiver's torso.
 *       positive → high, negative → low.
 *     TAG PLAY: height of the ball above the ground when it reaches the tag
 *       point. Always >= 0.
 *
 *   bounce_distance_ft
 *     Distance IN FRONT OF THE RECEIVER at which the throw bounced.
 *     `null` / `undefined` means the throw was caught in the air.
 *
 * Honesty rule: missing required inputs return a missing result with a reason.
 * A score is never fabricated.
 */

export type ThrowPlayType = "force" | "tag";

export type ThrowSpecificContext =
  | "standard"
  | "throw_home_from_lf"
  | "snap_third";

export interface ThrowAccuracyInput {
  play_type: ThrowPlayType;
  /** Defaults to "standard". Ignored for force plays. */
  specific_context?: ThrowSpecificContext;
  lateral_offset_ft: number | null | undefined;
  vertical_offset_ft: number | null | undefined;
  /** null = caught in the air (no bounce). */
  bounce_distance_ft?: number | null;
}

export interface ThrowAccuracyDeduction {
  /** Machine-readable rule id. */
  rule: string;
  /** Plain-language statement of the rule that fired. */
  reason: string;
  points: number;
}

export type ThrowAccuracyMissingReason =
  | "no_lateral_offset"
  | "no_vertical_offset"
  | "negative_bounce_distance"
  | "negative_tag_height";

export type ThrowAccuracyResult =
  | {
      score: number;
      perfect: boolean;
      deductions: ThrowAccuracyDeduction[];
      missing: false;
    }
  | {
      score: null;
      missing: true;
      missing_reason: ThrowAccuracyMissingReason;
    };

/* ------------------------------------------------------------------ */
/* Thresholds. Each constant names the rule it implements.             */
/* ------------------------------------------------------------------ */

/**
 * FORCE PLAY — "received within the receiver's torso, over the bag".
 * A torso is roughly 2ft wide, so the free lateral window is ±1ft from the
 * center of the bag, and roughly 3ft tall, so the free vertical window is
 * ±1.5ft from torso center.
 */
const FORCE_TORSO_LATERAL_FT = 1.0;
const FORCE_TORSO_VERTICAL_FT = 1.5;
/** Lateral miss (left/right of the bag) beyond the torso window. */
const FORCE_LATERAL_PENALTY_PER_FT = 12;
/** Too high — the receiver has to leave the bag reaching up. Costlier. */
const FORCE_HIGH_PENALTY_PER_FT = 15;
/** Too low but still caught in the air. */
const FORCE_LOW_PENALTY_PER_FT = 10;
/**
 * BOUNCE RULE — "a bounce under 10ft before reaching the receiver is a
 * smaller deduction than a bounce over 10ft". A short hop is handleable;
 * a long hop is a genuine liability.
 */
const BOUNCE_SHORT_HOP_MAX_FT = 10;
const FORCE_BOUNCE_SHORT_PENALTY = 10;
const FORCE_BOUNCE_LONG_PENALTY = 25;

/**
 * TAG PLAY — perfect throw is within 1ft laterally on the correct side of the
 * bag, at or below 1ft off the ground.
 */
const TAG_LATERAL_WINDOW_FT = 1.0;
const TAG_HEIGHT_WINDOW_FT = 1.0;
/** Correct side, but wider than 1ft: the tag has to travel. */
const TAG_LATERAL_PENALTY_PER_FT = 15;
/**
 * Wrong side entirely. On a tag play this is a categorical error — the
 * defender is now reaching across the bag/plate — so it carries a flat
 * penalty on top of the distance penalty.
 */
const TAG_WRONG_SIDE_FLAT_PENALTY = 20;
const TAG_WRONG_SIDE_PENALTY_PER_FT = 15;
/** Above the 1ft window: the tag has to come down through the slide. */
const TAG_HIGH_PENALTY_PER_FT = 20;
/**
 * Tag plays want the ball low, so a bounce is far less damaging than on a
 * force play — a short hop into the tag is nearly free.
 */
const TAG_BOUNCE_SHORT_PENALTY = 3;
const TAG_BOUNCE_LONG_PENALTY = 15;

function missing(reason: ThrowAccuracyMissingReason): ThrowAccuracyResult {
  return { score: null, missing: true, missing_reason: reason };
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Which side of the bag is the perfect throw on, for a tag play?
 *
 *   standard            → the RUNNER's side (get the ball where the runner
 *                         is arriving so the tag is already there).
 *   throw_home_from_lf  → the DEFENDER's side of the plate. Opposite of the
 *                         general rule on purpose: from left field the
 *                         catcher must receive up the third-base line and
 *                         work back into the plate to block it.
 *   snap_third          → the DEFENDER's side of the bag. The snap throw
 *                         behind the runner arrives on the defender's side so
 *                         the tag sweeps back into a diving runner.
 */
export function perfectTagSide(
  context: ThrowSpecificContext,
): "runner" | "defender" {
  switch (context) {
    case "throw_home_from_lf":
    case "snap_third":
      return "defender";
    case "standard":
    default:
      return "runner";
  }
}

export function scoreThrowAccuracy(
  input: ThrowAccuracyInput,
): ThrowAccuracyResult {
  const {
    play_type,
    specific_context = "standard",
    lateral_offset_ft,
    vertical_offset_ft,
    bounce_distance_ft,
  } = input;

  if (!isNum(lateral_offset_ft)) return missing("no_lateral_offset");
  if (!isNum(vertical_offset_ft)) return missing("no_vertical_offset");
  if (bounce_distance_ft != null) {
    if (!isNum(bounce_distance_ft) || bounce_distance_ft < 0) {
      return missing("negative_bounce_distance");
    }
  }
  if (play_type === "tag" && vertical_offset_ft < 0) {
    return missing("negative_tag_height");
  }

  const deductions: ThrowAccuracyDeduction[] = [];
  const bounced = bounce_distance_ft != null;
  const longHop = bounced && (bounce_distance_ft as number) > BOUNCE_SHORT_HOP_MAX_FT;

  if (play_type === "force") {
    const lat = Math.abs(lateral_offset_ft);
    if (lat > FORCE_TORSO_LATERAL_FT) {
      deductions.push({
        rule: "force_lateral_miss",
        reason: `Force play: throw missed left/right of the bag by ${round1(
          lat,
        )}ft, outside the ${FORCE_TORSO_LATERAL_FT}ft receiver-torso window.`,
        points: round1((lat - FORCE_TORSO_LATERAL_FT) * FORCE_LATERAL_PENALTY_PER_FT),
      });
    }

    if (vertical_offset_ft > FORCE_TORSO_VERTICAL_FT) {
      deductions.push({
        rule: "force_vertical_high",
        reason: `Force play: throw was ${round1(
          vertical_offset_ft,
        )}ft above torso center — high throws pull the receiver off the bag.`,
        points: round1(
          (vertical_offset_ft - FORCE_TORSO_VERTICAL_FT) * FORCE_HIGH_PENALTY_PER_FT,
        ),
      });
    } else if (vertical_offset_ft < -FORCE_TORSO_VERTICAL_FT && !bounced) {
      deductions.push({
        rule: "force_vertical_low",
        reason: `Force play: throw was ${round1(
          Math.abs(vertical_offset_ft),
        )}ft below torso center.`,
        points: round1(
          (Math.abs(vertical_offset_ft) - FORCE_TORSO_VERTICAL_FT) *
            FORCE_LOW_PENALTY_PER_FT,
        ),
      });
    }

    if (bounced) {
      deductions.push({
        rule: longHop ? "force_bounce_long_hop" : "force_bounce_short_hop",
        reason: longHop
          ? `Force play: throw bounced ${round1(
              bounce_distance_ft as number,
            )}ft out — a hop beyond ${BOUNCE_SHORT_HOP_MAX_FT}ft is a full long hop.`
          : `Force play: throw short-hopped ${round1(
              bounce_distance_ft as number,
            )}ft in front of the receiver — handleable, smaller deduction.`,
        points: longHop ? FORCE_BOUNCE_LONG_PENALTY : FORCE_BOUNCE_SHORT_PENALTY,
      });
    }
  } else {
    const wantSide = perfectTagSide(specific_context);
    const lat = Math.abs(lateral_offset_ft);
    // positive = runner's side, negative = defender's side (see header).
    const actualSide: "runner" | "defender" =
      lateral_offset_ft >= 0 ? "runner" : "defender";
    const sideLabel =
      wantSide === "runner" ? "the runner's side" : "the defender's side";

    if (lat > 0 && actualSide !== wantSide) {
      deductions.push({
        rule: "tag_wrong_side",
        reason: `Tag play (${specific_context}): perfect throw is within ${TAG_LATERAL_WINDOW_FT}ft to ${sideLabel}; this throw was ${round1(
          lat,
        )}ft to the other side, forcing the tag across the bag.`,
        points: round1(TAG_WRONG_SIDE_FLAT_PENALTY + lat * TAG_WRONG_SIDE_PENALTY_PER_FT),
      });
    } else if (lat > TAG_LATERAL_WINDOW_FT) {
      deductions.push({
        rule: "tag_lateral_wide",
        reason: `Tag play (${specific_context}): correct side (${sideLabel}) but ${round1(
          lat,
        )}ft wide, outside the ${TAG_LATERAL_WINDOW_FT}ft window.`,
        points: round1((lat - TAG_LATERAL_WINDOW_FT) * TAG_LATERAL_PENALTY_PER_FT),
      });
    }

    if (vertical_offset_ft > TAG_HEIGHT_WINDOW_FT) {
      deductions.push({
        rule: "tag_too_high",
        reason: `Tag play: ball arrived ${round1(
          vertical_offset_ft,
        )}ft off the ground — perfect is at or below ${TAG_HEIGHT_WINDOW_FT}ft.`,
        points: round1(
          (vertical_offset_ft - TAG_HEIGHT_WINDOW_FT) * TAG_HIGH_PENALTY_PER_FT,
        ),
      });
    }

    if (bounced) {
      deductions.push({
        rule: longHop ? "tag_bounce_long_hop" : "tag_bounce_short_hop",
        reason: longHop
          ? `Tag play: long hop at ${round1(
              bounce_distance_ft as number,
            )}ft — beyond the ${BOUNCE_SHORT_HOP_MAX_FT}ft short-hop window.`
          : `Tag play: short hop at ${round1(
              bounce_distance_ft as number,
            )}ft — a low tag throw hopping in is only lightly penalized.`,
        points: longHop ? TAG_BOUNCE_LONG_PENALTY : TAG_BOUNCE_SHORT_PENALTY,
      });
    }
  }

  const total = deductions.reduce((sum, d) => sum + d.points, 0);
  const score = Math.max(0, Math.min(100, round1(100 - total)));
  return { score, perfect: deductions.length === 0, deductions, missing: false };
}
