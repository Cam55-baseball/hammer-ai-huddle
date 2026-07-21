/**
 * Play Generator
 * ==============
 * Rules engine that produces defender routes + a ball track for any Game IQ
 * situation whose authored content is empty. Keeps every path anchored to
 * landmarks / other defenders (via pathResolver) so alignment shifts, batter
 * handedness, and DP depth still warp routes correctly.
 *
 * Runtime usage: `synthesizePlay(situation, actors, resolvedPositions, ctx)`
 * returns `{ actorPaths, actorWindows, ball }`. `buildTimeline` in
 * playTimeline.ts calls this whenever an actor has `primary_path.length === 0`
 * and/or the scenario has no `ball_track`.
 */
import type { IqActor, IqActorRole } from "./types";
import type { TargetWaypoint } from "./pathResolver";
import { LANDMARKS, DEFAULT_DEFENDER_POS } from "./pathResolver";
import type { BallTrackPoint } from "./playTimeline";

export type Archetype =
  | "drag_bunt_1b"
  | "drag_bunt_3b"
  | "sac_bunt"
  | "push_bunt"
  | "squeeze"
  | "slash_bunt"
  | "pop_bunt"
  | "wheel"
  | "pickoff_1b"
  | "pickoff_2b"
  | "first_and_third"
  | "steal_2b"
  | "steal_3b"
  | "wild_pitch"
  | "comebacker"
  | "grounder_ss"
  | "grounder_2b"
  | "grounder_3b"
  | "grounder_1b"
  | "slow_roller_3b"
  | "fly_lf" | "fly_cf" | "fly_rf"
  | "gap_lc" | "gap_rc"
  | "line_drive"
  | "relay"
  | "mound_visit"
  | "generic";

export interface GeneratedPlay {
  actorPaths: Partial<Record<IqActorRole, TargetWaypoint[]>>;
  actorWindows: Partial<Record<IqActorRole, { startAt: number; endAt: number }>>;
  ball: BallTrackPoint[];
  archetype: Archetype;
}

const H = LANDMARKS.H;
const P = LANDMARKS.P;
const B1 = LANDMARKS["1B"];
const B2 = LANDMARKS["2B"];
const B3 = LANDMARKS["3B"];

const win = (s: number, e: number) => ({ startAt: s, endAt: e });

// -------- classifier ----------
export function classify(slug: string, title: string): Archetype {
  const s = (slug + " " + title).toLowerCase();
  if (/wheel/.test(s)) return "wheel";
  if (/squeeze/.test(s)) return "squeeze";
  if (/slash/.test(s)) return "slash_bunt";
  if (/pop.?up.?bunt|bunt.?pop|foul.?pop/.test(s)) return "pop_bunt";
  if (/push.?bunt|push.?past/.test(s)) return "push_bunt";
  if (/drag.?bunt/.test(s)) {
    if (/lhh/.test(s) || /3b/.test(s)) return "drag_bunt_3b";
    return "drag_bunt_1b";
  }
  if (/bunt/.test(s)) return "sac_bunt";

  if (/pickoff.*1b|pickoff.*first/.test(s)) return "pickoff_1b";
  if (/pickoff.*2b|pickoff.*second/.test(s)) return "pickoff_2b";
  if (/1st.?&.?3rd|first.?and.?third|first.*third/.test(s)) return "first_and_third";
  if (/steal.*3rd|steal.*third/.test(s)) return "steal_3b";
  if (/steal/.test(s)) return "steal_2b";
  if (/wild.?pitch|passed.?ball/.test(s)) return "wild_pitch";
  if (/comebacker|back.?to.?the.?box/.test(s)) return "comebacker";
  if (/slow.?roller.*3b|slow.?roller.*third/.test(s)) return "slow_roller_3b";
  if (/gap|in.?the.?gap/.test(s)) return /right/.test(s) ? "gap_rc" : "gap_lc";
  if (/fly.*lf|fly.*left/.test(s)) return "fly_lf";
  if (/fly.*rf|fly.*right/.test(s)) return "fly_rf";
  if (/fly|pop.?fly|can.?of.?corn/.test(s)) return "fly_cf";
  if (/relay/.test(s)) return "relay";
  if (/line.?drive/.test(s)) return "line_drive";
  if (/mound.?visit|pre.?pitch/.test(s)) return "mound_visit";
  return "generic";
}

