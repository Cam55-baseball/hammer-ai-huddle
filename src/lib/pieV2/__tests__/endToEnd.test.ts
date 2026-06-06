/**
 * PIE V2 — end-to-end runtime proof (Section 2.1 / 2.3 / 2.4).
 *
 * Drives the deterministic runtime path with real implementations of
 * scoring, aggregation, emission shaping, the safeguarding projection,
 * and the trend roll-up consumed by the coach panel. The only mock is
 * `@/lib/asb/emit` — replaced with an in-memory captor so we can prove
 * emission shape, idempotency, lineage, and engine_version pinning
 * without touching the network. Every other module is the production
 * code path.
 *
 * Proves answers to Section 2 exit criteria:
 *   - pitcher generates populated aggregate
 *   - aggregate reaches coach surfaces (trend roll-up consumes it)
 *   - safeguarding consumes the aggregate (arm_health_caution event
 *     reaches safetyState projection)
 *   - replay is deterministic (two identical runs produce identical
 *     event_id, idempotency_key, payload)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture every emission instead of hitting the network. The captor
// preserves the exact AsbEmitRow shape so downstream projection code
// can consume what would have been written.
type CapturedEvent = {
  event_id: string;
  athlete_id: string;
  topic_id: string;
  occurred_at: string;
  payload: Record<string, unknown>;
  engine_version: string;
  idempotency_key: string;
  causality_refs: unknown;
  lineage_refs: unknown;
};
type CapturedLineage = {
  parent_event_id: string;
  child_event_id: string;
  derivation_type: string;
  engine_version: string;
};
const captured: CapturedEvent[] = [];
const lineage: CapturedLineage[] = [];

vi.mock("@/lib/asb/emit", () => ({
  emitAsbEvent: vi.fn(async (row: CapturedEvent) => {
    captured.push(row);
    return { ok: true, event_id: row.event_id };
  }),
  emitAsbLineage: vi.fn(async (edge: CapturedLineage) => {
    lineage.push(edge);
  }),
}));

import { finalizePieV2Session } from "../finalizeSession";
import { aggregateSession } from "../aggregate";
import { trajectoriesAll } from "../longitudinal";
import { PIE_V2_ENGINE_VERSION, type PieV2RepInput } from "../types";
import { safetyState } from "@/lib/runtime/projections/safeguardingNotifications";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

function rep(overrides: Partial<PieV2RepInput> = {}): PieV2RepInput {
  return {
    rep_id: "rep-base",
    session_id: "sess-e2e-1",
    athlete_id: "ath-e2e-1",
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

beforeEach(() => {
  captured.length = 0;
  lineage.length = 0;
});

describe("PIE V2 runtime end-to-end (Section 2.1 / 2.3 / 2.4)", () => {
  it("capture → aggregate → emit → projection → trend (clean session)", async () => {
    const reps = [
      rep({ rep_id: "r1" }),
      rep({ rep_id: "r2", energy_angle_deg: 24 }),
      rep({ rep_id: "r3", energy_angle_deg: 26 }),
      rep({ rep_id: "r4", energy_angle_deg: 25 }),
    ];

    const result = await finalizePieV2Session({
      session_id: "sess-e2e-1",
      athlete_id: "ath-e2e-1",
      reps,
      recent_aggregates: [],
      computed_at: "2026-06-04T12:30:00.000Z",
      persist: false,
    });

    // Aggregate has populated signals + composite.
    expect(result.aggregate.signals.length).toBeGreaterThan(0);
    const energy = result.aggregate.signals.find((s) => s.signal_id === "energy_angle");
    expect(energy?.sample_count).toBe(4);
    expect(energy?.average).not.toBeNull();
    expect(result.aggregate.pie_v2_composite).not.toBeNull();
    expect(result.aggregate.engine_version).toBe(PIE_V2_ENGINE_VERSION);

    // Exactly one canonical aggregate event emitted; no caution (clean session).
    const aggregates = captured.filter((e) => e.topic_id === "pitching.v2.session_aggregate");
    expect(aggregates).toHaveLength(1);
    expect(aggregates[0].engine_version).toBe(PIE_V2_ENGINE_VERSION);
    expect(aggregates[0].idempotency_key).toBeTruthy();
    expect(result.caution.level).toBe("none");
    expect(result.caution_emitted).toBe(false);

    // Coach surface — trajectoriesAll consumes the same aggregate the coach
    // panel reads from `usePitchingV2Trends`.
    const trajs = trajectoriesAll([result.aggregate]);
    expect(trajs.some((t) => t.signal_id === "energy_angle")).toBe(true);
  });

  it("athlete-reported pain emits arm_health_caution that reaches Safety Center", async () => {
    // RR-6: pain alone escalates to "watch" — system never diagnoses.
    const reps = [rep({ rep_id: "r1", athlete_reported_pain: true })];
    const result = await finalizePieV2Session({
      session_id: "sess-pain-1",
      athlete_id: "ath-pain-1",
      reps,
      computed_at: "2026-06-04T13:00:00.000Z",
      persist: false,
    });

    expect(result.caution.level).toBe("watch");
    expect(result.caution_emitted).toBe(true);

    const cautionEvents = captured.filter((e) => e.topic_id === "pitching.v2.arm_health_caution");
    expect(cautionEvents).toHaveLength(1);
    const c = cautionEvents[0];
    expect(c.payload.athlete_reported_pain).toBe(true);
    expect(c.payload.level).toBe("watch");
    expect(c.engine_version).toBe(PIE_V2_ENGINE_VERSION);

    // Safeguarding projection consumes pitching.v2.* events alongside
    // relational.* — feed it the captured row in the AsbEventRow shape it
    // already accepts. Confirms RR-6 → Safety Center wiring at projection
    // level (production transport ride is supabase.from('asb_events')
    // inserts which the captor stands in for).
    const asbRow: AsbEventRow = {
      event_id: c.event_id,
      athlete_id: c.athlete_id,
      topic_id: c.topic_id,
      occurred_at: c.occurred_at,
      payload: c.payload,
      // The projection only reads topic_id / payload / occurred_at /
      // athlete_id / event_id; remaining columns are tolerated as unknown.
    } as AsbEventRow;

    const { state, meta } = safetyState([asbRow], "self", {
      is_minor: false,
      statusRows: [],
    });
    expect(meta.sourceCount).toBe(1);
    // Watch-level cautions are not safeguarding-class (only "elevated" is),
    // so the projection may filter them out — but the meta proves the
    // pitching.v2.* prefix is being consumed by the safeguarding read-path.
    expect(meta.lastEventId).toBe(c.event_id);
    expect(Array.isArray(state.notifications)).toBe(true);
  });

  it("elevated caution (pain + multiple risk factors) marks safeguarding_category=true", async () => {
    // Force variance + drift signals high enough to produce ≥1 risk factor
    // alongside athlete-reported pain → "elevated".
    const reps = Array.from({ length: 8 }).map((_, i) =>
      rep({
        rep_id: `r${i}`,
        athlete_reported_pain: i === 7,
        arm_slot_deg: 80 + (i % 2 === 0 ? -6 : 6), // high variance
        release_extension_ft: 6 + (i % 2 === 0 ? -0.6 : 0.6),
        leg_lift_to_footstrike_sec: 1.0 + i * 0.1, // tempo decay
      }),
    );
    const result = await finalizePieV2Session({
      session_id: "sess-elev-1",
      athlete_id: "ath-elev-1",
      reps,
      computed_at: "2026-06-04T14:00:00.000Z",
      persist: false,
    });

    expect(result.caution.level).toBe("elevated");
    expect(result.caution.athlete_reported_pain).toBe(true);
    expect(result.caution.contributing_factors.length).toBeGreaterThan(0);

    const cautionEvent = captured.find((e) => e.topic_id === "pitching.v2.arm_health_caution");
    expect(cautionEvent).toBeDefined();
    expect(cautionEvent!.payload.safeguarding_category).toBe(true);
  });

  it("replay determinism — identical inputs produce identical event_id + idempotency_key + payload", async () => {
    const reps = [rep({ rep_id: "r1" }), rep({ rep_id: "r2", energy_angle_deg: 22 })];

    await finalizePieV2Session({
      session_id: "sess-replay",
      athlete_id: "ath-replay",
      reps,
      computed_at: "2026-06-04T15:00:00.000Z",
      persist: false,
    });
    const firstRun = captured.slice();
    captured.length = 0;

    await finalizePieV2Session({
      session_id: "sess-replay",
      athlete_id: "ath-replay",
      reps,
      computed_at: "2026-06-04T15:00:00.000Z",
      persist: false,
    });
    const secondRun = captured.slice();

    expect(secondRun).toHaveLength(firstRun.length);
    for (let i = 0; i < firstRun.length; i++) {
      expect(secondRun[i].event_id).toBe(firstRun[i].event_id);
      expect(secondRun[i].idempotency_key).toBe(firstRun[i].idempotency_key);
      expect(secondRun[i].payload).toEqual(firstRun[i].payload);
      expect(secondRun[i].engine_version).toBe(PIE_V2_ENGINE_VERSION);
    }
  });

  it("aggregateSession is byte-stable across two identical pure runs (no I/O)", () => {
    const reps = [rep({ rep_id: "r1" }), rep({ rep_id: "r2", energy_angle_deg: 23 })];
    const a = aggregateSession("s", "a", reps, "2026-06-04T16:00:00.000Z");
    const b = aggregateSession("s", "a", reps, "2026-06-04T16:00:00.000Z");
    expect(a).toEqual(b);
  });
});
