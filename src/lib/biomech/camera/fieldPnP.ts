/**
 * Camera pose from field geometry. Pure geometry — no trained model, no licence.
 *
 * All reference points lie on the ground plane (z = 0), so the image↔ground map
 * is a homography. We solve it by normalised DLT, recover the focal length from
 * the orthogonality of the two ground axes (square pixels, principal point at
 * image centre), then decompose into rotation + translation. Camera position is
 * C = −Rᵀt, in inches, in a field frame with origin at the plate's front-edge
 * centre, +y toward the pitcher, +z up.
 *
 * Refuses (never guesses) when: fewer than 4 points, points near-collinear,
 * focal length unrecoverable (plane seen near face-on or edge-on), camera ends
 * up below ground, or reprojection error above tolerance.
 */

export const FIELD_PNP_VERSION = "field_pnp@1.0.0-planar-homography";

export interface P2 { x: number; y: number }
export interface P3 { x: number; y: number; z: number }

/** Home plate pentagon, inches. Order is the tap order shown to the user. */
export const PLATE_POINTS_IN: readonly P2[] = [
  { x: -8.5, y: 0 },   // front-left (pitcher side)
  { x: 8.5, y: 0 },    // front-right
  { x: 8.5, y: -8.5 }, // right shoulder
  { x: 0, y: -17 },    // back point (catcher side)
  { x: -8.5, y: -8.5 },// left shoulder
];

/** Rubber front-edge centre is 60'6" (baseball) / 43' (softball) from the plate point. */
export function rubberPointsIn(sport: "baseball" | "softball"): P2[] {
  const d = (sport === "baseball" ? 726 : 516) - 17; // from plate front edge
  return [{ x: -12, y: d }, { x: 12, y: d }, { x: 12, y: d + 6 }, { x: -12, y: d + 6 }];
}

/** Base fallback: home point, 1B, 2B, 3B (inches). */
export function basePointsIn(sport: "baseball" | "softball"): P2[] {
  const s = (sport === "baseball" ? 90 : 60) * 12, h = s * Math.SQRT1_2;
  return [{ x: 0, y: -17 }, { x: h, y: -17 + h }, { x: 0, y: -17 + 2 * h }, { x: -h, y: -17 + h }];
}

export type PnPResult =
  | { ok: true; version: string; focal_px: number; R: number[][]; t: number[];
      camera_in: P3; camera_height_ft: number; camera_distance_ft: number;
      reprojection_rms_px: number; n_points: number }
  | { ok: false; version: string; reason: "too_few_points" | "degenerate_points" | "focal_unrecoverable" | "camera_below_ground" | "reprojection_too_high"; detail: string };

const refuse = (reason: Extract<PnPResult, { ok: false }>["reason"], detail: string): PnPResult =>
  ({ ok: false, version: FIELD_PNP_VERSION, reason, detail });

function normaliser(pts: P2[]) {
  const n = pts.length, mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
  const md = pts.reduce((s, p) => s + Math.hypot(p.x - mx, p.y - my), 0) / n || 1;
  const k = Math.SQRT2 / md;
  return { T: [[k, 0, -k * mx], [0, k, -k * my], [0, 0, 1]], apply: (p: P2) => ({ x: k * (p.x - mx), y: k * (p.y - my) }) };
}

function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}

const mul = (A: number[][], B: number[][]) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
function inv3(m: number[][]): number[][] {
  const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [[A, -(b * i - c * h), b * f - c * e], [B, a * i - c * g, -(a * f - c * d)], [C, -(a * h - b * g), a * e - b * d]].map((r) => r.map((v) => v / det));
}

/** Homography H with image ~ H · [X, Y, 1]. Least squares over all points (h33 = 1). */
export function homography(world: P2[], image: P2[]): number[][] | null {
  const nw = normaliser(world), ni = normaliser(image);
  const A: number[][] = [], b: number[] = [];
  world.forEach((w0, i) => {
    const w = nw.apply(w0), u = ni.apply(image[i]);
    A.push([w.x, w.y, 1, 0, 0, 0, -u.x * w.x, -u.x * w.y]); b.push(u.x);
    A.push([0, 0, 0, w.x, w.y, 1, -u.y * w.x, -u.y * w.y]); b.push(u.y);
  });
  const AtA = Array.from({ length: 8 }, (_, i) => Array.from({ length: 8 }, (_, j) => A.reduce((s, r) => s + r[i] * r[j], 0)));
  const Atb = Array.from({ length: 8 }, (_, i) => A.reduce((s, r, k) => s + r[i] * b[k], 0));
  const h = solve(AtA, Atb); if (!h) return null;
  const Hn = [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
  const H = mul(mul(inv3(ni.T), Hn), nw.T);
  return H.map((r) => r.map((v) => v / H[2][2]));
}

function collinear(pts: P2[]): boolean {
  let best = 0;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) for (let k = j + 1; k < pts.length; k++) {
    const a = pts[i], b = pts[j], c = pts[k];
    best = Math.max(best, Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)));
  }
  const span = Math.max(...pts.map((p) => Math.hypot(p.x - pts[0].x, p.y - pts[0].y)));
  return best < 0.01 * span * span;
}

export interface PnPOptions { imageWidth: number; imageHeight: number; maxRmsPx?: number; focalPx?: number }

