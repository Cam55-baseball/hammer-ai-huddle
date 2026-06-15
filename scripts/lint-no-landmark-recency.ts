/**
 * Phase 0 lint — Historical Landmark Immutability rule §0.6.
 *
 * Forbids resolving landmark runs by recency. The constitutional contract is
 * that historical analyses reference an exact landmark_model_version. Any
 * `video_landmark_runs … order …` call is therefore illegal.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOTS = ["src", "supabase/functions", "scripts/replay"];
const NEEDLE = "video_landmark_runs";

function listFiles(): string[] {
  const out: string[] = [];
  for (const root of ROOTS) {
    try {
      const raw = execSync(`grep -rln '${NEEDLE}' ${root} || true`, { encoding: "utf8" });
      for (const line of raw.split("\n").map((s) => s.trim()).filter(Boolean)) out.push(line);
    } catch {
      /* root missing — skip */
    }
  }
  return Array.from(new Set(out)).filter((f) => !f.endsWith("lint-no-landmark-recency.ts"));
}

const offenders: { file: string; line: number; text: string }[] = [];
for (const file of listFiles()) {
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.includes(NEEDLE)) continue;
    // Look at a small window after the offending reference for `.order(`
    const window = lines.slice(i, Math.min(i + 8, lines.length)).join("\n");
    if (/\.order\s*\(/.test(window) || /ORDER\s+BY/i.test(window)) {
      offenders.push({ file, line: i + 1, text: l.trim() });
    }
  }
}

if (offenders.length > 0) {
  console.error("Historical Landmark Immutability violation — video_landmark_runs may never be ordered by recency:");
  for (const o of offenders) console.error(`  ${o.file}:${o.line}  ${o.text}`);
  process.exit(1);
}
console.log("ok: no recency-based landmark lookups found.");
