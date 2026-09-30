import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { detectStanceLock } from "../anchors/stanceLock";
import { deriveDirectionSign } from "../side/strideSide";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("floor", () => {
  const s = load("still-subject-15d75bc9.ndjson.gz");
  const lock = detectStanceLock(s); console.log("LOCK", lock.ok, lock.detail, deriveDirectionSign(s,"L"), deriveDirectionSign(s,"R"));
  const W=s.header.width,H=s.header.height;
  const pt=(f:any,i:number)=> (f.pose_detected && (f.visibility?.[i]??0)>=0.5)?{x:f.normalized[i*3]*W,y:f.normalized[i*3+1]*H}:null;
  const st = (()=>{const xs=s.frames.map(f=>{const a=pt(f,11),b=pt(f,12),c=pt(f,27),d=pt(f,28); return a&&b&&c&&d? ((c.y+d.y)-(a.y+b.y))/2:null}).filter(Boolean) as number[]; xs.sort((a,b)=>a-b); return xs[xs.length>>1]/0.779;})();
  const med=(xs:number[])=>{const t=[...xs].sort((a,b)=>a-b);return t[t.length>>1]};
  for (const [name,i] of [["Lknee",25],["Rknee",26],["Lankle",27],["Rankle",28]] as const) for (const ax of ["x","y"] as const){
    const raw=s.frames.map(f=>pt(f,i)?.[ax]??null);
    const m3=raw.map((_,k)=>{const xs=[raw[k-1],raw[k],raw[k+1]].filter((v):v is number=>v!=null);return xs.length>=2?med(xs):null}).filter((v):v is number=>v!=null);
    const c=med(m3); console.log("STILL",name,ax,(Math.max(...m3.map(v=>Math.abs(v-c)))*100/st).toFixed(3));
  }
});
