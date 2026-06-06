/**
 * Spine Differentiation Test — P0-2.
 *
 * Synthesizes 5 athletes and routes them through `buildHammerDailyPlan` to
 * prove outputs materially differ when spine variables change.
 *
 * Pure / in-process — does not touch the database. Run with:
 *   bunx tsx scripts/audits/spine-differentiation-test.ts
 *
 * Evidence collected here is summarized in
 * `docs/asb/athlete-context-spine-consumer-activation-ratification.md` §F.
 */
import {
  buildHammerDailyPlan,
  type PrescribedBlock,
} from "@/lib/hammer/prescription/dailyPlan";
import type {
  ContextConfidence,
  ContextVariable,
  HammerAthleteContext,
} from "@/lib/hammer/context/athleteContext";

function mk<T>(
  key: string,
  value: T | null,
  source = "synthetic",
  confidence: ContextConfidence = "high",
): ContextVariable<T> {
  const missing = value === null || value === undefined;
  return {
    key,
    label: key,
    domain: "development",
    value: missing ? null : value,
    source,
    confidence: missing ? "missing" : confidence,
    missing,
    lastUpdated: missing ? null : new Date().toISOString(),
    lineage: { owner: "athlete", source, rawConfidence: confidence },
  };
}

function ctx(vars: ContextVariable[]): HammerAthleteContext {
  return {
    variables: vars,
    missing: vars.filter((v) => v.missing),
    missingCount: vars.filter((v) => v.missing).length,
    isLoading: false,
    envelope: null,
    get<T>(key: string) {
      return vars.find((v) => v.key === key) as ContextVariable<T> | undefined;
    },
  };
}

const ATHLETES: { name: string; vars: ContextVariable[] }[] = [
  {
    name: "novice-u12",
    vars: [
      mk("lifecycle_band", "u12"),
      mk("lifting_age_years", 0),
      mk("equipment_effective", { equipment: "full_gym" }),
      mk("position", "OF"),
      mk("development_priorities", ["skill", "mobility"]),
      mk("season_phase", "off"),
      mk("weekly_availability_days", 4),
      mk("goal_summary", "develop fundamentals"),
    ],
  },
  {
    name: "advanced-u18",
    vars: [
      mk("lifecycle_band", "u18"),
      mk("lifting_age_years", 4),
      mk("equipment_effective", { equipment: "full_gym" }),
      mk("position", "SS"),
      mk("development_priorities", ["strength", "power"]),
      mk("season_phase", "pre"),
      mk("weekly_availability_days", 5),
      mk("goal_summary", "college recruiting"),
    ],
  },
  {
    name: "detrained-adult",
    vars: [
      mk("lifecycle_band", "adult"),
      mk("lifting_age_years", 6),
      mk("equipment_effective", { equipment: "full_gym" }),
      mk("position", "P"),
      mk("development_priorities", ["strength"]),
      mk("season_phase", "off"),
      mk("weekly_availability_days", 3),
      mk("goal_summary", "return to play after layoff"),
    ],
  },
  {
    name: "injured-u18",
    vars: [
      mk("lifecycle_band", "u18"),
      mk("lifting_age_years", 3),
      mk("equipment_effective", { equipment: "full_gym" }),
      mk("position", "P"),
      mk("development_priorities", ["recovery"]),
      mk("season_phase", "in"),
      mk("weekly_availability_days", 4),
      mk("injury_history", "left UCL — no max throws"),
      mk("goal_summary", "rehab and return"),
    ],
  },
  {
    name: "hotel-equipment-adult",
    vars: [
      mk("lifecycle_band", "adult"),
      mk("lifting_age_years", 5),
      mk("equipment_effective", { equipment: "bodyweight" }, "session-scope"),
      mk("position", "OF"),
      mk("development_priorities", ["maintenance"]),
      mk("season_phase", "in"),
      mk("weekly_availability_days", 2),
      mk("goal_summary", "maintain on road"),
    ],
  },
];

function fingerprint(blocks: ReadonlyArray<PrescribedBlock>): string {
  return blocks
    .map((b) => `${b.modality}:${b.status}:${b.durationMin ?? "n"}:${b.title}`)
    .join("|");
}

function main() {
  const seen = new Map<string, string>();
  for (const a of ATHLETES) {
    const r = buildHammerDailyPlan(ctx(a.vars));
    const fp = fingerprint(r.blocks);
    const dup = seen.get(fp);
    console.log(`\n=== ${a.name} ===`);
    for (const b of r.blocks) {
      console.log(
        `  ${b.modality.padEnd(12)} ${b.status.padEnd(15)} ${b.durationMin ?? "—"}m  ${b.title}`,
      );
    }
    if (dup) console.warn(`  ⚠ identical fingerprint to ${dup} — NO differentiation`);
    else seen.set(fp, a.name);
  }
  console.log(
    `\nDifferentiation: ${seen.size}/${ATHLETES.length} unique plans produced.`,
  );
  if (seen.size < ATHLETES.length) process.exit(1);
}

main();
