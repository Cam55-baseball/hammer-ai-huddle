// Elite Training Methods Engine v1 — Method Catalog
//
// A "method" is the THIRD layer of the prescription:
//   1. Which movement    → engines + catalog
//   2. How much          → Zero-Drift Dosage Doctrine (resolveDose)
//   3. HOW it is organized → this module
//
// Constitutional bounds (docs/wic/training-methods-v1.md):
//   - A method NEVER authors a dose. It may only reshape a dose that
//     `resolveDose` already produced, inside a hard clamp (± 1 set, never
//     outside the quarter envelope).
//   - A method is interpretive structure + rest law. It may not relax a
//     legality gate, add a movement the engines did not select, or expand a
//     card's CNS share.
//   - Selection is deterministic. Same inputs → same method, always.
//   - When anything is uncertain, the method DROPS and the plain block ships.

import type { DoctrinePhase } from "../dosage/doctrine.ts";

export const METHODS_VERSION = "methods_v1";

export type MethodFamily = "contrast" | "intensity" | "density";

/** Engines a method may legally attach to. Nothing else is ever stamped. */
export type MethodEngine = "lift" | "speed" | "bat_speed" | "power";

/** Engines where methods are structurally forbidden, forever. */
export const FORBIDDEN_ENGINES = [
  "arm_care",
  "recovery",
  "mobility",
  "return_to_play",
  "warmup",
  "movement_prep",
  "conditioning",
  "cross_sport",
] as const;

export type TrainingAgeClass =
  | "beginner"
  | "developing"
  | "intermediate"
  | "advanced"
  | "elite"
  | "pro";

export const TRAINING_AGE_RANK: Record<TrainingAgeClass, number> = {
  beginner: 0,
  developing: 1,
  intermediate: 2,
  advanced: 3,
  elite: 4,
  pro: 5,
};

export interface MethodStation {
  /** 1-based order inside a round. */
  order: number;
  /** Short athlete-facing label. */
  label: string;
  /** What this station is asking the nervous system for. */
  intent: string;
  /** Load guidance — never an absolute number, always relative. */
  loadHint: string;
  /** Reps for this station (fixed, small, quality-first). */
  reps: number;
  /** Rest AFTER this station, in seconds. */
  restSeconds: number;
  /** Which movement pool the station draws from (already-selected rows only). */
  source: "anchor" | "plyometric" | "loaded_explosive" | "assisted" | "expression";
}

export interface PhaseRule {
  legal: boolean;
  /** Max times this method may appear in a rolling 7 days. */
  maxPerWeek: number;
  /** Rounds cap for this quarter (station methods only). */
  maxRounds?: number;
}

export interface MethodDef {
  id: string;
  family: MethodFamily;
  displayName: string;
  /** One-line header the card renders, e.g. "4 stations · 1 round every 3 min". */
  shape: string;
  engines: readonly MethodEngine[];
  structure: "stations" | "cluster" | "wave" | "tempo" | "isometric" | "emom" | "density" | "giant_set";
  stations: readonly MethodStation[];
  /** Rest between complete rounds, seconds. */
  restBetweenRoundsSeconds: number;
  /** Quarter legality + weekly frequency ceiling. */
  phases: Record<DoctrinePhase, PhaseRule>;
  minTrainingAge: TrainingAgeClass;
  minAgeYears: number;
  /** True → athlete must have cleared a relative-strength standard first. */
  requiresStrengthFloor: boolean;
  /** Multiplier applied to the block's CNS cost. > 1 must fit the CNS share. */
  cnsMultiplier: number;
  /** Equipment the method needs beyond the movements themselves. */
  equipment: readonly string[];
  /** Bounded dose transform. setsDelta is clamped to [-1, +1] by apply.ts. */
  setsDelta: -1 | 0 | 1;
  /** Athlete-facing "why this method today". */
  why: string;
  /** The single cue that makes or breaks the method. */
  cue: string;
  /** What to do if it feels wrong — no athlete is ever left guessing. */
  bailout: string;
}

