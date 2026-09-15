/**
 * STEP 3 — Subject locking for D-POSE.
 *
 * WHY THIS EXISTS
 * The dense pass ran MediaPipe with `numPoses: 1`. On a clip with more than one
 * person in frame (coach, on-deck hitter, catcher, parent) the single reported
 * pose is whichever body the detector preferred THAT FRAME. Validation on clip
 * c1319020 showed the ankle alternating between ~0.55 and ~0.93 of frame height
 * frame-to-frame: the "track" was two bodies interleaved. Every anchor and
 * every metric built on that is measuring a chimera.
 *
 * WHAT THIS DOES
 *   1. Consumes ALL poses detected in a frame (multi-pose).
 *   2. Locks onto one subject on the first frame that has a confident pose.
 *   3. Holds the lock by nearest-neighbour matching on the mid-hip, gated by a
 *      maximum plausible per-frame displacement and a body-scale continuity
 *      check.
 *   4. When no candidate satisfies the gate, the frame is UNOBSERVED for the
 *      locked subject. It never re-locks onto whoever happens to be nearest.
 *      A gap is honest; a swapped body is a fabrication that looks like data.
 *
 * DETERMINISM: fixed thresholds, integer indices, explicit tie-breaks
 * (lowest candidate index wins), no clock, no RNG, no model in the decision.
 */

/* ------------------------------------------------------------------ */
/* Landmark indices                                                     */
/* ------------------------------------------------------------------ */

const LEFT_HIP = 23;
const RIGHT_HIP = 24;

/* ------------------------------------------------------------------ */
/* Fixed constants — part of the rule identity below                    */
/* ------------------------------------------------------------------ */

/** A candidate pose whose mean landmark visibility is below this is not a
 *  lock-worthy subject. */
export const MIN_CANDIDATE_MEAN_VISIBILITY = 0.5;
/** Hips must be this visible for the candidate to have a usable anchor point. */
export const MIN_HIP_VISIBILITY = 0.5;
/** A candidate must be at least this tall relative to the tallest candidate in
 *  the frame to be considered "a comparably framed person". Filters out
 *  background bystanders without preferring whoever is nearest the lens. */
export const RELATIVE_HEIGHT_FLOOR = 0.6;

/**
 * Maximum plausible mid-hip travel, in frame heights per second.
 * A hitter's pelvis crosses at most ~1 body height per second in a stride; 2.0
 * frame-heights/sec is generous for any baseball movement filmed side-on and
 * still an order of magnitude below a body swap (which lands ~0.2-0.5 of frame
 * height in a single frame).
 */
export const MAX_HIP_SPEED_PER_SEC = 2.0;
/** Per-frame jitter floor: landmark noise alone can move the mid-hip this far
 *  at any fps, so the gate is never tighter than this. */
export const MIN_HIP_GATE_PER_FRAME = 0.035;
/** Widest the gate may open after a long gap, in normalized frame heights. */
export const MAX_HIP_GATE = 0.30;

/** Body scale must stay inside this band across a gap — a different person is
 *  usually a different size in frame. */
export const SCALE_BAND_LOW = 0.6;
export const SCALE_BAND_HIGH = 1.7;

/** Track reliability thresholds for the persisted header flag. */
export const MAX_RELIABLE_REACQUISITIONS = 3;
export const MAX_RELIABLE_LOST_FRACTION = 0.3;

/**
 * SELECTION RULE IDENTITY. Recorded in the series header so a future reader
 * knows exactly how the subject was chosen without re-deriving it.
 */
export const SUBJECT_SELECTION_RULE =
  "largest_confident_then_most_central_v1" as const;

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface PoseCandidate {
  /** 33 x (x,y,z) normalized image coords, flattened. */
  readonly normalized: readonly number[];
  /** 33 x (x,y,z) world coords in metres, flattened. */
  readonly world: readonly number[];
  /** 33 per-landmark visibility. */
  readonly visibility: readonly number[];
}

export interface CandidateFeatures {
  readonly mid_hip_x: number;
  readonly mid_hip_y: number;
  readonly bbox_height: number;
  readonly bbox_width: number;
  readonly mean_visibility: number;
  readonly hip_visible: boolean;
}

export type LockEvent = "locked" | "held" | "reacquired" | "lost" | "no_pose";

export interface LockStep {
  /** Index into the candidate array, or null when the frame is unobserved for
   *  the locked subject. */
  readonly candidate_index: number | null;
  readonly event: LockEvent;
  readonly candidates_detected: number;
}

