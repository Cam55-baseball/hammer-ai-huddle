// Tissue Cost Scheduler — full property sweep (spec §7).
//
//   bun scripts/audits/tcs-property-sweep.ts [totalSeasons] [workers] [baseSeed]
//
// Default: 100,000 athlete-seasons of 365 days across 16 workers (~20 min on 16 cores).
// Every worker prints its seed, so any failure can be replayed exactly with:
//   TCS_SEED=<seed> TCS_SEASONS=<n> npx vitest run src/test/tissueCost/invariants.test.ts

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const totalSeasons = Number(process.argv[2] ?? 100_000);
const workers = Number(process.argv[3] ?? 16);
const baseSeed = Number(process.argv[4] ?? 20260920);
const per = Math.ceil(totalSeasons / workers);
const dir = mkdtempSync(join(tmpdir(), "tcs-sweep-"));
const root = process.cwd();

const workerSrc = `
import { runSweep } from "${root}/supabase/functions/_shared/wic/schedule/tissueCost/sweep.ts";
const [seed, seasons, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
const t = Date.now();
const r = runSweep({ seed, seasons });
await Bun.write(out, JSON.stringify({ seed, seasons: r.seasons, daysChecked: r.daysChecked, deepChecks: r.deepChecks, violations: r.violations, ms: Date.now() - t }));
`;
const workerPath = join(dir, "worker.ts");
writeFileSync(workerPath, workerSrc);

const started = Date.now();
console.log(`[tcs] sweep: ${totalSeasons} seasons × 365 days, ${workers} workers, base seed ${baseSeed}`);

await Promise.all(
  Array.from({ length: workers }, (_, k) =>
    new Promise<void>((resolve, reject) => {
      const seed = baseSeed + k;
      const out = join(dir, `w${k}.json`);
      const p = spawn("bun", [workerPath, String(seed), String(per), out], { stdio: "inherit" });
      p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`worker ${k} exit ${code}`))));
    })
  ),
);

let seasons = 0;
let daysChecked = 0;
let deepChecks = 0;
const violations: unknown[] = [];
const seeds: number[] = [];
for (let k = 0; k < workers; k++) {
  const r = JSON.parse(readFileSync(join(dir, `w${k}.json`), "utf8"));
  seasons += r.seasons;
  daysChecked += r.daysChecked;
  deepChecks += r.deepChecks;
  seeds.push(r.seed);
  violations.push(...r.violations);
}

console.log(
  JSON.stringify(
    { seasons, daysChecked, deepChecks, violations: violations.length, seeds, seconds: Math.round((Date.now() - started) / 1000) },
    null,
    2,
  ),
);
if (violations.length) {
  console.error(JSON.stringify(violations.slice(0, 20), null, 2));
  process.exit(1);
}