// -------- geometry helpers --------
const mid = (a: { x: number; y: number }, b: { x: number; y: number }, k = 0.5) =>
  ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

const bunt1BContact = { x: B1.x - 20, y: B1.y + 10 }; // rolling up 1B line
const bunt3BContact = { x: B3.x + 20, y: B3.y + 10 };
const buntFrontMound = { x: P.x, y: P.y + 8 };

// -------- archetype builders --------
function buildDragBunt1B(hasRunners: boolean): GeneratedPlay {
  const contact = bunt1BContact;
  return {
    archetype: "drag_bunt_1b",
    actorPaths: {
      P:   [{ x: contact.x + 2, y: contact.y - 2 }, { target: "1B" }],
      "1B":[{ x: contact.x, y: contact.y }, { target: "1B" }],
      "2B":[{ target: "1B" }],
      SS:  [{ target: "2B" }],
      "3B":[{ dx: 0, dy: 6 }],
      C:   [{ x: contact.x + 4, y: contact.y + 2 }, { target: "1B" }],
      LF:  [{ dx: 6, dy: 20 }],
      CF:  [{ dx: 0, dy: 25 }],
      RF:  [{ target: "1B" }],
      BR:  [{ target: "1B" }],
      ...(hasRunners ? { R1: [{ target: "2B" }] } : {}),
    },
    actorWindows: {
      P:   win(0.20, 0.55),
      "1B":win(0.18, 0.55),
      C:   win(0.22, 0.60),
      "2B":win(0.25, 0.70),
      SS:  win(0.25, 0.65),
      "3B":win(0.15, 0.35),
      LF:  win(0.30, 0.85),
      CF:  win(0.30, 0.85),
      RF:  win(0.25, 0.75),
      BR:  win(0.20, 0.90),
      R1:  win(0.22, 0.85),
    },
    ball: [
      { x: P.x, y: P.y + 2, t: 0.02, kind: "pitch" },
      { x: H.x, y: H.y - 2, t: 0.18, kind: "pitch" },
      { x: contact.x, y: contact.y, t: 0.40, kind: "batted" },
      { x: B1.x, y: B1.y, t: 0.75, kind: "thrown" },
    ],
  };
}

function buildDragBunt3B(hasRunners: boolean): GeneratedPlay {
  const contact = bunt3BContact;
  return {
    archetype: "drag_bunt_3b",
    actorPaths: {
      P:   [{ x: contact.x - 2, y: contact.y - 2 }, { target: "1B" }],
      "3B":[{ x: contact.x, y: contact.y }, { target: "1B" }],
      SS:  [{ target: "3B" }],
      "2B":[{ target: "1B" }],
      "1B":[{ dx: -4, dy: 6 }, { target: "1B" }],
      C:   [{ x: contact.x - 4, y: contact.y + 2 }],
      LF:  [{ target: "3B" }],
      CF:  [{ dx: 0, dy: 25 }],
      RF:  [{ dx: -6, dy: 20 }],
      BR:  [{ target: "1B" }],
      ...(hasRunners ? { R1: [{ target: "2B" }] } : {}),
    },
    actorWindows: {
      P:   win(0.20, 0.55),
      "3B":win(0.18, 0.60),
      C:   win(0.22, 0.55),
      SS:  win(0.25, 0.70),
      "2B":win(0.25, 0.65),
      "1B":win(0.25, 0.70),
      LF:  win(0.30, 0.85),
      CF:  win(0.30, 0.85),
      RF:  win(0.30, 0.85),
      BR:  win(0.20, 0.90),
      R1:  win(0.22, 0.85),
    },
    ball: [
      { x: P.x, y: P.y + 2, t: 0.02, kind: "pitch" },
      { x: H.x, y: H.y - 2, t: 0.18, kind: "pitch" },
      { x: contact.x, y: contact.y, t: 0.40, kind: "batted" },
      { x: B1.x, y: B1.y, t: 0.78, kind: "thrown" },
    ],
  };
}

