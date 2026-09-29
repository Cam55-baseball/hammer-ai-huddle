import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { UPLOAD_ERRORS } from "@/lib/upload/uploadErrorCopy";
import { ROOT_PATTERNS } from "@/lib/analysis/rootPatterns";
import { withoutMeasurementNotation } from "@/lib/reportCard/athleteLanguage";
import { runHittingTilesFromText } from "@/lib/biomech/server/poseTileServerEntry";
import { buildPoseTileFindings } from "../../../../supabase/functions/_shared/faultFindings";

// Owner ruling: nothing an athlete reads carries a degree or percentage figure.
const NUM = /\d(?:\.\d+)?\s*[°%]/;

describe("athlete surfaces carry no degrees or percentages", () => {
  it("upload / error / loading copy", () => {
    for (const [k, v] of Object.entries(UPLOAD_ERRORS)) expect(String(v), k).not.toMatch(NUM);
  });
  it("root-pattern labels and explanations", () => {
    for (const p of Object.values(ROOT_PATTERNS)) {
      expect(`${p.label} ${p.plain} ${p.why}`, p.key).not.toMatch(NUM);
      expect(`${p.label} ${p.plain} ${p.why}`, p.key).not.toMatch(/\bP[1-4]\b/);
    }
  });
  it("914cf54c back-leg finding renders as one finding with evidence, no numbers", () => {
    const t = gunzipSync(readFileSync(join(__dirname, "../../biomech/__tests__/fixtures/swing-24fps-914cf54c.ndjson.gz"))).toString("utf8");
    const o = runHittingTilesFromText(t, "L", null);
    const rows = buildPoseTileFindings({ userId: "u", videoId: "v", runId: null, sport: "baseball", verdicts: o.verdicts });
    const backLeg = rows.filter((r) => r.root_pattern_key === "back_leg_did_not_hold_load");
    expect(backLeg).toHaveLength(1);
    const text = withoutMeasurementNotation(backLeg[0].evidence);
    expect(text).toMatch(/back heel lifted/);
    expect(text).not.toMatch(NUM);
    expect(text).not.toMatch(/\bP[1-4]\b/);
  });
  it("athlete-facing components contain no literal degree/percent figures", () => {
    const roots = ["src/components/analyze", "src/components/report-card", "src/pages/AnalyzeVideo.tsx"];
    // Staff/performance tools (240 fps camera) and code comments are exempt.
    const exempt = /DelayCam|HighFps|BallFlight|Staff|Owner|Debug|Diagnostics/;
    const files: string[] = [];
    const walk = (p: string) => statSync(p).isDirectory() ? readdirSync(p).forEach((f) => walk(join(p, f))) : /\.tsx$/.test(p) && !exempt.test(p) && files.push(p);
    roots.forEach((r) => walk(join(process.cwd(), r)));
    for (const f of files) {
      const code = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
      const hits = (code.match(/["'`>][^"'`<>\n]*\d\s*[°%][^"'`<>\n]*["'`<]/g) ?? []).filter((h) => !/[\w-]+-\[|\bw-|\bh-|translate|rgba|hsl|calc\(|inset|width:|height:/.test(h));
      expect(hits, f).toEqual([]);
    }
  });
});
