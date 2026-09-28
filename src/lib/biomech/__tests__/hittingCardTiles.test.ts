import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { runHittingCardTiles } from "../metrics/hittingCardTiles";
import { detectStanceLock } from "../anchors/stanceLock";
import { buildSegmentValidity, SEGMENT_TOL } from "../validity/segmentValidity";

const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
const still = load("still-subject-15d75bc9.ndjson.gz"), A = load("swing-24fps-914cf54c.ndjson.gz"), B = load("swing-24fps-9d2e117e.ndjson.gz");
type T = { value: number | null; verdict: string | null; lineage: Record<string, unknown> };
const tiles = (r: Record<string, unknown>) => Object.entries(r).filter(([k]) => k !== "version") as [string, T][];

describe("segment validity", () => {
  it("20% tolerance; 914cf54c left wrist rejected in the load (strict), hips never touched by a bad wrist", () => {
    expect(SEGMENT_TOL).toBe(0.2);
    const lock = detectStanceLock(A); const v = buildSegmentValidity(A, lock)!;
    const k = A.frames.findIndex((f) => f.frame_index === 79);
    expect(v.trustedStrict(k, 15)).toBe(false);
    expect(v.trusted(k, 23) && v.trusted(k, 24)).toBe(true);
  });
});

describe("hitting card tiles 6, 9–13, 16–21, 22", () => {
  it("still clip: every tile missing, both sides", () => {
    for (const side of ["L", "R"] as const) for (const [, t] of tiles(runHittingCardTiles(still, { side }))) expect(t.value).toBeNull();
  });
  it("914cf54c Left — owner-confirmed reference values", () => {
    const r = runHittingCardTiles(A, { side: "L" }) as unknown as Record<string, T>;
    // Owner doctrine 2026-09-28 re-spec.
    expect(r.heel_plant.value).toBe(7.7709); expect(r.heel_plant.verdict).toBe("fail");
    expect(r.sequencing.verdict).toBe("fail");
    expect(r.sequencing.lineage.out_of_order).toEqual(["torso_before_hips"]);
    expect(r.back_elbow_connection.value).toBe(17.8549); expect(r.back_elbow_connection.verdict).toBe("pass");
    expect(r.shoulder_plane_steadiness.value).toBeNull();
    expect(r.shoulder_plane_steadiness.lineage.reason).toBe("swing_peak_not_after_p4_start");
    expect(r.finish_balance.value).toBeNull();
    expect(r.shoulder_to_shoulder_hold.verdict).toBe("fail");
    expect((r.shoulder_to_shoulder_hold.lineage.outputs as Record<string, unknown>).front_shoulder_leak_before_swing_peak).toBe(true);
    expect(r.back_knee_flex_maintained.value).toBe(-7.2081); expect(r.back_knee_flex_maintained.verdict).toBe("pass");
    expect(r.post_landing_hip_drift.value).toBe(6.8209); expect(r.post_landing_hip_drift.verdict).toBe("fail");
    expect(r.post_landing_hip_drift.lineage.hips_rotating).toBe(true);
    expect(r.hands_stay_up_at_plant.value).toBe(7.125); expect(r.hands_stay_up_at_plant.verdict).toBe("pass");
    expect(r.lead_elbow_bend_increasing.value).toBeNull();
    expect(r.lead_elbow_bend_increasing.lineage.p2_reference_elbow_deg).not.toBeNull();
    expect(r.head_vertical_movement_post_landing.value).toBe(0); expect(r.head_vertical_movement_post_landing.verdict).toBe("pass");
    expect(r.pelvis_rotation_efficiency.value).toBeNull();
    expect(String(r.hitters_move.lineage.reason)).toBe("constituents_not_all_graded");
  });
  it("wrong side changes the answer or refuses", () => {
    const l = runHittingCardTiles(A, { side: "L" }) as unknown as Record<string, T>, r = runHittingCardTiles(A, { side: "R" }) as unknown as Record<string, T>;
    for (const [k, t] of tiles(l)) if (t.value != null) expect(r[k].value).not.toBe(t.value);
  });
  it("no repeating value across clips/sides (constant-detector)", () => {
    const vals: Record<string, number[]> = {};
    for (const s of [A, B]) for (const side of ["L", "R"] as const) for (const [k, t] of tiles(runHittingCardTiles(s, { side }))) if (t.value != null && t.value !== 0 && k !== "sequencing") (vals[k] ??= []).push(t.value);
    for (const xs of Object.values(vals)) if (xs.length > 1) expect(new Set(xs).size).toBe(xs.length);
  });
  it("deterministic ×3", () => {
    const s = [0, 1, 2].map(() => JSON.stringify(runHittingCardTiles(A, { side: "L" })));
    expect(new Set(s).size).toBe(1);
  });
});
