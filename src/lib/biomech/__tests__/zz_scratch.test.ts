import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { runHittingPoseTiles, hipMidFwd, wristVsShoulderFwd } from "../metrics/hittingPoseTiles";
import { runPitchingTiles } from "../metrics/pitchingTiles";
import { detectStanceLock } from "../anchors/stanceLock";
import { median } from "../anchors/poseKinematics";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("scratch", () => {
  const s = load("still-subject-15d75bc9.ndjson.gz"); const lock = detectStanceLock(s);
  console.log("still lock", lock.ok, lock.start_frame, lock.end_frame, lock.detail);
  if (lock.ok) for (const side of ["L","R"] as const) for (const dir of [1,-1] as const) {
    for (const [nm,g] of [["hip",(f:any)=>hipMidFwd(s,f,lock,dir)],["wrist",(f:any)=>wristVsShoulderFwd(s,f,lock,dir,side)]] as const) {
      const all = s.frames.map(g as any) as (number|null)[];
      const b = median(all.slice(lock.start_k!, lock.end_k!+1).filter((x):x is number=>x!=null))!;
      const d:number[]=[]; for (let k=1;k<all.length-1;k++){const xs=[all[k-1],all[k],all[k+1]].filter((x):x is number=>x!=null); if(xs.length>=2) d.push(Math.abs(median(xs)!-b));}
      d.sort((a,b)=>a-b); console.log("FLOOR",nm,side,dir,"p95",d[Math.floor(.95*(d.length-1))].toFixed(3),"p99",d[Math.floor(.99*(d.length-1))].toFixed(3),"max",d[d.length-1].toFixed(3));
    }
  }
  for (const n of ["still-subject-15d75bc9.ndjson.gz","swing-24fps-914cf54c.ndjson.gz","swing-24fps-9d2e117e.ndjson.gz"]) for (const side of ["L","R",null] as const) {
    const x = load(n); const r = runHittingPoseTiles(x,{side}); const p = runPitchingTiles(x,{throwing_side:side});
    const f=(t:any)=>`${t.value}${t.verdict?"/"+t.verdict:""} ${t.missingness?.missing_reason??""} ${JSON.stringify(t.lineage)}`;
    console.log("RES",n.slice(0,20),side,"cam",JSON.stringify(r.camera_view),"\n  hip",f(r.hip_load),"\n  hands",f(r.hands_outside_shoulders_at_landing),"\n  stride",f(r.stride_direction),"\n  pitchE",f(p.energy_angle_deg),"\n  pitchSh",f(p.premature_shoulder_open_deg));
  }
});
