import { GRADE_BENCHMARKS } from '../../src/data/gradeBenchmarks';
for (const [k,e] of Object.entries(GRADE_BENCHMARKS) as any) {
  const bands = Object.keys(e.softball||{});
  if (!bands.length) { console.log(`${k}\tNO_SOFTBALL\t${e.source}`); continue; }
  const ratios:number[] = [];
  for (const b of bands) {
    const sb = e.softball[b], bb = e.baseball?.[b];
    if (!sb||!bb||sb.length!==bb.length) continue;
    sb.forEach((p:any,i:number)=>ratios.push(p.raw/bb[i].raw));
  }
  const mn=Math.min(...ratios), mx=Math.max(...ratios);
  const spread = mx-mn;
  console.log(`${k}\t${bands.length}bands\tratio ${mn.toFixed(3)}-${mx.toFixed(3)} spread ${spread.toFixed(3)}\t${e.source}`);
}
