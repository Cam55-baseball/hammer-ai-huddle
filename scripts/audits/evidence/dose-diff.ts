/**
 * Stage 1 acceptance evidence #2 — Dose diff.
 *
 * Requirement: Stage 1 changes NO dose. `resolveDose()` is the single dosage
 * authority and was declared untouchable.
 *
 * This proves it two ways:
 *   1. Textual — the doctrine file at the pre-Stage-1 base commit is byte
 *      identical to the file at HEAD.
 *   2. Behavioural — resolveDose() is enumerated exhaustively across the whole
 *      declared input space (phase × role × category × unit × training-age ×
 *      week-in-block × deload × cns-clamp) at BOTH revisions, and every
 *      resolved (sets, reps) pair is compared. The diff must be empty.
 *
 * Run: bun scripts/audits/evidence/dose-diff.ts
 * Evidence: scripts/audits/evidence/dose-diff.json
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");
const DOCTRINE = "supabase/functions/_shared/wic/dosage/doctrine.ts";

/** Commit that introduced the Stage 1 spec — its parent is the pre-Stage-1 base. */
const SPEC_COMMIT = process.env.STAGE1_SPEC_COMMIT ?? "ecda11851";
const git = (...args: string[]) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" });
const BASE = git("rev-parse", `${SPEC_COMMIT}^`).trim();

const beforeSrc = git("show", `${BASE}:${DOCTRINE}`);
const afterSrc = git("show", `HEAD:${DOCTRINE}`);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const textualIdentical = beforeSrc === afterSrc;

// Materialise the base revision so it can be imported side-by-side with HEAD.
const scratch = mkdtempSync(join(tmpdir(), "dose-diff-"));
const beforePath = join(scratch, "doctrine_before.ts");
writeFileSync(beforePath, beforeSrc);

const before = await import(beforePath);
const after = await import(join(REPO, DOCTRINE));

// ─── Exhaustive input space ─────────────────────────────────────────────────
const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season", "rtp", "preseason", "offseason", "", null];
const ROLES = [
  "arm_care", "trunk_primer", "rotation", "compound_lower", "unilateral_lower",
  "upper_push", "upper_pull", "carry_antirotation", "trunk_finisher", "supplemental", null,
];
const CATEGORIES = ["compound", "unilateral", "accessory", "kot", "trunk", "warmup", "speed_lab", null];
const UNITS = ["reps", "seconds", "feet", "total_reps", null];
const TRAINING_AGES = [0, 0.5, 1, 2, 3, 5, 6, 9, 10, 15];
const WEEKS = [1, 2, 3, 4];
const DELOAD = [false, true];
const CNS = [false, true];

type Row = { key: string; before: string; after: string };
const diffs: Row[] = [];
let compared = 0;

for (const phase of PHASES) {
  for (const role of ROLES) {
    for (const category of CATEGORIES) {
      for (const dosageUnit of UNITS) {
        for (const trainingAgeYears of TRAINING_AGES) {
          for (const weekInBlock of WEEKS) {
            for (const isDeloadWeek of DELOAD) {
              for (const cnsClamped of CNS) {
                const input = { phase, role, category, dosageUnit, trainingAgeYears, weekInBlock, isDeloadWeek, cnsClamped };
                const b = before.resolveDose(input);
                const a = after.resolveDose(input);
                const fmt = (d: { sets: number; reps: number; group: string; phase: string; band: string; doctrine_version: string }) =>
                  `${d.sets}x${d.reps}|${d.group}|${d.phase}|${d.band}|${d.doctrine_version}`;
                compared++;
                if (fmt(b) !== fmt(a)) {
                  diffs.push({ key: JSON.stringify(input), before: fmt(b), after: fmt(a) });
                }
              }
            }
          }
        }
      }
    }
  }
}

const outPath = join(HERE, "dose-diff.json");
mkdirSync(HERE, { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      base_commit: BASE,
      head_commit: git("rev-parse", "HEAD").trim(),
      doctrine_sha256_before: sha(beforeSrc),
      doctrine_sha256_after: sha(afterSrc),
      textually_identical: textualIdentical,
      combinations_compared: compared,
      diff_count: diffs.length,
      diffs,
    },
    null,
    2,
  ),
);

console.log(`[dose-diff] base ${BASE.slice(0, 9)} → HEAD ${git("rev-parse", "--short", "HEAD").trim()}`);
console.log(`[dose-diff] doctrine.ts sha256 before: ${sha(beforeSrc)}`);
console.log(`[dose-diff] doctrine.ts sha256 after : ${sha(afterSrc)}`);
console.log(`[dose-diff] textually identical: ${textualIdentical}`);
console.log(`[dose-diff] combinations compared: ${compared}`);
console.log(`[dose-diff] dose differences: ${diffs.length}`);
console.log(`[dose-diff] evidence → ${outPath}`);
if (!textualIdentical || diffs.length > 0) {
  console.error("[dose-diff] ❌ FAILED — Stage 1 changed a dose.");
  process.exit(1);
}
console.log("[dose-diff] ✅ PASSED — dose diff is empty.");
