import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { detectStanceLock } from "../anchors/stanceLock";
import { deriveDirectionSign } from "../side/strideSide";
import { detectSwingStart, detectSwingPeak, detectLoadApex, detectFinish } from "../anchors/poseEvents";
import { frontFootPlantFromSeries } from "../metrics/hittingOwnerTiles";
import { runHittingCardTiles } from "../metrics/hittingCardTiles";
import { runActiveStride, runStrideCoil } from "../metrics/strideRhythm";
import { pointPx, LM } from "../anchors/poseKinematics";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("probe", () => {
  const s = load("swing-24fps-914cf54c.ndjson.gz");
  const dir = deriveDirectionSign(s, "L")!; const lock = detectStanceLock(s);
  const ss = detectSwingStart(s, dir); const pk = detectSwingPeak(s, dir, ss); const ap = detectLoadApex(s, dir); const fin = detectFinish(s);
  const { plant } = frontFootPlantFromSeries(s, "L");
  console.log("frames", s.frames.length, s.frames[0].frame_index, s.frames.at(-1)!.frame_index, "fps", s.header.fps_true, "ss", ss.frame_index, "pk", pk.frame_index, "apex", ap.frame_index, "plant", plant.frame_index, "fin", fin.frame_index, JSON.stringify(fin.diagnostics), "hipL", lock.baseline?.hip_len_px, "shL", lock.baseline?.shoulder_len_px);
  const t = runHittingCardTiles(s, { side: "L" });
  console.log("SEQ", JSON.stringify(t.sequencing.lineage), "PEL", JSON.stringify(t.pelvis_rotation_efficiency.lineage), "FB", JSON.stringify(t.finish_balance.lineage), "S2S", JSON.stringify(t.shoulder_to_shoulder_hold.lineage));
  console.log("AS", JSON.stringify(runActiveStride(s,{side:"L"}).lineage), "FVB", JSON.stringify(runStrideCoil(s,{side:"L"}).foot_vs_body));
  const d = (a:any,b:any)=>a&&b?Math.hypot(a.x-b.x,a.y-b.y):null;
  for (let k = 150; k < s.frames.length; k++) { const f = s.frames[k]; const P=(i:number)=>pointPx(s,f,i);
    const n=P(0), rs=P(LM.R_SHOULDER);
    console.log(f.frame_index, "hip", d(P(LM.L_HIP),P(LM.R_HIP))?.toFixed(1), "sh", d(P(LM.L_SHOULDER),P(LM.R_SHOULDER))?.toFixed(1), "noseRs", n&&rs?((n.x-rs.x).toFixed(1)+","+(n.y-rs.y).toFixed(1)):null, "vis", f.landmarks?.[12]?.visibility?.toFixed?.(2)); }
});
