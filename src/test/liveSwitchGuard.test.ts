import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Owner rule 2026-10-11: tests and scripts never write the live switch rows. */
function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (f === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|sql|py|sh)$/.test(f)) out.push(p);
  }
  return out;
}
const WRITE = /wk_feature_switches["'`)\s]*[\s\S]{0,120}?\.(update|insert|upsert|delete)\(|(update|insert\s+into|delete\s+from)\s+(public\.)?wk_feature_switches\b/i;

describe("live safety switches", () => {
  it("no test or script writes wk_feature_switches", () => {
    const files = [...walk("scripts"), ...walk("src/test"), ...walk("src").filter((f) => /\.test\.tsx?$/.test(f)), ...walk("supabase/functions").filter((f) => /\.test\.ts$/.test(f))];
    const bad = files.filter((f) => !f.endsWith("liveSwitchGuard.test.ts") && WRITE.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });
  it("the nightly check can never turn the rest-day rules down", () => {
    const src = readFileSync("supabase/functions/tcs-auto-off/index.ts", "utf8");
    expect(src).toMatch(/SAFETY_LOCKED = new Set\(\["rest_day_calculator"\]\)/);
    expect(src.indexOf("SAFETY_LOCKED.has(row.feature_key)")).toBeLessThan(src.indexOf('.update({ mode: verdict.toMode })'));
  });
});
