import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib";
import { decodeLandmarkSeriesText } from "@/lib/biomech/pose/landmarkSeriesFormat";
import { detectStanceLock } from "@/lib/biomech/anchors/stanceLock";
import { deriveDirectionSign } from "@/lib/biomech/side/strideSide";
import { headVsRearShoulderFwd, yawJerk, wristSepPct, runHittingPoseTiles } from "@/lib/biomech/metrics/hittingPoseTiles";
const F="/dev-server/src/lib/biomech/__tests__/fixtures/";
const load=(n:string)=>decodeLandmarkSeriesText(gunzipSync(readFileSync(F+n)).toString("utf8"));
const q=(a:number[],p:number)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(p*(s.length-1))]};
const med=(a:number[])=>q(a,.5);
it("m",()=>{
 const s=load("still-subject-15d75bc9.ndjson.gz"); const lock=detectStanceLock(s);
 console.log("still lock",lock.ok,lock.start_frame,lock.end_frame);
 const n=Math.round(0.7*s.header.fps_true);
 for (const side of ["L","R"] as const){ const d=deriveDirectionSign(s,side)!;
  const x=s.frames.map(f=>headVsRearShoulderFwd(s,f,lock,d,side));
  const m3=x.map((_,k)=>{const v=[x[k-1],x[k],x[k+1]].filter((z):z is number=>z!=null);return v.length>=2?med(v):null});
  const diffs:number[]=[]; for(let k=0;k+n<m3.length;k++) if(m3[k]!=null&&m3[k+n]!=null) diffs.push(Math.abs(m3[k+n]!-m3[k]!));
  const j:number[]=[]; for(let k=1;k+n<s.frames.length-1;k++){const v=yawJerk(s,k,k+n,lock,d); if(v!=null)j.push(v);}
  const sep=s.frames.map(f=>wristSepPct(s,f,lock)).filter((z):z is number=>z!=null);
  console.log(side,"pull p99",q(diffs,.99).toFixed(3),"max",q(diffs,1).toFixed(3),"| jerk p99",q(j,.99).toFixed(2),"max",q(j,1).toFixed(2),"| wristsep med",med(sep).toFixed(1));
 }
 for (const nm of ["swing-24fps-914cf54c.ndjson.gz","swing-24fps-9d2e117e.ndjson.gz"]) for (const side of ["L","R"] as const){ const c=load(nm); const r=runHittingPoseTiles(c,{side}); console.log(nm.slice(11,19),side,"head",r.head_discipline.value,JSON.stringify(r.head_discipline.lineage).slice(0,330),"| hand",r.hand_load.value,JSON.stringify(r.hand_load.lineage).slice(0,200));}
});
