/**
 * Zero-Drift Dosage Doctrine — CI audit.
 *
 * Asserts:
 *  1. Every quarter is distinguishable in main-compound volume/intensity.
 *  2. Every resolvable dose stays inside its envelope ceiling.
 *  3. No dose falls below the minimum effective dose (1 set × 1 rep).
 *  4. Week-4 deload actually reduces volume vs week 3.
 *  5. Training age actually changes the dose (no generic 2x8 for everyone).
 *  6. No hardcoded set/rep literal survives outside the doctrine module.
 *
 * Run: npx tsx scripts/audits/dosage-doctrine-audit.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DOSE_MATRIX,
  resolveDose,
  isWithinEnvelope,
  type DoctrinePhase,
  type DoseGroup,
  type TrainingAgeBand,
} from "../../supabase/functions/_shared/wic/dosage/doctrine.ts";

const PHASES: DoctrinePhase[] = ["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"];
const GROUPS: DoseGroup[] = [
  "main_compound",
  "unilateral",
  "upper",
  "trunk",
  "carry",
  "arm_care",
  "accessory",
];
const ROLE_FOR_GROUP: Record<DoseGroup, string> = {
  main_compound: "compound_lower",
  unilateral: "unilateral_lower",
  upper: "upper_push",
  trunk: "trunk_primer",
  carry: "carry_antirotation",
  arm_care: "arm_care",
  accessory: "supplemental",
};
const AGES: Array<[TrainingAgeBand, number]> = [
  ["beginner", 0],
  ["developing", 2],
  ["intermediate", 4],
  ["advanced", 8],
  ["elite", 12],
];

const failures: string[] = [];
const fail = (m: string) => failures.push(m);

// 1 + 2 + 3 — envelope legality across the full simulation grid.
for (const phase of PHASES) {
  for (const group of GROUPS) {
    for (const [band, years] of AGES) {
      for (const week of [1, 2, 3, 4]) {
        for (const cns of [false, true]) {
          const d = resolveDose({
            phase,
            role: ROLE_FOR_GROUP[group],
            trainingAgeYears: years,
            weekInBlock: week,
            cnsClamped: cns,
          });
          const label = `${phase}/${group}/${band}/wk${week}${cns ? "/cns" : ""}`;
          if (d.group !== group) fail(`${label}: resolved group ${d.group}, expected ${group}`);
          if (!isWithinEnvelope(phase, ROLE_FOR_GROUP[group], null, d.sets, d.reps)) {
            fail(`${label}: ${d.sets}x${d.reps} exceeds envelope ${JSON.stringify(d.envelope)}`);
          }
          if (d.sets < 1 || d.reps < 1) fail(`${label}: below minimum effective dose`);
        }
      }
    }
  }
}

// 1 — quarters must be distinguishable for the main compound.
const quarterSignature = new Map<string, string>();
for (const phase of PHASES) {
  const env = DOSE_MATRIX[phase].main_compound;
  const sig = `${env.sets.join("-")}x${env.reps.join("-")}`;
  const prior = quarterSignature.get(sig);
  if (prior) fail(`Quarters ${prior} and ${phase} share an identical main-compound envelope (${sig}) — quarters are cosmetic.`);
  quarterSignature.set(sig, phase);
}

// 4 — week 4 deload must reduce volume vs week 3 wherever the envelope allows.
for (const phase of PHASES) {
  const wk3 = resolveDose({ phase, role: "compound_lower", trainingAgeYears: 8, weekInBlock: 3 });
  const wk4 = resolveDose({ phase, role: "compound_lower", trainingAgeYears: 8, weekInBlock: 4 });
  if (wk4.sets * wk4.reps >= wk3.sets * wk3.reps) {
    fail(`${phase}: week 4 deload (${wk4.sets}x${wk4.reps}) is not lighter than week 3 (${wk3.sets}x${wk3.reps}).`);
  }
}

// 5 — training age must move the dose.
for (const phase of PHASES) {
  const beginner = resolveDose({ phase, role: "compound_lower", trainingAgeYears: 0, weekInBlock: 2 });
  const elite = resolveDose({ phase, role: "compound_lower", trainingAgeYears: 12, weekInBlock: 2 });
  const env = DOSE_MATRIX[phase].main_compound;
  const spread = env.sets[1] - env.sets[0] + (env.reps[1] - env.reps[0]);
  if (spread > 0 && beginner.sets === elite.sets && beginner.reps === elite.reps) {
    fail(`${phase}: beginner and elite receive an identical dose despite a non-zero envelope.`);
  }
}

// 6 — no literal dosing outside the doctrine module.
const SCAN_ROOTS = ["supabase/functions/wk-generate-daily", "supabase/functions/_shared/wic/engines"];
const LITERAL = /\{\s*sets:\s*\d|(^|[^_\w])reps:\s*\d/;
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".ts")) out.push(full);
  }
  return out;
}
for (const root of SCAN_ROOTS) {
  let files: string[] = [];
  try {
    files = walk(root);
  } catch {
    continue;
  }
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
      if (line.includes("dose_cap") || line.includes("_CAP") || line.includes("default_sets") || line.includes("default_reps")) return;
      if (LITERAL.test(line)) {
        fail(`${file}:${i + 1} hardcoded dose literal outside the doctrine module → ${line.trim()}`);
      }
    });
  }
}

// 7 — unit awareness: a total-dose movement must never be judged by set×rep math.
{
  const totalDoseRows = [
    { unit: "seconds", sets: 2, reps: 45 },
    { unit: "feet", sets: 3, reps: 30 },
    { unit: "innings", sets: 1, reps: 9 },
    { unit: "runs", sets: 1, reps: 6 },
    { unit: "each", sets: 2, reps: 20 },
  ];
  for (const row of totalDoseRows) {
    if (isRepDosed(row.unit)) {
      fail(`unit "${row.unit}" is treated as rep-dosed — envelope math would reject ${row.sets}×${row.reps}.`);
    }
  }
  if (!isRepDosed("reps") || !isRepDosed(null)) {
    fail("rep-dosed units must remain envelope-governed.");
  }
}

if (failures.length) {
  console.error(`\nDosage doctrine audit FAILED (${failures.length} issue${failures.length === 1 ? "" : "s"}):\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("Dosage doctrine audit passed — every quarter distinguishable, every dose inside its envelope, zero literal drift, units respected.");