const ALL_LEGAL = (maxPerWeek: number, maxRounds?: number): PhaseRule => ({
  legal: true,
  maxPerWeek,
  maxRounds,
});
const ILLEGAL: PhaseRule = { legal: false, maxPerWeek: 0 };

function phases(
  o: Partial<Record<DoctrinePhase, PhaseRule>>,
): Record<DoctrinePhase, PhaseRule> {
  return {
    os_q1: o.os_q1 ?? ILLEGAL,
    os_q2: o.os_q2 ?? ILLEGAL,
    os_q3: o.os_q3 ?? ILLEGAL,
    os_q4: o.os_q4 ?? ILLEGAL,
    in_season: o.in_season ?? ILLEGAL,
    post_season: o.post_season ?? ILLEGAL,
  };
}

// ---------------------------------------------------------------------------
// CONTRAST / COMPLEX FAMILY
// ---------------------------------------------------------------------------

const FRENCH_CONTRAST_STATIONS: readonly MethodStation[] = [
  {
    order: 1,
    label: "Heavy strength",
    intent: "Wake up high-threshold motor units.",
    loadHint: "Heavy — a load you could still move twice more",
    reps: 3,
    restSeconds: 20,
    source: "anchor",
  },
  {
    order: 2,
    label: "Plyometric",
    intent: "Convert that tension into fast ground contact.",
    loadHint: "Bodyweight — maximum intent, minimum contact time",
    reps: 5,
    restSeconds: 20,
    source: "plyometric",
  },
  {
    order: 3,
    label: "Loaded explosive",
    intent: "Express force against light resistance.",
    loadHint: "Light load — bar or implement moves fast",
    reps: 3,
    restSeconds: 20,
    source: "loaded_explosive",
  },
  {
    order: 4,
    label: "Assisted / overspeed",
    intent: "Teach the nervous system a speed it has not seen.",
    loadHint: "Assisted or unloaded — fastest quality rep of the day",
    reps: 5,
    restSeconds: 0,
    source: "assisted",
  },
];

