/**
 * Elite Training Methods Engine v1 — hostile governance audit.
 *
 * Proves, without a database, that the method layer cannot violate doctrine:
 *   A. Catalog integrity      — bounds, gating, rationale completeness.
 *   B. Quarter legality       — French contrast placement law.
 *   C. Veto law               — no method on unsafe days or unsafe athletes.
 *   D. Determinism            — same inputs, same method, every time.
 *   E. Dose containment       — the transform never leaves the envelope.
 *   F. Frequency ceilings     — rolling 7-day law is enforced.
 *   G. Engine scope           — methods never reach forbidden engines.
 *
 * Run: deno run -A scripts/audits/methods-governance-audit.ts
 */
import {
  FORBIDDEN_ENGINES,
  METHOD_PRIORITY,
  METHODS_BY_ID,
  METHODS_VERSION,
  TRAINING_AGE_RANK,
  type MethodDef,
  type MethodEngine,
  type TrainingAgeClass,
} from "../../supabase/functions/_shared/wic/methods/catalog.ts";
import {
  selectMethod,
  buildWeeklyMethodUsage,
  type MethodBlockShape,
} from "../../supabase/functions/_shared/wic/methods/selector.ts";
import { applyMethod, validateAppliedMethod } from "../../supabase/functions/_shared/wic/methods/apply.ts";
import {
  DOSE_MATRIX,
  doseGroupFor,
  type DoctrinePhase,
} from "../../supabase/functions/_shared/wic/dosage/doctrine.ts";

const PHASES: DoctrinePhase[] = ["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"];
const ENGINES: MethodEngine[] = ["lift", "speed", "bat_speed", "power"];
const AGES: TrainingAgeClass[] = ["beginner", "developing", "intermediate", "advanced", "elite", "pro"];

