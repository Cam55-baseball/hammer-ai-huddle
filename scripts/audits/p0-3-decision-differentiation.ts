/**
 * P0-3 Decision Differentiation Audit (RFL-029 / RFL-030 / RFL-031).
 *
 * Pure / in-process — exercises each engine's read path with 7 synthetic
 * athletes and proves spine variation drives output divergence.
 *
 * Run: bunx tsx scripts/audits/p0-3-decision-differentiation.ts
 * Evidence: scripts/audits/evidence/p0-3-differentiation.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildHammerDailyPlan,
  type PrescribedBlock,
} from "@/lib/hammer/prescription/dailyPlan";
import type {
  ContextConfidence,
  ContextVariable,
  HammerAthleteContext,
} from "@/lib/hammer/context/athleteContext";
import {
  projectEnvelope,
  selectSpeedFocus,
  orderRoadmapMilestones,
  applyContextFilter,
  type AthleteContextProjection,
  type RoadmapMilestoneView,
} from "@/lib/hammer/context/decisionFilters";

function mk<T>(key: string, value: T | null, confidence: ContextConfidence = "high"): ContextVariable<T> {
  const missing = value === null || value === undefined;
  return {
    key, label: key, domain: "development",
    value: missing ? null : value,
    source: "synthetic",
    confidence: missing ? "missing" : confidence,
    missing,
    lastUpdated: missing ? null : new Date().toISOString(),
    lineage: { owner: "athlete", source: "synthetic", rawConfidence: confidence },
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

const PERSONAS: { name: string; vars: ContextVariable[] }[] = [
  { name: "novice-u12", vars: [
    mk("lifecycle_band", "u12"), mk("lifting_age_years", 0),
    mk("equipment_effective", { equipment: "full_gym" }),
    mk("position", "OF"), mk("development_priorities", ["skill", "mobility"]),
    mk("season_phase", "off"), mk("weekly_availability_days", 4),
    mk("goal_summary", "fundamentals"), mk("goal_horizon", "long"),
  ]},
  { name: "advanced-u18", vars: [
    mk("lifecycle_band", "u18"), mk("lifting_age_years", 4),
    mk("equipment_effective", { equipment: "full_gym" }),
    mk("position", "SS"), mk("development_priorities", ["strength", "power"]),
    mk("season_phase", "pre"), mk("weekly_availability_days", 5),
    mk("goal_summary", "college recruiting"), mk("goal_horizon", "short"),
  ]},
  { name: "detrained-adult", vars: [
    mk("lifecycle_band", "adult"), mk("lifting_age_years", 6),
    mk("equipment_effective", { equipment: "full_gym" }),
    mk("position", "P"), mk("development_priorities", ["strength"]),
    mk("season_phase", "off"), mk("weekly_availability_days", 3),
    mk("goal_summary", "return after layoff"),
  ]},
  { name: "injured-u18", vars: [
    mk("lifecycle_band", "u18"), mk("lifting_age_years", 3),
    mk("equipment_effective", { equipment: "full_gym" }),
    mk("position", "P"), mk("development_priorities", ["recovery"]),
    mk("season_phase", "in"), mk("weekly_availability_days", 4),
    mk("injury_history", "left UCL — no max throws"),
    mk("goal_summary", "rehab and return"),
  ]},
  { name: "hotel-equipment-adult", vars: [
    mk("lifecycle_band", "adult"), mk("lifting_age_years", 5),
    mk("equipment_effective", { equipment: "bodyweight", scope: "session" }),
    mk("position", "OF"), mk("development_priorities", ["maintenance"]),
    mk("season_phase", "in"), mk("weekly_availability_days", 2),
    mk("goal_summary", "maintain on road"),
  ]},
  { name: "offseason-pro", vars: [
    mk("lifecycle_band", "adult"), mk("lifting_age_years", 8),
    mk("equipment_effective", { equipment: "full_gym" }),
    mk("position", "P"), mk("development_priorities", ["power", "speed"]),
    mk("season_phase", "off"), mk("weekly_availability_days", 6),
    mk("goal_summary", "build base"), mk("goal_horizon", "long"),
  ]},
  { name: "inseason-pro", vars: [
    mk("lifecycle_band", "adult"), mk("lifting_age_years", 8),
    mk("equipment_effective", { equipment: "full_gym" }),
    mk("position", "P"), mk("development_priorities", ["power"]),
    mk("season_phase", "in"), mk("weekly_availability_days", 5),
    mk("goal_summary", "compete"), mk("goal_horizon", "short"),
  ]},
  { name: "hamstring-injured-sprinter", vars: [
    mk("lifecycle_band", "adult"), mk("lifting_age_years", 4),
    mk("equipment_effective", { equipment: "full_gym" }),
    mk("position", "OF"), mk("development_priorities", ["speed"]),
    mk("season_phase", "pre"), mk("weekly_availability_days", 4),
    mk("injury_history", "right hamstring strain — no max sprints"),
    mk("goal_summary", "return to sprint"),
  ]},
  { name: "asymmetric-adult", vars: [
    mk("lifecycle_band", "adult"), mk("lifting_age_years", 5),
    mk("equipment_effective", { equipment: "full_gym" }),
    mk("position", "SS"), mk("development_priorities", ["speed", "power"]),
    mk("season_phase", "pre"), mk("weekly_availability_days", 5),
    mk("goal_summary", "fix asymmetry"),
    mk("asymmetry_pct", 14),
  ]},
  // RFL-034 — minor-athlete supremacy fixtures.
  { name: "minor-u16-no-concerns", vars: [
    mk("lifecycle_band", "u16"), mk("lifting_age_years", 1),
    mk("equipment_effective", { equipment: "home_gym" }),
    mk("position", "OF"), mk("development_priorities", ["skill", "speed"]),
    mk("season_phase", "pre"), mk("weekly_availability_days", 4),
    mk("goal_summary", "varsity tryout"), mk("goal_horizon", "short"),
    mk("parent_link_active", { status: "active" }),
    mk("parent_concerns", []),
  ]},
  { name: "minor-u16-parent-concerns", vars: [
    mk("lifecycle_band", "u16"), mk("lifting_age_years", 1),
    mk("equipment_effective", { equipment: "home_gym" }),
    mk("position", "P"), mk("development_priorities", ["speed", "power"]),
    mk("season_phase", "pre"), mk("weekly_availability_days", 4),
    mk("goal_summary", "varsity tryout"), mk("goal_horizon", "short"),
    mk("parent_link_active", { status: "active" }),
    mk("parent_concerns", ["arm_load", "speed_max", "heavy_lift"]),
  ]},
];

const DRILL_FIXTURE = [
  { id: "d-bw-squat", tags: ["bodyweight", "squat", "mobility", "skill"] },
  { id: "d-bench-max", tags: ["barbell", "bench_press", "max_load"] },
  { id: "d-band-row", tags: ["bands", "row", "maintenance"] },
  { id: "d-max-throw", tags: ["max_throw", "power", "pull_down"] },
  { id: "d-depth-jump-max", tags: ["depth_jump_max", "power"] },
  { id: "d-tempo-run", tags: ["tempo", "recovery", "volume"] },
  { id: "d-trap-bar", tags: ["trap_bar", "deadlift", "strength"] },
];

const ROADMAP_FIXTURE: RoadmapMilestoneView[] = [
  { id: "m-base", module: "strength", title: "Base build", tags: ["base", "volume"], milestoneOrder: 1 },
  { id: "m-max", module: "strength", title: "Max strength block", tags: ["max", "heavy"], milestoneOrder: 5 },
  { id: "m-throw-max", module: "throwing", title: "Throw velocity peak", tags: ["throw_max", "power"], milestoneOrder: 6 },
  { id: "m-youth-skill", module: "skill", title: "Youth skill fundamentals", tags: ["skill"], lifecycleBands: ["u10","u12","u14"], milestoneOrder: 2 },
  { id: "m-recover", module: "recovery", title: "Recovery protocol", tags: ["recovery", "mobility"], milestoneOrder: 3 },
];

function fp(blocks: ReadonlyArray<PrescribedBlock>): string {
  return blocks.map((b) => `${b.modality}:${b.status}:${b.durationMin ?? "n"}:${b.title}`).join("|");
}

interface PersonaEvidence {
  name: string;
  projection: AthleteContextProjection;
  dailyPlanFingerprint: string;
  speedFocus: ReturnType<typeof selectSpeedFocus>;
  drillsLegal: string[];
  drillsRanked: { id: string; boost: number; reasons: string[] }[];
  roadmapTop: { id: string; score: number; suppressed: boolean }[];
}

const evidence: PersonaEvidence[] = [];
const dailyFps = new Set<string>();
const speedFps = new Set<string>();
const drillFps = new Set<string>();
const roadmapFps = new Set<string>();

for (const p of PERSONAS) {
  const c = ctx(p.vars);
  const proj = projectEnvelope(c);
  const plan = buildHammerDailyPlan(c);
  const speed = selectSpeedFocus(proj);
  const drillFilter = applyContextFilter(DRILL_FIXTURE, proj);
  const roadmap = orderRoadmapMilestones(ROADMAP_FIXTURE, proj);

  const pEv: PersonaEvidence = {
    name: p.name,
    projection: proj,
    dailyPlanFingerprint: fp(plan.blocks),
    speedFocus: speed,
    drillsLegal: drillFilter.filter((d) => d.legal).map((d) => d.item.id),
    drillsRanked: drillFilter.map((d) => ({ id: d.item.id, boost: d.priorityBoost, reasons: [...d.reasons] })),
    roadmapTop: roadmap.slice(0, 5).map((r) => ({ id: r.milestone.id, score: r.score, suppressed: r.suppressed })),
  };
  evidence.push(pEv);

  dailyFps.add(pEv.dailyPlanFingerprint);
  speedFps.add(speed.focus + ":" + speed.recommendedReps);
  drillFps.add(pEv.drillsLegal.join(","));
  roadmapFps.add(pEv.roadmapTop.map((r) => r.id + (r.suppressed ? "X" : "")).join(","));
}

const summary = {
  personas: PERSONAS.length,
  uniqueDailyPlans: dailyFps.size,
  uniqueSpeedFoci: speedFps.size,
  uniqueDrillLegalSets: drillFps.size,
  uniqueRoadmapTops: roadmapFps.size,
};

console.log("\n=== P0-3 Decision Differentiation ===");
console.table(summary);
for (const e of evidence) {
  console.log(`\n[${e.name}] daily=${e.dailyPlanFingerprint.slice(0, 80)}...`);
  console.log(`  speed: ${e.speedFocus.focus} (${e.speedFocus.rationale})`);
  console.log(`  legal drills: ${e.drillsLegal.join(",") || "(none)"}`);
  console.log(`  roadmap top: ${e.roadmapTop.map((r) => r.id + (r.suppressed ? "(S)" : "")).join(", ")}`);
}

const out = "scripts/audits/evidence/p0-3-differentiation.json";
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ summary, evidence }, null, 2));
console.log(`\nEvidence written → ${out}`);

const failing: string[] = [];
if (summary.uniqueDailyPlans < PERSONAS.length) failing.push("dailyPlan not fully differentiated");
if (summary.uniqueSpeedFoci < 4) failing.push("speedFocus differentiation < 4");
if (summary.uniqueDrillLegalSets < 3) failing.push("drill legality differentiation < 3");
if (summary.uniqueRoadmapTops < 3) failing.push("roadmap differentiation < 3");
if (failing.length) {
  console.error("\nFAIL:", failing.join("; "));
  process.exit(1);
}
console.log("\nPASS — all engines differentiate on spine variation.");
