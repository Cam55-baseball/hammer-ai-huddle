import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { shoulderAngularRate } from "../anchors/poseEvents";
import { detectStanceLock } from "../anchors/stanceLock";
import { solveSegment } from "../rigid/segmentRotation";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("probe", () => {
  for (const n of ["swing-24fps-914cf54c.ndjson.gz","swing-24fps-9d2e117e.ndjson.gz","still-subject-15d75bc9.ndjson.gz"]) {
    const s = load(n); const w = shoulderAngularRate(s); const lock = detectStanceLock(s);
    console.log(n, "lock", lock.ok, lock.start_frame, lock.end_frame, JSON.stringify(lock.baseline).slice(0,200));
    const L = (lock.baseline as any)?.shoulder_len_px;
    const out: string[] = [];
    s.frames.forEach((f, k) => { if (n.includes("914") ? (k>=160&&k<=200) : n.includes("9d2")? (k>=90&&k<=140): k%40===0) { const sg = L ? solveSegment(s, f, 11, 12, L) : null; out.push(`${f.frame_index}:${w[k]?.toFixed(1)}/${sg?.theta_deg?.toFixed(0) ?? (sg?.tracking_failure?"TF":"-")}`); } });
    console.log(out.join(" "));
  }
});
