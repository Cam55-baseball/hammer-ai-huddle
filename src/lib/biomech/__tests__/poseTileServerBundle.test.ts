import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { checkStoredLandmarkMovement, runHittingTilesFromText } from "../server/poseTileServerEntry";
// generated JS bundle
import { checkStoredLandmarkMovement as bundledGate, runHittingTilesFromText as bundled } from "../../../../supabase/functions/_shared/poseTiles.bundle.js";
import { buildPoseTileFindings } from "../../../../supabase/functions/_shared/faultFindings";

const txt = (n: string) => gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8");
describe("server pose-tile bundle", () => {
  it("bundle is byte-identical to source (regenerate with scripts/build-pose-tile-bundle.sh if this fails)", () => {
    for (const f of ["still-subject-15d75bc9.ndjson.gz", "swing-24fps-914cf54c.ndjson.gz"]) for (const s of ["L", "R"] as const)
      expect(JSON.stringify(bundled(txt(f), s, null))).toBe(JSON.stringify(runHittingTilesFromText(txt(f), s, null)));
  });
  it("914cf54c Left surfaces the back-leg root pattern from stored landmarks", () => {
    const o = runHittingTilesFromText(txt("swing-24fps-914cf54c.ndjson.gz"), "L", null);
    expect(o.verdicts.back_heel_early_rise).toBe("fail");
    const rows = buildPoseTileFindings({ userId: "u", videoId: "v", runId: null, sport: "baseball", verdicts: o.verdicts });
    expect(rows.map((r) => r.root_pattern_key)).toContain("back_leg_did_not_hold_load");
  });
  it("still clip writes nothing", () => {
    expect(checkStoredLandmarkMovement(txt("still-subject-15d75bc9.ndjson.gz")).status).toBe("refused");
    expect(bundledGate(txt("still-subject-15d75bc9.ndjson.gz")).status).toBe("refused");
    expect(bundledGate(txt("swing-24fps-914cf54c.ndjson.gz")).status).toBe("movement");
    const o = runHittingTilesFromText(txt("still-subject-15d75bc9.ndjson.gz"), "L", null);
    expect(buildPoseTileFindings({ userId: "u", videoId: "v", runId: null, sport: "baseball", verdicts: o.verdicts })).toEqual([]);
  });
});
