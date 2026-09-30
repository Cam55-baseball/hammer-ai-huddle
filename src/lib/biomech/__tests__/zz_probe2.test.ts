import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { pointPx } from "../anchors/poseKinematics";
const s = decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", "swing-24fps-914cf54c.ndjson.gz"))).toString("utf8"));
it("p", () => { const k0 = s.frames.findIndex(f=>f.frame_index===168); const o: string[]=[];
  for (let k=k0;k<k0+28;k++){ const f=s.frames[k]; const a=pointPx(s,f,11), b=pointPx(s,f,13), h=pointPx(s,f,23), n=pointPx(s,f,25);
    o.push(`${f.frame_index} arm=${a&&b?Math.hypot(a.x-b.x,a.y-b.y).toFixed(0):"-"} ang=${a&&b?(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI).toFixed(0):"-"} thigh=${h&&n?(Math.atan2(n.y-h.y,n.x-h.x)*180/Math.PI).toFixed(0):"-"}`);}
  console.log("ARM\n"+o.join("\n")); });