function buildSacBunt(hasR1: boolean, hasR2: boolean): GeneratedPlay {
  const contact = buntFrontMound;
  const throwTarget: TargetWaypoint = hasR2 ? { target: "3B" } : { target: "1B" };
  return {
    archetype: "sac_bunt",
    actorPaths: {
      P:   [{ x: contact.x, y: contact.y }, throwTarget],
      "1B":[{ x: contact.x + 8, y: contact.y + 4 }, { target: "1B" }],
      "3B":[{ x: contact.x - 8, y: contact.y + 4 }],
      SS:  [{ target: hasR2 ? "3B" : "2B" }],
      "2B":[{ target: "1B" }],
      C:   [{ x: contact.x, y: contact.y + 6 }],
      LF:  [{ target: "3B" }],
      CF:  [{ target: "2B" }],
      RF:  [{ target: "1B" }],
      BR:  [{ target: "1B" }],
      ...(hasR1 ? { R1: [{ target: "2B" }] } : {}),
      ...(hasR2 ? { R2: [{ target: "3B" }] } : {}),
    },
    actorWindows: {
      P: win(0.20, 0.55), "1B": win(0.18, 0.55), "3B": win(0.18, 0.55),
      SS: win(0.22, 0.65), "2B": win(0.22, 0.65), C: win(0.22, 0.55),
      LF: win(0.30, 0.85), CF: win(0.30, 0.85), RF: win(0.30, 0.85),
      BR: win(0.20, 0.90), R1: win(0.22, 0.85), R2: win(0.22, 0.85),
    },
    ball: [
      { x: P.x, y: P.y + 2, t: 0.02, kind: "pitch" },
      { x: H.x, y: H.y - 2, t: 0.18, kind: "pitch" },
      { x: contact.x, y: contact.y, t: 0.42, kind: "batted" },
      hasR2
        ? { x: B3.x, y: B3.y, t: 0.78, kind: "thrown" }
        : { x: B1.x, y: B1.y, t: 0.78, kind: "thrown" },
    ],
  };
}

function buildPushBunt(): GeneratedPlay {
  const g = buildSacBunt(false, true);
  g.archetype = "push_bunt";
  // ball squirts through box toward 2B side
  g.ball = [
    { x: P.x, y: P.y + 2, t: 0.02, kind: "pitch" },
    { x: H.x, y: H.y - 2, t: 0.18, kind: "pitch" },
    { x: P.x + 6, y: P.y - 4, t: 0.42, kind: "batted" },
    { x: B1.x, y: B1.y, t: 0.78, kind: "thrown" },
  ];
  return g;
}

function buildSqueeze(): GeneratedPlay {
  const contact = { x: P.x - 4, y: P.y + 10 };
  return {
    archetype: "squeeze",
    actorPaths: {
      P:  [{ x: contact.x, y: contact.y }, { target: "H" }],
      C:  [{ x: contact.x, y: contact.y + 4 }, { target: "H" }],
      "1B": [{ x: contact.x + 6, y: contact.y + 2 }],
      "3B": [{ x: contact.x - 6, y: contact.y + 2 }],
      SS: [{ target: "3B" }],
      "2B": [{ target: "1B" }],
      LF: [{ dx: 4, dy: 20 }],
      CF: [{ dx: 0, dy: 25 }],
      RF: [{ dx: -4, dy: 20 }],
      BR: [{ target: "1B" }],
      R3: [{ target: "H" }],
    },
    actorWindows: {
      P: win(0.20, 0.55), C: win(0.22, 0.65),
      "1B": win(0.15, 0.50), "3B": win(0.15, 0.50),
      SS: win(0.20, 0.65), "2B": win(0.20, 0.65),
      LF: win(0.30, 0.85), CF: win(0.30, 0.85), RF: win(0.30, 0.85),
      BR: win(0.20, 0.90), R3: win(0.05, 0.75),
    },
    ball: [
      { x: P.x, y: P.y + 2, t: 0.02, kind: "pitch" },
      { x: H.x, y: H.y - 2, t: 0.18, kind: "pitch" },
      { x: contact.x, y: contact.y, t: 0.42, kind: "batted" },
      { x: H.x, y: H.y, t: 0.72, kind: "thrown" },
    ],
  };
}

