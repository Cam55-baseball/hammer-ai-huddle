import { describe, expect, it } from "vitest";
import { getReportCardSpec } from "..";
import { getContract, spContract } from "../contracts";
import { spReportCard, spTiles } from "../disciplines/sp";
import { classifyRelease1, isRelease1Visible } from "../release1";
import type { AnalysisLike } from "../types";

const metric = (value: number | boolean, confidence = 0.9) => ({ value, confidence });

const SP_METRIC_KEYS = [
  "windup_trunk_tibia_deg",
  "windup_hip_square_deg",
  "windup_knee_over_foot_deg",
  "windup_foot_power_line_deg",
  "stride_triple_extension_pass",
  "sfc_foot_angle_deg",
  "sfc_arm_path_deg",
  "sfc_trunk_alignment_pass",
  "sfc_knee_ankle_deg",
  "sfc_hip_shoulder_rotation_deg",
  "accel_arm_path_pass",
  "ft_knee_ankle_deg",
  "stride_pct_top",
  "stride_pct_sfc",
  "stride_pct_release",
] as const;

describe("softball pitching report card", () => {
  it("defines 13 windmill tiles backed by 15 persisted metric keys", () => {
    expect(spContract.id).toBe("sp");
    expect(spContract.label).toBe("Softball Pitching");
    expect(spTiles).toHaveLength(13);
    expect(spContract.metrics.map((m) => m.key)).toEqual(SP_METRIC_KEYS);
    expect(new Set(spContract.metrics.map((m) => m.tileKey)).size).toBe(13);
  });

  it("routes softball pitching to SP instead of cloning BP", () => {
    expect(getContract("softball", "pitching")).toBe(spContract);
    expect(getContract("baseball", "pitching")?.id).toBe("bp");
    expect(getReportCardSpec("softball", "pitching")).toBe(spReportCard);
    expect(getReportCardSpec("baseball", "pitching")?.disciplineLabel).toBe("Baseball Pitching");
  });

  it("keeps every SP metric in SHOWCASE_FUTURE and out of the athlete-visible Release-1 surface", () => {
    for (const key of SP_METRIC_KEYS) {
      expect(classifyRelease1(key)).toBe("showcase_future");
      expect(isRelease1Visible(key)).toBe(false);
    }
    expect(spReportCard.tiles).toHaveLength(0);
  });

  it("labels sourced standards separately from proposed starting tolerances", () => {
    const proposed = spTiles.find((t) => t.key === "windup_trunk_tibia")!;
    const sourced = spTiles.find((t) => t.key === "sfc_foot_angle")!;
    const rotation = spTiles.find((t) => t.key === "sfc_hip_shoulder_rotation")!;
    const stride = spTiles.find((t) => t.key === "stride_profile")!;

    expect(proposed.standard).toContain("Proposed");
    expect(sourced.standard).toContain("Sourced");
    expect(rotation.explainer.whatWhy).toContain("does not publish a softball minimum");
    expect(rotation.explainer.whatWhy).toContain("not directly transferable");
    expect(stride.explainer.whatWhy).toContain("±10-percentage-point pass window is a proposed review tolerance");
  });

  it("computes the sourced SFC foot-angle band with arm-side sign preserved", () => {
    const tile = spTiles.find((t) => t.key === "sfc_foot_angle")!;
    const pass = tile.compute({ metrics: { sfc_foot_angle_deg: metric(30) } } as AnalysisLike);
    const fail = tile.compute({ metrics: { sfc_foot_angle_deg: metric(-8) } } as AnalysisLike);

    expect(pass).toMatchObject({ status: "pass", value: "30° arm side" });
    expect(fail).toMatchObject({ status: "fail", value: "8° glove side" });
  });

  it("grades the three-moment stride profile against the closer sourced age band", () => {
    const tile = spTiles.find((t) => t.key === "stride_profile")!;
    const analysis = {
      metrics: {
        stride_pct_top: metric(92),
        stride_pct_sfc: metric(89),
        stride_pct_release: metric(72),
      },
    } as AnalysisLike;

    expect(tile.compute(analysis)).toMatchObject({
      status: "pass",
      value: "92 / 89 / 72%",
      confidence: 0.9,
    });
  });

  it("fails a stride profile outside the closer band and preserves missingness", () => {
    const tile = spTiles.find((t) => t.key === "stride_profile")!;
    const fail = tile.compute({
      metrics: {
        stride_pct_top: metric(80),
        stride_pct_sfc: metric(89),
        stride_pct_release: metric(68),
      },
    } as AnalysisLike);
    const missing = tile.compute({
      metrics: {
        stride_pct_top: { missing: true, missing_reason: "Top of arm circle not visible", confidence: 0 },
        stride_pct_sfc: metric(89),
        stride_pct_release: metric(68),
      },
    } as AnalysisLike);

    expect(fail.status).toBe("fail");
    expect(fail.note).toContain("Closer band");
    expect(missing).toEqual({ status: "missing", missing_reason: "Top of arm circle not visible" });
  });
});
