/**
 * Elite Defensive Drill Library
 *
 * Position × sport × season-phase catalog for the Hammers Today Defense block.
 * Replaces the old 3-drill generic prescription with real, coach-legible,
 * position-specific work covering receiving, blocking, footwork, range,
 * exchanges, PFPs, first-step reads, do-or-die throws, and rise-ball / slap
 * differentiations for softball.
 *
 * Pure — no I/O, no fabrication. Missing position stays missing (caller
 * handles the awaiting-input state).
 */
import type { DrillStep } from "./dailyPlan";
import {
  guideForDefense,
  tierNoteForDefense,
  type DefenseTier,
} from "./defenseGuides";
import { coercePositionTokens, firstPositionToken } from "@/lib/hammer/positions/positionNormalizer";

export type { DefenseTier } from "./defenseGuides";

export type DefensePosition =
  | "C"
  | "P"
  | "1B"
  | "2B"
  | "SS"
  | "3B"
  | "LF"
  | "CF"
  | "RF"
  | "OF"
  | "IF"
  | "DH"
  | "utility";

export type DefenseSport = "baseball" | "softball";
export type DefensePhase = "off" | "pre" | "in" | "tournament";

export interface DefenseSelectorInput {
  readonly position: unknown;
  readonly secondaryPositions?: unknown;
  readonly sport: DefenseSport;
  readonly seasonPhase: "off" | "pre" | "in" | "post" | "unknown" | string | null | undefined;
  readonly injuryRegions?: ReadonlyArray<string>;
  /** true if today is a tournament / stacked-game day per schedule signal. */
  readonly tournamentToday?: boolean;
  readonly goal?: string | null;
  /**
   * Difficulty tier for the drill variants. If omitted, caller-agnostic
   * default is "developing" — safe and useful for the median athlete.
   * Callers with rung/training-age context should pass an explicit tier
   * via `resolveDefenseTier()`.
   */
  readonly tier?: DefenseTier;
}

export interface DefensePrescription {
  readonly position: DefensePosition;
  readonly sport: DefenseSport;
  readonly phase: DefensePhase;
  readonly tier: DefenseTier;
  readonly drills: ReadonlyArray<DrillStep>;
  readonly cues: ReadonlyArray<string>;
  readonly stopRules: ReadonlyArray<string>;
  readonly durationMin: number;
  readonly title: string;
  readonly why: string;
}

// ---- position normalization (finer than EASS) --------------------------------

export function normalizeDefensePosition(pos: unknown): DefensePosition {
  const token = firstPositionToken(pos);
  if (!token) return "utility";
  const p = token.trim().toUpperCase();
  if (p === "C" || p === "CATCHER") return "C";
  if (p === "P" || p === "PITCHER" || p === "SP" || p === "RP") return "P";
  if (p === "1B" || p === "FIRST" || p === "FIRST_BASE") return "1B";
  if (p === "2B" || p === "SECOND" || p === "SECOND_BASE") return "2B";
  if (p === "SS" || p === "SHORT" || p === "SHORTSTOP") return "SS";
  if (p === "3B" || p === "THIRD" || p === "THIRD_BASE") return "3B";
  if (p === "LF" || p === "LEFT" || p === "LEFT_FIELD") return "LF";
  if (p === "CF" || p === "CENTER" || p === "CENTER_FIELD") return "CF";
  if (p === "RF" || p === "RIGHT" || p === "RIGHT_FIELD") return "RF";
  if (p === "OF" || p === "OUTFIELD") return "OF";
  if (p === "IF" || p === "INFIELD") return "IF";
  if (p === "DH" || p === "DESIGNATED_HITTER") return "DH";
  return "utility";
}

function normalizePhase(
  phase: DefenseSelectorInput["seasonPhase"],
  tournamentToday: boolean,
): DefensePhase {
  if (tournamentToday) return "tournament";
  const p = (phase ?? "").toString().toLowerCase();
  if (p === "off" || p === "off_season" || p === "offseason") return "off";
  if (p === "pre" || p === "pre_season" || p === "preseason") return "pre";
  if (p === "in" || p === "in_season" || p === "inseason") return "in";
  if (p === "post" || p === "post_season" || p === "postseason") return "off";
  return "pre";
}

// ---- injury gating -----------------------------------------------------------