function buildPopBunt(): GeneratedPlay {
  const contact = { x: H.x + 4, y: H.y - 10 };
  return {
    archetype: "pop_bunt",
    actorPaths: {
      C:  [{ x: contact.x, y: contact.y }],
      P:  [{ x: contact.x - 2, y: contact.y + 2 }],
      "1B": [{ x: contact.x + 6, y: contact.y - 2 }],
      "3B": [{ x: contact.x - 8, y: contact.y }],
      SS: [{ target: "3B" }],
      "2B": [{ target: "1B" }],
      LF: [{ target: "3B" }], CF: [{ target: "2B" }], RF: [{ target: "1B" }],
      BR: [{ target: "1B" }],
    },
    actorWindows: {
      C: win(0.20, 0.60), P: win(0.22, 0.60),
      "1B": win(0.20, 0.60), "3B": win(0.20, 0.60),
      SS: win(0.25, 0.70), "2B": win(0.25, 0.70),
      LF: win(0.30, 0.85), CF: win(0.30, 0.85), RF: win(0.30, 0.85),
      BR: win(0.20, 0.90),
    },
    ball: [
      { x: P.x, y: P.y + 2, t: 0.02, kind: "pitch" },
      { x: H.x, y: H.y - 2, t: 0.18, kind: "pitch" },
      { x: contact.x, y: contact.y - 6, t: 0.35, kind: "batted" },
      { x: contact.x, y: contact.y, t: 0.70, kind: "batted" },
    ],
  };
}

function buildComebacker(): GeneratedPlay {
  return {
    archetype: "comebacker",
    actorPaths: {
      P:  [{ x: P.x, y: P.y + 4 }, { target: "2B" }],
      SS: [{ target: "2B" }],
      "2B": [{ target: "1B" }],
      "1B": [{ target: "1B" }],
      "3B": [{ dx: 0, dy: 4 }],
      C:  [{ dx: 0, dy: -2 }],
      LF: [{ dx: 0, dy: 25 }], CF: [{ dx: 0, dy: 25 }], RF: [{ dx: 0, dy: 25 }],
      BR: [{ target: "1B" }],
      R1: [{ target: "2B" }],
    },
    actorWindows: {
      P: win(0.18, 0.55), SS: win(0.22, 0.55), "2B": win(0.25, 0.70),
      "1B": win(0.20, 0.75), "3B": win(0.20, 0.45), C: win(0.20, 0.45),
      LF: win(0.30, 0.90), CF: win(0.30, 0.90), RF: win(0.30, 0.90),
      BR: win(0.20, 0.90), R1: win(0.22, 0.75),
    },
    ball: [
      { x: P.x, y: P.y + 2, t: 0.02, kind: "pitch" },
      { x: H.x, y: H.y - 2, t: 0.18, kind: "pitch" },
      { x: P.x, y: P.y + 4, t: 0.36, kind: "batted" },
      { x: B2.x, y: B2.y, t: 0.62, kind: "thrown" },
      { x: B1.x, y: B1.y, t: 0.90, kind: "thrown" },
    ],
  };
}

