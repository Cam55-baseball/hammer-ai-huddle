import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { pointPx, LM, median } from "../anchors/poseKinematics";
import { detectStanceLock } from "../anchors/stanceLock";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("p",()=>{const s=load("swing-24fps-914cf54c.ndjson.gz"); const st=detectStanceLock(s).baseline!.stature_px!; const IDX=[15,16,11,12,23,24,27,28];
const out=[] as string[]; for(let k=190;k<s.frames.length-1;k++){const a=s.frames[k-1],b=s.frames[k+1];const dt=b.timestamp_seconds-a.timestamp_seconds;const v=IDX.map(i=>{const p=pointPx(s,a,i),q=pointPx(s,b,i);return p&&q?Math.hypot(q.x-p.x,q.y-p.y)/dt*100/st:null}).filter(x=>x!=null) as number[]; out.push(s.frames[k].frame_index+":"+median(v).toFixed(0));} console.log("SPD",out.join(" "));});
