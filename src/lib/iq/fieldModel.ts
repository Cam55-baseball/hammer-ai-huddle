/**
 * Field Model — single source of truth for defender geometry.
 *
 * The IQ grid is 100×100. Home plate sits at (50, 95). All physical
 * distances (feet) are mapped into grid units via a per-sport scale
 * so the same "steps toward 2B" language means the right thing on a
 * 90 ft baseball field OR a 60 ft softball field.
 */

import type { IqActorRole } from "./types";

export type FieldSport = "baseball" | "softball";
export type Handedness = "R" | "L";

/** Real-world reference distances (feet). */
const SPORT: Record<FieldSport, { baseDist: number; moundDist: number; fenceRef: number; stepFt: number }> = {
  // baseball: 90 ft bases, 60'6" mound, ~330 ft fence, adult step ≈ 2.5 ft
  baseball: { baseDist: 90, moundDist: 60.5, fenceRef: 330, stepFt: 2.5 },
  // softball: 60 ft bases, 43 ft circle, ~220 ft fence, step scales down
  softball: { baseDist: 60, moundDist: 43, fenceRef: 220, stepFt: 2.0 },
};

export function stepsToFeet(sport: FieldSport, steps: number) {
  return steps * SPORT[sport].stepFt;
}
export function feetToSteps(sport: FieldSport, ft: number) {
  return ft / SPORT[sport].stepFt;
}

export interface Pt { x: number; y: number }

/** Home plate + base coords on the 100×100 grid, per sport. */
export function fieldPoints(sport: FieldSport) {
  const s = SPORT[sport];
  // Fit fenceRef vertically into ~85 grid units
  const gpf = 85 / s.fenceRef;
  const home: Pt = { x: 50, y: 95 };
  const diag = s.baseDist * Math.SQRT1_2 * gpf; // horizontal / vertical component of a base
  const first: Pt = { x: home.x + diag, y: home.y - diag };
  const third: Pt = { x: home.x - diag, y: home.y - diag };
  const second: Pt = { x: home.x, y: home.y - 2 * diag };
  const mound: Pt = { x: home.x, y: home.y - s.moundDist * gpf };
  return { home, first, second, third, mound, gpf, s };
}

/** Anchor grammar — the coach-legible way to say "where to stand". */
export type StepAnchor =
  // Corner infielders (1B, 3B): "N steps toward 2B, M steps back from bag".
  | { kind: "corner_bag"; bag: "1B" | "3B"; towardSecond: number; backFromBag: number }
  // Middle infielders (SS, 2B): "N feet between bags, M steps back from baseline".
  | { kind: "middle_bag"; fromBag: "1B" | "2B" | "3B"; towardBag: "1B" | "2B" | "3B"; feetFromFromBag: number; backSteps: number }
  // Outfielders: "N steps right/left of 2B (from batter's view), M steps back from home".
  | { kind: "outfield"; lateralStepsRightOfSecond: number; depthStepsFromHome: number }
  // Pitcher / Catcher — fixed by rules but expressed for completeness.
  | { kind: "mound" }
  | { kind: "plate" };

export interface DefensiveAnchors {
  P?: StepAnchor;   C?: StepAnchor;
  "1B"?: StepAnchor; "2B"?: StepAnchor; "3B"?: StepAnchor; SS?: StepAnchor;
  LF?: StepAnchor; CF?: StepAnchor; RF?: StepAnchor;
}
export type DefensivePositions = Partial<Record<IqActorRole, Pt>>;

/**
 * Convert a coach anchor into a grid position (0..100).
 * Handedness matters only for outfielders (lateral reference from 2B).
 */
