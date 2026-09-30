import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { runHittingCardTiles } from "../metrics/hittingCardTiles";
import { runActiveStride, runStrideCoil } from "../metrics/strideRhythm";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("probe", () => {
  const s = load("swing-24fps-914cf54c.ndjson.gz"); const r = runHittingCardTiles(s, { side: "L" });
  console.log("SEQ", JSON.stringify({ v: r.sequencing.verdict, per: r.sequencing.lineage.per_segment, out: r.sequencing.lineage.out_of_order, why: r.sequencing.lineage.reason }));
  console.log("CHIN", JSON.stringify({ v: r.shoulder_to_shoulder_hold.verdict, val: r.shoulder_to_shoulder_hold.value, u: r.shoulder_to_shoulder_hold.unit, l: r.shoulder_to_shoulder_hold.lineage.leak, ch: r.shoulder_to_shoulder_hold.lineage.reported_channel }));
  console.log("AS", JSON.stringify(runActiveStride(s, { side: "L" })));
  console.log("COIL", JSON.stringify(runStrideCoil(s, { side: "L" })).slice(0, 800));
  const st = load("still-subject-15d75bc9.ndjson.gz"); const q = runHittingCardTiles(st, { side: "L" });
  console.log("STILL", q.sequencing.value, q.shoulder_to_shoulder_hold.value);
});
