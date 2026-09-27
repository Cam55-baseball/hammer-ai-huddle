import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { energyAt } from "../metrics/pitchingTiles";
import { frontFootPlantFromSeries } from "../metrics/hittingOwnerTiles";
import { deriveDirectionSign } from "../side/strideSide";
import { pointPx } from "../anchors/poseKinematics";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("scratch", () => {
  for (const n of ["still-subject-15d75bc9.ndjson.gz","swing-24fps-914cf54c.ndjson.gz","swing-24fps-9d2e117e.ndjson.gz","motion-hitting-edf45130.ndjson.gz"]) {
    const s = load(n);
    // camera view: shoulder width / shoulder-to-hip height, median
    const r: number[] = [], h: number[] = [];
    for (const f of s.frames) { const a=pointPx(s,f,11),b=pointPx(s,f,12),c=pointPx(s,f,23),d=pointPx(s,f,24); if(!a||!b||!c||!d) continue;
      const tor = Math.abs((c.y+d.y)/2-(a.y+b.y)/2); if(tor<=0) continue; r.push(Math.abs(a.x-b.x)/tor); h.push(Math.abs(c.x-d.x)/tor); }
    const med=(x:number[])=>{const q=[...x].sort((a,b)=>a-b);return q[Math.floor(q.length/2)]?.toFixed(3)};
    const p=(x:number[],pp:number)=>{const q=[...x].sort((a,b)=>a-b);return q[Math.floor((q.length-1)*pp)]?.toFixed(3)};
    console.log(n, "shW/torso med", med(r), "p10",p(r,.1),"p90",p(r,.9), "hipW/torso med", med(h), "fps", s.header.fps_true);
    for (const side of ["L","R"] as const) {
      const st = frontFootPlantFromSeries(s, side); const dir = deriveDirectionSign(s, side);
      const fi = st.lift.frame_index; if (fi==null||dir==null) { console.log(" ",side,"no lift/dir", st.lift.missingness?.missing_reason, dir); continue; }
      const k = s.frames.findIndex(f=>f.frame_index===fi);
      const row = (o:"back_ankle"|"rear_midfoot") => { const v=energyAt(s,s.frames[k],side,dir,o); const nb=[energyAt(s,s.frames[k-1],side,dir,o),energyAt(s,s.frames[k+1],side,dir,o)].filter((x):x is number=>x!=null); return `${v?.toFixed(2)} ±${v==null||!nb.length?"-":Math.max(...nb.map(x=>Math.abs(x-v))).toFixed(2)}`; };
      console.log(" ",side,"lift",fi,"ankle",row("back_ankle"),"midfoot",row("rear_midfoot"));
    }
  }
});
