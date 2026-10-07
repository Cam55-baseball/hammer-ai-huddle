// _shared/wic/pitching/windmillProgram.ts — Softball windmill pitching program v1
// (Step 8 batch 3, owner approved 2026-10-07). Pure: facts in, one session out.
//
// Rules (SOURCED = from the windmill doctrine / owner's arm defaults; PROPOSED = Hammers default):
// - Limits come only from ARM_DEFAULTS.windmill + windmillCheck (owner §1): 140/day, 3 days in a row,
//   youth innings rules. A session never takes a day over the limit. SOURCED (owner).
// - Never converted from baseball counts. SOURCED (owner).
// - No weighted balls under 13; v1 uses no weighted or plyo softballs at any age. SOURCED/PROPOSED.
// - Band-resisted circle work 13+, off-season only. PROPOSED.
// - Rise ball and screwball 14+ (spin-heavy, PROPOSED); drop/curve/change 12+ (PROPOSED).
// - Phase arc: post-season none · os_q1 drills only · os_q2 fastball+change · os_q3 add movement
//   pitches · os_q4/pre-season game-like · in-season maintenance between games. PROPOSED.
// - Game day: no card (the game is the pitching). Day before a game: short sharpen. Day after
//   60+ pitches or 4+ innings: no card (arm care carries it). Readiness <40 none, 40–59 half. PROPOSED.
// - Arm pain: none. Growth mode: ×0.7 and drills-only in os_q1/os_q2. PROPOSED.
// - Off-season full pitching days ≤3 a week; never back-to-back full sessions off-season. PROPOSED.
// - Counting: full pitches 1.0; drill throws (short-distance, sub-max) 0.25. SOURCED (owner throw rates).
import { ARM_DEFAULTS, windmillCheck, type WindmillOuting } from "../phases/armLedger.ts";

export const WINDMILL_PROGRAM_VERSION = "windmill_program_v1";

export interface WindmillDrill {
  slug: string; name: string; kind: "drill" | "pitch" | "resisted";
  minAge: number; reps: number; sets: number; pitchType?: string; equipment: string[]; cue: string;
}

export const WINDMILL_LIBRARY: WindmillDrill[] = [
  { slug: "wm_k_position_snap", name: "K-position wrist snap", kind: "drill", minAge: 8, sets: 2, reps: 8, equipment: ["softball"], cue: "Arm at the hip, snap the wrist through. Short distance, easy effort." },
  { slug: "wm_half_circle_whip", name: "Half-circle whip", kind: "drill", minAge: 8, sets: 2, reps: 8, equipment: ["softball"], cue: "Start at 12 o'clock, whip down past the hip. Stay close to the body." },
  { slug: "wm_drive_line_stride", name: "Drive and stride on the power line", kind: "drill", minAge: 8, sets: 2, reps: 5, equipment: [], cue: "Push hard off the drive leg and land on the power line, foot turned 0–45° toward your throwing side." },
  { slug: "wm_walk_through", name: "Walk-through windmill", kind: "drill", minAge: 9, sets: 2, reps: 6, equipment: ["softball"], cue: "Step in, full circle, finish tall. Smooth, about 70% effort." },
  { slug: "wm_band_resisted_circle", name: "Band-resisted arm circle", kind: "resisted", minAge: 13, sets: 2, reps: 8, equipment: ["bands"], cue: "Light band, full circle, slow and controlled. Never to fatigue." },
  { slug: "wm_fastball_spots", name: "Fastball to spots", kind: "pitch", minAge: 8, sets: 1, reps: 10, pitchType: "fastball", equipment: ["softball"], cue: "Full pitch. Hit the glove — in, out, up, down." },
  { slug: "wm_changeup", name: "Change-up", kind: "pitch", minAge: 10, sets: 1, reps: 6, pitchType: "change", equipment: ["softball"], cue: "Same arm speed as the fastball. Let the grip slow it." },
  { slug: "wm_drop_ball", name: "Drop ball", kind: "pitch", minAge: 12, sets: 1, reps: 6, pitchType: "drop", equipment: ["softball"], cue: "Shorter stride, stay tall over the front side." },
  { slug: "wm_curveball", name: "Curveball", kind: "pitch", minAge: 12, sets: 1, reps: 6, pitchType: "curve", equipment: ["softball"], cue: "Stride a little toward your throwing-arm side. Spin it, don't force it." },
  { slug: "wm_rise_ball", name: "Rise ball", kind: "pitch", minAge: 14, sets: 1, reps: 6, pitchType: "rise", equipment: ["softball"], cue: "Longer stride, get under it. Stop if your shoulder or elbow complains." },
  { slug: "wm_screwball", name: "Screwball", kind: "pitch", minAge: 14, sets: 1, reps: 6, pitchType: "screw", equipment: ["softball"], cue: "Stride a little toward your glove side. Smooth spin." },
  { slug: "wm_game_sim", name: "Game simulation innings", kind: "pitch", minAge: 10, sets: 1, reps: 15, pitchType: "mixed", equipment: ["softball"], cue: "Pitch like it's a game: full routine between batters. Count every pitch." },
];

