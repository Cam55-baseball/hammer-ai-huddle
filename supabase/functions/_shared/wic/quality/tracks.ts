/**
 * Three quality tracks — Stage 5 (spec §4).
 *
 * Every athlete owns all three tracks at once: Power, Velocity, Work Rate.
 * Nobody is "a power athlete". Each track carries a current and a future grade
 * on the existing 20-80 scale; the gap between them decides how much weight
 * that track gets when ORDERING an already-legal candidate pool.
 *
 * Two hard floors, both enforced here:
 *   (a) every track gets at least one exposure per training week, so no
 *       quality can fall to zero;
 *   (b) emphasis RE-ORDERS a list and never filters one. A sort cannot empty a
 *       pool, so it can never produce a missing card. If a re-order somehow
 *       yields nothing, we fall through to the canonical order untouched.
 *
 * Pure, deterministic, no I/O. Authors no dose: this module never touches
 * sets, reps or load — it only decides the order of candidates.
 */

export const QUALITY_TRACKS_VERSION = "quality_tracks_v1";

export type QualityTrack = "power" | "velocity" | "work_rate";

export const QUALITY_TRACKS: readonly QualityTrack[] = ["power", "velocity", "work_rate"];

export const TRACK_LABEL: Record<QualityTrack, string> = {
  power: "Power",
  velocity: "Velocity",
  work_rate: "Work Rate",
};

/** 20-80 scouting scale, same one the rest of the app already uses. */
export interface TrackGrade {
  current: number;
  future: number;
}

export type TrackGrades = Record<QualityTrack, TrackGrade>;

const SCALE_MIN = 20;
const SCALE_MAX = 80;

function clampGrade(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return SCALE_MIN;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, n));
}

/** Gap between where an athlete is and where they project. Never negative. */
export function trackGap(g: TrackGrade | null | undefined): number {
  if (!g) return 0;
  return Math.max(0, clampGrade(g.future) - clampGrade(g.current));
}

/**
 * Normalised emphasis weight per track. Sums to 1 when any gap exists,
 * otherwise every track gets an equal share — an athlete with no measured gap
 * is not steered anywhere.
 */
export function computeEmphasis(grades: Partial<TrackGrades> | null | undefined): Record<QualityTrack, number> {
  const gaps = QUALITY_TRACKS.map((t) => trackGap(grades?.[t]));
  const total = gaps.reduce((a, b) => a + b, 0);
  const out = {} as Record<QualityTrack, number>;
  QUALITY_TRACKS.forEach((t, i) => {
    out[t] = total > 0 ? gaps[i] / total : 1 / QUALITY_TRACKS.length;
  });
  return out;
}

/**
 * Which quality a candidate movement trains. Unknown → null, and a null track
 * is never penalised out of the pool; it simply keeps its canonical position.
 */
export function classifyTrack(m: {
  role?: string | null;
  category?: string | null;
  intensity_class?: string | null;
  slug?: string | null;
} | null | undefined): QualityTrack | null {
  if (!m) return null;
  const hay = `${m.role ?? ""} ${m.category ?? ""} ${m.slug ?? ""}`.toLowerCase();
  const intensity = String(m.intensity_class ?? "").toLowerCase();

  if (/sprint|accel|jump|throw|med[\s_-]?ball|plyo|olympic|clean|snatch|power/.test(hay)) return "power";
  if (intensity === "max" || intensity === "maximal") return "velocity";
  if (/compound|deadlift|squat|press|pull|hinge/.test(hay)) return "velocity";
  if (/carry|tissue|arm_care|trunk|accessory|conditioning|sled|capacity/.test(hay)) return "work_rate";
  return null;
}

export interface ExposureWindow {
  /** Count of exposures already given to each track in the current training week. */
  counts: Partial<Record<QualityTrack, number>>;
}

/** Tracks that have had zero exposure this training week — floor (a). */
export function starvedTracks(w: ExposureWindow | null | undefined): QualityTrack[] {
  return QUALITY_TRACKS.filter((t) => (w?.counts?.[t] ?? 0) <= 0);
}

export interface OrderableCandidate {
  role?: string | null;
  category?: string | null;
  intensity_class?: string | null;
  slug?: string | null;
}

/**
 * Re-order an already-legal pool by track emphasis.
 *
 * - A track with zero exposure this week outranks every emphasis weight
 *   (floor a). That is what stops a weak track being starved by a strong one.
 * - Ordering is stable: equal scores keep their canonical relative order.
 * - The pool is returned whole. Nothing is ever dropped (floor b).
 */
export function orderByEmphasis<T extends OrderableCandidate>(
  pool: readonly T[],
  grades: Partial<TrackGrades> | null | undefined,
  exposure?: ExposureWindow | null,
): T[] {
  if (!Array.isArray(pool) || pool.length === 0) return [...(pool ?? [])];
  const emphasis = computeEmphasis(grades);
  const starved = new Set(starvedTracks(exposure));

  const scored = pool.map((item, index) => {
    const track = classifyTrack(item);
    const base = track ? emphasis[track] : 0;
    const floorBonus = track && starved.has(track) ? 10 : 0;
    return { item, index, score: base + floorBonus };
  });

  scored.sort((a, b) => (b.score - a.score) || (a.index - b.index));
  const out = scored.map((s) => s.item);

  // Floor (b): a sort can never empty a pool. If it somehow did, hand back the
  // canonical order rather than a missing card.
  return out.length === pool.length ? out : [...pool];
}
