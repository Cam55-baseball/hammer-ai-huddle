import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { runHittingPoseTiles, hipMidFwd, wristVsShoulderFwd } from "../metrics/hittingPoseTiles";
import { runPitchingTiles } from "../metrics/pitchingTiles";
import { detectStanceLock, stanceBaseline } from "../anchors/stanceLock";
import { median } from "../anchors/poseKinematics";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("scratch", () => {
  const s = load("still-subject-15d75bc9.ndjson.gz"); const n=s.frames.length; const lock:any = { ok:true, start_k:0, end_k:n-1, baseline: stanceBaseline(s,0,n-1) };
  console.log("still lock", lock.ok, lock.start_frame, lock.end_frame, lock.detail);
  if (lock.ok) for (const side of ["L","R"] as const) for (const dir of [1,-1] as const) {
    for (const [nm,g] of [["hip",(f:any)=>hipMidFwd(s,f,lock,dir)],["wrist",(f:any)=>wristVsShoulderFwd(s,f,lock,dir,side)]] as const) {
      const all = s.frames.map(g as any) as (number|null)[];
      const b = median(all.slice(lock.start_k!, lock.end_k!+1).filter((x):x is number=>x!=null))!;
      const d:number[]=[]; for (let k=1;k<all.length-1;k++){const xs=[all[k-1],all[k],all[k+1]].filter((x):x is number=>x!=null); if(xs.length>=2) d.push(Math.abs(median(xs)!-b));}
      d.sort((a,b)=>a-b); console.log("FLOOR",nm,side,dir,"p95",d[Math.floor(.95*(d.length-1))].toFixed(3),"p99",d[Math.floor(.99*(d.length-1))].toFixed(3),"max",d[d.length-1].toFixed(3));
    }
  }
  // 914 L hip trace between lock and apex
  const x = load("swing-24fps-914cf54c.ndjson.gz"); const l2 = detectStanceLock(x);
  const tr:string[]=[]; for (let k=40;k<200;k+=10){ tr.push(k+":"+hipMidFwd(x,x.frames[k],l2,-1)?.toFixed(1)); } console.log("TRACE914", tr.join(" "));
});
