/**
 * PERMANENT REGRESSION — the still-subject clip.
 *
 * Fixture: owner-uploaded clip 15d75bc9-07e8-4adb-9eb1-e1fbf3d59efa
 * (video_landmark_runs ca0ec35f-5410-4394-aebd-8fb42442aa02), 328 frames at
 * 29.97 fps, pose on every frame, mean visibility 0.974. The subject stands
 * completely still for ~11 s. The correct answer for EVERY anchor and EVERY
 * tile is "nothing happened" → missingness. Any anchor that returns a frame,
 * or any tile that returns a value, on this clip is broken.
 *
 * Positive control: owner clip edf45130 (real movement, 59.94 fps) must pass
 * the movement gate, so the gate is not simply refusing everything.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { decodeLandmarkSeriesText, type LandmarkSeries } from "../pose/landmarkSeriesFormat";
import { evaluateMovementGate, movementScore, STILL_REFERENCE_MAX_BODY } from "../gates/movementGate";
import { densePoseRowToPoseFrameRow } from "../pose/poseRunner";
import { toPeakLegLiftFrames, toPlantFrames } from "../pose/toAnchorFrames";
import { findPeakLegLiftFrame } from "../anchors/peakLegLift";
import { findFrontFootStrikeFrame } from "../anchors/frontFootStrike";
import { runTempoPipeline } from "../pipeline/tempoPipeline";
import { detectAllPoseEvents } from "../anchors/poseEvents";
import { detectFrontFootPlant } from "../detectors/dPlant";
import { SESSION_METRICS, computeRepMetrics } from "@/lib/delaycam/session/metricRegistry";

function load(name: string): LandmarkSeries {
  const raw = readFileSync(join(__dirname, "fixtures", name));
  return decodeLandmarkSeriesText(gunzipSync(raw).toString("utf8"));
}

const still = load("still-subject-15d75bc9.ndjson.gz");
const rows = still.frames.map((f) => densePoseRowToPoseFrameRow(f.frame_index, f.timestamp_seconds, f));

describe("still-subject clip — every answer is missingness", () => {
  it("fixture is the clip we think it is", () => {
    expect(still.frames.length).toBe(328);
    expect(still.header.fps_true).toBe(29.97);
    expect(still.frames.every((f) => f.pose_detected)).toBe(true);
  });

  it("movement gate refuses the whole analysis", () => {
    const g = evaluateMovementGate(still);
    expect(g.status).toBe("refused");
    if (g.status === "refused") expect(g.reason).toBe("no_movement_detected");
    // Threshold basis: the recorded still-clip maximum must stay reproducible.
    expect(Math.abs((movementScore(still) ?? 0) - STILL_REFERENCE_MAX_BODY)).toBeLessThan(0.01);
  });

  it("D-PEAK-LIFT refuses on both ankles", () => {
    for (const idx of [27, 28]) {
      const r = findPeakLegLiftFrame(toPeakLegLiftFrames(rows, idx));
      expect(r.frame_index).toBeNull();
      expect(r.missingness?.missing_reason).toBe("anchor_not_detected");
    }
  });

  it("D-PLANT (tempo front-foot strike) refuses on both ankles", () => {
    for (const idx of [27, 28]) {
      const r = findFrontFootStrikeFrame(toPlantFrames(rows, idx));
      expect(r.frame_index).toBeNull();
      expect(r.missingness?.missing_reason).toBe("anchor_not_detected");
    }
  });

  it("D-PLANT (series detector) finds no contact and no full plant", () => {
    for (const front_side of ["auto", "left", "right"] as const) {
      const r = detectFrontFootPlant(still, { front_side });
      expect(r.front_foot_first_contact?.frame_index ?? null).toBeNull();
      expect(r.front_foot_full_plant?.frame_index ?? null).toBeNull();
    }
  });

  it("tempo tile is missing, never a number", async () => {
    const peak = toPeakLegLiftFrames(rows);
    const plant = toPlantFrames(rows);
    const r = await runTempoPipeline({
      video_sha256_hex: still.header.video_sha256_hex,
      fps_true: still.header.fps_true,
      landing_time_sec: null,
      direction_sign: 1,
      calibration_h_px: still.header.height,
      pose_frames: peak.map((p, i) => ({ ...p, front_ankle_y: plant[i].front_ankle_y })),
    });
    expect(r.metric.value).toBeNull();
    expect(r.metric.missingness).not.toBeNull();
  });

  it("every pose-derived event anchor returns missingness", () => {
    for (const direction_sign of [1, -1, null] as const) {
      for (const throwing_side of ["left", "right"] as const) {
        const all = detectAllPoseEvents(still, { direction_sign, throwing_side, front_foot_full_plant_frame: null });
        for (const [k, a] of Object.entries(all)) {
          // D-STILL is the one anchor whose correct answer on a still clip IS
          // a stillness window — it describes the absence of movement.
          if (k === "still") continue;
          expect({ k, frame: a.frame_index }).toEqual({ k, frame: null });
          expect(a.missingness).not.toBeNull();
        }
      }
    }
  });

  it("every DelayCam session tile returns missingness", () => {
    expect(SESSION_METRICS.length).toBeGreaterThan(0);
    for (const module of ["hitting", "pitching", "throwing"] as const) {
      for (const sport of ["baseball", "softball"] as const) {
        const out = computeRepMetrics(module, sport, { rows, fps: still.header.fps_true, tier: "t_high" });
        for (const [k, v] of Object.entries(out)) {
          expect({ k, missing: "missing" in v }).toEqual({ k, missing: true });
        }
      }
    }
  });
});

describe("positive control — a clip with real movement", () => {
  it("passes the movement gate", () => {
    const g = evaluateMovementGate(load("motion-hitting-edf45130.ndjson.gz"));
    expect(g.status).toBe("movement");
  });
});
