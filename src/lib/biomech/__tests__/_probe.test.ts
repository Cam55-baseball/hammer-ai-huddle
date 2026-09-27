import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { shoulderAngularRate, detectSwingPeak, detectSwingStart } from "../anchors/poseEvents";
import { deriveDirectionSign } from "../side/strideSide";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("probe", () => {
  for (const n of ["still-subject-15d75bc9.ndjson.gz","swing-24fps-914cf54c.ndjson.gz","swing-24fps-9d2e117e.ndjson.gz"]) {
    const s = load(n); const w = shoulderAngularRate(s).filter((x): x is number => x != null).sort((a,b)=>a-b);
    console.log(n, "max", w[w.length-1]?.toFixed(3), "p99", w[Math.floor(w.length*0.99)]?.toFixed(3));
    for (const side of ["L","R"] as const) { const d = deriveDirectionSign(s, side); const ss = detectSwingStart(s, d); const sp = detectSwingPeak(s, d, ss);
      console.log(" ", side, "dir", d, "start", ss.frame_index, JSON.stringify(ss.diagnostics).slice(0,80), "peak", sp.frame_index, JSON.stringify(sp.diagnostics).slice(0,120)); }
  }
});
