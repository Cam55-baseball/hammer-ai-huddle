// Method envelopes — training-intelligence-v1 §8.1/§8.2/§8.3.
//
// These replace the main-compound envelope in DOSE_MATRIX for heavy-eligible
// athletes only. Foundation athletes never receive a method, so their doses are
// byte-identical to today's matrix — the smallest possible dose diff (§8.1).
//
// Pure: no clock, no I/O, no database.

import type { DoseEnvelope, DoseRange } from "./doctrine.ts";

export const METHOD_DOCTRINE_VERSION = "method-envelopes-v1";

export type MethodKey =
  | "heavy_triples"
  | "double_eccentric"
  | "banded_velocity"
  | "overcoming_isometric"
  | "concentric"
  | "eccentric";

/** Methods that carry their own envelope. The other two stay on DOSE_MATRIX. */
export const ENVELOPED_METHODS: readonly MethodKey[] = Object.freeze([
  "heavy_triples",
  "double_eccentric",
  "banded_velocity",
  "overcoming_isometric",
] as const);

export type MethodContext = "offseason" | "in_season";

export interface MethodEnvelope extends DoseEnvelope {
  readonly method: MethodKey;
  readonly context: MethodContext;
  /** What the athlete reads for load. Reps in reserve first, never a percentage. */
  readonly loadWords: string;
  readonly tempo: string | null;
  /** Isometric efforts only. */
  readonly holdSeconds: DoseRange | null;
  /** Advisory %1RM label, shown only when the athlete has a logged estimate (§8.3). */
  readonly percentLabel: string | null;
}

function env(e: MethodEnvelope): MethodEnvelope {
  return Object.freeze(e);
}

export const METHOD_ENVELOPES: Readonly<
  Record<MethodKey, Partial<Record<MethodContext, MethodEnvelope>>>
> = Object.freeze({
  heavy_triples: {
    offseason: env({
      method: "heavy_triples",
      context: "offseason",
      sets: [3, 3],
      reps: [3, 3],
      intent: "heavy triples",
      loadWords: "a weight you could lift 6–8 times",
      tempo: "2-0-1-0 or dead-stop",
      holdSeconds: null,
      percentLabel: "≈80–85%",
    }),
    in_season: env({
      method: "heavy_triples",
      context: "in_season",
      sets: [2, 3],
      reps: [3, 3],
      intent: "power anchor",
      loadWords: "a weight you could lift 6–8 times — always leave 3 or more in the tank",
      tempo: "concentric / dead-stop",
      holdSeconds: null,
      percentLabel: "≈80–85%",
    }),
  },
  double_eccentric: {
    offseason: env({
      method: "double_eccentric",
      context: "offseason",
      sets: [2, 3],
      reps: [4, 5],
      intent: "absorb",
      loadWords: "a weight you could lift 7–8 times",
      tempo: "4-2-1-0",
      holdSeconds: null,
      percentLabel: "≈75–80%",
    }),
  },
  banded_velocity: {
    offseason: env({
      method: "banded_velocity",
      context: "offseason",
      sets: [3, 4],
      reps: [3, 5],
      intent: "move it fast",
      loadWords: "about half your max plus bands — move it as fast as you can",
      tempo: "fast",
      holdSeconds: null,
      percentLabel: "≈50%",
    }),
    in_season: env({
      method: "banded_velocity",
      context: "in_season",
      sets: [2, 3],
      reps: [3, 3],
      intent: "velocity reload",
      loadWords: "about half your max plus bands — move it as fast as you can",
      tempo: "fast",
      holdSeconds: null,
      percentLabel: "≈50%",
    }),
  },
  overcoming_isometric: {
    offseason: env({
      method: "overcoming_isometric",
      context: "offseason",
      sets: [2, 4],
      reps: [3, 5],
      intent: "push into the pins",
      loadWords: "push or pull as hard as you can into pins or a wall — full rest between efforts",
      tempo: null,
      holdSeconds: [2, 5],
      percentLabel: null,
    }),
    in_season: env({
      method: "overcoming_isometric",
      context: "in_season",
      sets: [2, 3],
      reps: [3, 3],
      intent: "push into the pins",
      loadWords: "push or pull as hard as you can into pins or a wall — full rest between efforts",
      tempo: null,
      holdSeconds: [3, 3],
      percentLabel: null,
    }),
  },
  concentric: {},
  eccentric: {},
} as const);

export interface HeavyEligibleInput {
  readonly ageYears: number | null | undefined;
  readonly trainingAgeYears: number | null | undefined;
  readonly growthMode?: boolean | null;
  readonly painFlag?: boolean | null;
}

/**
 * §8.1 — age ≥ 16 AND advanced/elite training age AND not in Growth Mode AND no
 * active pain flag. Everyone else rides the Foundation track unchanged.
 */
export function isHeavyEligible(input: HeavyEligibleInput): boolean {
  const age = Number(input.ageYears ?? 0);
  const trainingAge = Number(input.trainingAgeYears ?? 0);
  if (!Number.isFinite(age) || age < 16) return false;
  if (!Number.isFinite(trainingAge) || trainingAge < 6) return false; // advanced+ band
  if (input.growthMode === true) return false;
  if (input.painFlag === true) return false;
  return true;
}

export function methodEnvelope(
  method: MethodKey | null | undefined,
  context: MethodContext,
): MethodEnvelope | null {
  if (!method) return null;
  const row = METHOD_ENVELOPES[method];
  if (!row) return null;
  // Law L0.3 — a method with no envelope for this context is simply not
  // available here. No falling back to the offseason envelope: that is how
  // eccentric overload would leak into the season.
  return row[context] ?? null;
}

/** The plain-English line the card prints under a method lift. */
export function methodSentence(e: MethodEnvelope): string {
  const tempo = e.tempo ? ` Tempo ${e.tempo}.` : "";
  const hold = e.holdSeconds
    ? ` Hold ${e.holdSeconds[0] === e.holdSeconds[1] ? e.holdSeconds[0] : `${e.holdSeconds[0]}–${e.holdSeconds[1]}`} seconds.`
    : "";
  return `${e.loadWords}.${hold}${tempo}`;
}
