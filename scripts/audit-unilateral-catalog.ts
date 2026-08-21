/**
 * Catalog laterality audit.
 *
 * Fails when a movement whose slug is clearly single-limb does not carry
 * `unilateral = true` in `wk_movement_catalog` — the flag the log sheet trusts
 * before it decides to ask the athlete for a side.
 *
 * Requires database access (PGHOST et al). Skips cleanly when unavailable so
 * CI without a database does not report a false failure.
 *
 * Run: bun scripts/audit-unilateral-catalog.ts
 */
import { execFileSync } from "node:child_process";
import { matchesUnilateralSlug } from "../src/components/hammer/logging/logTemplates";

if (!process.env.PGHOST) {
  console.log("[unilateral-catalog] no database access — skipped");
  process.exit(0);
}

let raw: string;
try {
  raw = execFileSync(
    "psql",
    ["-t", "-A", "-F", "\t", "-c", "select slug, coalesce(unilateral,false) from wk_movement_catalog order by slug"],
    { encoding: "utf8" },
  );
} catch (e) {
  console.log("[unilateral-catalog] psql unavailable — skipped");
  process.exit(0);
}

const missing: string[] = [];
let flagged = 0;

for (const line of raw.split("\n")) {
  const [slug, flag] = line.split("\t");
  if (!slug) continue;
  const unilateral = flag === "t" || flag === "true";
  if (unilateral) flagged += 1;
  else if (matchesUnilateralSlug(slug)) missing.push(slug);
}

if (missing.length) {
  console.error(
    `[unilateral-catalog] ${missing.length} single-limb movement(s) missing the unilateral flag:\n  ${missing.join("\n  ")}`,
  );
  process.exit(1);
}

console.log(`[unilateral-catalog] OK — ${flagged} movements flagged unilateral, no gaps`);