export type WindmillSessionType = "none" | "drills" | "build" | "movement" | "game_like" | "maintain" | "sharpen";

export interface WindmillInput {
  planDate: string;
  phase: string;                 // os_q1..os_q4, pre_season, in_season, post_season
  age: number | null;
  growthMode: boolean;
  readiness: number | null;      // 0–100
  armPain: boolean;
  history: WindmillOuting[];     // last 7+ days, pitches already thrown per day
  todayPitchesSoFar: number;
  gameToday: boolean;
  gameTomorrow: boolean;
  priorFullSessionsThisWeek: number;
  fullSessionYesterday: boolean;
  equipment: string[] | null;    // null = unknown → assume basics present
}

export interface WindmillRow { slug: string; name: string; kind: WindmillDrill["kind"]; sets: number; reps: number; pitchType?: string; countWeight: number; cue: string }
export interface WindmillSession { type: WindmillSessionType; rows: WindmillRow[]; fullPitches: number; drillThrows: number; armUnits: number; reasons: string[]; version: string }

const none = (reasons: string[]): WindmillSession => ({ type: "none", rows: [], fullPitches: 0, drillThrows: 0, armUnits: 0, reasons, version: WINDMILL_PROGRAM_VERSION });
const day = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86_400_000);

/** Full-pitch target for a session type before scaling. PROPOSED. */
const TARGET: Record<WindmillSessionType, number> = { none: 0, drills: 0, build: 30, movement: 45, game_like: 60, maintain: 35, sharpen: 20 };