function buildFly(zone: "L" | "C" | "R"): GeneratedPlay {
  const landing = zone === "L"
    ? { x: 22, y: 22 } : zone === "R" ? { x: 78, y: 22 } : { x: 50, y: 14 };
  const primary: IqActorRole = zone === "L" ? "LF" : zone === "R" ? "RF" : "CF";
  const backup: IqActorRole = zone === "C" ? "LF" : "CF";
  return {
    archetype: zone === "L" ? "fly_lf" : zone === "R" ? "fly_rf" : "fly_cf",
    actorPaths: {
      [primary]: [{ x: landing.x, y: landing.y }],
      [backup]: [{ x: landing.x + (zone === "R" ? -6 : 6), y: landing.y - 4 }],
      SS: [{ target: "2B" }],
      "2B": [{ target: "2B" }],
      "1B": [{ target: "1B" }],
      "3B": [{ target: "3B" }],
      P: [{ x: P.x, y: P.y - 2 }],
      C: [{ x: H.x, y: H.y }],
      BR: [{ target: "1B" }],
    } as Partial<Record<IqActorRole, TargetWaypoint[]>>,
    actorWindows: {
      [primary]: win(0.22, 0.75),
      [backup]:  win(0.25, 0.78),
      SS: win(0.20, 0.55), "2B": win(0.20, 0.55),
      "1B": win(0.20, 0.55), "3B": win(0.20, 0.55),
      P: win(0.18, 0.40), C: win(0.18, 0.40),
      BR: win(0.20, 0.75),
    } as Partial<Record<IqActorRole, { startAt: number; endAt: number }>>,
    ball: [
      { x: P.x, y: P.y + 2, t: 0.02, kind: "pitch" },
      { x: H.x, y: H.y - 2, t: 0.18, kind: "pitch" },
      { x: (H.x + landing.x) / 2, y: (H.y + landing.y) / 2 - 8, t: 0.45, kind: "batted" },
      { x: landing.x, y: landing.y, t: 0.75, kind: "batted" },
    ],
  };
}

function buildGap(side: "L" | "R"): GeneratedPlay {
  const landing = side === "L" ? { x: 32, y: 16 } : { x: 68, y: 16 };
  const cutoff = side === "L" ? { target: "cutoff_3B" as const } : { target: "cutoff_1B" as const };
  return {
    archetype: side === "L" ? "gap_lc" : "gap_rc",
    actorPaths: {
      LF: side === "L" ? [{ x: landing.x, y: landing.y }, cutoff] : [{ dx: 8, dy: 8 }],
      CF: [{ x: landing.x, y: landing.y + 4 }],
      RF: side === "R" ? [{ x: landing.x, y: landing.y }, cutoff] : [{ dx: -8, dy: 8 }],
      SS: side === "L" ? [cutoff] : [{ target: "2B" }],
      "2B": side === "R" ? [cutoff] : [{ target: "2B" }],
      "1B": [{ target: "1B" }],
      "3B": [{ target: "3B" }],
      P: [{ x: H.x, y: H.y - 6 }],
      C: [{ x: H.x, y: H.y }],
      BR: [{ target: "2B" }],
    },
    actorWindows: {
      LF: win(0.20, 0.75), CF: win(0.22, 0.75), RF: win(0.20, 0.75),
      SS: win(0.25, 0.75), "2B": win(0.25, 0.75),
      "1B": win(0.20, 0.55), "3B": win(0.20, 0.55),
      P: win(0.25, 0.70), C: win(0.20, 0.50),
      BR: win(0.20, 0.95),
    },
    ball: [
      { x: P.x, y: P.y + 2, t: 0.02, kind: "pitch" },
      { x: H.x, y: H.y - 2, t: 0.18, kind: "pitch" },
      { x: (H.x + landing.x) / 2, y: (H.y + landing.y) / 2, t: 0.45, kind: "batted" },
      { x: landing.x, y: landing.y, t: 0.65, kind: "batted" },
      { x: (side === "L" ? LANDMARKS.cutoff_3B : LANDMARKS.cutoff_1B).x,
        y: (side === "L" ? LANDMARKS.cutoff_3B : LANDMARKS.cutoff_1B).y, t: 0.85, kind: "thrown" },
    ],
  };
}

