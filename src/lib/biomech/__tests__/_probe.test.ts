import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { LM, pointPx, mid, median } from "../anchors/poseKinematics";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("probe", () => {
  const s = load("still-subject-15d75bc9.ndjson.gz");
  // stature proxy: shoulder->ankle / 0.779
  const st = median(s.frames.map(f=>{const a=mid(pointPx(s,f,11),pointPx(s,f,12)), b=mid(pointPx(s,f,27),pointPx(s,f,28)); return a&&b? Math.abs(b.y-a.y)/0.779:null}).filter((x):x is number=>x!=null))!;
  for (const [nm, g] of [["handsMid", (f:any)=>mid(pointPx(s,f,15),pointPx(s,f,16))], ["L", (f:any)=>pointPx(s,f,15)], ["R",(f:any)=>pointPx(s,f,16)]] as const) {
    for (const ax of ["x","y"] as const) {
    const xs = s.frames.map(f=>{const p=(g as any)(f); return p? p[ax]*100/st:null});
    const m3 = xs.map((_,k)=>{const v=[xs[k-1],xs[k],xs[k+1]].filter((x):x is number=>x!=null); return v.length>=2?median(v):null}).filter((x):x is number=>x!=null);
    const md = median(m3)!; const d = m3.map(x=>Math.abs(x-md)).sort((a,b)=>a-b);
    console.log("P", nm, ax, "p99", d[Math.floor(d.length*0.99)].toFixed(3)); }
  }
});