export function solveFieldCamera(world: P2[], image: P2[], o: PnPOptions): PnPResult {
  if (world.length < 4 || world.length !== image.length) return refuse("too_few_points", `n=${image.length}`);
  if (collinear(image) || collinear(world)) return refuse("degenerate_points", "points nearly on one line");
  const cx = o.imageWidth / 2, cy = o.imageHeight / 2;
  const H0 = homography(world, image); if (!H0) return refuse("degenerate_points", "homography singular");
  // Centre the principal point.
  const H = [[H0[0][0] - cx * H0[2][0], H0[0][1] - cx * H0[2][1], H0[0][2] - cx * H0[2][2]],
             [H0[1][0] - cy * H0[2][0], H0[1][1] - cy * H0[2][1], H0[1][2] - cy * H0[2][2]], H0[2]];
  let f = o.focalPx ?? NaN;
  if (!(f > 0)) {
    const num = -(H[0][0] * H[0][1] + H[1][0] * H[1][1]), den = H[2][0] * H[2][1];
    const f2a = Math.abs(den) > 1e-12 ? num / den : NaN;
    const num2 = (H[0][0] ** 2 + H[1][0] ** 2) - (H[0][1] ** 2 + H[1][1] ** 2), den2 = H[2][1] ** 2 - H[2][0] ** 2;
    const f2b = Math.abs(den2) > 1e-12 ? num2 / den2 : NaN;
    const cands = [f2a, f2b].filter((v) => Number.isFinite(v) && v > 0);
    if (!cands.length) return refuse("focal_unrecoverable", "ground plane seen too face-on or edge-on to recover focal length; tap the rubber too or supply device focal");
    f = Math.sqrt(cands.reduce((s, v) => s + v, 0) / cands.length);
    if (!(f > 0.2 * o.imageWidth && f < 10 * o.imageWidth)) return refuse("focal_unrecoverable", `implausible focal ${f.toFixed(0)}px`);
  }
  const col = (j: number) => [H[0][j] / f, H[1][j] / f, H[2][j]];
  let r1 = col(0), r2 = col(1), t = col(2);
  const lam = 2 / (Math.hypot(...r1) + Math.hypot(...r2));
  r1 = r1.map((v) => v * lam); r2 = r2.map((v) => v * lam); t = t.map((v) => v * lam);
  if (t[2] < 0) { r1 = r1.map((v) => -v); r2 = r2.map((v) => -v); t = t.map((v) => -v); }
  // Orthonormalise (Gram–Schmidt, symmetric split).
  const n1 = Math.hypot(...r1); r1 = r1.map((v) => v / n1);
  const d = r1.reduce((s, v, i) => s + v * r2[i], 0); r2 = r2.map((v, i) => v - d * r1[i]);
  const n2 = Math.hypot(...r2); r2 = r2.map((v) => v / n2);
  const r3 = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
  const R = [[r1[0], r2[0], r3[0]], [r1[1], r2[1], r3[1]], [r1[2], r2[2], r3[2]]];
  const C = [0, 1, 2].map((i) => -(R[0][i] * t[0] + R[1][i] * t[1] + R[2][i] * t[2]));
  // Ground frame has +z up; image y points down so the solved camera may sit at −z. Fold to +z.
  const camZ = Math.abs(C[2]);
  if (camZ < 1) return refuse("camera_below_ground", `camera height ${camZ.toFixed(1)}in`);
  let se = 0;
  world.forEach((w, i) => {
    const X = [R[0][0] * w.x + R[0][1] * w.y + t[0], R[1][0] * w.x + R[1][1] * w.y + t[1], R[2][0] * w.x + R[2][1] * w.y + t[2]];
    const u = f * X[0] / X[2] + cx, v = f * X[1] / X[2] + cy;
    se += (u - image[i].x) ** 2 + (v - image[i].y) ** 2;
  });
  const rms = Math.sqrt(se / world.length);
  const maxRms = o.maxRmsPx ?? 3;
  if (rms > maxRms) return refuse("reprojection_too_high", `rms ${rms.toFixed(2)}px > ${maxRms}px — taps or detections disagree with the known shape`);
  return { ok: true, version: FIELD_PNP_VERSION, focal_px: f, R, t, camera_in: { x: C[0], y: C[1], z: camZ },
    camera_height_ft: camZ / 12, camera_distance_ft: Math.hypot(C[0], C[1]) / 12, reprojection_rms_px: rms, n_points: world.length };
}

/** Synthetic projector used by tests and accuracy sweeps. */
export function projectGround(world: P2[], cam: P3, target: P3, focalPx: number, w: number, h: number): P2[] {
  const fwd = [target.x - cam.x, target.y - cam.y, target.z - cam.z], nf = Math.hypot(...fwd); const z = fwd.map((v) => v / nf);
  const up = [0, 0, 1]; let x = [z[1] * up[2] - z[2] * up[1], z[2] * up[0] - z[0] * up[2], z[0] * up[1] - z[1] * up[0]];
  const nx = Math.hypot(...x); x = x.map((v) => v / nx);
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return world.map((p) => {
    const d = [p.x - cam.x, p.y - cam.y, -cam.z];
    const Xc = d[0] * x[0] + d[1] * x[1] + d[2] * x[2], Yc = d[0] * y[0] + d[1] * y[1] + d[2] * y[2], Zc = d[0] * z[0] + d[1] * z[1] + d[2] * z[2];
    return { x: focalPx * Xc / Zc + w / 2, y: focalPx * Yc / Zc + h / 2 };
  });
}
