/**
 * Preflight lint: skill-frequency ladder drift guards.
 *
 * Enforces (fails CI on violation):
 *   1. No weekly template schedules a skill modality more than 6 days/wk
 *      (MLB/AUSL cadence is the hard ceiling — never exceed the pros).
 *   2. Pitcher throwing ladder never hits 6 (bullpen recovery reality).
 *   3. `resolveSkillDaysTarget` is monotonically non-decreasing across
 *      Foundation → Sustain for every modality (no rung regression).
 *   4. Every skill modality in every template has a `priorityDayOrder`
 *      entry that covers all its baseline days (deterministic slicing).
 *
 * These invariants are also asserted by the determinism test suite;
 * this script gives us a fast, dependency-free CI gate.
 */
import {
  SKILL_MODALITIES,
  SKILL_DAYS_CEILING,
  resolveSkillDaysTarget,
} from "../src/lib/hammer/roadmap/skillFrequencyLadder";
import { RUNG_ORDER } from "../src/lib/hammer/roadmap/roadmapLadder";

// Templates are internal to weeklyMicrocycle; re-export via a tiny helper.
import type { WeeklyTemplate } from "../src/lib/hammer/prescription/weeklyMicrocycle";

// Minimal duck-typed access — we import the module and inspect the exported
// resolver's outputs for each phase branch instead of reaching into private
// constants. This keeps the lint honest against runtime behavior.
import {
  resolveWeeklyTemplate,
} from "../src/lib/hammer/prescription/weeklyMicrocycle";

const failures: string[] = [];

/* ── 1 + 4: template ceilings + priorityDayOrder coverage ──────────────── */

// Synthetic projections that exercise every branch of resolveWeeklyTemplate.
type Proj = Parameters<typeof resolveWeeklyTemplate>[0];
const mkProj = (over: Partial<Proj>): Proj =>
  ({
    seasonPhase: "off",
    weeklyAvailabilityDays: 5,
    lifecycleBand: "hs",
    liftingAgeYears: 3,
    injuryRegions: [],
    ...over,
  }) as Proj;

const templates: Array<{ name: string; t: WeeklyTemplate }> = [
  { name: "youth", t: resolveWeeklyTemplate(mkProj({ lifecycleBand: "u12" })) },
  { name: "off_4d", t: resolveWeeklyTemplate(mkProj({ seasonPhase: "off", weeklyAvailabilityDays: 4 })) },
  { name: "off_5d", t: resolveWeeklyTemplate(mkProj({ seasonPhase: "off", weeklyAvailabilityDays: 5 })) },
  { name: "pre", t: resolveWeeklyTemplate(mkProj({ seasonPhase: "pre" })) },
  { name: "in", t: resolveWeeklyTemplate(mkProj({ seasonPhase: "in" })) },
  { name: "post", t: resolveWeeklyTemplate(mkProj({ seasonPhase: "post" })) },
  { name: "permissive", t: resolveWeeklyTemplate(mkProj({ seasonPhase: null as never })) },
];

for (const { name, t } of templates) {
  for (const m of SKILL_MODALITIES) {
    const days = t.perModality[m] ?? [];
    if (days.length > SKILL_DAYS_CEILING) {
      failures.push(`[${name}] modality "${m}" schedules ${days.length} days/wk — exceeds ${SKILL_DAYS_CEILING} pro ceiling.`);
    }
    const priority = t.priorityDayOrder?.[m] ?? [];
    const priSet = new Set(priority);
    for (const d of days) {
      if (!priSet.has(d)) {
        failures.push(`[${name}] modality "${m}" baseline day ${d} missing from priorityDayOrder — non-deterministic slicing.`);
      }
    }
  }
}

/* ── 2: pitcher throwing never hits 6 ──────────────────────────────────── */

for (const r of RUNG_ORDER) {
  const t = resolveSkillDaysTarget(r, "throwing", "P");
  if (t >= SKILL_DAYS_CEILING) {
    failures.push(`Pitcher throwing at rung "${r}" resolves to ${t}/wk — must stay below ${SKILL_DAYS_CEILING} (bullpen reality).`);
  }
}

/* ── 3: monotonicity across rungs ──────────────────────────────────────── */

for (const m of SKILL_MODALITIES) {
  for (const pos of [null, "SS", "P"] as const) {
    let prev = -1;
    for (const r of RUNG_ORDER) {
      const t = resolveSkillDaysTarget(r, m, pos);
      if (t < prev) {
        failures.push(`Ladder regression: modality "${m}" position "${pos ?? "any"}" drops from ${prev} at earlier rung to ${t} at "${r}".`);
      }
      prev = t;
    }
  }
}

/* ── Report ────────────────────────────────────────────────────────────── */

if (failures.length > 0) {
  console.error("Skill-frequency ladder drift detected:");
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log("Skill-frequency ladder: all drift guards pass.");
