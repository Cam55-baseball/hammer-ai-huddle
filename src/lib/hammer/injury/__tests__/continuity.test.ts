import { describe, it, expect } from "vitest";
import {
  buildInjuryArcs,
  activeRegions,
  type InjuryEventRow,
} from "@/lib/hammer/injury/continuity";

function ev(
  event_id: string,
  topic_id: string,
  occurred_at: string,
  payload: Record<string, unknown>,
  actor_role = "athlete",
): InjuryEventRow {
  return { event_id, topic_id, occurred_at, payload, actor_role };
}

const R = "relational.injury.reported";
const C = "relational.injury.recovery_checkpoint";
const A = "relational.injury.rtp_authorized";
const U = "relational.injury.updated";

describe("RR-6 injury continuity projection", () => {
  it("opens an arc at report and stays in `reported` with no checkpoints", () => {
    const arcs = buildInjuryArcs([
      ev("e1", R, "2026-01-01T00:00:00Z", {
        body_region: "shoulder",
        severity_band: "moderate",
        participation_status: "limited",
        reported_symptoms: ["soreness"],
      }),
    ]);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].stage).toBe("reported");
    expect(arcs[0].origin_event_id).toBe("e1");
  });

  it("keeps the arc adapting while the athlete still reports a limiting status", () => {
    const arcs = buildInjuryArcs([
      ev("e1", R, "2026-01-01T00:00:00Z", {
        body_region: "knee",
        participation_status: "limited",
      }),
      ev("e2", C, "2026-01-03T00:00:00Z", {
        body_region: "knee",
        checkpoint_type: "mobility",
        participation_status: "limited",
      }),
      ev("e3", C, "2026-01-05T00:00:00Z", {
        body_region: "knee",
        checkpoint_type: "strength",
        participation_status: "limited",
      }),
    ]);
    expect(arcs[0].stage).toBe("adapting");
    expect(arcs[0].human_authorized).toBe(false);
  });

  it("never clears an arc without an explicit human authorization", () => {
    const arcs = buildInjuryArcs([
      ev("e1", R, "2026-01-01T00:00:00Z", {
        body_region: "hamstring",
        participation_status: "limited",
      }),
      ev("e2", C, "2026-01-03T00:00:00Z", {
        body_region: "hamstring",
        checkpoint_type: "mobility",
        participation_status: "modified",
      }),
      ev("e3", C, "2026-01-05T00:00:00Z", {
        body_region: "hamstring",
        checkpoint_type: "conditioning",
        participation_status: "full",
      }),
    ]);
    expect(arcs[0].stage).toBe("awaiting_authorization");
    expect(arcs[0].human_authorized).toBe(false);
    expect(activeRegions(arcs)).toEqual(["hamstring"]);
  });

  it("clears only on rtp_authorized and records the authorizing role", () => {
    const arcs = buildInjuryArcs([
      ev("e1", R, "2026-01-01T00:00:00Z", {
        body_region: "elbow",
        participation_status: "limited",
      }),
      ev("e2", C, "2026-01-04T00:00:00Z", {
        body_region: "elbow",
        checkpoint_type: "throwing",
        participation_status: "modified",
      }),
      ev(
        "e3",
        A,
        "2026-01-08T00:00:00Z",
        {
          body_region: "elbow",
          authorizes_event_id: "e1",
          participation_status: "full",
        },
        "parent",
      ),
    ]);
    expect(arcs[0].stage).toBe("cleared");
    expect(arcs[0].authorized_by_role).toBe("parent");
    expect(activeRegions(arcs)).toEqual([]);
  });

  it("re-opens a fresh arc when the same region is reported again after clearing", () => {
    const arcs = buildInjuryArcs([
      ev("e1", R, "2026-01-01T00:00:00Z", {
        body_region: "ankle",
        participation_status: "limited",
      }),
      ev(
        "e2",
        A,
        "2026-01-08T00:00:00Z",
        { body_region: "ankle", authorizes_event_id: "e1", participation_status: "full" },
        "clinician",
      ),
      ev("e3", R, "2026-02-01T00:00:00Z", {
        body_region: "ankle",
        participation_status: "inactive",
      }),
    ]);
    expect(arcs[0].origin_event_id).toBe("e3");
    expect(arcs[0].stage).toBe("reported");
    expect(arcs[0].human_authorized).toBe(false);
  });

  it("is deterministic regardless of input row ordering", () => {
    const rows = [
      ev("e3", U, "2026-01-06T00:00:00Z", {
        body_region: "back",
        participation_status: "modified",
        updates_event_id: "e1",
      }),
      ev("e1", R, "2026-01-01T00:00:00Z", {
        body_region: "back",
        participation_status: "limited",
      }),
      ev("e2", C, "2026-01-03T00:00:00Z", {
        body_region: "back",
        checkpoint_type: "general",
        participation_status: "limited",
      }),
    ];
    const a = buildInjuryArcs(rows);
    const b = buildInjuryArcs([...rows].reverse());
    expect(a).toEqual(b);
    expect(a[0].origin_event_id).toBe("e1");
  });
});
