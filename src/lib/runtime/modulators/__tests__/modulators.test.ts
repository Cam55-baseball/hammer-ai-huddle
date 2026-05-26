import { describe, it, expect } from "vitest";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { cycleModulator } from "../cycle";
import { rtpModulator } from "../rtp";
import { illnessModulator } from "../illness";
import { environmentModulator } from "../environment";
import { positionModulator } from "../position";
import { perceptionModulator } from "../perception";
import { respiratoryModulator } from "../respiratory";
import { applyModulators } from "../index";
import type { DailyPrescription } from "@/lib/runtime/prescription";

function row(over: Partial<AsbEventRow> & { topic_id: string }): AsbEventRow {
  return {
    event_id: `e_${Math.random().toString(36).slice(2, 8)}`,
    athlete_id: "ath_1",
    topic_id: over.topic_id,
    actor_role: "player",
    actor_id: "u_1",
    occurred_at: new Date().toISOString(),
    ingested_at: new Date().toISOString(),
    effective_at: new Date().toISOString(),
    payload: over.payload ?? {},
    engine_version: "test",
    ...over,
  } as AsbEventRow;
}

const baseRx: DailyPrescription = {
  state: "calm",
  kind: "lift",
  headline: "lift",
  rationale: [],
  blocks: [],
  confidence: 0.9,
  missingness: null,
  sourceEventIds: ["base_1"],
  engineVersion: "test",
  inputs: {} as any,
};

describe("cycle modulator", () => {
  it("returns pass-through for non-self viewers", () => {
    const env = cycleModulator({
      rows: [row({ topic_id: "cycle.phase_logged", payload: { phase: "menstrual" } })],
      athleteId: "ath_1",
      viewerScope: "coach",
    });
    expect(env.ceilingKind).toBeNull();
    expect(env.notes).toEqual([]);
  });
  it("caps to recovery on severe symptoms (self viewer)", () => {
    const env = cycleModulator({
      rows: [
        row({
          topic_id: "cycle.symptom_logged",
          payload: { symptom_severity: "severe" },
        }),
      ],
      athleteId: "ath_1",
      viewerScope: "self",
    });
    expect(env.ceilingKind).toBe("recovery");
    expect(env.sources.length).toBe(1);
  });
});

describe("rtp modulator", () => {
  it("respects explicit restriction ceiling", () => {
    const env = rtpModulator({
      rows: [
        row({
          topic_id: "rtp.restriction_set",
          payload: { active: true, ceiling_kind: "hybrid", reason: "elbow" },
        }),
      ],
      athleteId: "ath_1",
      viewerScope: "self",
    });
    expect(env.ceilingKind).toBe("hybrid");
    expect(env.notes[0]).toMatch(/elbow/);
  });
  it("acute phase forces recovery", () => {
    const env = rtpModulator({
      rows: [
        row({
          topic_id: "rtp.phase_advanced",
          payload: { phase: "acute" },
        }),
      ],
      athleteId: "ath_1",
      viewerScope: "self",
    });
    expect(env.ceilingKind).toBe("recovery");
  });
});

describe("illness modulator", () => {
  it("severe illness forces rest", () => {
    const env = illnessModulator({
      rows: [
        row({ topic_id: "illness.logged", payload: { severity: "severe" } }),
      ],
      athleteId: "ath_1",
      viewerScope: "self",
    });
    expect(env.ceilingKind).toBe("rest");
  });
  it("resolved event clears the ceiling", () => {
    const earlier = new Date(Date.now() - 86_400_000).toISOString();
    const later = new Date().toISOString();
    const env = illnessModulator({
      rows: [
        row({
          topic_id: "illness.logged",
          payload: { severity: "moderate" },
          occurred_at: earlier,
        }),
        row({ topic_id: "illness.resolved", occurred_at: later }),
      ],
      athleteId: "ath_1",
      viewerScope: "self",
    });
    expect(env.ceilingKind).toBeNull();
  });
});

describe("environment modulator", () => {
  it("compound stress caps to recovery", () => {
    const env = environmentModulator({
      rows: [
        row({ topic_id: "env.travel", payload: { severity: "high" } }),
        row({ topic_id: "env.sleep_disruption", payload: { severity: "moderate" } }),
      ],
      athleteId: "ath_1",
      viewerScope: "self",
    });
    expect(env.ceilingKind).toBe("recovery");
  });
});

describe("position modulator", () => {
  it("emits youth optionality note for young athletes", () => {
    const env = positionModulator({
      rows: [
        row({ topic_id: "position.assigned", payload: { position: "pitcher" } }),
      ],
      athleteId: "ath_1",
      viewerScope: "self",
      ageBand: "youth",
    });
    expect(env.notes.some((n) => /optionality/i.test(n))).toBe(true);
    expect(env.ceilingKind).toBeNull();
  });
});

describe("perception modulator", () => {
  it("high fatigue caps to hybrid", () => {
    const env = perceptionModulator({
      rows: [
        row({
          topic_id: "perception.fatigue_logged",
          payload: { fatigue: "high" },
        }),
      ],
      athleteId: "ath_1",
      viewerScope: "self",
    });
    expect(env.ceilingKind).toBe("hybrid");
  });
});

describe("respiratory modulator", () => {
  it("high load caps to hybrid", () => {
    const env = respiratoryModulator({
      rows: [
        row({
          topic_id: "respiratory.load_logged",
          payload: { load: "high" },
        }),
      ],
      athleteId: "ath_1",
      viewerScope: "self",
    });
    expect(env.ceilingKind).toBe("hybrid");
  });
});

describe("applyModulators", () => {
  it("never raises confidence and tightens kind", () => {
    const ctx = {
      rows: [
        row({ topic_id: "illness.logged", payload: { severity: "moderate" } }),
        row({ topic_id: "env.travel", payload: { severity: "high" } }),
        row({ topic_id: "env.sleep_disruption", payload: { severity: "high" } }),
      ],
      athleteId: "ath_1",
      viewerScope: "self" as const,
    };
    const { prescription, envelopes } = applyModulators(baseRx, ctx);
    // illness=recovery, env=recovery → kind <= recovery
    expect(["recovery", "rest"]).toContain(prescription.kind);
    expect(prescription.confidence! <= baseRx.confidence!).toBe(true);
    // All modulator domains accounted for
    expect(envelopes.length).toBe(7);
  });
  it("pass-through when no domain events present", () => {
    const ctx = {
      rows: [],
      athleteId: "ath_1",
      viewerScope: "self" as const,
    };
    const { prescription } = applyModulators(baseRx, ctx);
    expect(prescription.kind).toBe(baseRx.kind);
    expect(prescription.confidence).toBe(baseRx.confidence);
  });
});
