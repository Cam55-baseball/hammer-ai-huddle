import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { pointPx, LM, median } from "../anchors/poseKinematics";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("p", () => { for (const fx of ["still-subject-15d75bc9.ndjson.gz","swing-24fps-914cf54c.ndjson.gz"]) {
  const s=load(fx); const P=(k:number,i:number)=>pointPx(s,s.frames[k],i);
  const w=s.frames.map((_,k)=>{const a=P(k,LM.L_HIP),b=P(k,LM.R_HIP);return a&&b?Math.hypot(a.x-b.x,a.y-b.y):null;});
  const m3=(k:number)=>{const v=[w[k-1],w[k],w[k+1]].filter(x=>x!=null) as number[];return v.length>=2?median(v):null;};
  const end = fx.includes("914")?185:w.length-1; const ws=[] as number[]; for(let k=1;k<end;k++){const x=m3(k); if(x!=null) ws.push(x);} const L=Math.max(...ws);
  const th=ws.map(x=>Math.acos(Math.min(1,x/L))*180/Math.PI); const md=median(th);
  console.log(fx,"L",L.toFixed(1),"thetaFloor",Math.max(...th.map(t=>Math.abs(t-md))).toFixed(2),"median",md.toFixed(1));
  if(fx.includes("914")) console.log("trace", [169,172,175,178,181,184].map(k=>k+":"+(Math.acos(Math.min(1,m3(k)!/L))*180/Math.PI).toFixed(1)).join(" "));
}});
