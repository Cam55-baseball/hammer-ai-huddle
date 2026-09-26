import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { gunzipSync } from "zlib";
import { join } from "path";
import { readContainerFps, bytesSource } from "../containerFps";
import { fpsFloorVerdict, evaluateProbe } from "../videoAcceptance";
import { diagnoseTrack } from "../pose/trackDiagnosis";
import {
  decodeLandmarkSeriesText,
  encodeLandmarkSeriesText,
  type LandmarkSeries,
  type LandmarkSeriesFrame,
} from "../pose/landmarkSeriesFormat";

const FX = join(__dirname, "fixtures");
const container = (f: string) =>
  readContainerFps(bytesSource(new Uint8Array(readFileSync(join(FX, "containers", f)))));

describe("encoded frame rate from the container", () => {
  it("reads progressive mp4 / mov at 15, 60 and 240 fps", async () => {
    expect(await container("prog-15.mp4")).toMatchObject({ status: "ok", fps: 15, frame_count: 15, layout: "progressive" });
    expect(await container("prog-60.mp4")).toMatchObject({ status: "ok", fps: 60, frame_count: 60 });
    expect(await container("prog-240.mov")).toMatchObject({ status: "ok", fps: 240, frame_count: 120, duration_sec: 0.5 });
  });
  it("reads fragmented mp4 (the MediaRecorder layout)", async () => {
    expect(await container("frag-30.mp4")).toMatchObject({ status: "ok", fps: 30, frame_count: 30, layout: "fragmented" });
  });
  it("says unavailable for WebM — never assumes a rate", async () => {
    expect(await container("clip.webm")).toEqual({ status: "unavailable", reason: "not_iso_bmff" });
  });
  it("is deterministic", async () => {
    expect(await container("prog-60.mp4")).toEqual(await container("prog-60.mp4"));
  });
});

describe("frame-rate floor", () => {
  const base = { width: 1080, height: 1920, duration_sec: 3 };
  it("rejects only an encoded rate below 24", () => {
    expect(fpsFloorVerdict({ fps_true: 15, fps_source: "container" })).toEqual({ reject: true, decision: "rejected_encoded_below_floor" });
    expect(fpsFloorVerdict({ fps_true: 60, fps_source: "container" }).reject).toBe(false);
    expect(evaluateProbe({ ...base, fps_true: 15, fps_source: "container" }).ok).toBe(false);
  });
  it("never rejects an unknown rate", () => {
    expect(fpsFloorVerdict({ fps_true: null, fps_source: "unknown" })).toEqual({ reject: false, decision: "accepted_fps_unknown" });
    expect(evaluateProbe({ ...base, fps_true: null, fps_source: "unknown" }).ok).toBe(true);
  });
});

/* ---------------- tracking diagnosis ---------------- */

const loadFixture = (f: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(FX, f))).toString());

function standing(dx = 0, dy = 0, scale = 1, vis = 0.95): { normalized: number[]; visibility: number[] } {
  const n: number[] = [];
  const v: number[] = [];
  for (let k = 0; k < 33; k++) {
    let x = 0.5, y = 0.5;
    if (k <= 10) y = 0.2;
    else if (k <= 22) y = 0.35;
    else if (k <= 24) y = 0.5;
    else if (k <= 26) y = 0.65;
    else y = 0.8;
    if (k === 27 || k === 29 || k === 31) x = 0.45;
    if (k === 28 || k === 30 || k === 32) x = 0.55;
    n.push(0.5 + (x - 0.5) * scale + dx, 0.5 + (y - 0.5) * scale + dy, 0);
    v.push(vis);
  }
  return { normalized: n, visibility: v };
}

function makeSeries(frames: Array<Partial<LandmarkSeriesFrame> & { pose_detected: boolean }>, reliable = false): LandmarkSeries {
  return {
    header: {
      format: "ndjson.gz@1", video_sha256_hex: "x", landmark_model_id: "m", landmark_model_version: "v",
      fps_true: 30, fps_source: "container", width: 1080, height: 1920, orientation: "portrait",
      frame_count: frames.length, window_start_frame: 0, window_end_frame: frames.length - 1,
      window_start_sec: 0, window_end_sec: frames.length / 30, window_rule: "t", inference_width: 360,
      inference_height: 640, landmark_count: 33, subject_track_reliable: reliable,
      subject_frames_lost: frames.filter((f) => !f.pose_detected).length, subject_reacquisitions: 0,
    },
    frames: frames.map((f, i) => ({
      frame_index: i, timestamp_seconds: i / 30, world: [],
      normalized: [], visibility: [], ...f,
    })) as LandmarkSeriesFrame[],
  };
}