const LEG_INJURY = new Set(["knee", "ankle", "hip", "hamstring", "groin", "quad", "calf", "foot"]);
const SHOULDER_INJURY = new Set(["shoulder", "elbow", "ucl", "labrum", "rotator_cuff", "biceps"]);
const BACK_INJURY = new Set(["back", "lumbar", "spine", "oblique"]);

function hasAny(regions: ReadonlyArray<string> | undefined, set: Set<string>): boolean {
  if (!regions || regions.length === 0) return false;
  return regions.some((r) => set.has(r.toLowerCase()));
}

/**
 * Filter drills by injury constraints — never fabricate a replacement, just
 * remove unsafe work. Callers keep the block; volume adjusts naturally.
 */
function gateForInjury(
  drills: ReadonlyArray<DrillStep>,
  regions: ReadonlyArray<string> | undefined,
): DrillStep[] {
  const noLegs = hasAny(regions, LEG_INJURY);
  const noArm = hasAny(regions, SHOULDER_INJURY);
  const noBack = hasAny(regions, BACK_INJURY);
  return drills.filter((d) => {
    const tag = `${d.name} ${d.setup ?? ""} ${d.cue ?? ""}`.toLowerCase();
    if (noLegs && /(charge|sprint|do-or-die|drop-step|crossover|bunt charge|slow-roller)/.test(tag)) return false;
    if (noArm && /(long throw|max effort throw|pop-time|rock-and-throw|one-hop to)/.test(tag)) return false;
    if (noBack && /(block|dive|extension|barrel roll)/.test(tag)) return false;
    return true;
  });
}

// ---- catalog: position × sport × phase --------------------------------------

type CatalogKey = `${DefensePosition}:${DefenseSport}:${DefensePhase}`;

