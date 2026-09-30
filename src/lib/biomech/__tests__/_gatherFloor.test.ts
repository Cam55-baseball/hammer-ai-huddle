import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { gatherSignals, runFrontLegGather } from "../metrics/frontLegGather";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("floor", () => {
  const s = load("still-subject-15d75bc9.ndjson.gz");
  for (const side of ["L","R"] as const) { const g = gatherSignals(s, side, { before_frame: s.frames[s.frames.length-1].frame_index }); if (!g) { console.log(side,"null", s.header.fps_true); continue; }
    const mx = (k: "knee_up"|"knee_back"|"ankle_up") => Math.max(...g.rows.map(r => Math.abs(r[k] ?? 0)));
    console.log("STILL", side, mx("knee_up"), mx("knee_back"), mx("ankle_up")); }
  for (const f of ["swing-24fps-914cf54c.ndjson.gz","swing-24fps-9d2e117e.ndjson.gz"]) for (const side of ["L","R"] as const) console.log(f, side, JSON.stringify(runFrontLegGather(load(f), { side })));
});