export function anchorToPos(sport: FieldSport, anchor: StepAnchor, hand: Handedness): Pt {
  const f = fieldPoints(sport);
  const stepG = f.s.stepFt * f.gpf; // grid units per step

  switch (anchor.kind) {
    case "mound":  return { ...f.mound };
    case "plate":  return { x: f.home.x, y: f.home.y + 1.5 };
    case "corner_bag": {
      const bag = anchor.bag === "1B" ? f.first : f.third;
      // Direction "toward 2B" = unit vector bag → second.
      const t = unit(sub(f.second, bag));
      // "Back from bag" = perpendicular going away from home.
      const back = perpAwayFromHome(bag, f);
      const p = add(add(bag, scale(t, anchor.towardSecond * stepG)), scale(back, anchor.backFromBag * stepG));
      return clampPt(p);
    }
    case "middle_bag": {
      const from = pickBag(f, anchor.fromBag);
      const to   = pickBag(f, anchor.towardBag);
      const t = unit(sub(to, from));
      const line = add(from, scale(t, anchor.feetFromFromBag * f.gpf));
      const back = perpAwayFromHome(line, f);
      const p = add(line, scale(back, anchor.backSteps * stepG));
      return clampPt(p);
    }
    case "outfield": {
      // Base longitudinal axis = home → second, extended past 2B.
      const axis = unit(sub(f.second, f.home));
      const depthPt = add(f.home, scale(axis, anchor.depthStepsFromHome * stepG));
      // Lateral axis (perpendicular). Positive lateral = to batter's RIGHT (1B side).
      // On a top-down field where 1B is +x, that means +x for RHH view.
      // axis = home→2B = (0,-1); 90° CCW rotation gives (1,0) = +x = 1B side. ✓
      const lateral: Pt = { x: -axis.y, y: axis.x };
      // For LHH the sign flips (mirror lateral reference).
      const sign = hand === "R" ? 1 : -1;
      const p = add(depthPt, scale(lateral, anchor.lateralStepsRightOfSecond * stepG * sign));
      return clampPt(p);
    }
  }
}

/** Format a coach-readable label for a single anchor. */
export function describeAnchor(a: StepAnchor, hand: Handedness): string {
  switch (a.kind) {
    case "mound": return "On the rubber";
    case "plate": return "Behind the plate";
    case "corner_bag": {
      const bagName = a.bag === "1B" ? "1st base" : "3rd base";
      return `${a.towardSecond} steps toward 2B · ${a.backFromBag} steps back from ${bagName}`;
    }
    case "middle_bag": {
      const from = a.fromBag; const to = a.towardBag;
      return `${a.feetFromFromBag} ft from ${from} toward ${to} · ${a.backSteps} steps back`;
    }
    case "outfield": {
      const dir = a.lateralStepsRightOfSecond === 0
        ? "aligned with 2B"
        : `${Math.abs(a.lateralStepsRightOfSecond)} steps ${a.lateralStepsRightOfSecond > 0 ? "right" : "left"} of 2B (vs ${hand === "R" ? "RHH" : "LHH"})`;
      return `${dir} · ${a.depthStepsFromHome} steps back from home`;
    }
  }
}

/** Mirror an anchor for the opposite handedness (per your published rules). */
export function mirrorAnchor(a: StepAnchor): StepAnchor {
  if (a.kind === "outfield") {
    return { ...a, lateralStepsRightOfSecond: -a.lateralStepsRightOfSecond };
  }
  return a; // infielders don't shift between R/L unless the preset says so
}

/** Materialize a full set of positions for the given handedness. */
export function anchorsToPositions(
  sport: FieldSport,
  anchors: DefensiveAnchors,
  hand: Handedness,
): DefensivePositions {
  const out: DefensivePositions = {};
  (Object.keys(anchors) as (keyof DefensiveAnchors)[]).forEach((k) => {
    const a = anchors[k]; if (!a) return;
    out[k as IqActorRole] = anchorToPos(sport, a, hand);
  });
  return out;
}

// ------------- vector helpers -------------
function add(a: Pt, b: Pt): Pt { return { x: a.x + b.x, y: a.y + b.y }; }
function sub(a: Pt, b: Pt): Pt { return { x: a.x - b.x, y: a.y - b.y }; }
function scale(a: Pt, k: number): Pt { return { x: a.x * k, y: a.y * k }; }
function len(a: Pt) { return Math.hypot(a.x, a.y); }
function unit(a: Pt): Pt { const L = len(a) || 1; return { x: a.x / L, y: a.y / L }; }
function clampPt(p: Pt): Pt { return { x: clamp(p.x), y: clamp(p.y) }; }
function clamp(v: number, lo = 2, hi = 98) { return Math.max(lo, Math.min(hi, v)); }
function pickBag(f: ReturnType<typeof fieldPoints>, name: "1B" | "2B" | "3B"): Pt {
  return name === "1B" ? f.first : name === "3B" ? f.third : f.second;
}
/** Perpendicular to (bag→home) pointing away from home (i.e. toward the outfield). */
function perpAwayFromHome(from: Pt, f: ReturnType<typeof fieldPoints>): Pt {
  const toHome = unit(sub(f.home, from));
  return { x: -toHome.x, y: -toHome.y };
}