let failures = 0;
let checks = 0;
function ok(cond: boolean, label: string, detail = "") {
  checks++;
  if (!cond) {
    failures++;
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}
function section(name: string) {
  console.log(`\n${name}`);
}

const FULL_BLOCK: MethodBlockShape = {
  hasAnchor: true,
  hasPlyometric: true,
  hasLoadedExplosive: true,
  hasAssisted: true,
  hasExpression: true,
  accessoryCount: 4,
};
const CLEAN_DAY = {
  dayType: "training",
  isGameDay: false,
  isTravelDay: false,
  isHeavyPracticeDay: false,
  isRecoveryDay: false,
  isReturnToPlay: false,
};
const READY = { reductionCount: 0, cnsClamped: false, cnsReadiness: 9 };
const ELITE_ATHLETE = {
  trainingAgeClass: "elite" as TrainingAgeClass,
  ageYears: 19,
  strengthFloorCleared: true,
  hasActiveInjury: false,
  equipment: ["bands", "chains", "barbell", "dumbbell", "sled", "box", "medicine_ball"],
};

// ---------------------------------------------------------------------------
section("A. Catalog integrity");
const methods: MethodDef[] = METHOD_PRIORITY.map((id) => METHODS_BY_ID[id]).filter(Boolean);
ok(methods.length === METHOD_PRIORITY.length, "every prioritized method resolves");
ok(methods.length >= 12, "library carries at least 12 methods", `${methods.length}`);
for (const m of methods) {
  ok([-1, 0, 1].includes(m.setsDelta), `${m.id}: setsDelta bounded`);
  ok(m.cnsMultiplier >= 0.7 && m.cnsMultiplier <= 1.35, `${m.id}: cnsMultiplier bounded`, String(m.cnsMultiplier));
  ok(!!m.why && !!m.cue && !!m.bailout, `${m.id}: rationale complete`);
  ok(!!m.displayName && !!m.shape, `${m.id}: athlete-facing labels present`);
  ok(
    m.engines.every((e) => !(FORBIDDEN_ENGINES as readonly string[]).includes(e)),
    `${m.id}: no forbidden engine`,
  );
  ok(
    m.stations.every((s, i) => s.order === i + 1),
    `${m.id}: station order contiguous`,
  );
  ok(
    m.stations.every((s) => !!s.label && !!s.intent && !!s.loadHint && s.reps > 0),
    `${m.id}: stations fully specified`,
  );
  ok(
    PHASES.some((p) => m.phases[p].legal),
    `${m.id}: legal somewhere`,
  );
  for (const p of PHASES) {
    const r = m.phases[p];
    ok(!r.legal || r.maxPerWeek >= 1, `${m.id}/${p}: legal implies a weekly ceiling`);
    ok(r.legal || r.maxPerWeek === 0, `${m.id}/${p}: illegal implies zero ceiling`);
  }
  ok(TRAINING_AGE_RANK[m.minTrainingAge] !== undefined, `${m.id}: training age gate valid`);
  ok(m.minAgeYears >= 12, `${m.id}: chronological floor sane`, String(m.minAgeYears));
}

// ---------------------------------------------------------------------------
section("B. French contrast placement law");
const fc = methods.find((m) => m.id.includes("french"));
ok(!!fc, "French contrast exists in the library");
if (fc) {
  ok(fc.stations.length === 4, "four stations", String(fc.stations.length));
  ok(fc.stations[0].source === "anchor", "station 1 is the heavy anchor");
  ok(fc.stations[1].source === "plyometric", "station 2 is plyometric");
  ok(fc.stations[2].source === "loaded_explosive", "station 3 is loaded explosive");
  ok(fc.stations[3].source === "assisted", "station 4 is assisted / overspeed");
  ok(!fc.phases.os_q1.legal, "illegal in Q1");
  ok(!fc.phases.in_season.legal, "illegal in-season");
  ok(!fc.phases.post_season.legal, "illegal post-season");
  ok(fc.phases.os_q3.legal, "legal in Q3 (home quarter)");
  ok(
    fc.phases.os_q3.maxPerWeek >= (fc.phases.os_q2.maxPerWeek || 0) &&
      fc.phases.os_q3.maxPerWeek >= (fc.phases.os_q4.maxPerWeek || 0),
    "Q3 carries the highest frequency",
  );
  ok(fc.requiresStrengthFloor, "requires a cleared strength standard");
  ok(TRAINING_AGE_RANK[fc.minTrainingAge] >= TRAINING_AGE_RANK.advanced, "advanced+ only");
  ok(fc.minAgeYears >= 16, "16+ only", String(fc.minAgeYears));
}

// ---------------------------------------------------------------------------
section("C. Veto law");
const unsafeDays: Array<[string, Partial<typeof CLEAN_DAY>]> = [
  ["game day", { isGameDay: true }],
  ["tournament", { dayType: "tournament" }],
  ["travel", { isTravelDay: true }],
  ["recovery", { isRecoveryDay: true }],
  ["rest", { dayType: "rest" }],
  ["return to play", { isReturnToPlay: true }],
  ["heavy practice", { isHeavyPracticeDay: true }],
  ["deload", { dayType: "deload" }],
];
for (const [label, patch] of unsafeDays) {
  for (const phase of PHASES) {
    const sel = selectMethod({
      engine: "lift", phase, day: { ...CLEAN_DAY, ...patch },
      athlete: ELITE_ATHLETE, readiness: READY, block: FULL_BLOCK, weeklyUsage: {}, seed: "seed",
    });
    ok(sel.method === null && sel.vetoCode === "method_veto_day_type", `${label}/${phase}: vetoed`);
  }
}
const unsafeStates: Array<[string, { readiness?: typeof READY; athlete?: typeof ELITE_ATHLETE; code: string }]> = [
  ["cns clamped", { readiness: { ...READY, cnsClamped: true }, code: "method_veto_cns_clamped" }],
  ["volume reduction", { readiness: { ...READY, reductionCount: 1 }, code: "method_veto_readiness" }],
  ["low readiness", { readiness: { ...READY, cnsReadiness: 5 }, code: "method_veto_low_readiness" }],
  ["active injury", { athlete: { ...ELITE_ATHLETE, hasActiveInjury: true }, code: "method_veto_injury" }],
];
for (const [label, cfg] of unsafeStates) {
  const sel = selectMethod({
    engine: "lift", phase: "os_q3", day: CLEAN_DAY,
    athlete: cfg.athlete ?? ELITE_ATHLETE, readiness: cfg.readiness ?? READY,
    block: FULL_BLOCK, weeklyUsage: {}, seed: "seed",
  });
  ok(sel.method === null && sel.vetoCode === cfg.code, `${label}: vetoed`, String(sel.vetoCode));
}

// Age / training-age / strength gating.
for (const cls of AGES) {
  for (const age of [12, 13, 14, 15, 16, 18]) {
    for (const floor of [false, true]) {
      const sel = selectMethod({
        engine: "lift", phase: "os_q3", day: CLEAN_DAY,
        athlete: { ...ELITE_ATHLETE, trainingAgeClass: cls, ageYears: age, strengthFloorCleared: floor },
        readiness: READY, block: FULL_BLOCK, weeklyUsage: {}, seed: "s",
      });
      if (!sel.method) continue;
      const m = sel.method;
      ok(TRAINING_AGE_RANK[cls] >= TRAINING_AGE_RANK[m.minTrainingAge], `${m.id}: training age respected @${cls}`);
      ok(age >= m.minAgeYears, `${m.id}: age respected @${age}`);
      ok(!m.requiresStrengthFloor || floor, `${m.id}: strength floor respected`);
      ok(m.phases.os_q3.legal, `${m.id}: quarter legal`);
    }
  }
}

// A beginner 13-year-old must never receive a contrast method.
for (const phase of PHASES) {
  const sel = selectMethod({
    engine: "lift", phase, day: CLEAN_DAY,
    athlete: { ...ELITE_ATHLETE, trainingAgeClass: "beginner", ageYears: 13, strengthFloorCleared: false },
    readiness: READY, block: FULL_BLOCK, weeklyUsage: {}, seed: "s",
  });
  ok(!sel.method || sel.method.family !== "contrast", `young beginner gets no contrast in ${phase}`, sel.method?.id);
}

// Equipment law.
const noKit = selectMethod({
  engine: "lift", phase: "os_q3", day: CLEAN_DAY,
  athlete: { ...ELITE_ATHLETE, equipment: [] }, readiness: READY,
  block: FULL_BLOCK, weeklyUsage: {}, seed: "s",
});
ok(!noKit.method || noKit.method.equipment.length === 0, "no-equipment athlete never gets an equipment method");

// ---------------------------------------------------------------------------
section("D. Determinism");
for (const phase of PHASES) {
  for (const engine of ENGINES) {
    const args = {
      engine, phase, day: CLEAN_DAY, athlete: ELITE_ATHLETE, readiness: READY,
      block: FULL_BLOCK, weeklyUsage: {}, seed: `seed:${phase}:${engine}`,
    };
    const first = selectMethod(args);
    for (let i = 0; i < 50; i++) {
      const again = selectMethod(args);
      ok(
        (again.method?.id ?? again.vetoCode) === (first.method?.id ?? first.vetoCode),
        `${phase}/${engine}: deterministic`,
      );
    }
    if (first.method) {
      ok(first.method.engines.includes(engine), `${phase}/${engine}: engine legality`);
      ok(first.method.phases[phase].legal, `${phase}/${engine}: quarter legality`);
    }
  }
}

// ---------------------------------------------------------------------------
section("E. Dose containment");
const ROLES = ["compound_lower_push", "compound_upper_pull", "accessory", "primary", null];
for (const phase of PHASES) {
  for (const m of methods) {
    if (!m.phases[phase].legal) {
      const res = applyMethod({
        method: m, phase, role: "compound_lower_push", category: "lower_push",
        sets: 3, reps: 5, cnsCost: 3, cnsHeadroom: 10,
      });
      ok(res.applied === null && res.dropCode === "method_phase_illegal", `${m.id}/${phase}: illegal quarter drops`);
      continue;
    }
    for (const role of ROLES) {
      const group = doseGroupFor(role, "lower_push");
      const env = DOSE_MATRIX[phase][group];
      for (const sets of [1, 2, 3, 4, 5, 6, 8]) {
        const res = applyMethod({
          method: m, phase, role, category: "lower_push",
          sets, reps: env.reps[0], cnsCost: 3, cnsHeadroom: 10,
          resolvedStations: m.stations.map((s) => ({ ...s, slug: `slug-${s.order}`, name: `Movement ${s.order}` })),
        });
        if (!res.applied) continue;
        const a = res.applied;
        ok(a.sets <= env.sets[1], `${m.id}/${phase}/${group}: sets under ceiling`, `${a.sets}>${env.sets[1]}`);
        ok(a.sets >= 1, `${m.id}/${phase}/${group}: sets at least 1`);
        ok(Math.abs(a.sets - sets) <= Math.max(1, Math.abs(sets - env.sets[1])), `${m.id}: set move bounded`);
        ok(a.reps === env.reps[0], `${m.id}: reps untouched`);
        ok(a.rounds >= 1, `${m.id}: rounds at least 1`);
        const cap = m.phases[phase].maxRounds;
        ok(typeof cap !== "number" || m.stations.length === 0 || a.rounds <= cap, `${m.id}: rounds capped`);
        ok(a.cns_cost <= 3 + 10, `${m.id}: CNS inside headroom`);
        ok(a.methods_version === METHODS_VERSION, `${m.id}: version stamped`);
        const issues = validateAppliedMethod(a, { phase, role, category: "lower_push" });
        ok(!issues.some((i) => i.severity === "fatal"), `${m.id}/${phase}/${group}: certifies clean`, issues.map((i) => i.code).join(","));
      }
    }
    // CNS headroom law.
    if (m.cnsMultiplier > 1) {
      const starved = applyMethod({
        method: m, phase, role: "compound_lower_push", category: "lower_push",
        sets: 3, reps: 5, cnsCost: 10, cnsHeadroom: 0,
        resolvedStations: m.stations.map((s) => ({ ...s, slug: "s", name: "n" })),
      });
      ok(
        starved.applied === null && starved.dropCode === "method_cns_headroom_exceeded",
        `${m.id}: drops when CNS headroom is gone`,
      );
    }
  }
}

// A station method with missing stations must drop, never half-ship.
const stationMethod = methods.find((m) => m.stations.length >= 3);
if (stationMethod) {
  const res = applyMethod({
    method: stationMethod, phase: PHASES.find((p) => stationMethod.phases[p].legal)!,
    role: "compound_lower_push", category: "lower_push", sets: 3, reps: 3,
    cnsCost: 3, cnsHeadroom: 10,
    resolvedStations: [{ ...stationMethod.stations[0], slug: "a", name: "A" }],
  });
  ok(res.applied === null && res.dropCode === "method_station_incomplete", "partial stations drop the method");
}

// ---------------------------------------------------------------------------
section("F. Frequency ceilings");
for (const phase of PHASES) {
  const usage: Record<string, number> = {};
  for (let week = 0; week < 12; week++) {
    const sel = selectMethod({
      engine: "lift", phase, day: CLEAN_DAY, athlete: ELITE_ATHLETE, readiness: READY,
      block: FULL_BLOCK, weeklyUsage: usage, seed: `wk${phase}`,
    });
    if (!sel.method) break;
    const rule = sel.method.phases[phase];
    ok((usage[sel.method.id] ?? 0) < rule.maxPerWeek, `${phase}: ceiling respected for ${sel.method.id}`);
    usage[sel.method.id] = (usage[sel.method.id] ?? 0) + 1;
  }
}
const ledger = buildWeeklyMethodUsage([
  { why_payload: { training_method_id: "french_contrast" } },
  { why_payload: { training_method_id: "french_contrast" } },
  { why_payload: { training_method_id: "cluster_sets" } },
  { why_payload: null },
  {},
]);
ok(ledger["french_contrast"] === 2 && ledger["cluster_sets"] === 1, "usage ledger counts prior payloads");

// ---------------------------------------------------------------------------
section("G. Engine scope + structural honesty");
for (const forbidden of FORBIDDEN_ENGINES) {
  const sel = selectMethod({
    engine: forbidden as unknown as MethodEngine, phase: "os_q3", day: CLEAN_DAY,
    athlete: ELITE_ATHLETE, readiness: READY, block: FULL_BLOCK, weeklyUsage: {}, seed: "s",
  });
  ok(sel.method === null, `forbidden engine ${forbidden} never carries a method`, sel.method?.id);
}
// A bare block (anchor only) must never receive a multi-station method.
const bare = selectMethod({
  engine: "lift", phase: "os_q3", day: CLEAN_DAY, athlete: ELITE_ATHLETE, readiness: READY,
  block: { hasAnchor: true, hasPlyometric: false, hasLoadedExplosive: false, hasAssisted: false, hasExpression: false, accessoryCount: 1 },
  weeklyUsage: {}, seed: "s",
});
ok(!bare.method || bare.method.stations.length === 0, "bare block gets no station method", bare.method?.id);

// ---------------------------------------------------------------------------
console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${checks - failures}/${checks} checks passed.`);
if (failures > 0) Deno.exit(1);

// ---------------------------------------------------------------------------
// H. Station resolution honesty
// ---------------------------------------------------------------------------
import {
  buildStationPools,
  movementFamily,
  resolveStations,
  shapeFromPools,
  type StationMovementLike,
} from "../../supabase/functions/_shared/wic/methods/stations.ts";

section("H. Station resolution");
const POOL: StationMovementLike[] = [
  { slug: "back_squat", name: "Back Squat", movement_category: "squat", equipment: ["barbell"], movement_velocity: "strength" },
  { slug: "trap_bar_jump", name: "Trap Bar Jump", movement_category: "jump", equipment: ["barbell"], movement_velocity: "explosive" },
  { slug: "jump_squat", name: "Jump Squat", movement_category: "jump", equipment: ["dumbbell"], movement_velocity: "dynamic" },
  { slug: "hurdle_hop", name: "Hurdle Hop", movement_category: "plyo", pap_classification: "plyometric", equipment: [] },
  { slug: "depth_jump", name: "Depth Jump", movement_category: "plyo", pap_classification: "plyometric", equipment: [] },
  { slug: "band_assisted_jump", name: "Band Assisted Jump", movement_category: "overspeed", equipment: ["bands"] },
  { slug: "bench_press", name: "Bench Press", movement_category: "press", equipment: ["barbell"] },
];
const anchor = POOL[0];
const fam = movementFamily(anchor);
ok(fam === "lower", "anchor family resolves", fam);
const pools = buildStationPools(POOL, fam);
ok(pools.plyometric.length > 0, "plyometric pool populated");
ok(pools.loaded_explosive.length > 0, "loaded explosive pool populated");
ok(pools.assisted.length > 0, "assisted pool populated");
ok(!pools.plyometric.some((m) => m.slug === "bench_press"), "cross-family movement excluded");

if (fc) {
  const st = resolveStations(fc, anchor, pools, "seed-1");
  ok(st !== null, "French contrast resolves against a rich pool");
  if (st) {
    ok(st.length === 4, "four stations resolved");
    ok(new Set(st.map((s) => s.slug)).size === 4, "no movement repeats inside a round");
    ok(st[0].slug === anchor.slug, "station 1 is the anchor itself");
    ok(st.every((s) => POOL.some((p) => p.slug === s.slug)), "every station came from the legal pool");
    const again = resolveStations(fc, anchor, pools, "seed-1");
    ok(JSON.stringify(again) === JSON.stringify(st), "station resolution is deterministic");
  }
  const thin = buildStationPools([anchor], fam);
  ok(resolveStations(fc, anchor, thin, "seed-1") === null, "thin pool refuses to half-fill");
  const shape = shapeFromPools(thin, { hasAnchor: true, accessoryCount: 1 });
  const sel = selectMethod({
    engine: "lift", phase: "os_q3", day: CLEAN_DAY, athlete: ELITE_ATHLETE,
    readiness: READY, block: shape, weeklyUsage: {}, seed: "s",
  });
  ok(!sel.method || sel.method.stations.length === 0, "thin pool never selects a station method", sel.method?.id);
}

console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${checks - failures}/${checks} checks passed (with stations).`);
if (failures > 0) Deno.exit(1);
