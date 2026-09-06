/**
 * Stage 6 evidence — the full wave dose diff, by group.
 *
 * `resolveDose()` is untouched. `dosage/wave.ts` is imported by nothing in the
 * generator and the `lifting_v2_enabled` flag is false, so nothing shipped here
 * changes a dose today. This script exists so the owner can read exactly what
 * the wave rebuild would change BEFORE anyone turns it on.
 *
 * Run: bun scripts/audits/evidence/wave-diff.ts
 * Evidence: scripts/audits/evidence/wave-diff.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDose } from "../../../supabase/functions/_shared/wic/dosage/doctrine.ts";
import { resolveWaveDose } from "../../../supabase/functions/_shared/wic/dosage/wave.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"];
const ROLES = [
  "compound_lower", "unilateral_lower", "upper_push", "upper_pull",
  "trunk_finisher", "carry_antirotation", "arm_care", "supplemental",
];
const AGES = [0, 2, 4, 7, 12];
const WEEKS = [1, 2, 3, 4];
const CNS = [false, true];

interface Row {
  phase: string; role: string; group: string; trainingAgeYears: number;
  weekInBlock: number; cnsClamped: boolean; before: string; after: string;
}

const rows: Row[] = [];
const byGroup: Record<string, { compared: number; changed: number; repDelta: number[] }> = {};
let compared = 0;

for (const phase of PHASES) {
  for (const role of ROLES) {
    for (const trainingAgeYears of AGES) {
      for (const weekInBlock of WEEKS) {
        for (const cnsClamped of CNS) {
          const input = { phase, role, category: null, dosageUnit: "reps", trainingAgeYears, weekInBlock, cnsClamped };
          const before = resolveDose(input);
          const after = resolveWaveDose(input, true);
          const off = resolveWaveDose(input, false);
          if (off.sets !== before.sets || off.reps !== before.reps) {
            throw new Error("flag-off path diverged from resolveDose — aborting");
          }
          const g = (byGroup[before.group] ??= { compared: 0, changed: 0, repDelta: [] });
          g.compared++;
          compared++;
          if (before.sets !== after.sets || before.reps !== after.reps) {
            g.changed++;
            g.repDelta.push(after.reps - before.reps);
            rows.push({
              phase, role, group: before.group, trainingAgeYears, weekInBlock, cnsClamped,
              before: `${before.sets}x${before.reps}`, after: `${after.sets}x${after.reps}`,
            });
          }
        }
      }
    }
  }
}

const summary = Object.fromEntries(
  Object.entries(byGroup).map(([group, g]) => [
    group,
    {
      compared: g.compared,
      changed: g.changed,
      rep_delta_min: g.repDelta.length ? Math.min(...g.repDelta) : 0,
      rep_delta_max: g.repDelta.length ? Math.max(...g.repDelta) : 0,
    },
  ]),
);

const out = join(HERE, "wave-diff.json");
mkdirSync(HERE, { recursive: true });
writeFileSync(
  out,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      note: "wave.ts is not wired into the generator and lifting_v2_enabled is false. This is a preview diff only.",
      sets_changed: rows.filter((r) => r.before.split("x")[0] !== r.after.split("x")[0]).length,
      combinations_compared: compared,
      changed: rows.length,
      by_group: summary,
      rows,
    },
    null,
    2,
  ),
);

console.log(`[wave-diff] combinations compared: ${compared}`);
console.log(`[wave-diff] rows changed: ${rows.length}`);
for (const [group, g] of Object.entries(summary)) {
  console.log(
    `[wave-diff] ${group.padEnd(14)} compared ${String(g.compared).padStart(4)}  changed ${String(g.changed).padStart(4)}  rep delta ${g.rep_delta_min}..${g.rep_delta_max}`,
  );
}
console.log(`[wave-diff] evidence → ${out}`);
