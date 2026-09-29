import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { runThrowingTiles } from "../metrics/throwingTiles";
import { bandFlag } from "../metrics/throwingInjuryTiles";

const load = (name: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", name))).toString("utf8"));
const still = load("still-subject-15d75bc9.ndjson.gz");
const a = load("swing-24fps-914cf54c.ndjson.gz");
const b = load("swing-24fps-9d2e117e.ndjson.gz");
const measured = (r: ReturnType<typeof runThrowingTiles>) => [r.tempo, r.energy_angle, r.shoulder_opening, r.head_stability, r.stride_length];

describe("throwing cards refuse non-throws", () => {
  for (const [label, series] of [["still", still], ["reference swing", a], ["second swing", b]] as const) {
    for (const side of ["L", "R", null] as const) {
      it(`${label} / ${side ?? "unknown"}`, () => {
        const r = runThrowingTiles(series, side);
        expect(r.pattern).toBe("undetermined");
        for (const t of measured(r)) {
          expect(t.value).toBeNull();
          expect(t.verdict).toBeNull();
          expect(t.missing_reason).toBeTruthy();
        }
      });
    }
  }
  it("is deterministic three times", () => {
    expect(new Set([0, 1, 2].map(() => JSON.stringify(runThrowingTiles(a, "L")))).size).toBe(1);
  });
});
describe("throwing injury markers", () => {
  it("every marker refuses on every fixture and side, with a reason and a cited source", () => {
    for (const s of [still, a, b]) for (const side of ["L", "R", null] as const) {
      const r = runThrowingTiles(s, side);
      for (const m of Object.values(r.injury)) {
        expect(m.value).toBeNull(); expect(m.verdict).toBeNull(); expect(m.flag).toBeNull(); expect(m.grading_weight).toBe(0); expect(m.missing_reason).toBeTruthy();
        expect(m.sources.length).toBeGreaterThan(0);
      }
    }
  });
  it("constant detector refuses everything", () => {
    const f = still.frames[10];
    const c = { header: still.header, frames: still.frames.map((x) => ({ ...f, frame_index: x.frame_index, timestamp_seconds: x.timestamp_seconds })) };
    for (const side of ["L", "R"] as const) for (const m of Object.values(runThrowingTiles(c, side).injury)) expect(m.value).toBeNull();
  });
  it("swing clips refuse with a throwing-specific reason, never a generic one", () => {
    for (const s of [a, b]) for (const side of ["L", "R"] as const) {
      const r = runThrowingTiles(s, side);
      for (const m of Object.values(r.injury)) expect(m.missing_reason).toBe("throwing_delivery_not_confirmed");
      expect(r.stride_length.lineage.reason ?? r.stride_length.missing_reason).toBeTruthy();
    }
  });
  it("band flags never call inside the noise floor", () => {
    expect(bandFlag(50, 45, 55, 5.4)).toBeNull();
    expect(bandFlag(30, 45, 55, 5.4)).toBe("raised");
    expect(bandFlag(90, 70, 110, 6.2)).toBe("clear");
  });
});