function d(name: string, dosage: string, cue?: string, setup?: string, stopIf?: string): DrillStep {
  return setup ? { name, dosage, cue, setup, stopIf } : { name, dosage, cue, stopIf };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CATALOG: Partial<Record<CatalogKey, DrillStep[]>> = {
  // ================================================================ CATCHER
  "C:baseball:off": [
    d("Driveline one-knee receiving", "3×15 reps", "quiet glove, thumb up, catch the ball into the strike zone"),
    d("Framing ladder — 4 corners", "4 zones × 8", "load the glove early, freeze on the catch"),
    d("Short-hop blocking angles", "3×10 (L/M/R)", "chin to chest, block ball down, keep it in front", "kneel on turf, coach short-hops from 20 ft"),
    d("Pop-time footwork — jab-replace to 2B", "3×8 dry, 2×5 with ball", "replace back foot, throw over front hip"),
    d("Foul-pop turn-and-find", "20 reps", "flip mask off away from ball, find it late"),
  ],
  "C:baseball:pre": [
    d("One-knee receiving — high/low/glove/arm", "4×10", "catch strikes as strikes"),
    d("Blocking recovery to ball", "3×8", "block, pop up, locate runner"),
    d("Pop-time to 2B", "2×6 timed", "goal ≤ 2.0s", "warmed up arm required"),
    d("Bunt pick-and-throw to 1B/3B", "6 reps each base", "clear the ball, footwork before throw"),
  ],
  "C:baseball:in": [
    d("Receiving primer — bottom of zone", "20 reps", "steal the low strike"),
    d("Block-and-recover", "2×5", "chin down, ball in front, then feet"),
    d("Live pop-time 1 round", "3 throws to 2B", "game speed only"),
    d("Foul-pop reads", "5 reps", "off the mask away from the ball"),
  ],

  "C:softball:off": [
    d("One-knee receiving — rise + drop", "3×15", "glove up on rise, glove down on drop — never flip"),
    d("Short-hop blocking angles", "3×10 (L/M/R)", "chin down, block down, redirect in front"),
    d("Pop-time to 2B — slapper timing", "3×8 dry + 2×5 live", "quick exchange, four-seam grip"),
    d("Slap-bunt read + barehand", "10 reps", "read runner speed, throw on the run"),
    d("Framing ladder — 4 corners", "4 zones × 8", "quiet glove, freeze on catch"),
  ],
  "C:softball:pre": [
    d("Receiving vs rise-ball", "3×10", "get on top of the ball — glove stays above the hand"),
    d("Blocking — screwball/drop", "3×8", "block into the ball, not around it"),
    d("Pop-time to 2B", "2×6 timed", "≤ 1.9s target", "warm arm"),
    d("Slapper block-and-recover", "6 reps", "block, up, throw to 1B on the run"),
  ],
  "C:softball:in": [
    d("Receiving primer — bottom of zone + drop", "15 reps", "steal the drop-ball strike"),
    d("Block-and-recover", "2×5", "chin down, feet after"),
    d("Live pop-time to 2B", "3 throws", "game speed"),
  ],

  // ================================================================ PITCHER (PFP)
  "P:baseball:off": [
    d("Comebacker glove work", "3×10", "field the ball with soft hands, spin foot to 2B or 1B"),
    d("1-3-1 PFP", "8 reps", "underhand toss inside the 45-ft line, overhand outside"),
    d("Cover 1B on 3-6-1 / 3-6-3", "8 reps", "hit inside the bag, catch on the run"),
    d("Bunt fielding to 1B / 2B / 3B", "5 to each base", "clear the ball, throw off the correct foot"),
    d("Backup 3B & home", "5 rounds", "read the throw, deep angle behind the base"),
    d("Slide-step / hold-runner reads", "10 pitches", "vary looks 1-1-3-2 to disrupt timing"),
  ],
  "P:baseball:pre": [
    d("Comebackers + turn to 2B", "3×6", "glove-side spin to shortstop"),
    d("1-3-1 PFP", "6 reps", "clean flip, catch on the bag"),
    d("Bunt to all bases", "3 per base", "footwork before throw"),
    d("Pickoff to 1B / 2B", "5 each", "back leg first, quick throw"),
  ],
  "P:baseball:in": [
    d("Comebacker primer", "5 reps", "soft hands, spin to 2B"),
    d("1-3-1 walk-through", "3 reps", "clean flip"),
    d("Hold-runner primer", "5 pitches with imaginary R1", "vary look counts"),
  ],

  "P:softball:off": [
    d("Windmill follow-through into fielding position", "3×10", "recover glove-up, chest to hitter"),
    d("Comebacker glove work", "3×10", "soft hands, spin to base"),
    d("Bunt fielding to 1B / 2B / 3B", "5 per base", "clear the ball, throw off correct foot"),
    d("Cover 1B on 3-6-1", "8 reps", "hit inside the bag"),
    d("Rise-ball hold-and-throw", "8 pitches with R1", "quick release, no lead-off but jump-step read"),
    d("Backup 3B & home", "5 rounds", "deep angle behind base"),
  ],
  "P:softball:pre": [
    d("Follow-through into set", "3×8", "chest square, glove up"),
    d("Comebackers + turn", "3×6", "spin to 2B on the glove side"),
    d("Bunt to all bases", "3 per base"),
    d("Pickoff read — courtesy runner", "5 reps", "detect early jump"),
  ],
  "P:softball:in": [
    d("Comebacker primer", "5 reps", "soft hands"),
    d("Bunt walk-through to 3B / 1B", "3 each"),
  ],

  // ================================================================ FIRST BASE
  "1B:baseball:off": [
    d("Scoop/short-hop ladder", "3×15 (short/med/long hops)", "keep body low, glove out in front"),
    d("Pick footwork — stretch to all angles", "20 reps", "stretch AFTER catch is secure"),
    d("3-6-3 / 3-6-1 turn", "10 reps", "clear the runner lane, throw on the run"),
    d("Bunt charge & throw to 3B/2B", "6 to each", "field with two hands, throw on the move"),
    d("Hold runner + pickoff reception", "10 reps", "tag down and back to bag"),
  ],
  "1B:baseball:pre": [
    d("Short-hop scoops", "3×10", "keep chest low"),
    d("Stretch & pick — 4 angles", "12 reps", "secure catch first"),
    d("3-6-3", "6 reps", "clear runner lane"),
  ],
  "1B:baseball:in": [
    d("Scoop primer", "10 reps", "soft-hand the hop"),
    d("Stretch — 4 angles", "8 reps", "secure the catch"),
  ],

  "1B:softball:off": [
    d("Scoop/short-hop ladder", "3×15", "chest low, glove out front"),
    d("Stretch to all angles", "20 reps", "secure the catch first"),
    d("3-6-3 turn", "8 reps", "clear runner, throw on the run"),
    d("Slap-bunt charge + throw to 2B", "6 reps", "read speed, throw on the move"),
    d("Rise-ball pop-up read", "8 reps", "call it early, glove-side turn"),
  ],
  "1B:softball:pre": [
    d("Short-hop scoops", "3×10"),
    d("Stretch — 4 angles", "12 reps"),
    d("Bunt coverage rehearsal", "6 reps"),
  ],
  "1B:softball:in": [
    d("Scoop primer", "10 reps"),
    d("Stretch — 4 angles", "8 reps"),
  ],

  // ================================================================ 2B / SS (shared middle-infield spine, differentiated below)
  "2B:baseball:off": [
    d("DP feed to SS — flip, pivot, backhand-glove flip", "3×8 each", "get the ball to the bag with a clean seam"),
    d("Turn at 2B — inside/outside", "3×8", "footwork over the bag, throw over the runner"),
    d("Backhand & forehand range", "3×8 each", "field with feet moving forward"),
    d("Slow-roller barehand & throw", "10 reps", "field on the run, throw off the correct foot"),
    d("Relay from RF — 2-hand catch, spin, throw", "6 reps", "line up chest-to-chest with cutoff"),
  ],
  "2B:baseball:pre": [
    d("DP feeds — 3 types", "3×5", "clean seam to SS"),
    d("Turn at 2B", "3×5", "over the bag"),
    d("Backhand range", "10 reps", "field forward"),
  ],
  "2B:baseball:in": [
    d("DP feed primer", "10 reps", "clean seam"),
    d("Backhand primer", "6 reps"),
  ],

  "SS:baseball:off": [
    d("DP pivot at 2B — replace foot + throw", "3×10", "replace back foot, throw over front hip"),
    d("Backhand & throw across body", "3×8", "field with weight forward"),
    d("Slow-roller barehand", "10 reps", "field on the run, throw off correct foot"),
    d("Deep-hole throw", "8 reps", "plant, jump, throw", undefined, "shoulder soreness — cut volume"),
    d("Relay from LF/CF — spin & throw", "6 reps", "line up cutoff man, chest-to-chest"),
    d("Pop-up communication with 2B/OF", "5 reps", "loud call, drift under, catch above head"),
  ],
  "SS:baseball:pre": [
    d("DP pivot", "3×6", "replace and throw"),
    d("Backhand range", "10 reps"),
    d("Slow-roller barehand", "6 reps"),
  ],
  "SS:baseball:in": [
    d("DP pivot primer", "10 reps"),
    d("Backhand primer", "6 reps"),
    d("Deep-hole primer", "4 reps", undefined, undefined, "arm tightness — skip"),
  ],

  "2B:softball:off": [
    d("DP feed to SS — slapper depth (in on grass)", "3×8", "quick clean seam, short arm-action"),
    d("Turn at 2B vs slap runner", "3×8", "over the bag, throw off outside foot"),
    d("Backhand & forehand range", "3×8 each"),
    d("Slap-bunt barehand & throw to 1B", "10 reps", "attack, throw on the run"),
  ],
  "2B:softball:pre": [
    d("DP feed", "3×5"),
    d("Turn at 2B vs slap", "3×5"),
    d("Backhand range", "8 reps"),
  ],
  "2B:softball:in": [
    d("DP feed primer", "8 reps"),
    d("Slap-bunt walk-through", "5 reps"),
  ],

  "SS:softball:off": [
    d("DP pivot at 2B — quick feed & throw", "3×8", "replace foot, short arm"),
    d("Slap-bunt read + barehand", "10 reps", "attack downhill, throw on the run"),
    d("Backhand & throw across body", "3×8"),
    d("Deep-hole throw", "6 reps", "plant, jump, throw"),
    d("Pop-up communication — infield fly rule reps", "5 reps", "loud call"),
  ],
  "SS:softball:pre": [
    d("DP pivot", "3×6"),
    d("Slap read + barehand", "8 reps"),
    d("Backhand range", "8 reps"),
  ],
  "SS:softball:in": [
    d("DP pivot primer", "8 reps"),
    d("Slap barehand primer", "5 reps"),
  ],

  // ================================================================ THIRD BASE
  "3B:baseball:off": [
    d("Slow-roller barehand & throw", "3×10", "attack the ball, throw off right foot"),
    d("Backhand at the line", "3×8", "keep the ball fair, field with weight forward"),
    d("In-between hop reads", "3×10", "attack the short hop, don't wait on the in-between"),
    d("Bunt charge & throw to 1B", "10 reps", "field on the run, throw across body"),
    d("Around-the-horn DP feed", "3×5", "step-and-throw to 2B, clean seam"),
  ],
  "3B:baseball:pre": [
    d("Slow-roller barehand", "3×8"),
    d("Backhand at the line", "3×6"),
    d("Bunt charge & throw", "8 reps"),
  ],
  "3B:baseball:in": [
    d("Slow-roller primer", "6 reps"),
    d("Backhand at line — walk-through", "5 reps"),
  ],

  "3B:softball:off": [
    d("Slow-roller barehand & throw", "3×10", "attack ball, throw on the run"),
    d("Slap-bunt charge to 1B", "3×8", "field on the run, throw across body"),
    d("Backhand down the line", "3×8", "keep it fair"),
    d("In-between hop reads", "3×10"),
  ],
  "3B:softball:pre": [
    d("Slow-roller barehand", "3×8"),
    d("Slap-bunt charge", "3×6"),
  ],
  "3B:softball:in": [
    d("Slow-roller primer", "6 reps"),
    d("Slap-bunt walk-through", "5 reps"),
  ],

  // ================================================================ OUTFIELD (generic + specific)
  "OF:baseball:off": [
    d("Drop-step reads — deep left/right", "3×8", "open hips first, run on the balls of feet"),
    d("Crossover first step", "3×10", "one crossover, then sprint — don't drift"),
    d("Do-or-die charge", "10 reps", "one-knee funnel through the ball, throw off right foot"),
    d("One-hop throws to 2B / 3B / home", "5 each", "aim for the cutoff's letters, one clean hop"),
    d("Fence work — read, drift, brace", "6 reps", "find fence with glove hand"),
    d("Sun-ball tracking", "6 reps", "shade with glove, don't lose the ball"),
  ],
  "OF:baseball:pre": [
    d("Drop-step reads", "3×6"),
    d("Crossover first step", "3×8"),
    d("Do-or-die charge", "8 reps"),
    d("One-hop throws to bases", "3 per base"),
  ],
  "OF:baseball:in": [
    d("Drop-step primer", "6 reps"),
    d("Crossover primer", "6 reps"),
    d("Do-or-die primer", "5 reps"),
  ],

  "CF:baseball:off": [
    d("Drop-step reads — L/R", "3×8", "open hips, straight-line to spot"),
    d("Gap reads with wing (LF & RF)", "3×5", "call ball early and loud"),
    d("Crossover + sprint", "3×10", "one crossover, then run"),
    d("Do-or-die charge", "10 reps", "funnel through the ball"),
    d("One-hop throws — home & 3B", "5 each", "one clean hop to cutoff"),
    d("Fence & sun-ball", "5 reps each"),
  ],

  "OF:softball:off": [
    d("Drop-step reads — deep L/R", "3×8", "open hips first"),
    d("Rise-ball tracking", "3×10", "read the pop off the bat — no first-step-in"),
    d("Crossover first step", "3×10"),
    d("Do-or-die charge", "10 reps", "funnel, throw off right foot"),
    d("One-hop to bases — shorter fence angles", "5 per base", "aim cutoff's letters"),
    d("Slap-hit read — soft line drive in front", "6 reps", "come through the ball, don't drift"),
  ],
  "OF:softball:pre": [
    d("Drop-step reads", "3×6"),
    d("Rise-ball tracking", "3×8"),
    d("Do-or-die charge", "8 reps"),
  ],
  "OF:softball:in": [
    d("Drop-step primer", "6 reps"),
    d("Rise-ball tracking primer", "6 reps"),
    d("Do-or-die primer", "5 reps"),
  ],
};

// Aliases — corner OFs share OF work by default, then we merge one specialty
// drill on top. CF inherits the CF catalog above.
function catalogFor(pos: DefensePosition, sport: DefenseSport, phase: DefensePhase): DrillStep[] {
  const key = `${pos}:${sport}:${phase}` as CatalogKey;
  if (CATALOG[key]) return [...(CATALOG[key] as DrillStep[])];
  // Outfield fallback → OF catalog. CF has its own off-season entry but not
  // every phase, so it falls back here too rather than dropping to a generic
  // "field the ball" block.
  if (pos === "LF" || pos === "RF" || pos === "CF") {
    const of = CATALOG[`OF:${sport}:${phase}` as CatalogKey];
    if (of) return [...of];
  }
  // Generic IF fallback → SS in/off/pre catalog
  if (pos === "IF") {
    const ss = CATALOG[`SS:${sport}:${phase}` as CatalogKey];
    if (ss) return [...ss];
  }
  // Utility / DH fallback: pre-season core mix
  if (pos === "utility" || pos === "DH") {
    const of = CATALOG[`OF:${sport}:${phase}` as CatalogKey] ?? [];
    const ss = CATALOG[`SS:${sport}:${phase}` as CatalogKey] ?? [];
    return [...ss.slice(0, 2), ...of.slice(0, 2)];
  }
  return [];
}

// ---- tournament tapering -----------------------------------------------------

function taperForTournament(drills: DrillStep[]): DrillStep[] {
  // Keep only primers (dry footwork + one glove/reception drill), max 3.
  const primers = drills.slice(0, 3).map((step) => ({
    ...step,
    dosage: step.dosage.replace(/(\d+)×(\d+)/, (_m, _a, b) => `1×${b}`),
  }));
  return primers;
}

// ---- secondary-position blend -----------------------------------------------

function blendSecondary(
  primary: DrillStep[],
  secondary: DefensePosition | null,
  sport: DefenseSport,
  phase: DefensePhase,
): DrillStep[] {
  if (!secondary) return primary;
  const secondaryDrills = catalogFor(secondary, sport, phase);
  if (secondaryDrills.length === 0) return primary;
  // Add ONE primer from the secondary position with reduced dosage.
  const primer = secondaryDrills[0];
  if (!primer) return primary;
  const already = primary.some((p) => p.name.toLowerCase() === primer.name.toLowerCase());
  if (already) return primary;
  return [
    ...primary,
    {
      ...primer,
      name: `${primer.name} (secondary: ${secondary})`,
      dosage: primer.dosage.replace(/(\d+)×(\d+)/, (_m, _a, b) => `1×${Math.max(3, Math.ceil(Number(b) / 2))}`),
    },
  ];
}

// ---- cues + stop rules -------------------------------------------------------

function cuesFor(pos: DefensePosition, sport: DefenseSport): string[] {
  const base: string[] = ["Footwork before glove.", "Field through the ball, don't stab."];
  if (pos === "C") base.push("Chin down on blocks. Quiet glove on receiving.");
  if (pos === "P") base.push("Chest square, glove up after every pitch.");
  if (pos === "1B") base.push("Secure the catch before the stretch.");
  if (pos === "2B" || pos === "SS") base.push("Feet over the bag, throw over the runner.");
  if (pos === "3B") base.push("Attack the slow-roller. Keep the backhand fair.");
  if (pos === "LF" || pos === "CF" || pos === "RF" || pos === "OF") {
    base.push("One crossover, then sprint. Call the ball loud.");
    if (sport === "softball") base.push("Read rise-balls off the bat — no drifting in.");
  }
  return base;
}

const STOP_RULES: string[] = [
  "Knee, ankle, or hip pain — stop and tell Hammer.",
  "Shoulder or elbow pain on throws — stop, do dry-footwork only.",
  "Any lightheadedness on charge/sprint drills — stop and hydrate.",
];

// ---- durations ---------------------------------------------------------------

function durationFor(phase: DefensePhase, position: DefensePosition): number {
  if (phase === "tournament") return 10;
  if (phase === "in") return position === "C" || position === "P" ? 20 : 15;
  if (phase === "off") return position === "C" || position === "P" ? 40 : 35;
  return position === "C" || position === "P" ? 28 : 25;
}

// ---- tier resolution & scaling ----------------------------------------------

/**
 * Map training age (years of consistent training) + season phase to a
 * default drill tier. Pure — no context lookups.
 *
 *   trainingAge < 1 → beginner
 *   1–2 yrs         → developing
 *   3–5 yrs         → advanced
 *   6+ yrs          → elite
 *
 * In-season shifts one tier DOWN (mgmt of volume/CNS); tournament clamps
 * to at most "developing" (primer intent, no elite volume today).
 */
export function resolveDefenseTier(
  trainingAgeYears: number | null | undefined,
  phase: DefensePhase | "post" | "unknown" | string | null | undefined,
): DefenseTier {
  const age = typeof trainingAgeYears === "number" && trainingAgeYears >= 0 ? trainingAgeYears : 1;
  let base: DefenseTier =
    age < 1 ? "beginner" : age < 3 ? "developing" : age < 6 ? "advanced" : "elite";
  const p = (phase ?? "").toString().toLowerCase();
  if (p === "in" || p === "in_season" || p === "inseason") {
    // In-season prescriptions are shorter and lower-volume; step tier down one.
    base = base === "elite" ? "advanced" : base === "advanced" ? "developing" : base === "developing" ? "beginner" : "beginner";
  }
  if (p === "tournament") {
    base = base === "elite" || base === "advanced" ? "developing" : "beginner";
  }
  return base;
}

const TIER_SCALE: Record<DefenseTier, number> = {
  beginner: 0.5,
  developing: 0.75,
  advanced: 1.0,
  elite: 1.25,
};

/** Scale numeric reps inside a dosage string. Preserves format and units. */
function scaleDosage(dosage: string, factor: number): string {
  // "3×15" / "3x15" — scale the rep count (second number).
  let out = dosage.replace(/(\d+)\s*[×x]\s*(\d+)/g, (_m, sets: string, reps: string) => {
    const scaled = Math.max(1, Math.round(Number(reps) * factor));
    return `${sets}×${scaled}`;
  });
  // "20 reps" / "10 reps" — scale the leading integer.
  out = out.replace(/^(\d+)(\s+)(reps?|throws?|pitches?|rounds?)\b/i, (_m, n: string, sp: string, unit: string) => {
    const scaled = Math.max(1, Math.round(Number(n) * factor));
    return `${scaled}${sp}${unit}`;
  });
  return out;
}

/** Attach tier metadata + guide + tier note to a single drill. */
function decorateDrill(step: DrillStep, tier: DefenseTier): DrillStep {
  const guide = guideForDefense(step.name) ?? undefined;
  const tierNote = tierNoteForDefense(step.name, tier);
  const scaledDosage = scaleDosage(step.dosage, TIER_SCALE[tier]);
  const setup = tierNote
    ? step.setup
      ? `${step.setup}\n\nTier — ${tier}: ${tierNote}`
      : `Tier — ${tier}: ${tierNote}`
    : step.setup;
  const next: DrillStep = { ...step, dosage: scaledDosage };
  if (setup !== undefined) (next as { setup?: string }).setup = setup;
  if (guide) (next as { guide?: unknown }).guide = guide;
  return next;
}

// ---- public API --------------------------------------------------------------

export function selectDefenseDrills(input: DefenseSelectorInput): DefensePrescription | null {
  const position = normalizeDefensePosition(input.position);
  const sport = input.sport;
  const phase = normalizePhase(input.seasonPhase, !!input.tournamentToday);
  const tier: DefenseTier = input.tier ?? "developing";

  let drills = catalogFor(position, sport, phase);
  if (drills.length === 0) return null;

  const secondaryPositions = coercePositionTokens(input.secondaryPositions);
  if (secondaryPositions.length > 0) {
    const secondary = normalizeDefensePosition(secondaryPositions[0]);
    if (secondary !== position && secondary !== "utility") {
      drills = blendSecondary(drills, secondary, sport, phase);
    }
  }

  drills = gateForInjury(drills, input.injuryRegions);

  if (phase === "tournament") drills = taperForTournament(drills);

  if (drills.length === 0) return null;

  // Decorate every drill with the tier note, scaled dosage, and its guide.
  drills = drills.map((d) => decorateDrill(d, tier));

  const posLabel = position === "utility" ? "utility" : position;
  const phaseLabel =
    phase === "in"
      ? "game-rep"
      : phase === "off"
        ? "volume + range"
        : phase === "tournament"
          ? "primer"
          : "sharpen";
  const title = `Defense — ${posLabel} · ${tier} (${phaseLabel})`;
  const why =
    (phase === "in"
      ? "Game-rep quality over volume — the reps that show up in the game."
      : phase === "off"
        ? "Volume, footwork, and range — this is where elite defenders are built."
        : phase === "tournament"
          ? "Primer only — sharpen reads, save the legs for the game."
          : "Position-specific reads, footwork, and finishes.") +
    (input.goal ? ` ${input.goal}` : "");

  return {
    position,
    sport,
    phase,
    tier,
    drills,
    cues: cuesFor(position, sport),
    stopRules: STOP_RULES,
    durationMin: durationFor(phase, position),
    title,
    why,
  };
}
