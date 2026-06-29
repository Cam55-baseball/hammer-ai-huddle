/**
 * P3 Do-Not-Cue lint — enforces `.lovable/p3-do-not-cue-rule.md`.
 *
 * P3 (stride / heel plant) is involuntary under the v2 Arakawa overlay
 * (`.lovable/hitting-philosophy-v2-arakawa-integration.md`). Athlete-facing
 * cue surfaces may not instruct the hitter to consciously stride or to
 * project / push / drive the back hip through the ball or release point.
 *
 * Allowed locations: the rule doc itself, the master doctrine doc, prior
 * historical doctrine docs (preserved verbatim under additive law).
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOTS = ["src", "supabase/functions"];

/** Banned athlete-facing phrases. Matched case-insensitive, whole substring. */
const BANNED: RegExp[] = [
  /\bstride to the pitcher\b/i,
  /\bstep to the pitcher\b/i,
  /\bpush\s+(the\s+)?back\s+hip\b/i,
  /\bproject\s+(the\s+)?back\s+hip\b/i,
  /\bdrive\s+(the\s+)?back\s+hip\s+(to|through)\b/i,
  /\bconsciously\s+stride\b/i,
  /\bthink about (your )?stride\b/i,
];

/** Files exempted (rule + doctrine + prior preserved doctrine). */
const EXEMPT = [
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
      const raw = execSync(`grep -rln -E 'back hip|stride' ${root} || true`, { encoding: "utf8" });
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
    // Skip lines that look like coach_note keys (coach-voice diagnostic is exempt).
    if (/coach_note\s*:/.test(l) || /coachNote\s*:/.test(l)) continue;
    for (const re of BANNED) {
      if (re.test(l)) {
        offenders.push({ file, line: i + 1, text: l.trim(), rule: re.source });
      }
    }
  }
}

if (offenders.length > 0) {
  console.error("P3 Do-Not-Cue violation — see .lovable/p3-do-not-cue-rule.md");
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  [${o.rule}]  ${o.text}`);
  }
  process.exit(1);
}
console.log("ok: no banned P3 cue phrases found in athlete-facing surfaces.");
