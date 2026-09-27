import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { decodeLandmarkSeriesText, type LandmarkSeries } from "../pose/landmarkSeriesFormat";
import { runPitchingTiles, PITCHING_OWNER_STANDARDS, HEAD_VERTICAL_NOISE_FLOOR_PCT, SHOULDER_ROTATION_NOISE_FLOOR_DEG } from "../metrics/pitchingTiles";
import { pointPx, bodyScalePx } from "../anchors/poseKinematics";
import { ownerTileAudience, confirmedCount } from "../metrics/ownerTileVisibility";

const load = (n: string): LandmarkSeries => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
const still = load("still-subject-15d75bc9.ndjson.gz");
const clipA = load("swing-24fps-914cf54c.ndjson.gz");
const clipB = load("swing-24fps-9d2e117e.ndjson.gz");
const tiles = (r: ReturnType<typeof runPitchingTiles>) => [r.energy_angle_deg, r.premature_shoulder_open_deg, r.head_vertical_movement_pct];

describe("pitching tiles — still clip refuses everything", () => {
  for (const side of ["L", "R", null] as const) {
    it(`side=${side}`, () => {
      const r = runPitchingTiles(still, { throwing_side: side });
      for (const t of tiles(r)) { expect(t.value).toBeNull(); expect(t.verdict).toBeNull(); expect(t.missingness).not.toBeNull(); }
    });
  }
});

describe("pitching tiles — hitting clips refuse with a no-delivery reason", () => {
  const cases: [LandmarkSeries, "L" | "R", string, string][] = [
    [clipA, "L", "pitcher_release_frame_missing", "no_pitching_delivery:throwing_wrist_below_shoulder_at_release"],
    [clipA, "R", "anchor_not_detected", "no_pitching_delivery:plant_missing:no_observed_frames_after_lift"],
    [clipB, "L", "anchor_not_detected", "no_pitching_delivery:peak_leg_lift_missing"],
    [clipB, "R", "pitcher_release_frame_missing", "no_pitching_delivery:release_too_long_after_plant"],
  ];
  for (const [s, side, reason, detail] of cases) {
    it(`${s === clipA ? "914cf54c" : "9d2e117e"} side=${side}`, () => {
      const r = runPitchingTiles(s, { throwing_side: side });
      expect(r.delivery.ok).toBe(false);
      expect(r.delivery.refusal_detail).toBe(detail);
      for (const t of tiles(r)) { expect(t.value).toBeNull(); expect(t.missingness?.missing_reason).toBe(reason); expect(t.lineage.gate).toBe(detail); }
    });
  }
  it("is byte-identical across runs", () => {
    const runs = [0, 1, 2].map(() => JSON.stringify(runPitchingTiles(clipB, { throwing_side: "R" })));
    expect(new Set(runs).size).toBe(1);
  });
});

describe("standards are owner-supplied, floors are measured", () => {
  it("labels every standard as an owner coaching standard", () => {
    for (const s of Object.values(PITCHING_OWNER_STANDARDS)) expect(s.source).toBe("owner_coaching_standard");
  });
  it("head floor matches the still clip (centroid, 3-frame median, % of stature)", () => {
    const H = [0, 2, 5, 7, 8];
    const ys = still.frames.map((f) => { let y = 0; for (const i of H) { const p = pointPx(still, f, i); if (!p) return null; y += p.y; } return y / 5; }).filter((v): v is number => v != null);
    const m3 = ys.map((v, i) => [ys[i - 1] ?? v, v, ys[i + 1] ?? v].sort((a, b) => a - b)[1]);
    const pct = ((Math.max(...m3) - Math.min(...m3)) / (bodyScalePx(still)! / 0.779)) * 100;
    expect(pct).toBeLessThanOrEqual(HEAD_VERTICAL_NOISE_FLOOR_PCT);
    expect(pct).toBeGreaterThan(HEAD_VERTICAL_NOISE_FLOOR_PCT - 0.1);
  });
  it("shoulder floor matches the still clip x–z line range", () => {
    const a = still.frames.filter((f) => f.pose_detected).map((f) => { const N = f.normalized; return (Math.atan2((N[35] - N[38]), Math.abs(N[33] - N[36])) * 180) / Math.PI; });
    expect(Math.max(...a) - Math.min(...a)).toBeLessThanOrEqual(SHOULDER_ROTATION_NOISE_FLOOR_DEG);
  });
});

describe("tiles 19/20 audience", () => {
  it("stays staff-only until n≥10 confirmed clips across both sides", () => {
    expect(confirmedCount("head_path_through_stride")).toEqual({ total: 1, left: 1, right: 0 });
    expect(ownerTileAudience("head_path_through_stride")).toBe("staff");
    expect(ownerTileAudience("back_hip_socket_hold")).toBe("staff");
  });
});
