import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { LM, pointPx } from "../anchors/poseKinematics";
import { detectStanceLock } from "../anchors/stanceLock";
import { buildSegmentValidity } from "../validity/segmentValidity";
import { detectLoadApex, detectP4, detectSwingStart } from "../anchors/poseEvents";
import { deriveDirectionSign } from "../side/strideSide";
import { frontFootPlantFromSeries } from "../metrics/hittingOwnerTiles";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("probe", () => {
  for (const [n, side] of [["still-subject-15d75bc9.ndjson.gz","L"],["still-subject-15d75bc9.ndjson.gz","R"],["swing-24fps-914cf54c.ndjson.gz","L"]] as const) {
    const s = load(n); const lock = detectStanceLock(s); const v = (lock.ok ? buildSegmentValidity(s, lock) : null);
    const P = (k: number, i: number) => (v && !v.trusted(k, i)) ? null : pointPx(s, s.frames[k], i);
    const lead = side === "R" ? LM.L_SHOULDER : LM.R_SHOULDER, rear = side==="R"?LM.R_SHOULDER:LM.L_SHOULDER;
    const st = lock.baseline?.stature_px ?? s.header.height*0.8;
    // candidates: nose->lead shoulder angle; nose->lead shoulder horizontal dist %stature
    const ang = (k: number) => { const a = P(k, LM.NOSE), b = P(k, lead); return a&&b ? Math.atan2(b.y-a.y, b.x-a.x)*180/Math.PI : null; };
    const dx = (k: number) => { const a = P(k, LM.NOSE), b = P(k, lead); return a&&b ? (b.x-a.x)*100/st : null; };
    const med = (xs: number[]) => { const t=[...xs].sort((a,b)=>a-b); return t[Math.floor(t.length/2)]; };
    const m3 = (k: number, g: (j:number)=>number|null) => { const xs=[k-1,k,k+1].filter(j=>s.frames[j]).map(g).filter((x):x is number=>x!=null); return xs.length>=2?med(xs):null; };
    const dev = (g: (j:number)=>number|null) => { const xs=s.frames.map((_,k)=>m3(k,g)).filter((x):x is number=>x!=null); const m=med(xs); return Math.max(...xs.map(x=>Math.abs(x-m))); };
    const dir = deriveDirectionSign(s, side) ?? 1; const apex = detectLoadApex(s, dir); const {plant} = frontFootPlantFromSeries(s, side); const p4 = detectP4(s, dir, plant.frame_index, plant); const ss = detectSwingStart(s, dir);
    const kOf = (fi: number|null) => fi==null?-1:s.frames.findIndex(f=>f.frame_index===fi);
    const a=kOf(apex.frame_index), p=kOf(plant.frame_index), q=kOf(p4.frame_index);
    const trace = (g:(j:number)=>number|null) => a<0?null: s.frames.slice(a, Math.max(p,q)+4).map((_,i)=>{const x=m3(a+i,g); return x==null?null:+x.toFixed(1);});
    console.log(n, side, "stillDev ang", dev(ang).toFixed(2), "dx", dev(dx).toFixed(2), "apex", apex.frame_index, "plant", plant.frame_index, "p4", p4.frame_index, "ss", ss.frame_index, "fps", s.header.fps_true, "\nang", JSON.stringify(trace(ang)), "\ndx", JSON.stringify(trace(dx)), "rear", rear);
  }
});
