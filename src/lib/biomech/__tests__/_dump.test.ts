import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { runHittingCardTiles } from "../metrics/hittingCardTiles";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("dump", () => {
  const K = ["heel_plant","back_elbow_connection","shoulder_plane_steadiness","back_knee_flex_maintained","post_landing_hip_drift","hands_stay_up_at_plant","lead_elbow_bend_increasing","head_vertical_movement_post_landing","pelvis_rotation_efficiency"];
  for (const [n,f] of [["still","still-subject-15d75bc9.ndjson.gz"],["A","swing-24fps-914cf54c.ndjson.gz"],["B","swing-24fps-9d2e117e.ndjson.gz"]]) for (const side of ["L","R"] as const) {
    const r = runHittingCardTiles(load(f), { side }) as any;
    for (const k of K) { const t = r[k]; const l = t.lineage; console.log(n, side, k, t.value, t.verdict, JSON.stringify(t.value==null ? l.reason : Object.fromEntries(Object.entries(l).filter(([x]) => !["coaching","rule","sign","reasoning","caveat","why_ungraded","reference","window_end_note","limitation","statistic"].includes(x))))); }
  }
});
