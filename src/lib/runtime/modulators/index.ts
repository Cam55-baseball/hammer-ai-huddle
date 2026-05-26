/**
 * Wave 3 — Modulator registry + applyModulators pipeline.
 *
 * Pure: given (prescription, context) → (prescription with bounded modulation
 * applied + per-domain envelope trace). Never authors organism truth.
 */
import type {
  DailyPrescription,
  SessionKind,
} from "@/lib/runtime/prescription";
import {
  MODULATOR_ORDER,
  type Modulator,
  type ModulatorContext,
  type ModulatorEnvelope,
  tightestConfidence,
  tightestKind,
} from "./types";
import { cycleModulator } from "./cycle";
import { rtpModulator } from "./rtp";
import { illnessModulator } from "./illness";
import { respiratoryModulator } from "./respiratory";
import { environmentModulator } from "./environment";
import { positionModulator } from "./position";
import { perceptionModulator } from "./perception";

const REGISTRY: Record<(typeof MODULATOR_ORDER)[number], Modulator> = {
  rtp: rtpModulator,
  illness: illnessModulator,
  cycle: cycleModulator,
  respiratory: respiratoryModulator,
  environment: environmentModulator,
  position: positionModulator,
  perception: perceptionModulator,
};

const KIND_RANK: Record<SessionKind, number> = {
  rest: 0, recovery: 1, hybrid: 2, throw: 3, sprint: 4, lift: 5,
};

/** Apply modulators in canonical order. Pure. */
export function applyModulators(
  base: DailyPrescription,
  ctx: ModulatorContext,
): { prescription: DailyPrescription; envelopes: ModulatorEnvelope[] } {
  const envelopes: ModulatorEnvelope[] = [];
  let kind = base.kind;
  let confidence = base.confidence;
  const extraNotes: string[] = [];
  const extraSources: string[] = [];

  for (const domain of MODULATOR_ORDER) {
    const env = REGISTRY[domain](ctx);
    envelopes.push(env);
    if (env.ceilingKind && KIND_RANK[env.ceilingKind] < KIND_RANK[kind]) {
      kind = env.ceilingKind;
    }
    confidence = tightestConfidence(confidence, env.confidenceCeiling);
    for (const n of env.notes) extraNotes.push(n);
    for (const s of env.sources) extraSources.push(s);
  }

  if (kind === base.kind && extraNotes.length === 0) {
    return { prescription: base, envelopes };
  }

  // Merge sources (de-dup, preserve order).
  const mergedSources = Array.from(
    new Set([...base.sourceEventIds, ...extraSources]),
  );

  return {
    prescription: {
      ...base,
      kind,
      confidence,
      sourceEventIds: mergedSources,
      rationale: [...base.rationale, ...extraNotes],
    },
    envelopes,
  };
}

export { MODULATOR_ORDER };
export type { ModulatorContext, ModulatorEnvelope } from "./types";
