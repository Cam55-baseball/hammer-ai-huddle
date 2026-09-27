import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { decodeLandmarkSeriesText, type LandmarkSeries } from "../pose/landmarkSeriesFormat";
import { runPitchingTiles, PITCHING_OWNER_STANDARDS, HEAD_VERTICAL_NOISE_FLOOR_PCT, SHOULDER_ROTATION_NOISE_FLOOR_DEG } from "../metrics/pitchingTiles";
import { pointPx, bodyScalePx } from "../anchors/poseKinematics";
import { detectStanceLock, headCentroidPx, unroll } from "../anchors/stanceLock";
import { solveSegment } from "../rigid/segmentRotation";
import { oneEuroZeroPhase, HEAD_ONE_EURO } from "../filters/oneEuro";
import { ownerTileAudience, confirmedCount } from "../metrics/ownerTileVisibility";

const load = (n: string): LandmarkSeries => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
const still = load("still-subject-15d75bc9.ndjson.gz");
const clipA = load("swing-24fps-914cf54c.ndjson.gz");
const clipB = load("swing-24fps-9d2e117e.ndjson.gz");
const tiles = (r: ReturnType<typeof runPitchingTiles>) => [r.energy_angle_deg, r.premature_shoulder_open_deg, r.head_vertical_movement_pct, r.lift_thrust];

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
  it("head floor = worst 1.5 s window of tracking jitter (raw minus <0.5 Hz trend) on the still clip", () => {
    const lock = detectStanceLock(still, { before_frame: 1e9 });
    const st = lock.baseline!.stature_px!;
    const y = still.frames.map((f) => { const h = headCentroidPx(still, f); return h ? unroll(h, lock.baseline!.roll_deg).y : null; });
    const m3 = y.map((v, i) => (v == null ? null : [y[i - 1] ?? v, v, y[i + 1] ?? v].sort((a, b) => (a as number) - (b as number))[1]));
    const trend = oneEuroZeroPhase(m3, m3.map(() => 0), still.header.fps_true, { min_cutoff_hz: 0.5, beta: 0, d_cutoff_hz: 1 });
    const res = m3.map((v, k) => (v == null || trend[k] == null ? null : (v as number) - (trend[k] as number)));
    const win = Math.round(1.5 * still.header.fps_true); let worst = 0;
    for (let i = 0; i + win <= res.length; i++) { const a = res.slice(i, i + win).filter((v): v is number => v != null); worst = Math.max(worst, ((Math.max(...a) - Math.min(...a)) / st) * 100); }
    expect(worst).toBeLessThanOrEqual(HEAD_VERTICAL_NOISE_FLOOR_PCT);
    expect(worst).toBeGreaterThan(HEAD_VERTICAL_NOISE_FLOOR_PCT - 0.1);
  });
  it("shoulder floor = rigid-solve angle range on the still clip, zero tracking failures", () => {
    const lock = detectStanceLock(still, { before_frame: 1e9 });
    const r = still.frames.map((f) => solveSegment(still, f, 11, 12, lock.baseline!.shoulder_len_px!));
    expect(r.filter((x) => x.tracking_failure).length).toBe(0);
    const th = r.map((x) => x.theta_deg).filter((v): v is number => v != null);
    const range = Math.max(...th) - Math.min(...th);
    expect(range).toBeLessThanOrEqual(SHOULDER_ROTATION_NOISE_FLOOR_DEG);
    expect(range).toBeGreaterThan(SHOULDER_ROTATION_NOISE_FLOOR_DEG - 0.1);
  });
  it("still clip has no stance lock before movement (nothing moves afterwards)", () => {
    expect(detectStanceLock(still).detail).toBe("no_settled_stance_before_movement");
  });
  it("zero-phase filter does not shift a step in time and is deterministic", () => {
    const x = Array.from({ length: 60 }, (_, i) => (i < 30 ? 0 : 10));
    const g = x.map(() => 0);
    const a = oneEuroZeroPhase(x, g, 30, HEAD_ONE_EURO), b = oneEuroZeroPhase(x, g, 30, HEAD_ONE_EURO);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(Math.abs((a[29] as number) + (a[30] as number) - 10)).toBeLessThan(1e-9); // symmetric about the step
  });
});

describe("tiles 19/20 audience", () => {
  it("stays staff-only until n≥10 confirmed clips across both sides", () => {
    expect(confirmedCount("head_path_through_stride")).toEqual({ total: 1, left: 1, right: 0 });
    expect(ownerTileAudience("head_path_through_stride")).toBe("staff");
    expect(ownerTileAudience("back_hip_socket_hold")).toBe("staff");
  });
});
