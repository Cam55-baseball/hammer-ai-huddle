import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { runThrowingTiles } from "../metrics/throwingTiles";

const load = (name: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", name))).toString("utf8"));
const still = load("still-subject-15d75bc9.ndjson.gz");
const a = load("swing-24fps-914cf54c.ndjson.gz");
const b = load("swing-24fps-9d2e117e.ndjson.gz");
const measured = (r: ReturnType<typeof runThrowingTiles>) => [r.tempo, r.energy_angle, r.shoulder_opening, r.head_stability];

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