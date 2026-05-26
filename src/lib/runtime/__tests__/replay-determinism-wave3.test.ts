/**
 * Wave 3 closure — Full replay-determinism suite.
 *
 * Asserts:
 *  - byte-identical double replay
 *  - render-order independence (sort by occurred_at, event_id)
 *  - modulators never raise confidence
 *  - self-scoped cycle events never appear in coach/org projections
 *  - lineage refs preserved through projections
 */
import { describe, it, expect } from "vitest";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { cycleState } from "@/lib/runtime/projections/cycleState";
import { rtpState } from "@/lib/runtime/projections/rtpState";
import { illnessState } from "@/lib/runtime/projections/illnessState";
import { envState } from "@/lib/runtime/projections/envState";
import { perceptionState } from "@/lib/runtime/projections/perceptionState";
import { onboardingState } from "@/lib/runtime/projections/onboardingState";
import { shareState } from "@/lib/runtime/projections/shareState";
import { applyModulators, MODULATOR_ORDER } from "@/lib/runtime/modulators";
import type { DailyPrescription } from "@/lib/runtime/prescription";

function mk(over: Partial<AsbEventRow> & { topic_id: string; event_id: string; occurred_at: string }): AsbEventRow {
  return {
    athlete_id: "ath_1",
    actor_role: "player",
    actor_id: "u_1",
    ingested_at: over.occurred_at,
    effective_at: over.occurred_at,
    valid_from: over.occurred_at,
    valid_to: null,
    payload: {},
    engine_version: "test",
    idempotency_key: over.event_id,
    causality_refs: null,
    lineage_refs: null,
    ...over,
  } as AsbEventRow;
}

const CORPUS: AsbEventRow[] = [
  mk({ event_id: "e01", topic_id: "cycle.phase_logged", occurred_at: "2026-01-01T08:00:00Z", payload: { phase: "menstrual", confidence: 0.6, visibility_scope: "self" } }),
  mk({ event_id: "e02", topic_id: "cycle.symptom_logged", occurred_at: "2026-01-01T08:00:00Z", payload: { symptom_severity: "moderate", visibility_scope: "self" } }),
  mk({ event_id: "e03", topic_id: "rtp.restriction_set", occurred_at: "2026-01-02T09:00:00Z", payload: { active: true, ceiling_kind: "recovery", reason: "shoulder" } }),
  mk({ event_id: "e04", topic_id: "rtp.phase_advanced", occurred_at: "2026-01-05T09:00:00Z", payload: { phase: "reintroduction" } }),
  mk({ event_id: "e05", topic_id: "illness.reported", occurred_at: "2026-01-06T09:00:00Z", payload: { severity: "mild" } }),
  mk({ event_id: "e06", topic_id: "illness.resolved", occurred_at: "2026-01-08T09:00:00Z", payload: {} }),
  mk({ event_id: "e07", topic_id: "env.observed", occurred_at: "2026-01-09T09:00:00Z", payload: { heat_index: 92, air_quality: 60 } }),
  mk({ event_id: "e08", topic_id: "perception.captured", occurred_at: "2026-01-09T18:00:00Z", payload: { rpe: 7, mood: "ok" } }),
  mk({ event_id: "e09", topic_id: "onboarding.primer_acknowledged", occurred_at: "2026-01-01T07:00:00Z", payload: {} }),
  mk({ event_id: "e10", topic_id: "onboarding.step_completed", occurred_at: "2026-01-01T07:05:00Z", payload: { step: "welcome" } }),
  mk({ event_id: "e11", topic_id: "share.scope_changed", occurred_at: "2026-01-10T09:00:00Z", payload: { scope: "coach" } }),
  mk({ event_id: "e12", topic_id: "share.granted", occurred_at: "2026-01-10T09:01:00Z", payload: {} }),
];

const baseRx: DailyPrescription = {
  state: "calm", kind: "lift", headline: "h", rationale: [], blocks: [],
  confidence: 0.8, missingness: "complete" as never, sourceEventIds: ["base_evt"],
  engineVersion: "test",
  inputs: { readiness: {} as never, fatigue: {} as never, recovery: {} as never, override: null },
};

function snapshot(rows: AsbEventRow[]) {
  return {
    cycleSelf: cycleState(rows, "self").state,
    cycleCoach: cycleState(rows, "coach").state,
    rtp: rtpState(rows, "coach").state,
    illness: illnessState(rows, "coach").state,
    env: envState(rows, "coach").state,
    perception: perceptionState(rows, "self").state,
    onboarding: onboardingState(rows, "self").state,
    share: shareState(rows, "self").state,
    rx: applyModulators(baseRx, {
      rows, athleteId: "ath_1", viewerScope: "self",
    }),
  };
}

describe("Wave 3 closure — replay determinism", () => {
  it("byte-identical across double replay", () => {
    const a = JSON.stringify(snapshot(CORPUS));
    const b = JSON.stringify(snapshot(CORPUS));
    expect(a).toBe(b);
  });

  it("render-order independence (within same occurred_at, sort by event_id)", () => {
    const shuffled = [...CORPUS].reverse();
    const a = JSON.stringify(snapshot(CORPUS));
    const b = JSON.stringify(snapshot(shuffled));
    expect(a).toBe(b);
  });

  it("self-scoped cycle events never leak to coach scope", () => {
    const coach = cycleState(CORPUS, "coach").state;
    expect(coach.phaseSource).toBeNull();
    expect(coach.symptomSource).toBeNull();
    expect(coach.phase).toBe("unknown");
  });

  it("modulators never raise confidence", () => {
    const out = applyModulators(baseRx, { rows: CORPUS, athleteId: "ath_1", viewerScope: "self" });
    expect((out.prescription.confidence ?? 1)).toBeLessThanOrEqual(baseRx.confidence ?? 1);
  });

  it("MODULATOR_ORDER is fixed and survivability-first", () => {
    expect(MODULATOR_ORDER[0]).toBe("rtp");
    expect(MODULATOR_ORDER[1]).toBe("illness");
  });

  it("lineage refs preserved — output sources superset of base", () => {
    const out = applyModulators(baseRx, { rows: CORPUS, athleteId: "ath_1", viewerScope: "self" });
    for (const s of baseRx.sourceEventIds) {
      expect(out.prescription.sourceEventIds).toContain(s);
    }
  });
});
