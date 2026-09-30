import { describe, it, expect } from "vitest";
import { solveFieldCamera, projectGround, PLATE_POINTS_IN, basePointsIn } from "../camera/fieldPnP";
import { applyConstraints, type Frame3D } from "../lift3d/constraintStage";

const W = 1920, H = 1080, F = 1500;
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32 - 0.5); }

describe("field PnP", () => {
  it("recovers a behind-plate camera exactly from clean plate taps", () => {
    const cam = { x: 0, y: -240, z: 60 };
    const img = projectGround([...PLATE_POINTS_IN], cam, { x: 0, y: 120, z: 0 }, F, W, H);
    const r = solveFieldCamera([...PLATE_POINTS_IN], img, { imageWidth: W, imageHeight: H });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(Math.abs(r.camera_in.z - 60)).toBeLessThan(1); expect(Math.abs(r.camera_in.y + 240)).toBeLessThan(2); }
  });

  it("accuracy sweep: ±2px tap noise, behind plate", () => {
    const cam = { x: 30, y: -300, z: 66 }, rnd = rng(7), errs: number[] = [];
    const clean = projectGround([...PLATE_POINTS_IN], cam, { x: 0, y: 200, z: 0 }, F, W, H);
    for (let k = 0; k < 200; k++) {
      const img = clean.map((p) => ({ x: p.x + 4 * rnd(), y: p.y + 4 * rnd() }));
      const r = solveFieldCamera([...PLATE_POINTS_IN], img, { imageWidth: W, imageHeight: H, focalPx: F });
      if (r.ok) errs.push(Math.hypot(r.camera_in.x - cam.x, r.camera_in.y - cam.y, r.camera_in.z - cam.z));
    }
    errs.sort((a, b) => a - b);
    // Record, don't tune: median position error in inches with known focal.
    console.log("[pnp sweep] behind-plate median err in:", errs[errs.length >> 1]?.toFixed(1), "ok", errs.length, "/200");
    expect(errs.length).toBeGreaterThan(150);
  });

  it("side-on low camera sees the plate nearly edge-on → refuses or reports its error honestly", () => {
    const cam = { x: -480, y: 0, z: 48 };
    const img = projectGround([...PLATE_POINTS_IN], cam, { x: 0, y: 0, z: 0 }, F, W, H);
    const r = solveFieldCamera([...PLATE_POINTS_IN], img, { imageWidth: W, imageHeight: H });
    if (r.ok === true) expect(r.reprojection_rms_px).toBeLessThan(3);
    else expect(["focal_unrecoverable", "degenerate_points", "reprojection_too_high", "camera_below_ground"]).toContain(r.reason);
  });

  it("base fallback solves a centre-field camera", () => {
    const pts = basePointsIn("softball"), cam = { x: 0, y: 2400, z: 240 };
    const img = projectGround(pts, cam, { x: 0, y: 300, z: 0 }, F, W, H);
    const r = solveFieldCamera(pts, img, { imageWidth: W, imageHeight: H, focalPx: F });
    expect(r.ok).toBe(true);
  });

  it("refuses with fewer than four points and with scrambled taps", () => {
    expect(solveFieldCamera(PLATE_POINTS_IN.slice(0, 3), [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 3, y: 9 }], { imageWidth: W, imageHeight: H }).ok).toBe(false);
    const img = projectGround([...PLATE_POINTS_IN], { x: 0, y: -240, z: 60 }, { x: 0, y: 120, z: 0 }, F, W, H);
    const scrambled = [img[0], img[3], img[1], img[4], img[2]];
    expect(solveFieldCamera([...PLATE_POINTS_IN], scrambled, { imageWidth: W, imageHeight: H }).ok).toBe(false);
  });
});

function standing(h = 1.8, jitter = 0): Frame3D {
  const f: Frame3D = Array(33).fill(null);
  const s = h / 1.1 / 1.7; // nose→ankle ≈ h/1.1 mapped onto model units of 1.7
  const P = (x: number, y: number) => ({ x: x * s + jitter, y: y * s, z: 0 });
  f[0] = P(0, 1.7); f[11] = P(-0.2, 1.45); f[12] = P(0.2, 1.45); f[13] = P(-0.25, 1.15); f[14] = P(0.25, 1.15);
  f[15] = P(-0.27, 0.9); f[16] = P(0.27, 0.9); f[23] = P(-0.12, 0.95); f[24] = P(0.12, 0.95);
  f[25] = P(-0.12, 0.5); f[26] = P(0.12, 0.5); f[27] = P(-0.12, 0.05); f[28] = P(0.12, 0.05);
  f[29] = P(-0.14, 0); f[30] = P(0.14, 0); f[31] = P(-0.1, 0.0); f[32] = P(0.1, 0.0);
  return f;
}

describe("constraint stage", () => {
  it("refuses without athlete height", () => {
    expect(applyConstraints({ frames: [standing()], stance: { start: 0, end: 0 }, athleteHeightM: null }).ok).toBe(false);
  });
  it("still subject: every frame valid, near-zero correction, deterministic", () => {
    const frames = Array.from({ length: 30 }, () => standing());
    const a = applyConstraints({ frames, stance: { start: 0, end: 29 }, athleteHeightM: 1.8 });
    const b = applyConstraints({ frames, stance: { start: 0, end: 29 }, athleteHeightM: 1.8 });
    expect(a.invalid_frames).toBe(0);
    expect(Math.max(...(a.per_frame_max_correction as number[]))).toBeLessThan(1e-9);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it("restores a stretched femur and invalidates a wildly wrong frame", () => {
    const frames = Array.from({ length: 10 }, () => standing());
    const stretched = standing(); stretched[25] = { ...stretched[25]!, y: stretched[25]!.y - 0.03 }; frames.push(stretched);
    const broken = standing(); broken[27] = { x: 2, y: 2, z: 2 }; frames.push(broken);
    const r = applyConstraints({ frames, stance: { start: 0, end: 9 }, athleteHeightM: 1.8 });
    expect(r.frames[10]).not.toBeNull();
    expect(r.frames[11]).toBeNull();
  });
  it("lifts a frame whose foot sinks through the floor", () => {
    const frames = Array.from({ length: 10 }, () => standing());
    const sunk = standing().map((p) => (p ? { ...p, y: p.y - 0.02 } : null)); frames.push(sunk);
    const r = applyConstraints({ frames, stance: { start: 0, end: 9 }, athleteHeightM: 1.8 });
    const foot = r.frames[10]![29]!.y;
    expect(foot).toBeGreaterThanOrEqual(r.floor_y! - 1e-9);
  });
});
