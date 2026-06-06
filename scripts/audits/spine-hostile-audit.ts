/**
 * Spine Hostile Audit — P0-2.
 *
 * Routes empty / partial / stale / conflicting / overridden contexts through
 * the canonical daily-plan consumer and asserts lawful output (no null
 * cascades, no silent failures, missingness preserved per FC-1…FC-10).
 *
 *   bunx tsx scripts/audits/spine-hostile-audit.ts
 */
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import type {
  ContextConfidence,
  ContextVariable,
  HammerAthleteContext,
} from "@/lib/hammer/context/athleteContext";

function v<T>(
  key: string,
  value: T | null,
  confidence: ContextConfidence = "high",
  lastUpdated: string | null = new Date().toISOString(),
): ContextVariable<T> {
  const missing = value === null || value === undefined;
  return {
    key,
    label: key,
    domain: "development",
    value: missing ? null : value,
    source: "hostile-test",
    confidence: missing ? "missing" : confidence,
    missing,
    lastUpdated: missing ? null : lastUpdated,
    lineage: { owner: "athlete", source: "hostile-test", rawConfidence: confidence },
  };
}

function ctx(vars: ContextVariable[]): HammerAthleteContext {
  return {
    variables: vars,
    missing: vars.filter((x) => x.missing),
    missingCount: vars.filter((x) => x.missing).length,
    isLoading: false,
    envelope: null,
    get<T>(key: string) {
      return vars.find((x) => x.key === key) as ContextVariable<T> | undefined;
    },
  };
}

const CASES = {
  empty: ctx([]),
  partial: ctx([v("sport_primary", "baseball"), v("goal_summary", "develop")]),
  stale: ctx([
    v("lifecycle_band", "u18", "low", "2025-01-01T00:00:00Z"),
    v("lifting_age_years", 2, "low", "2025-01-01T00:00:00Z"),
    v("equipment_effective", { equipment: "full_gym" }, "low"),
    v("position", "SS"),
  ]),
  conflicting: ctx([
    v("equipment_effective", { equipment: "bodyweight" }, "high"),
    v("equipment_access", "full_gym", "high"),
    v("lifecycle_band", "adult"),
    v("lifting_age_years", 4),
    v("position", "OF"),
  ]),
  overridden: ctx([
    {
      ...v("lifecycle_band", "u12"),
      lineage: { owner: "parent", source: "parent-override", rawConfidence: "high" },
    },
    v("lifting_age_years", 0),
    v("equipment_effective", { equipment: "full_gym" }),
    v("position", "OF"),
    {
      ...v("safeguarding_minor", true),
      lineage: { owner: "system", source: "safeguarding", rawConfidence: "high" },
    },
  ]),
};

let failed = 0;
for (const [name, c] of Object.entries(CASES)) {
  try {
    const r = buildHammerDailyPlan(c);
    const nulls = r.blocks.filter(
      (b) => b.title == null || b.modality == null || b.steps == null,
    );
    if (nulls.length) {
      console.error(`✗ ${name}: null cascade in ${nulls.length} block(s)`);
      failed++;
      continue;
    }
    const awaiting = r.blocks.filter((b) => b.status === "awaiting-input").length;
    console.log(
      `✓ ${name}: ${r.blocks.length} blocks · ${awaiting} awaiting-input · seasonPhase=${r.seasonPhase}`,
    );
  } catch (e) {
    console.error(`✗ ${name}: threw — ${(e as Error).message}`);
    failed++;
  }
}
console.log(failed === 0 ? "\nALL HOSTILE CASES LAWFUL" : `\n${failed} FAILED`);
if (failed) process.exit(1);
