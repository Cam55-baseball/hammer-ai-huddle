import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { pointPx, LM, mid, median } from "../anchors/poseKinematics";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
const ang=(a:any,b:any,c:any)=>{if(!a||!b||!c)return null;const u={x:a.x-b.x,y:a.y-b.y},w={x:c.x-b.x,y:c.y-b.y};return Math.acos(Math.max(-1,Math.min(1,(u.x*w.x+u.y*w.y)/Math.hypot(u.x,u.y)/Math.hypot(w.x,w.y))))*180/Math.PI;};
it("p", () => { for (const fx of ["still-subject-15d75bc9.ndjson.gz","swing-24fps-914cf54c.ndjson.gz","swing-24fps-9d2e117e.ndjson.gz"]) for (const side of ["L","R"]) {
  const s=load(fx); const P=(k:number,i:number)=>pointPx(s,s.frames[k],i);
  const bh= side==="L"?LM.L_HIP:LM.R_HIP, bk= side==="L"?LM.L_KNEE:LM.R_KNEE;
  const a=(k:number)=>ang(mid(P(k,LM.L_SHOULDER),P(k,LM.R_SHOULDER)),P(k,bh),P(k,bk));
  const xs=s.frames.map((_,k)=>a(k)); const m3=(k:number)=>{const v=[xs[k-1],xs[k],xs[k+1]].filter(x=>x!=null) as number[];return v.length>=2?median(v):null;};
  const all=xs.map((_,k)=>k>0&&k<xs.length-1?m3(k):null).filter(x=>x!=null) as number[]; const md=median(all);
  const flo=Math.max(...all.map(x=>Math.abs(x-md)));
  console.log(fx,side,"floor",flo.toFixed(2), fx.includes("914")? `169:${m3(169)?.toFixed(1)} 176:${m3(176)?.toFixed(1)} 184:${m3(184)?.toFixed(1)}`:"");
}});
