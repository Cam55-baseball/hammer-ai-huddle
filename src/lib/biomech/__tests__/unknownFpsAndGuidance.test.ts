import { describe, expect, it } from "vitest";
import { captureGuidanceFor } from "../captureGuidance";
import { bytesSource, readMatroskaDefaultDurationFps } from "../containerFps";
import { classifyDensityTier } from "../pose/denseLandmarkCapture";
import { tierMeets } from "@/lib/delaycam/session/metricRegistry";

describe("capture guidance", () => {
  it("names limits at 24 fps and never blocks", () => {
    const g = captureGuidanceFor(24, "hitting")!;
    expect(g.fps).toBe(24);
    expect(g.notPossible).toContain("Foot plant and tempo");
    expect(g.possible).toContain("Body positions and posture feedback");
    expect(g.fix).toMatch(/1080p at 60 fps/);
    expect(g.fix).toMatch(/Cinematic/);
  });
  it("is silent at 60 fps and above", () => {
    expect(captureGuidanceFor(59.94, "hitting")).toBeNull();
    expect(captureGuidanceFor(120, "pitching")).toBeNull();
  });
  it("guides on unknown rate without inventing one", () => {
    expect(captureGuidanceFor(null, "throwing")!.fps).toBeNull();
  });
  it("is deterministic", () => {
    expect(JSON.stringify(captureGuidanceFor(30, "pitching"))).toBe(JSON.stringify(captureGuidanceFor(30, "pitching")));
  });
});

describe("unknown frame rate", () => {
  it("has its own tier that meets no requirement", () => {
    expect(classifyDensityTier(null)).toBe("unknown");
    expect(tierMeets("unknown", "below_floor")).toBe(false);
    expect(tierMeets("unknown", "t_low")).toBe(false);
  });
});

describe("WebM declared frame duration route", () => {
  const ebmlHead = [0x1a, 0x45, 0xdf, 0xa3, 0x80];
  it("reads DefaultDuration from a video track", async () => {
    // TrackEntry(0xAE) … TrackType=1 … DefaultDuration = 16_683_333 ns (~59.94 fps)
    const ns = 16_683_333;
    const b = new Uint8Array([...ebmlHead, 0xae, 0x90, 0x83, 0x81, 0x01, 0x23, 0xe3, 0x83, 0x84,
      (ns >>> 24) & 255, (ns >>> 16) & 255, (ns >>> 8) & 255, ns & 255]);
    const r = await readMatroskaDefaultDurationFps(bytesSource(b));
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.fps).toBeCloseTo(59.94, 2);
  });
  it("reports why when absent", async () => {
    const r = await readMatroskaDefaultDurationFps(bytesSource(new Uint8Array([...ebmlHead, 0xae, 0x83, 0x83, 0x81, 0x01])));
    expect(r).toMatchObject({ status: "unavailable", reason: "no_default_duration" });
    const n = await readMatroskaDefaultDurationFps(bytesSource(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70])));
    expect(n).toMatchObject({ status: "unavailable", reason: "not_matroska" });
  });
});