function buildSteal(base: "2B" | "3B"): GeneratedPlay {
  const receiver: IqActorRole = base === "2B" ? "2B" : "3B";
  const runner: IqActorRole = base === "2B" ? "R1" : "R2";
  return {
    archetype: base === "2B" ? "steal_2b" : "steal_3b",
    actorPaths: {
      C: [{ target: base }],
      [receiver]: [{ target: base }],
      SS: base === "2B" ? [{ target: "2B" }] : [{ dx: 0, dy: 0 }],
      P: [{ x: P.x, y: P.y - 3 }],
      "1B": [{ target: "1B" }],
      "3B": base === "3B" ? [{ target: "3B" }] : [{ dx: 0, dy: 0 }],
      "2B": base === "2B" ? [{ target: "2B" }] : [{ dx: 0, dy: 0 }],
      LF: base === "3B" ? [{ target: "3B" }] : [{ dx: 0, dy: 6 }],
      CF: [{ target: base }],
      RF: base === "2B" ? [{ target: "2B" }] : [{ dx: 0, dy: 6 }],
      [runner]: [{ target: base }],
    } as Partial<Record<IqActorRole, TargetWaypoint[]>>,
    actorWindows: {
      C: win(0.20, 0.55), [receiver]: win(0.15, 0.55),
      SS: win(0.15, 0.55), P: win(0.10, 0.30),
      "1B": win(0.10, 0.35), "3B": win(0.10, 0.35), "2B": win(0.10, 0.35),
      LF: win(0.25, 0.75), CF: win(0.25, 0.75), RF: win(0.25, 0.75),
      [runner]: win(0.05, 0.75),
    } as Partial<Record<IqActorRole, { startAt: number; endAt: number }>>,
    ball: [
      { x: P.x, y: P.y + 2, t: 0.02, kind: "pitch" },
      { x: H.x, y: H.y - 2, t: 0.20, kind: "pitch" },
      { x: (base === "2B" ? B2.x : B3.x), y: (base === "2B" ? B2.y : B3.y), t: 0.55, kind: "thrown" },
    ],
  };
}

function buildPickoff(base: "1B" | "2B"): GeneratedPlay {
  const receiver: IqActorRole = base === "1B" ? "1B" : "SS";
  const runner: IqActorRole = base === "1B" ? "R1" : "R2";
  return {
    archetype: base === "1B" ? "pickoff_1b" : "pickoff_2b",
    actorPaths: {
      P: [{ target: base }],
      [receiver]: [{ target: base }],
      C: [{ x: H.x, y: H.y }],
      [runner]: [{ target: base }],
    } as Partial<Record<IqActorRole, TargetWaypoint[]>>,
    actorWindows: {
      P: win(0.10, 0.45), [receiver]: win(0.10, 0.45),
      C: win(0.05, 0.20), [runner]: win(0.05, 0.55),
    } as Partial<Record<IqActorRole, { startAt: number; endAt: number }>>,
    ball: [
      { x: P.x, y: P.y, t: 0.02, kind: "pitch" },
      { x: base === "1B" ? B1.x : B2.x, y: base === "1B" ? B1.y : B2.y, t: 0.40, kind: "thrown" },
    ],
  };
}

function buildWildPitch(): GeneratedPlay {
  return {
    archetype: "wild_pitch",
    actorPaths: {
      C: [{ x: H.x - 6, y: H.y + 2 }, { target: "H" }],
      P: [{ target: "H" }],
      R3: [{ target: "H" }],
    },
    actorWindows: {
      C: win(0.18, 0.60), P: win(0.20, 0.65), R3: win(0.05, 0.75),
    },
    ball: [
      { x: P.x, y: P.y + 2, t: 0.02, kind: "pitch" },
      { x: H.x - 8, y: H.y + 4, t: 0.30, kind: "pitch" },
      { x: H.x, y: H.y, t: 0.75, kind: "thrown" },
    ],
  };
}

function buildMoundVisit(): GeneratedPlay {
  return {
    archetype: "mound_visit",
    actorPaths: {
      C:  [{ x: P.x, y: P.y + 4 }],
      SS: [{ x: P.x - 2, y: P.y - 2 }],
      "2B": [{ x: P.x + 2, y: P.y - 2 }],
      "1B": [{ x: P.x + 6, y: P.y }],
      "3B": [{ x: P.x - 6, y: P.y }],
    },
    actorWindows: {
      C: win(0.10, 0.55), SS: win(0.15, 0.55), "2B": win(0.15, 0.55),
      "1B": win(0.20, 0.60), "3B": win(0.20, 0.60),
    },
    ball: [],
  };
}

