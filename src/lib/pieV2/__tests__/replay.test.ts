/**
 * PIE V2 — replay determinism + invariant cross-check tests.
 *
 * Verifies that scoring + aggregation are byte-deterministic across two
 * identical input runs at pinned engine_version. Satisfies replay equivalence
 * obligation per Phase 47 RP-1…RP-10 and Phase 56 RE-1…RE-10.
 */
import { describe, it, expect } from "vitest";
import { scoreSignal } from "../scoring";
import { aggregateSession } from "../aggregate";
import { PIE_V2_ENGINE_VERSION, type PieV2RepInput } from "../types";

function rep(overrides: Partial<PieV2RepInput> = {}): PieV2RepInput {
  return {
    rep_id: "rep-1",
    session_id: "sess-1",
    athlete_id: "ath-1",
    occurred_at: "2026-06-04T12:00:00.000Z",
    provenance: "video_derived",
    energy_angle_deg: 25,
    eyes_on_target: true,
    shoulders_closed_to_footstrike: true,
    leg_lift_to_footstrike_sec: 1.0,
    stride_pct_body_height: 100,
    head_vertical_drop_pct: 1.5,
    hips_fired_toward_target: true,
    glove_inside_frame: true,
    head_offset_from_belly_line_deg: 10,
    shoulder_horizontal_offset_deg: 5,
    rear_foot_drag_foot_lengths: 2,
    rear_foot_drag_direction_clean: true,
    ...overrides,
  };
}

describe("PIE V2 replay determinism", () => {
  it("scoreSignal is deterministic across identical inputs", () => {
    const a = scoreSignal("energy_angle", rep());
    const b = scoreSignal("energy_angle", rep());
    expect(a).toEqual(b);
    expect(a.engine_version).toBe(PIE_V2_ENGINE_VERSION);
  });

  it("aggregateSession produces identical aggregates across runs", () => {
    const reps = [rep({ rep_id: "r1" }), rep({ rep_id: "r2", energy_angle_deg: 22 }), rep({ rep_id: "r3", energy_angle_deg: 27 })];
    const a1 = aggregateSession("sess-1", "ath-1", reps, "2026-06-04T12:00:00.000Z");
    const a2 = aggregateSession("sess-1", "ath-1", reps, "2026-06-04T12:00:00.000Z");
    expect(a1).toEqual(a2);
    expect(a1.engine_version).toBe(PIE_V2_ENGINE_VERSION);
  });

  it("missingness suppresses scoring without fabricating confidence", () => {
    const r = rep({ energy_angle_deg: undefined });
    const s = scoreSignal("energy_angle", r);
    expect(s.score).toBeNull();
    expect(s.tier).toBeNull();
    expect(s.missingness.length).toBeGreaterThan(0);
  });
});
