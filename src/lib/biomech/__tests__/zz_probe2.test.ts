import { it } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { pointPx, LM } from "../anchors/poseKinematics";
const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
it("p", () => { for (const [fx,side] of [["swing-24fps-914cf54c.ndjson.gz","L"],["still-subject-15d75bc9.ndjson.gz","L"]] as const) {
  const s = load(fx); const P=(k:number,i:number)=>pointPx(s,s.frames[k],i);
  const lead = side==="L"? {sh:LM.R_SHOULDER,el:LM.R_ELBOW,wr:LM.R_WRIST,o:LM.L_SHOULDER}:null!;
  const d=(a:any,b:any)=>a&&b?Math.hypot(a.x-b.x,a.y-b.y):null;
  const n=s.frames.length; const hw=[...Array(n)].map((_,k)=>d(P(k,LM.L_HIP),P(k,LM.R_HIP))); const sw=[...Array(n)].map((_,k)=>d(P(k,LM.L_SHOULDER),P(k,LM.R_SHOULDER)));
  const Lh=Math.max(...hw.slice(100,184).filter(Boolean) as number[]), Ls=Math.max(...sw.slice(100,184).filter(Boolean) as number[]);
  const ac=(x:number|null,L:number)=>x==null?null:Math.acos(Math.min(1,x/L))*180/Math.PI;
  const ang=(a:any,b:any,c:any)=>{if(!a||!b||!c)return null;const u={x:a.x-b.x,y:a.y-b.y},w={x:c.x-b.x,y:c.y-b.y};return Math.acos(Math.max(-1,Math.min(1,(u.x*w.x+u.y*w.y)/Math.hypot(u.x,u.y)/Math.hypot(w.x,w.y))))*180/Math.PI;};
  const at=(a:any,b:any)=>a&&b?Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI:null;
  const ch:any={pel:(k:number)=>ac(hw[k],Lh),tor:(k:number)=>ac(sw[k],Ls),lsh:(k:number)=>ang(P(k,lead.o),P(k,lead.sh),P(k,lead.el)),larm:(k:number)=>at(P(k,lead.sh),P(k,lead.wr))};
  console.log(fx,"Lh",Lh,"Ls",Ls);
  for (let k=(fx.startsWith("sw")?165:1);k<(fx.startsWith("sw")?205:n-1);k++){ const r:any={}; for(const c in ch){const a=ch[c](k-1),b=ch[c](k+1); let dd=a!=null&&b!=null?b-a:null; if(c==="larm"&&dd!=null){dd=((dd+540)%360)-180;} r[c]=dd==null?"-":(dd*s.header.fps_true!/2).toFixed(0);} if(fx.startsWith("sw")||k%40===0) console.log(s.frames[k].frame_index, JSON.stringify(r)); }
}});
