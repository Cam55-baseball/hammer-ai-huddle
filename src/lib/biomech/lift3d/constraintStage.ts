/**
 * Constraint correction stage for ANY 3-D skeleton estimate (MediaPipe world
 * landmarks today, a lifting model later). Model-agnostic, deterministic.
 *
 *  1. Scale     — athlete height (profile) sets absolute scale from the
 *                 Stance Lock pose (head-top ≈ nose + 10 % of nose→ankle).
 *  2. Bones     — each segment's length = median over the Stance Lock window.
 *                 Every frame, the child joint is moved along the parent→child
 *                 direction to that length (direction kept, length fixed).
 *  3. Ground    — floor height = lowest foot point in the stance window. A foot
 *                 below the floor lifts the whole frame; nothing floats down.
 *
 * A frame whose correction exceeds CORRECTION_LIMIT of stature is NOT repaired
 * into a plausible shape — it is marked invalid (missing). Correcting a badly
 * wrong estimate would manufacture a value.
 */
export const CONSTRAINT_STAGE_VERSION = "constraint_stage@1.0.0";
export const CORRECTION_LIMIT = 0.08; // fraction of stature a single joint may be moved

export interface V3 { x: number; y: number; z: number }
/** One frame: 33 MediaPipe joints, metres, +y UP. null = joint missing. */
export type Frame3D = (V3 | null)[];

// Parent→child tree rooted at mid-hip (hips handled as root pair).
export const BONES: readonly [number, number][] = [
  [23, 25], [25, 27], [27, 29], [27, 31], [24, 26], [26, 28], [28, 30], [28, 32],
  [23, 11], [24, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 0], [12, 0],
];
const FOOT = [27, 28, 29, 30, 31, 32];

const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (a: V3) => Math.hypot(a.x, a.y, a.z);
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export interface ConstraintInput { frames: Frame3D[]; stance: { start: number; end: number }; athleteHeightM: number | null }
export interface ConstraintOutput {
  version: string;
  ok: boolean;
  reason?: "no_stance_pose" | "no_height";
  scale: number | null;
  bone_lengths_m: Record<string, number>;
  floor_y: number | null;
  frames: (Frame3D | null)[];
  per_frame_max_correction: (number | null)[];
  invalid_frames: number;
}

export function applyConstraints(inp: ConstraintInput): ConstraintOutput {
  const empty = (reason: ConstraintOutput["reason"]): ConstraintOutput =>
    ({ version: CONSTRAINT_STAGE_VERSION, ok: false, reason, scale: null, bone_lengths_m: {}, floor_y: null, frames: inp.frames.map(() => null), per_frame_max_correction: inp.frames.map(() => null), invalid_frames: inp.frames.length });
  if (!(inp.athleteHeightM && inp.athleteHeightM > 1)) return empty("no_height");
  const win = inp.frames.slice(Math.max(0, inp.stance.start), Math.min(inp.frames.length, inp.stance.end + 1));
  const stat: number[] = [];
  for (const f of win) {
    const n = f[0], a = f[27] && f[28] ? (f[27].y < f[28].y ? f[27] : f[28]) : f[27] ?? f[28];
    if (n && a) stat.push((n.y - a.y) * 1.1);
  }
  if (stat.length < 3) return empty("no_stance_pose");
  const scale = inp.athleteHeightM / median(stat);
  const scaled = inp.frames.map((f) => f.map((p) => (p ? { x: p.x * scale, y: p.y * scale, z: p.z * scale } : null)));
  const sWin = scaled.slice(Math.max(0, inp.stance.start), Math.min(scaled.length, inp.stance.end + 1));
  const L: Record<string, number> = {};
  for (const [a, b] of BONES) {
    const v = sWin.map((f) => (f[a] && f[b] ? len(sub(f[b]!, f[a]!)) : NaN)).filter(Number.isFinite);
    if (v.length >= 3) L[`${a}-${b}`] = median(v);
  }
  const feet = sWin.flatMap((f) => FOOT.map((i) => f[i]?.y).filter((y): y is number => y != null));
  const floor = feet.length ? Math.min(...feet) : null;
  const limit = CORRECTION_LIMIT * inp.athleteHeightM;
  let invalid = 0;
  const maxCorr: (number | null)[] = [];
  const out = scaled.map((f) => {
    const g = f.map((p) => (p ? { ...p } : null));
    let worst = 0;
    for (const [a, b] of BONES) {
      const Lab = L[`${a}-${b}`], pa = g[a], pb = g[b];
      if (!Lab || !pa || !pb) continue;
      const d = sub(pb, pa), n = len(d); if (!(n > 0)) continue;
      const np = { x: pa.x + (d.x / n) * Lab, y: pa.y + (d.y / n) * Lab, z: pa.z + (d.z / n) * Lab };
      worst = Math.max(worst, len(sub(np, pb)));
      g[b] = np;
    }
    if (floor != null) {
      const ys = FOOT.map((i) => g[i]?.y).filter((y): y is number => y != null);
      const pen = ys.length ? floor - Math.min(...ys) : 0;
      if (pen > 0) { worst = Math.max(worst, pen); for (const p of g) if (p) p.y += pen; }
    }
    if (worst > limit) { invalid++; maxCorr.push(worst); return null; }
    maxCorr.push(worst);
    return g;
  });
  return { version: CONSTRAINT_STAGE_VERSION, ok: true, scale, bone_lengths_m: L, floor_y: floor, frames: out, per_frame_max_correction: maxCorr, invalid_frames: invalid };
}
