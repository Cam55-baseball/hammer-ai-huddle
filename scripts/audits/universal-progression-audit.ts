/**
 * Universal progression audit — every Hammers Today card, not just the
 * explosive engines.
 *
 * Simulates 60 consecutive days for several athlete archetypes across every
 * training domain and asserts:
 *   1. every registered card slot resolves to a domain with a shape floor,
 *   2. block waves advance and deload weeks land on week 4,
 *   3. each domain accumulates its own history lineage (cadence + completion),
 *   4. personal bests are only claimed when a number was actually logged,
 *   5. the career horizon resolves for every age band,
 *   6. derivation is deterministic (same inputs → identical payload).
 *
 * Run: npx tsx scripts/audits/universal-progression-audit.ts
 */
import {
  buildProgressionState,
  buildProgressionPayload,
  domainForSlotRole,
  domainSessionName,
  resolveCareerHorizon,
  DOMAIN_SHAPE_FLOOR,
  DOMAIN_METRIC_KEY,
  type HistoryPrescriptionRow,
  type HistorySessionLogRow,
  type TrainingDomain,
} from "../../supabase/functions/_shared/wic/progression/progressionState.ts";

const failures: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) failures.push(msg);
};

const SLOTS = [
  "movement_prep",
  "warmup",
  "speed",
  "bat_speed",
  "lift",
  "supplemental",
  "conditioning",
  "cross_sport",
  "recovery",
  "mobility",
  "arm_care",
  "throwing",
] as const;

// 1 — domain resolution + floors ------------------------------------------
for (const slot of SLOTS) {
  const domain = domainForSlotRole(slot, null);
  ok(domain !== "other", `slot "${slot}" fell through to the "other" domain`);
  ok(!!DOMAIN_SHAPE_FLOOR[domain], `domain "${domain}" has no shape floor`);
  ok(DOMAIN_SHAPE_FLOOR[domain].min >= 1, `domain "${domain}" floor must be >= 1`);
  ok(!!domainSessionName(domain), `domain "${domain}" has no session name`);
  ok(domain in DOMAIN_METRIC_KEY, `domain "${domain}" missing metric mapping`);
}
ok(domainForSlotRole("lift", "arm_care") === "arm_care", "arm-care role inside the lift slot must resolve to arm_care");

// 2 — 60-day simulation per archetype -------------------------------------
interface Archetype {
  name: string;
  ageYears: number;
  trainingAgeYears: number;
  logsEverything: boolean;
}
const ARCHETYPES: Archetype[] = [
  { name: "12u foundation", ageYears: 12, trainingAgeYears: 0, logsEverything: false },
  { name: "15u development", ageYears: 15, trainingAgeYears: 2, logsEverything: true },
  { name: "17u expression", ageYears: 17, trainingAgeYears: 4, logsEverything: true },
  { name: "22 peak", ageYears: 22, trainingAgeYears: 8, logsEverything: false },
];

const addDays = (iso: string, n: number) =>
  new Date(new Date(iso + "T00:00:00Z").getTime() + n * 86400000).toISOString().slice(0, 10);

const START = "2026-03-02"; // Monday

for (const a of ARCHETYPES) {
  const prescriptions: HistoryPrescriptionRow[] = [];
  const logs: HistorySessionLogRow[] = [];
  const seenPhases = new Set<string>();

  for (let d = 0; d < 60; d++) {
    const planDate = addDays(START, d);
    const state = buildProgressionState({
      planDate,
      prescriptions,
      logs,
      ageYears: a.ageYears,
      trainingAgeYears: a.trainingAgeYears,
    });
    seenPhases.add(state.blockPhase);

    ok(state.weekInBlock >= 1 && state.weekInBlock <= 4, `${a.name}: week ${state.weekInBlock} out of range on ${planDate}`);
    ok(
      state.isDeloadWeek === (state.weekInBlock === 4),
      `${a.name}: deload flag disagrees with week ${state.weekInBlock} on ${planDate}`,
    );
    ok(!!state.career.stage && !!state.career.focus, `${a.name}: career horizon missing on ${planDate}`);

    for (const slot of SLOTS) {
      const domain = domainForSlotRole(slot, null);
      const slug = `${slot}_movement_${d % 5}`;
      const payload = buildProgressionPayload({
        state,
        slug,
        metricKey: DOMAIN_METRIC_KEY[domain],
        sessionName: domainSessionName(domain),
        domain,
      });

      ok(payload.domain === domain, `${a.name}: payload domain mismatch for ${slot}`);
      ok(!!payload.next_step, `${a.name}: ${slot} payload missing next step`);
      ok(!!payload.career_label, `${a.name}: ${slot} payload missing career label`);
      ok(payload.domain_history != null, `${a.name}: ${slot} payload missing domain history`);
      if (payload.target) {
        const key = DOMAIN_METRIC_KEY[domain];
        ok(!!key && state.bests.has(key), `${a.name}: ${slot} claimed a target with no logged best`);
      }

      // Determinism — identical inputs must produce an identical payload.
      const again = buildProgressionPayload({
        state,
        slug,
        metricKey: DOMAIN_METRIC_KEY[domain],
        sessionName: domainSessionName(domain),
        domain,
      });
      ok(JSON.stringify(payload) === JSON.stringify(again), `${a.name}: ${slot} payload is non-deterministic`);

      prescriptions.push({ plan_date: planDate, slot, movement_slug: slug });
      if (a.logsEverything || d % 3 === 0) {
        logs.push({
          plan_date: planDate,
          movement_slug: slug,
          rpe: 7,
          load_used: slot === "lift" ? 100 + d : null,
          metrics:
            slot === "bat_speed"
              ? { bat_speed_mph: 65 + d * 0.1 }
              : slot === "speed"
              ? { sprint_time_s: 7.2 - d * 0.005 }
              : {},
        });
      }
    }
  }

  ok(seenPhases.size === 4, `${a.name}: only saw phases ${[...seenPhases].join(", ")} across 60 days`);

  // Final state must carry per-domain lineage for every domain trained.
  const final = buildProgressionState({
    planDate: addDays(START, 60),
    prescriptions,
    logs,
    ageYears: a.ageYears,
    trainingAgeYears: a.trainingAgeYears,
  });
  for (const slot of SLOTS) {
    const domain = domainForSlotRole(slot, null) as TrainingDomain;
    const dp = final.domains.get(domain);
    ok(!!dp, `${a.name}: no domain history accumulated for ${domain}`);
    ok((dp?.sessionsInWindow ?? 0) > 0, `${a.name}: ${domain} has zero sessions in window`);
    ok(
      dp?.completionRate == null || (dp.completionRate >= 0 && dp.completionRate <= 1),
      `${a.name}: ${domain} completion rate out of range`,
    );
  }
}

// 3 — career horizon covers every age band --------------------------------
for (const [age, expected] of [
  [10, "foundation"],
  [14, "development"],
  [17, "expression"],
  [23, "peak"],
  [29, "sustain"],
  [38, "longevity"],
] as const) {
  const h = resolveCareerHorizon(age, 3);
  ok(h.stage === expected, `career horizon for age ${age} resolved to ${h.stage}, expected ${expected}`);
}

if (failures.length) {
  console.error(`❌ Universal progression audit failed — ${failures.length} issue(s):`);
  for (const f of failures.slice(0, 40)) console.error("  · " + f);
  process.exit(1);
}
console.log("✅ Universal progression audit passed — every card domain carries block, history, and career lineage.");
