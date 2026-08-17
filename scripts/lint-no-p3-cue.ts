/**
 * P3 Power Step lint — enforces `.lovable/p3-power-step-rule.md`.
 *
 * v3 doctrine: P3 (stride / power step) is VOLUNTARY. It is coached, cued and
 * timed to the pitcher's release point. Direct stride instruction is CORRECT
 * and no longer banned.
 *
 * This lint now guards the reverse direction: it fails the build if retired
 * "P3 is involuntary / do-not-cue" language creeps back into athlete-facing
 * or engine surfaces.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOTS = ["src", "supabase/functions"];

/** Banned retired-doctrine phrases. Matched case-insensitive. */
const BANNED: RegExp[] = [
  /\bdo[-\s]?not[-\s]?cue\b/i,
  /\bP3 is involuntary\b/i,
  /\binvoluntary (stride|landing|step)\b/i,
  /\bnever coach the stride\b/i,
  /\bdon'?t cue the stride\b/i,
  /\bthe body will plant\b/i,
];

/** Files exempted (the rule itself + historical doctrine preserved verbatim). */
const EXEMPT = [
  ".lovable/p3-power-step-rule.md",
  ".lovable/p3-do-not-cue-rule.md",
  ".lovable/hitting-philosophy-v2-arakawa-integration.md",
  ".lovable/back-elbow-methodology.md",
  ".lovable/p3-timing-methodology.md",
  ".lovable/bat-path-vs-on-plane-definitions.md",
  ".lovable/finish-and-balance-methodology.md",
  ".lovable/time-to-contact-vs-power.md",
  "scripts/lint-no-p3-cue.ts",
];

function listFiles(): string[] {
  const out: string[] = [];
  for (const root of ROOTS) {
    try {
      const raw = execSync(
        `grep -rlni -E 'involuntary|do-not-cue|do not cue' ${root} || true`,
        { encoding: "utf8" },
      );
      for (const line of raw.split("\n").map((s) => s.trim()).filter(Boolean)) out.push(line);
    } catch {
      /* root missing */
    }
  }
  return Array.from(new Set(out)).filter((f) => !EXEMPT.some((e) => f.endsWith(e)));
}

const offenders: { file: string; line: number; text: string; rule: string }[] = [];
for (const file of listFiles()) {
  let text = "";
  try { text = readFileSync(file, "utf8"); } catch { continue; }
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    for (const re of BANNED) {
      if (re.test(l)) {
        offenders.push({ file, line: i + 1, text: l.trim(), rule: re.source });
      }
    }
  }
}

if (offenders.length > 0) {
  console.error("Retired P3 do-not-cue doctrine detected — see .lovable/p3-power-step-rule.md");
  console.error("P3 is a VOLUNTARY power step. Coach it, cue it, time it to release.");
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  [${o.rule}]  ${o.text}`);
  }
  process.exit(1);
}
console.log("ok: no retired involuntary-P3 language found.");