export function planWindmillSession(i: WindmillInput): WindmillSession {
  const reasons: string[] = [];
  const phase = i.phase === "preseason" ? "pre_season" : i.phase;
  if (i.armPain) return none(["Arm pain reported — no pitching today."]);
  if (i.gameToday) return none(["Game today — the game is your pitching."]);
  if (i.readiness != null && i.readiness < 40) return none(["Low readiness — no pitching today."]);
  if (phase === "post_season") return none(["Post-season — the arm gets a break from pitching."]);
  const y = i.history.find((h) => day(h.date) === day(i.planDate) - 1);
  if (y && (y.pitches >= 60 || y.innings >= 4)) return none(["Big pitching day yesterday — recovery today."]);
  const blocks = windmillCheck(i.age, i.history, i.planDate, { pitches: i.todayPitchesSoFar + 1, innings: 0 });
  if (blocks.length) return none(blocks);

  let type: WindmillSessionType;
  if (i.gameTomorrow) type = "sharpen";
  else if (phase === "os_q1") type = "drills";
  else if (phase === "os_q2") type = "build";
  else if (phase === "os_q3") type = "movement";
  else if (phase === "os_q4" || phase === "pre_season") type = "game_like";
  else type = "maintain";
  if (i.growthMode && (phase === "os_q1" || phase === "os_q2")) { type = "drills"; reasons.push("Growth mode — drills only."); }
  const offSeason = phase.startsWith("os_");
  if (type !== "drills" && type !== "sharpen" && offSeason && (i.priorFullSessionsThisWeek >= 3 || i.fullSessionYesterday)) {
    type = "drills"; reasons.push(i.fullSessionYesterday ? "Pitched yesterday — drills today." : "Three pitching days already this week — drills today.");
  }

  const age = i.age ?? 14;
  let scale = age < 13 ? 0.6 : age < 15 ? 0.8 : 1;
  if (i.growthMode) scale *= 0.7;
  if (i.readiness != null && i.readiness < 60) { scale *= 0.5; reasons.push("Readiness is middling — half the pitches."); }
  const room = Math.max(0, ARM_DEFAULTS.windmill.dayMax - i.todayPitchesSoFar);
  let fullTarget = Math.min(room, Math.round(TARGET[type] * scale));

  const has = (eq: string[]) => i.equipment == null || eq.every((e) => i.equipment!.includes(e) || e === "softball");
  const legal = (d: WindmillDrill) => age >= d.minAge && has(d.equipment);
  const pick = (slug: string) => WINDMILL_LIBRARY.find((d) => d.slug === slug)!;
  const rows: WindmillRow[] = [];
  const add = (d: WindmillDrill, reps = d.reps, sets = d.sets) => {
    if (!legal(d) || reps <= 0) return;
    rows.push({ slug: d.slug, name: d.name, kind: d.kind, sets, reps, pitchType: d.pitchType, countWeight: d.kind === "pitch" ? 1 : d.kind === "drill" && d.equipment.includes("softball") ? 0.25 : 0, cue: d.cue });
  };

  // Drills every session (warm-up into the circle). Fewer on sharpen days.
  add(pick("wm_k_position_snap"), type === "sharpen" ? 6 : 8);
  add(pick("wm_half_circle_whip"), type === "sharpen" ? 6 : 8);
  add(pick("wm_drive_line_stride"));
  if (type === "drills") { add(pick("wm_walk_through")); if (offSeason && age >= 13) add(pick("wm_band_resisted_circle")); }

  if (fullTarget > 0) {
    const menu: string[] = type === "build" ? ["wm_fastball_spots", "wm_changeup"]
      : type === "movement" ? ["wm_fastball_spots", "wm_changeup", "wm_drop_ball", "wm_curveball", "wm_rise_ball", "wm_screwball"]
      : type === "game_like" ? ["wm_fastball_spots", "wm_game_sim", "wm_changeup", "wm_drop_ball", "wm_rise_ball"]
      : ["wm_fastball_spots", "wm_changeup", "wm_drop_ball", "wm_curveball", "wm_rise_ball"]; // maintain / sharpen
    const usable = menu.map(pick).filter(legal);
    let left = fullTarget;
    // Fastball first and largest; the rest share what's left; nothing below 4 pitches.
    usable.forEach((d, idx) => {
      if (left < 4) return;
      const share = idx === 0 ? Math.max(4, Math.round(fullTarget * 0.4)) : Math.max(4, Math.round(left / (usable.length - idx)));
      const n = Math.min(left, share);
      add(d, n, 1); left -= n;
    });
    fullTarget -= left;
  }

  const fullPitches = rows.filter((r) => r.kind === "pitch").reduce((s, r) => s + r.sets * r.reps, 0);
  const drillThrows = rows.filter((r) => r.countWeight === 0.25).reduce((s, r) => s + r.sets * r.reps, 0);
  const armUnits = fullPitches + drillThrows * 0.25;
  return { type, rows, fullPitches, drillThrows, armUnits, reasons, version: WINDMILL_PROGRAM_VERSION };
}