describe("tracking diagnosis", () => {
  it("still clip is clean — no invented cause", () => {
    expect(diagnoseTrack(loadFixture("still-subject-15d75bc9.ndjson.gz")).status).toBe("clean");
  });

  it("swing clip edf45130: unreliable, no cause with evidence → undetermined, people count not assessed", () => {
    const d = diagnoseTrack(loadFixture("motion-hitting-edf45130.ndjson.gz"));
    expect(d.status).toBe("undetermined");
    if (d.status === "clean") throw new Error();
    expect(d.frames_lost).toBe(76);
    expect(d.reacquisitions).toBe(12);
    expect(d.not_assessed).toContain("multiple_people");
  });

  it("athlete leaving at the right edge, with the time", () => {
    const fr = [];
    for (let i = 0; i < 30; i++) fr.push({ pose_detected: true, candidates_detected: 1, ...standing(i * 0.0155) });
    for (let i = 0; i < 20; i++) fr.push({ pose_detected: false, candidates_detected: 0, gap_reason: "no_person" as const });
    const d = diagnoseTrack(makeSeries(fr));
    if (d.status === "clean") throw new Error("expected diagnosis");
    // A body sliding rigidly sideways is geometrically identical to a pan, so
    // both may be reported; the exit and its time must be among them.
    const i = d.causes.findIndex((c) => c.kind === "left_frame");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(d.messages[i].detail).toContain("at 1s off the right edge");
  });

  it("feet cut off", () => {
    const fr = [];
    for (let i = 0; i < 30; i++) {
      const s = standing();
      for (const k of [27, 28]) s.visibility[k] = 0.1;
      fr.push({ pose_detected: true, candidates_detected: 1, ...s });
    }
    const d = diagnoseTrack(makeSeries(fr, true));
    if (d.status === "clean") throw new Error();
    expect(d.causes[0]).toMatchObject({ kind: "body_cut_off", end: "feet" });
  });

  it("two people, athlete lost to the other body and regained — counted", () => {
    const fr = [];
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 10; i++) fr.push({ pose_detected: true, candidates_detected: 2, ...standing() });
      for (let i = 0; i < 4; i++) fr.push({ pose_detected: false, candidates_detected: 2, gap_reason: "no_match" as const });
    }
    fr.push({ pose_detected: true, candidates_detected: 2, ...standing() });
    const d = diagnoseTrack(makeSeries(fr));
    if (d.status === "clean") throw new Error();
    const m = d.causes.find((c) => c.kind === "multiple_people");
    expect(m).toMatchObject({ max_people: 2, lost_to_other: 12, regained: 3 });
    expect(d.messages.find((x) => x.title.startsWith("More than one"))!.detail).toContain("find them again 3 times");
  });

  it("low visibility across the whole clip", () => {
    const fr = [];
    for (let i = 0; i < 30; i++) fr.push({ pose_detected: true, candidates_detected: 1, ...standing(0, 0, 1, 0.45) });
    const d = diagnoseTrack(makeSeries(fr, true));
    if (d.status === "clean") throw new Error();
    expect(d.causes.map((c) => c.kind)).toContain("low_light");
  });

  it("camera pan: whole body shifts rigidly → camera_moving", () => {
    const fr = [];
    for (let i = 0; i < 60; i++) fr.push({ pose_detected: true, candidates_detected: 1, ...standing(-0.2 + i * 0.006) });
    const d = diagnoseTrack(makeSeries(fr, true));
    if (d.status === "clean") throw new Error();
    expect(d.causes.map((c) => c.kind)).toContain("camera_moving");
  });

  it("athlete walking toward the lens (size changes) is NOT called camera movement", () => {
    const fr = [];
    for (let i = 0; i < 60; i++) fr.push({ pose_detected: true, candidates_detected: 1, ...standing(-0.1 + i * 0.004, 0, 0.8 + i * 0.006) });
    const d = diagnoseTrack(makeSeries(fr, true));
    expect(d.status === "clean" || !d.causes.some((c) => c.kind === "camera_moving")).toBe(true);
  });
});

describe("series format carries per-frame people count and gap reason", () => {
  it("round-trips new fields and still decodes old rows", () => {
    const s = makeSeries([
      { pose_detected: true, candidates_detected: 2, ...standing() },
      { pose_detected: false, candidates_detected: 2, gap_reason: "no_match" },
      { pose_detected: false, candidates_detected: 0, gap_reason: "decode_failed" },
    ]);
    const back = decodeLandmarkSeriesText(encodeLandmarkSeriesText(s));
    expect(back.frames[0].candidates_detected).toBe(2);
    expect(back.frames[0].gap_reason).toBeUndefined();
    expect(back.frames[1].gap_reason).toBe("no_match");
    expect(back.frames[2].gap_reason).toBe("decode_failed");
    const legacy = loadFixture("still-subject-15d75bc9.ndjson.gz");
    expect(legacy.frames[0].candidates_detected).toBeUndefined();
  });
});
