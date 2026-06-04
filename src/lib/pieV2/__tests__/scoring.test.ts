import { describe, it, expect } from "vitest";
import {
  scoreEnergyAngle,
  scoreTempo,
  scoreStride,
  scoreHeadStability,
  scoreRearFootDrag,
  scoreSeparation,
  scoreAllSignals,
} from "../scoring";
import { aggregateSession } from "../aggregate";
import { PIE_V2_ENGINE_VERSION, type PieV2RepInput } from "../types";

const baseRep: PieV2RepInput = {
  rep_id: "r1",
  session_id: "s1",
  athlete_id: "a1",
  occurred_at: "2026-06-04T12:00:00.000Z",
  provenance: "manual",
};

describe("PIE V2 scoring — replay determinism", () => {
  it("produces identical output for identical input across calls", () => {
    const rep: PieV2RepInput = { ...baseRep, energy_angle_deg: 25 };
    const a = scoreEnergyAngle(rep);
    const b = scoreEnergyAngle(rep);
    expect(a).toEqual(b);
    expect(a.engine_version).toBe(PIE_V2_ENGINE_VERSION);
  });

  it("missing input → null score, null tier, missingness preserved", () => {
    const s = scoreEnergyAngle(baseRep);
    expect(s.score).toBeNull();
    expect(s.tier).toBeNull();
    expect(s.missingness.length).toBeGreaterThan(0);
    expect(s.missingness[0].field).toBe("energy_angle_deg");
  });

  it("energy angle tier boundaries", () => {
    expect(scoreEnergyAngle({ ...baseRep, energy_angle_deg: 25 }).tier).toBe("clean");
    expect(scoreEnergyAngle({ ...baseRep, energy_angle_deg: 18 }).tier).toBe("minor");
    expect(scoreEnergyAngle({ ...baseRep, energy_angle_deg: 12 }).tier).toBe("major");
    expect(scoreEnergyAngle({ ...baseRep, energy_angle_deg: 0 }).tier).toBe("critical");
  });

  it("tempo: ≤1.05s = clean, >1.4s = critical", () => {
    expect(scoreTempo({ ...baseRep, leg_lift_to_footstrike_sec: 1.0 }).tier).toBe("clean");
    expect(scoreTempo({ ...baseRep, leg_lift_to_footstrike_sec: 1.8 }).tier).toBe("critical");
  });

  it("stride: ≥100% BH = clean", () => {
    expect(scoreStride({ ...baseRep, stride_pct_body_height: 105 }).tier).toBe("clean");
  });

  it("head stability: ≤2% drop = clean", () => {
    expect(scoreHeadStability({ ...baseRep, head_vertical_drop_pct: 1.5 }).tier).toBe("clean");
  });

  it("separation false → major or worse", () => {
    const s = scoreSeparation({ ...baseRep, shoulders_closed_to_footstrike: false });
    expect(s.tier === "major" || s.tier === "critical").toBe(true);
  });

  it("rear foot drag: clean direction × ideal length = high score", () => {
    const s = scoreRearFootDrag({
      ...baseRep,
      rear_foot_drag_foot_lengths: 2,
      rear_foot_drag_direction_clean: true,
    });
    expect(s.score).toBeGreaterThanOrEqual(85);
  });

  it("rear foot drag: out-and-around direction collapses score", () => {
    const s = scoreRearFootDrag({
      ...baseRep,
      rear_foot_drag_foot_lengths: 2,
      rear_foot_drag_direction_clean: false,
    });
    expect(s.score).toBeLessThan(60);
  });

  it("scoreAllSignals returns 13 signal results", () => {
    expect(scoreAllSignals(baseRep).length).toBe(13);
  });
});

describe("PIE V2 session aggregate", () => {
  it("composite is null when no scored signals have data", () => {
    const agg = aggregateSession("s1", "a1", [baseRep], "2026-06-04T12:00:00.000Z");
    expect(agg.pie_v2_composite).toBeNull();
  });

  it("composite reflects scored signal weights, ignores tracked-only", () => {
    const reps: PieV2RepInput[] = [1, 2, 3].map((i) => ({
      ...baseRep,
      rep_id: `r${i}`,
      energy_angle_deg: 25,
      leg_lift_to_footstrike_sec: 1.0,
      stride_pct_body_height: 105,
      release_extension_ft: 6.5, // tracked-only — should not influence composite
    }));
    const agg = aggregateSession("s1", "a1", reps, "2026-06-04T12:00:00.000Z");
    expect(agg.pie_v2_composite).not.toBeNull();
    expect(agg.pie_v2_composite!).toBeGreaterThan(80);
  });

  it("athlete_reported_pain_in_session bubbles up", () => {
    const agg = aggregateSession(
      "s1",
      "a1",
      [{ ...baseRep, athlete_reported_pain: true, energy_angle_deg: 25 }],
      "2026-06-04T12:00:00.000Z",
    );
    expect(agg.athlete_reported_pain_in_session).toBe(true);
  });

  it("tracked-only signal aggregate has tier=null even when scored", () => {
    const agg = aggregateSession(
      "s1",
      "a1",
      [{ ...baseRep, release_extension_ft: 6.5 }],
      "2026-06-04T12:00:00.000Z",
    );
    const ext = agg.signals.find((s) => s.signal_id === "extension_consistency")!;
    expect(ext.tier).toBeNull();
    expect(ext.tracked_only).toBe(true);
  });
});