export const METHODS: readonly MethodDef[] = [
  {
    id: "french_contrast",
    family: "contrast",
    displayName: "French Contrast",
    shape: "4 stations · 20s between stations · full reset between rounds",
    engines: ["lift", "power"],
    structure: "stations",
    stations: FRENCH_CONTRAST_STATIONS,
    restBetweenRoundsSeconds: 180,
    phases: phases({
      os_q2: ALL_LEGAL(1, 3),
      os_q3: ALL_LEGAL(2, 4),
      os_q4: ALL_LEGAL(1, 3),
    }),
    minTrainingAge: "advanced",
    minAgeYears: 16,
    requiresStrengthFloor: true,
    cnsMultiplier: 1.15,
    equipment: [],
    setsDelta: -1,
    why:
      "French contrast stacks four qualities inside one round — heavy, reactive, loaded-fast, faster-than-you-can-go. Each station leaves the next one primed, which is why elite power is built here and not in another set of straight sets.",
    cue: "Every rep is a maximum-intent rep. The second a station slows down, the round is over.",
    bailout:
      "If bar speed or jump height drops on a round, stop the method there and finish the day with the plain strength sets. Nothing is lost — the quality was the point.",
  },
  {
    id: "contrast_pair",
    family: "contrast",
    displayName: "Contrast Pair",
    shape: "2 stations · heavy then reactive",
    engines: ["lift", "speed", "bat_speed", "power"],
    structure: "stations",
    stations: [
      {
        order: 1,
        label: "Heavy strength",
        intent: "Load the pattern.",
        loadHint: "Heavy — two reps in reserve",
        reps: 3,
        restSeconds: 30,
        source: "anchor",
      },
      {
        order: 2,
        label: "Reactive expression",
        intent: "Spend the potentiation immediately.",
        loadHint: "Bodyweight or implement — fastest version of the same pattern",
        reps: 5,
        restSeconds: 0,
        source: "plyometric",
      },
    ],
    restBetweenRoundsSeconds: 150,
    phases: phases({
      os_q2: ALL_LEGAL(2, 4),
      os_q3: ALL_LEGAL(2, 4),
      os_q4: ALL_LEGAL(2, 3),
      in_season: ALL_LEGAL(1, 2),
    }),
    minTrainingAge: "intermediate",
    minAgeYears: 15,
    requiresStrengthFloor: false,
    cnsMultiplier: 1.08,
    equipment: [],
    setsDelta: 0,
    why:
      "A heavy set makes the next fast set faster. Pairing them is the cheapest way to train force and speed in the same minute without adding volume.",
    cue: "The fast station starts within 30 seconds of racking the heavy one. Waiting wastes it.",
    bailout: "Tired legs? Drop the heavy station's load, keep the reactive one honest.",
  },
  {
    id: "complex_pair",
    family: "contrast",
    displayName: "Complex Pair",
    shape: "2 stations · strength then same-pattern power",
    engines: ["lift", "power"],
    structure: "stations",
    stations: [
      {
        order: 1,
        label: "Strength",
        intent: "Build the pattern under load.",
        loadHint: "Moderate-heavy — controlled",
        reps: 5,
        restSeconds: 45,
        source: "anchor",
      },
      {
        order: 2,
        label: "Power",
        intent: "Same pattern, no brakes.",
        loadHint: "Light — accelerate through the whole range",
        reps: 4,
        restSeconds: 0,
        source: "loaded_explosive",
      },
    ],
    restBetweenRoundsSeconds: 120,
    phases: phases({
      os_q1: ALL_LEGAL(1, 3),
      os_q2: ALL_LEGAL(2, 4),
      os_q3: ALL_LEGAL(1, 3),
      os_q4: ALL_LEGAL(1, 3),
    }),
    minTrainingAge: "developing",
    minAgeYears: 14,
    requiresStrengthFloor: false,
    cnsMultiplier: 1.05,
    equipment: [],
    setsDelta: 0,
    why:
      "Same movement, two speeds. It teaches the pattern first and then teaches the pattern fast, which is how strength actually becomes usable on the field.",
    cue: "Identical technique on both stations. The only thing that changes is intent.",
    bailout: "If the fast station changes your technique, cut the load until it doesn't.",
  },
  {
    id: "pap_primer",
    family: "contrast",
    displayName: "PAP Primer",
    shape: "1 heavy primer · then today's expression work",
    engines: ["lift", "speed", "bat_speed"],
    structure: "stations",
    stations: [
      {
        order: 1,
        label: "Heavy primer",
        intent: "One heavy set to switch the system on.",
        loadHint: "Heavy — crisp, never grinding",
        reps: 2,
        restSeconds: 120,
        source: "anchor",
      },
      {
        order: 2,
        label: "Expression",
        intent: "Cash in the primer on the real work.",
        loadHint: "Competition speed",
        reps: 3,
        restSeconds: 0,
        source: "expression",
      },
    ],
    restBetweenRoundsSeconds: 120,
    phases: phases({
      os_q2: ALL_LEGAL(2, 3),
      os_q3: ALL_LEGAL(2, 3),
      os_q4: ALL_LEGAL(2, 3),
      in_season: ALL_LEGAL(2, 2),
    }),
    minTrainingAge: "developing",
    minAgeYears: 14,
    requiresStrengthFloor: false,
    cnsMultiplier: 1.0,
    equipment: [],
    setsDelta: 0,
    why:
      "One heavy set, then the work that matters. It costs almost nothing in volume and buys a measurable jump in output for the next few minutes.",
    cue: "Rest the full two minutes after the primer. The potentiation peaks late, not early.",
    bailout: "Feeling flat instead of sharp? Skip the primer today — that is data, not failure.",
  },

  // -------------------------------------------------------------------------
  // INTENSITY FAMILY
  // -------------------------------------------------------------------------
  {
    id: "cluster_sets",
    family: "intensity",
    displayName: "Cluster Sets",
    shape: "Reps broken into singles/doubles with 15s intra-set rest",
    engines: ["lift"],
    structure: "cluster",
    stations: [],
    restBetweenRoundsSeconds: 150,
    phases: phases({
      os_q1: ALL_LEGAL(2),
      os_q2: ALL_LEGAL(2),
      os_q3: ALL_LEGAL(2),
      os_q4: ALL_LEGAL(1),
      in_season: ALL_LEGAL(1),
    }),
    minTrainingAge: "developing",
    minAgeYears: 14,
    requiresStrengthFloor: false,
    cnsMultiplier: 1.0,
    equipment: [],
    setsDelta: 0,
    why:
      "Fifteen seconds between reps keeps every rep looking like the first one. You get the same load with better bar speed and less breakdown.",
    cue: "Rack it, breathe, reset the brace, go again. Don't rush the mini-rest.",
    bailout: "If the mini-rest isn't holding speed, the load is too heavy — drop it and keep the structure.",
  },
  {
    id: "wave_loading",
    family: "intensity",
    displayName: "Wave Loading",
    shape: "Ascending waves — heavier each rep, then reset lighter",
    engines: ["lift"],
    structure: "wave",
    stations: [],
    restBetweenRoundsSeconds: 150,
    phases: phases({
      os_q2: ALL_LEGAL(1),
      os_q3: ALL_LEGAL(1),
      os_q4: ALL_LEGAL(2),
    }),
    minTrainingAge: "intermediate",
    minAgeYears: 15,
    requiresStrengthFloor: false,
    cnsMultiplier: 1.05,
    equipment: [],
    setsDelta: 0,
    why:
      "Each wave leaves the next one feeling lighter. It is the safest way to touch heavy loads because you earn every jump inside the session.",
    cue: "Never jump to the next wave if the last rep slowed down.",
    bailout: "Stop the wave where speed stops. That is your top set for today.",
  },
  {
    id: "accommodating_resistance",
    family: "intensity",
    displayName: "Bands / Chains",
    shape: "Accommodating resistance on the main lift",
    engines: ["lift"],
    structure: "wave",
    stations: [],
    restBetweenRoundsSeconds: 120,
    phases: phases({
      os_q2: ALL_LEGAL(1),
      os_q3: ALL_LEGAL(2),
      os_q4: ALL_LEGAL(1),
    }),
    minTrainingAge: "intermediate",
    minAgeYears: 15,
    requiresStrengthFloor: false,
    cnsMultiplier: 1.05,
    equipment: ["bands"],
    setsDelta: 0,
    why:
      "Resistance that grows as you get stronger through the range forces you to keep accelerating instead of coasting at the top.",
    cue: "Accelerate all the way to lockout. The band should be fighting you at the finish.",
    bailout: "No bands available today? Run the same sets straight — nothing else changes.",
  },
  {
    id: "tempo_eccentric",
    family: "intensity",
    displayName: "Tempo / Eccentric",
    shape: "Controlled 3–4s lowering on every rep",
    engines: ["lift"],
    structure: "tempo",
    stations: [],
    restBetweenRoundsSeconds: 120,
    phases: phases({
      os_q1: ALL_LEGAL(3),
      os_q2: ALL_LEGAL(2),
      post_season: ALL_LEGAL(2),
    }),
    minTrainingAge: "beginner",
    minAgeYears: 13,
    requiresStrengthFloor: false,
    cnsMultiplier: 0.95,
    equipment: [],
    setsDelta: 0,
    why:
      "The lowering half is where tissue gets tough. Slowing it down builds tendon and control that fast reps skip right past.",
    cue: "Count the lowering out loud in your head. Own the bottom before you come up.",
    bailout: "If the count breaks down, shorten it to two seconds rather than adding load.",
  },
  {
    id: "isometric_holds",
    family: "intensity",
    displayName: "Isometric Holds",
    shape: "Position holds at the hardest joint angle",
    engines: ["lift"],
    structure: "isometric",
    stations: [],
    restBetweenRoundsSeconds: 90,
    phases: phases({
      os_q1: ALL_LEGAL(2),
      os_q3: ALL_LEGAL(1),
      in_season: ALL_LEGAL(1),
      post_season: ALL_LEGAL(2),
    }),
    minTrainingAge: "advanced",
    minAgeYears: 16,
    requiresStrengthFloor: false,
    cnsMultiplier: 0.9,
    equipment: [],
    setsDelta: 0,
    why:
      "Holding the hardest position builds strength exactly where you are weakest, with almost no soreness cost the next day.",
    cue: "Push into the hold like you are trying to move it, even though nothing moves.",
    bailout: "Shaking is fine. Losing the position is not — end the hold there.",
  },

  // -------------------------------------------------------------------------
  // DENSITY / CAPACITY FAMILY
  // -------------------------------------------------------------------------
  {
    id: "emom",
    family: "density",
    displayName: "EMOM",
    shape: "One short set at the top of every minute",
    engines: ["lift"],
    structure: "emom",
    stations: [],
    restBetweenRoundsSeconds: 0,
    phases: phases({
      os_q1: ALL_LEGAL(2),
      os_q2: ALL_LEGAL(1),
      in_season: ALL_LEGAL(2),
      post_season: ALL_LEGAL(2),
    }),
    minTrainingAge: "beginner",
    minAgeYears: 13,
    requiresStrengthFloor: false,
    cnsMultiplier: 0.9,
    equipment: [],
    setsDelta: 0,
    why:
      "The clock does the pacing for you. Same work, less standing around, and the rest is honest instead of whatever your phone decides.",
    cue: "If a set takes more than 30 seconds, the load is too heavy for the clock.",
    bailout: "Falling behind the minute? Cut a rep, keep the clock.",
  },
  {
    id: "escalating_density",
    family: "density",
    displayName: "Escalating Density",
    shape: "Fixed time window — beat last week's total quality reps",
    engines: ["lift"],
    structure: "density",
    stations: [],
    restBetweenRoundsSeconds: 0,
    phases: phases({
      os_q1: ALL_LEGAL(2),
      post_season: ALL_LEGAL(2),
    }),
    minTrainingAge: "developing",
    minAgeYears: 14,
    requiresStrengthFloor: false,
    cnsMultiplier: 0.9,
    equipment: [],
    setsDelta: 0,
    why:
      "Progress you can see without touching the load: more good reps in the same window, week after week.",
    cue: "Only reps that look like the first one count.",
    bailout: "Form slips? Stop counting and finish the window with clean sets.",
  },
  {
    id: "tri_set",
    family: "density",
    displayName: "Tri-Set",
    shape: "Three accessories back-to-back, rest once at the end",
    engines: ["lift"],
    structure: "giant_set",
    stations: [],
    restBetweenRoundsSeconds: 90,
    phases: phases({
      os_q1: ALL_LEGAL(3),
      os_q2: ALL_LEGAL(2),
      os_q3: ALL_LEGAL(2),
      in_season: ALL_LEGAL(2),
      post_season: ALL_LEGAL(3),
    }),
    minTrainingAge: "beginner",
    minAgeYears: 13,
    requiresStrengthFloor: false,
    cnsMultiplier: 0.95,
    equipment: [],
    setsDelta: 0,
    why:
      "Accessory work does not need long rests. Stacking three of them buys back ten minutes without costing a thing.",
    cue: "Move between exercises, not between phones.",
    bailout: "Out of breath before the third? Take 20 seconds between them — still counts.",
  },
];

export const METHODS_BY_ID: Record<string, MethodDef> = Object.fromEntries(
  METHODS.map((m) => [m.id, m]),
);

export function methodById(id: string | null | undefined): MethodDef | null {
  if (!id) return null;
  return METHODS_BY_ID[id] ?? null;
}

/** Deterministic priority order — earlier ids win ties in the selector. */
export const METHOD_PRIORITY: readonly string[] = [
  "french_contrast",
  "contrast_pair",
  "complex_pair",
  "pap_primer",
  "wave_loading",
  "cluster_sets",
  "accommodating_resistance",
  "isometric_holds",
  "tempo_eccentric",
  "emom",
  "escalating_density",
  "tri_set",
];