function buildGeneric(actors: IqActor[]): GeneratedPlay {
  // Derive a play from the actors' assignments alone.
  const paths: Partial<Record<IqActorRole, TargetWaypoint[]>> = {};
  const windows: Partial<Record<IqActorRole, { startAt: number; endAt: number }>> = {};
  let ballDest: TargetWaypoint = { target: "1B" };
  const bagRole = actors.find((a) => a.assignment === "bag");
  if (bagRole && ["1B","2B","3B"].includes(bagRole.role)) {
    ballDest = { target: bagRole.role as "1B" | "2B" | "3B" };
  }
  const ballRole = actors.find((a) => a.assignment === "ball");
  actors.forEach((a, i) => {
    const stagger = 0.20 + (i / Math.max(1, actors.length)) * 0.10;
    if (a.assignment === "ball") {
      paths[a.role] = [{ x: P.x, y: P.y + 4 }, ballDest];
      windows[a.role] = win(stagger, 0.70);
    } else if (a.assignment === "bag") {
      paths[a.role] = [{ target: (["1B","2B","3B"].includes(a.role) ? a.role : "2B") as "1B" | "2B" | "3B" }];
      windows[a.role] = win(stagger, 0.65);
    } else if (a.assignment === "backup") {
      paths[a.role] = [{ dx: 0, dy: 12 }];
      windows[a.role] = win(stagger, 0.85);
    } else if (a.assignment === "read") {
      paths[a.role] = [{ dx: 0, dy: 4 }];
      windows[a.role] = win(stagger, 0.50);
    } else if (a.assignment === "execute") {
      paths[a.role] = [{ target: "1B" }];
      windows[a.role] = win(stagger, 0.85);
    }
  });
  const destPt =
    "target" in ballDest && typeof (ballDest as { target: string }).target === "string"
      ? LANDMARKS[(ballDest as { target: keyof typeof LANDMARKS }).target]
      : B1;
  const startPt = ballRole ? DEFAULT_DEFENDER_POS[ballRole.role] : P;
  return {
    archetype: "generic",
    actorPaths: paths,
    actorWindows: windows,
    ball: [
      { x: P.x, y: P.y + 2, t: 0.02, kind: "pitch" },
      { x: H.x, y: H.y - 2, t: 0.18, kind: "pitch" },
      { x: startPt.x, y: startPt.y, t: 0.40, kind: "batted" },
      { x: destPt.x, y: destPt.y, t: 0.75, kind: "thrown" },
    ],
  };
}

// -------- entry --------
export function synthesizePlay(
  meta: { slug?: string; title?: string; runners?: string[] },
  actors: IqActor[],
): GeneratedPlay {
  const arch = classify(meta.slug ?? "", meta.title ?? "");
  const runners = new Set(meta.runners ?? []);
  const hasR1 = runners.has("1B") || actors.some((a) => a.role === "R1");
  const hasR2 = runners.has("2B") || actors.some((a) => a.role === "R2");
  switch (arch) {
    case "drag_bunt_1b": return buildDragBunt1B(hasR1);
    case "drag_bunt_3b": return buildDragBunt3B(hasR1);
    case "push_bunt":    return buildPushBunt();
    case "squeeze":      return buildSqueeze();
    case "slash_bunt":   return buildSacBunt(true, hasR2);
    case "pop_bunt":     return buildPopBunt();
    case "wheel":
    case "sac_bunt":     return buildSacBunt(hasR1, hasR2);
    case "comebacker":
    case "grounder_ss":
    case "grounder_2b":
    case "grounder_3b":
    case "grounder_1b":
    case "slow_roller_3b": return buildComebacker();
    case "fly_lf": return buildFly("L");
    case "fly_rf": return buildFly("R");
    case "fly_cf": return buildFly("C");
    case "gap_lc": return buildGap("L");
    case "gap_rc": return buildGap("R");
    case "line_drive":
    case "relay":  return buildGap("L");
    case "steal_2b": return buildSteal("2B");
    case "steal_3b": return buildSteal("3B");
    case "pickoff_1b": return buildPickoff("1B");
    case "pickoff_2b": return buildPickoff("2B");
    case "first_and_third": return buildSteal("2B");
    case "wild_pitch": return buildWildPitch();
    case "mound_visit": return buildMoundVisit();
    default: return buildGeneric(actors);
  }
}
