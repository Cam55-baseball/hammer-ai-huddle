import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as saved from "../supabase/functions/_shared/generated/hammerBlockBuilder.mjs";

const dir = await mkdtemp(path.join(tmpdir(), "hammer-block-parity-"));
try {
  const result = await build({
    entryPoints: ["src/lib/hammer/prescription/serverBlockBuilder.ts"],
    bundle: true, write: false, format: "esm", platform: "neutral", treeShaking: true,
    alias: { "@": path.resolve("src") }, external: [path.resolve("src/integrations/supabase/client")],
    define: { "window": "undefined", "localStorage": "undefined", "import.meta.env.DEV": "false", "import.meta.env.MODE": '"server"' },
  });
  const file = path.join(dir, "fresh.mjs");
  await writeFile(file, result.outputFiles[0].contents);
  const fresh = await import(pathToFileURL(file).href);
  const now = new Date("2026-10-22T12:00:00Z");
  let checked = 0;
  for (const sport of ["baseball", "softball"]) {
    for (const gear of [[], ["bat", "tee"], ["bat", "pitching_machine", "partner", "foam_roller"]]) {
      const values = { sport_primary: sport, lifecycle_band: "adult", season_phase: "in", injury_history: [],
        equipment_effective: { equipment: gear }, position_primary: "SS", lifting_age_years: 3,
        weekly_availability_days: 6, development_priorities: ["hitting", "defense"] };
      const envelope = Object.fromEntries(Object.entries(values).map(([key, value]) => [key,
        { value, source: "parity-fixture", confidence: "high", missing: false, last_updated: null, owner: "athlete" }]));
      const inputs = { subscriptionModules: [`${sport}_5tool`] };
      const actual = saved.buildHammerDailyPlan(saved.contextFromEnvelope(envelope), undefined, null, null, undefined, now, inputs);
      const expected = fresh.buildHammerDailyPlan(fresh.contextFromEnvelope(envelope), undefined, null, null, undefined, now, inputs);
      assert.deepEqual(actual, expected, `${sport} gear ${gear.join(",")}: stale server builder`);
      checked++;
    }
  }
  const missing = saved.contextFromEnvelope({ sport_primary: { value: "baseball", missing: true, confidence: "missing", source: "fixture", owner: "athlete", last_updated: null } });
  assert.equal(missing.get("sport_primary").value, null);
  assert.equal(missing.get("sport_primary").missing, true);
  console.log(`${checked} sport/equipment parity cases and missingness preservation passed.`);
} finally {
  await rm(dir, { recursive: true, force: true });
}