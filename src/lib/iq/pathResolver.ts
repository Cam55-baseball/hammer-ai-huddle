/**
 * IQ Path Resolver
 * ================
 * Guarantees that every drawn route ORIGINATES from the defender's actual
 * resolved set position and TERMINATES at meaningful field landmarks
 * (bags, cutoff spots, teammates, deltas) even when alignment changes
 * (shift, DP depth, no-doubles, corners-in, wheel, etc.).
 *
 * Back-compat: existing scenarios stored absolute {x,y} waypoints on top
 * of the DEFAULT alignment. We compute the delta between the resolved
 * position and the historical default and apply it to every absolute
 * waypoint on that role's path — so lines "come along" with the defender
 * automatically without hand-editing published content.
 *
 * New content can use target/relative segments:
 *   { target: "1B" | "2B" | "3B" | "H" | "P" | "mound" }
 *   { targetRole: "SS" }           // point at another defender's resolved pos
 *   { dx, dy }                      // offset from previous waypoint
 */
import type { IqActorRole, IqPathPoint } from "./types";
import type { AlignmentPositions } from "@/hooks/useDefensiveAlignment";

/** Historical default (matches DEFENSIVE_FALLBACK) used to compute delta shift. */
export const DEFAULT_DEFENDER_POS: Record<IqActorRole, { x: number; y: number }> = {
  P:  { x: 50, y: 68 },
  C:  { x: 50, y: 94 },
  "1B": { x: 72, y: 66 },
  "2B": { x: 60, y: 52 },
  SS:   { x: 40, y: 52 },
  "3B": { x: 28, y: 66 },
  LF:   { x: 22, y: 22 },
  CF:   { x: 50, y: 10 },
  RF:   { x: 78, y: 22 },
  // Offensive roles — fixed by rules; no delta shift.
  R1: { x: 76, y: 70 },
  R2: { x: 50, y: 40 },
  R3: { x: 24, y: 70 },
  BR: { x: 50, y: 96 },
  BAT: { x: 50, y: 96 },
};

/** Base/landmark coordinates on the 100×100 grid. */
export const LANDMARKS = {
  "1B": { x: 76, y: 70 },
  "2B": { x: 50, y: 40 },
  "3B": { x: 24, y: 70 },
  H:    { x: 50, y: 94 },
  P:    { x: 50, y: 68 },
  mound:{ x: 50, y: 68 },
  cutoff_1B: { x: 60, y: 60 }, // relay from RF
  cutoff_3B: { x: 40, y: 60 }, // relay from LF
  cutoff_2B: { x: 50, y: 55 }, // relay from CF
} as const;

export type TargetWaypoint =
  | { target: keyof typeof LANDMARKS }
  | { targetRole: IqActorRole }
  | { dx: number; dy: number }
  | IqPathPoint;

const clamp = (v: number, lo = 2, hi = 98) => Math.max(lo, Math.min(hi, v));

/**
 * Resolve a single role's path into concrete grid points that all start at
 * `resolvedStart` (the defender's actual set position under the active
 * alignment preset + handedness).
 */
export function resolveRolePath(
  role: IqActorRole,
  resolvedStart: { x: number; y: number },
  waypoints: readonly (IqPathPoint | TargetWaypoint)[],
  ctx: {
    positions: Partial<Record<IqActorRole, { x: number; y: number }>>;
  },
): { x: number; y: number }[] {
  const defaultStart = DEFAULT_DEFENDER_POS[role] ?? resolvedStart;
  const deltaX = resolvedStart.x - defaultStart.x;
  const deltaY = resolvedStart.y - defaultStart.y;

  const out: { x: number; y: number }[] = [resolvedStart];
  let prev = resolvedStart;

  for (const w of waypoints) {
    let p: { x: number; y: number };
    if ("target" in w && typeof w.target === "string") {
      p = LANDMARKS[w.target];
    } else if ("targetRole" in w && w.targetRole) {
      p = ctx.positions[w.targetRole] ?? DEFAULT_DEFENDER_POS[w.targetRole] ?? prev;
    } else if ("dx" in w && "dy" in w) {
      p = { x: prev.x + w.dx, y: prev.y + w.dy };
    } else if ("x" in w && "y" in w) {
      // Absolute waypoint authored against the DEFAULT preset — shift with the defender.
      p = { x: w.x + deltaX, y: w.y + deltaY };
    } else {
      continue;
    }
    p = { x: clamp(p.x), y: clamp(p.y) };
    out.push(p);
    prev = p;
  }
  return out;
}

/** Build an SVG path `d` string from resolved points. */
export function pointsToPathD(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

/** Compute all resolved positions for defenders using the resolved alignment. */
export function buildResolvedDefenderMap(
  positions: AlignmentPositions,
): Partial<Record<IqActorRole, { x: number; y: number }>> {
  const out: Partial<Record<IqActorRole, { x: number; y: number }>> = {};
  (Object.keys(positions) as IqActorRole[]).forEach((k) => {
    const p = positions[k];
    if (p) out[k] = p;
  });
  return out;
}
