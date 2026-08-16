/**
 * Adaptation-label drift guard.
 *
 * The daily generator gates every candidate movement through
 * `adaptationsCompatible(dayAdaptation, movement.primary_adaptation)`.
 * A catalog label that is neither canonical nor aliased used to silently make
 * that movement ineligible on every single day — which is how ~40% of the
 * catalog went dark and `full_body_strength` started fataling with
 * "requires compound_upper_pull".
 *
 * This guard asserts that every alias target is canonical and that the alias
 * table + canonical set stay in sync with the generator. Run:
 *   bunx tsx scripts/check-adaptation-labels.ts
 */
import { readFileSync } from "node:fs";

const GEN = "supabase/functions/wk-generate-daily/index.ts";
const src = readFileSync(GEN, "utf8");

const failures: string[] = [];

// Canonical adaptations = the keys of the compatibility map in the generator.
const mapBlock = src.match(/const map: Record<string, string\[\]> = \{([\s\S]*?)\n {6}\};/);
if (!mapBlock) {
  failures.push(`${GEN}: could not locate the adaptation compatibility map.`);
}
const canonical = new Set<string>(
  [...(mapBlock?.[1] ?? "").matchAll(/^\s{8}(\w+):/gm)].map((m) => m[1]),
);
// Values referenced inside the map are canonical too (they are movement-side labels).
for (const m of (mapBlock?.[1] ?? "").matchAll(/"([a-z_]+)"/g)) canonical.add(m[1]);
// Support classes are always-compatible movement labels.
for (const c of ["arm_care", "recovery_only", "movement_literacy", "conditioning_repeat_explosive"]) {
  canonical.add(c);
}

const aliasBlock = src.match(/const ADAPTATION_ALIASES: Record<string, string> = \{([\s\S]*?)\n {4}\};/);
if (!aliasBlock) {
  failures.push(`${GEN}: ADAPTATION_ALIASES table is missing — label canonicalization was removed.`);
}
const aliases = new Map<string, string>(
  [...(aliasBlock?.[1] ?? "").matchAll(/(\w+):\s*"([a-z_]+)"/g)].map((m) => [m[1], m[2]] as const),
);

if (aliases.size === 0 && aliasBlock) {
  failures.push(`${GEN}: ADAPTATION_ALIASES is empty.`);
}

for (const [from, to] of aliases) {
  if (!canonical.has(to)) {
    failures.push(`Alias "${from}" -> "${to}" targets a non-canonical adaptation.`);
  }
  if (canonical.has(from) && from !== to) {
    failures.push(`Alias "${from}" shadows a canonical adaptation — remove it or fix the target.`);
  }
}

// The gate must fail open on unknown labels, never silently empty the catalog.
if (!/if \(!map\[day\]\) return true;/.test(src)) {
  failures.push(`${GEN}: the adaptation gate no longer fails open on an unknown day label.`);
}
if (!/pickFirstRelaxed/.test(src)) {
  failures.push(`${GEN}: the template-completion fallback picker (pickFirstRelaxed) is gone.`);
}

if (failures.length) {
  console.error(`\nAdaptation-label guard FAILED (${failures.length}):\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `Adaptation-label guard passed — ${aliases.size} aliases, all resolving into ${canonical.size} canonical adaptations, gate fails open.`,
);
