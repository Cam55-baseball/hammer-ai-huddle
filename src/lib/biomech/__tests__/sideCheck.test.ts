import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { checkDeclaredSide, RELIABLE_SIGNALS } from "../side/sideCheck";

const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
const confirmedLeft = ["swing-24fps-914cf54c.ndjson.gz", "swing-24fps-9d2e117e.ndjson.gz"];

describe("side-mismatch check never cries wolf", () => {
  it("no signal is enabled until one passes the confirmed clips", () => {
    expect(RELIABLE_SIGNALS).toEqual([]);
  });
  for (const n of confirmedLeft) {
    it(`${n} declared Left (owner-confirmed) → never a mismatch`, () => {
      const r = checkDeclaredSide(load(n), "L");
      expect(r.verdict).not.toBe("mismatch");
      expect(r.verdict).toBe("inconclusive");
    });
  }
  it("the raw stride-foot signal WOULD false-alarm on both confirmed clips (why it is off)", () => {
    for (const n of confirmedLeft) {
      expect(checkDeclaredSide(load(n), "L").evidence.find((e) => e.signal === "stride_foot")!.suggests).toBe("R");
    }
  });
  it("still clip → inconclusive, no invented mismatch", () => {
    for (const s of ["L", "R"] as const) expect(checkDeclaredSide(load("still-subject-15d75bc9.ndjson.gz"), s).verdict).toBe("inconclusive");
  });
});