export interface SubjectLockStats {
  readonly subjects_detected_min: number;
  readonly subjects_detected_median: number;
  readonly subjects_detected_max: number;
  readonly selection_rule: string;
  /** Frame ORDINAL (position in the processed sequence) the lock was taken on. */
  readonly locked_on_ordinal: number | null;
  readonly locked_candidate_index: number | null;
  readonly frames_locked: number;
  readonly frames_lost: number;
  readonly reacquisitions: number;
  readonly track_reliable: boolean;
}

/* ------------------------------------------------------------------ */
/* Feature extraction                                                   */
/* ------------------------------------------------------------------ */

export function candidateFeatures(c: PoseCandidate): CandidateFeatures | null {
  const n = c.visibility.length;
  if (n === 0 || c.normalized.length < n * 3) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let visSum = 0;
  for (let i = 0; i < n; i++) {
    const x = c.normalized[i * 3];
    const y = c.normalized[i * 3 + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    visSum += c.visibility[i] ?? 0;
  }

  const lhx = c.normalized[LEFT_HIP * 3];
  const lhy = c.normalized[LEFT_HIP * 3 + 1];
  const rhx = c.normalized[RIGHT_HIP * 3];
  const rhy = c.normalized[RIGHT_HIP * 3 + 1];
  const hipVis = Math.min(c.visibility[LEFT_HIP] ?? 0, c.visibility[RIGHT_HIP] ?? 0);

  return {
    mid_hip_x: (lhx + rhx) / 2,
    mid_hip_y: (lhy + rhy) / 2,
    bbox_height: maxY - minY,
    bbox_width: maxX - minX,
    mean_visibility: visSum / n,
    hip_visible: hipVis >= MIN_HIP_VISIBILITY,
  };
}

/* ------------------------------------------------------------------ */
/* Selection                                                            */
/* ------------------------------------------------------------------ */

/**
 * SELECTION RULE (`largest_confident_then_most_central_v1`), applied on the
 * first frame that offers at least one qualifying candidate:
 *
 *   1. GATE — drop candidates with mean landmark visibility < 0.5 or with the
 *      hips not visible. A subject we cannot see well cannot be tracked.
 *   2. SIZE BAND — keep candidates whose bounding-box height is at least 60% of
 *      the tallest qualifying candidate. This removes background bystanders
 *      without handing the lock to whoever stands closest to the lens.
 *   3. CENTRALITY — within that band, take the candidate whose mid-hip is
 *      horizontally closest to the frame centre (x = 0.5). The athlete is the
 *      subject of the capture and is framed accordingly; a coach or on-deck
 *      hitter is typically off to one side.
 *   4. TIE-BREAK — equal centrality: taller bbox wins; still equal: higher mean
 *      visibility; still equal: lowest candidate index. Fully deterministic.
 *
 * "Largest alone" was rejected precisely because a person nearer the camera
 * wins it. "Most central alone" was rejected because a distant background
 * figure can sit dead centre. The two together encode what the frame is of.
 */
export function selectSubject(candidates: readonly PoseCandidate[]): number | null {
  const feats = candidates.map(candidateFeatures);
  const eligible: number[] = [];
  for (let i = 0; i < feats.length; i++) {
    const f = feats[i];
    if (!f) continue;
    if (f.mean_visibility < MIN_CANDIDATE_MEAN_VISIBILITY) continue;
    if (!f.hip_visible) continue;
    if (!(f.bbox_height > 0)) continue;
    eligible.push(i);
  }
  if (eligible.length === 0) return null;

  const tallest = Math.max(...eligible.map((i) => feats[i]!.bbox_height));
  const inBand = eligible.filter(
    (i) => feats[i]!.bbox_height >= RELATIVE_HEIGHT_FLOOR * tallest,
  );

  let best = inBand[0];
  for (const i of inBand.slice(1)) {
    const a = feats[best]!;
    const b = feats[i]!;
    const da = Math.abs(a.mid_hip_x - 0.5);
    const db = Math.abs(b.mid_hip_x - 0.5);
    if (db < da) { best = i; continue; }
    if (db > da) continue;
    if (b.bbox_height > a.bbox_height) { best = i; continue; }
    if (b.bbox_height < a.bbox_height) continue;
    if (b.mean_visibility > a.mean_visibility) { best = i; }
    // equal on everything: lowest index already held in `best`
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Tracking                                                             */
/* ------------------------------------------------------------------ */

interface LockState {
  mid_hip_x: number;
  mid_hip_y: number;
  bbox_height: number;
}

/**
 * Stateful, single-pass tracker. Feed it one frame's candidates at a time in
 * frame order; it returns which candidate (if any) IS the locked subject.
 */
export class SubjectTracker {
  private readonly fps: number;
  private state: LockState | null = null;
  private framesSinceSeen = 0;
  private ordinal = -1;

  private lockedOnOrdinal: number | null = null;
  private lockedCandidateIndex: number | null = null;
  private framesLocked = 0;
  private framesLost = 0;
  private reacquisitions = 0;
  private everLocked = false;
  private readonly counts: number[] = [];

  constructor(fps: number) {
    this.fps = Number.isFinite(fps) && fps > 0 ? fps : 30;
  }

  /** Displacement gate for the current gap length, in normalized frame heights. */
  private gate(): number {
    const gapFrames = Math.max(1, this.framesSinceSeen + 1);
    const perFrame = Math.max(
      MIN_HIP_GATE_PER_FRAME,
      MAX_HIP_SPEED_PER_SEC / this.fps,
    );
    return Math.min(MAX_HIP_GATE, perFrame * gapFrames);
  }

  step(candidates: readonly PoseCandidate[]): LockStep {
    this.ordinal += 1;
    this.counts.push(candidates.length);

    if (candidates.length === 0) {
      if (this.everLocked) {
        this.framesLost += 1;
        this.framesSinceSeen += 1;
        return { candidate_index: null, event: "lost", candidates_detected: 0 };
      }
      return { candidate_index: null, event: "no_pose", candidates_detected: 0 };
    }

    // Not locked yet: apply the selection rule.
    if (!this.everLocked) {
      const idx = selectSubject(candidates);
      if (idx == null) {
        return {
          candidate_index: null,
          event: "no_pose",
          candidates_detected: candidates.length,
        };
      }
      const f = candidateFeatures(candidates[idx])!;
      this.state = {
        mid_hip_x: f.mid_hip_x,
        mid_hip_y: f.mid_hip_y,
        bbox_height: f.bbox_height,
      };
      this.everLocked = true;
      this.lockedOnOrdinal = this.ordinal;
      this.lockedCandidateIndex = idx;
      this.framesLocked += 1;
      this.framesSinceSeen = 0;
      return { candidate_index: idx, event: "locked", candidates_detected: candidates.length };
    }

    // Locked: nearest-neighbour match under the displacement + scale gates.
    const gate = this.gate();
    const prev = this.state!;
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const f = candidateFeatures(candidates[i]);
      if (!f || !f.hip_visible || !(f.bbox_height > 0)) continue;
      const dx = f.mid_hip_x - prev.mid_hip_x;
      const dy = f.mid_hip_y - prev.mid_hip_y;
      const dist = Math.hypot(dx, dy);
      if (dist > gate) continue;
      const scale = f.bbox_height / prev.bbox_height;
      if (scale < SCALE_BAND_LOW || scale > SCALE_BAND_HIGH) continue;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx < 0) {
      // HONEST FAILURE. No re-selection: this frame is unobserved.
      this.framesLost += 1;
      this.framesSinceSeen += 1;
      return {
        candidate_index: null,
        event: "lost",
        candidates_detected: candidates.length,
      };
    }

    const wasLost = this.framesSinceSeen > 0;
    const f = candidateFeatures(candidates[bestIdx])!;
    this.state = {
      mid_hip_x: f.mid_hip_x,
      mid_hip_y: f.mid_hip_y,
      bbox_height: f.bbox_height,
    };
    this.framesSinceSeen = 0;
    this.framesLocked += 1;
    if (wasLost) this.reacquisitions += 1;
    return {
      candidate_index: bestIdx,
      event: wasLost ? "reacquired" : "held",
      candidates_detected: candidates.length,
    };
  }

  stats(): SubjectLockStats {
    const sorted = [...this.counts].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    const medianCount =
      sorted.length === 0
        ? 0
        : sorted.length % 2 === 1
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2;
    const totalConsidered = this.framesLocked + this.framesLost;
    const lostFraction = totalConsidered > 0 ? this.framesLost / totalConsidered : 0;
    return {
      subjects_detected_min: sorted.length === 0 ? 0 : sorted[0],
      subjects_detected_median: medianCount,
      subjects_detected_max: sorted.length === 0 ? 0 : sorted[sorted.length - 1],
      selection_rule: SUBJECT_SELECTION_RULE,
      locked_on_ordinal: this.lockedOnOrdinal,
      locked_candidate_index: this.lockedCandidateIndex,
      frames_locked: this.framesLocked,
      frames_lost: this.framesLost,
      reacquisitions: this.reacquisitions,
      track_reliable:
        this.everLocked &&
        this.reacquisitions <= MAX_RELIABLE_REACQUISITIONS &&
        lostFraction <= MAX_RELIABLE_LOST_FRACTION,
    };
  }
}
