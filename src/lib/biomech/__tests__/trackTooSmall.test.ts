import { describe, expect, it } from "vitest";
import { diagnoseTrack } from "../pose/trackDiagnosis";
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";

function tiny(held: boolean, i: number) {
  if (!held) return { frame_index: i, timestamp_seconds: i / 60, pose_detected: false, normalized: [], world: [], visibility: [], candidates_detected: 0, gap_reason: "no_person" as const };
  const n: number[] = [];
  for (let k = 0; k < 33; k++) n.push(0.4, 0.6 + (k / 32) * 0.1, 0);
  return { frame_index: i, timestamp_seconds: i / 60, pose_detected: true, normalized: n, world: new Array(99).fill(0), visibility: new Array(33).fill(0.8), candidates_detected: 1 };
}

describe("too_small cause", () => {
  it("names a tiny, mostly-undetected athlete first, ahead of cut-off feet", () => {
    const frames = Array.from({ length: 180 }, (_, i) => tiny(i % 4 === 0, i));
    const series = { header: { width: 788, height: 438, subject_track_reliable: false } as never, frames } as unknown as LandmarkSeries;
    const d = diagnoseTrack(series);
    expect(d.status).toBe("diagnosed");
    if (d.status === "diagnosed") expect(d.causes[0].kind).toBe("too_small");
  });
});
