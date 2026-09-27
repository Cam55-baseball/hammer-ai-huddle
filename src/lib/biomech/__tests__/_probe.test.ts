import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { runHittingPoseTiles } from "../metrics/hittingPoseTiles";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("probe", () => {
  for (const n of ["still-subject-15d75bc9.ndjson.gz","swing-24fps-914cf54c.ndjson.gz","swing-24fps-9d2e117e.ndjson.gz"]) for (const side of ["L","R"] as const) {
    const r = runHittingPoseTiles(load(n), { side }) as any;
    for (const k of ["hip_load","hand_load","p2_timing","p3_timing"]) console.log("P", n.slice(0,14), side, k, r[k].value, r[k].missingness?.missing_reason ?? "", JSON.stringify(r[k].lineage).slice(0,90));
  }
});
