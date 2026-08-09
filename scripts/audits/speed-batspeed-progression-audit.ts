/**
 * Elite Speed & Bat-Speed Progression — 60-day regression audit.
 *
 * Simulates 60 consecutive days for several athlete archetypes against the
 * pure selection + progression modules and asserts:
 *
 *  1. Session shape floors are met every day (no one-item cards).
 *  2. The 4-week wave advances and deload weeks land exactly on week 4.
 *  3. Bat-speed sessions emit in canonical stage order.
 *  4. No movement repeats inside its re-exposure window unless the pool is
 *     genuinely exhausted for that category.
 *  5. Every prescription carries a valid progression lineage payload and no
 *     performance number is fabricated without a logged best.
 *  6. Selection is deterministic — identical inputs replay identically.
 *
 * Run: deno run -A scripts/audits/speed-batspeed-progression-audit.ts
 */
import {
  selectBatSpeedPicks,
  BAT_SPEED_STAGE_ORDER,
  type BatSpeedCatalogRow,
} from "../../supabase/functions/_shared/wic/engines/batSpeed.ts";
import {
  selectSpeedPicks,
  type SpeedCatalogRow,
} from "../../supabase/functions/_shared/wic/engines/speed.ts";
import {
  buildProgressionState,
  buildProgressionPayload,
  isInReExposureWindow,
  type HistoryPrescriptionRow,
  type HistorySessionLogRow,
} from "../../supabase/functions/_shared/wic/progression/progressionState.ts";

const failures: string[] = [];
function check(cond: boolean, msg: string) {
  if (!cond) failures.push(msg);
}

// ---------------------------------------------------------------- catalogs
const BAT_CATEGORIES = [
  "pvc", "band", "elastic_rotation", "med_ball", "rotational_strength", "pap",
  "overload", "heavy_implement", "underload", "light_implement", "recovery_swing",
];
const SPEED_CATEGORIES = [
  "acceleration", "top_speed", "reactive", "plyometric", "resisted",
  "overspeed", "change_of_direction", "mobility", "elastic", "pap", "deceleration",
];

const batCatalog: BatSpeedCatalogRow[] = BAT_CATEGORIES.flatMap((cat) =>
  Array.from({ length: 4 }, (_, i) => ({
    slug: `bs_${cat}_${i}`,
    name: `${cat} drill ${i}`,
    category: "bat_speed",
    bat_speed_category: cat,
    cns_cost: 1,
    substitution_family: `${cat}_fam_${i}`,
    default_sets: 3,
    default_reps: 5,
    dosage_unit: "reps",
  }))
);

const speedCatalog: SpeedCatalogRow[] = SPEED_CATEGORIES.flatMap((cat) =>
  Array.from({ length: 4 }, (_, i) => ({
    slug: `sp_${cat}_${i}`,
    name: `${cat} run ${i}`,
    category: "speed",
    speed_category: cat,
    game_day_legal: true,
    practice_day_legal: true,
    cns_cost: 1,
    substitution_family: `${cat}_fam_${i}`,
    default_sets: 3,
    default_reps: 3,
    dosage_unit: "reps",
  }))
);

// ------------------------------------------------------------- archetypes
interface Archetype {
  name: string;
  sport: "baseball" | "softball";
  seasonPhase: string;
  trainingAgeClass: string;
  logs: boolean;
  gameEvery: number; // every Nth day is a game day
}

const ARCHETYPES: Archetype[] = [
  { name: "hs_inseason_intermediate", sport: "baseball", seasonPhase: "in_season", trainingAgeClass: "intermediate", logs: true, gameEvery: 3 },
  { name: "youth_offseason_beginner", sport: "softball", seasonPhase: "off_season", trainingAgeClass: "beginner", logs: false, gameEvery: 0 },
  { name: "college_preseason_advanced", sport: "baseball", seasonPhase: "pre_season", trainingAgeClass: "advanced", logs: true, gameEvery: 7 },
  { name: "travel_summer_intermediate", sport: "softball", seasonPhase: "in_season", trainingAgeClass: "intermediate", logs: true, gameEvery: 2 },
];

function isoAddDays(startIso: string, days: number): string {
  const d = new Date(startIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const START = "2026-03-02"; // a Monday

for (const arch of ARCHETYPES) {
  const history: HistoryPrescriptionRow[] = [];
  const logs: HistorySessionLogRow[] = [];
  const seenDeloadWeeks = new Set<number>();
  const phaseSequence: string[] = [];

  for (let day = 0; day < 60; day++) {
    const planDate = isoAddDays(START, day);
    const isGameDay = arch.gameEvery > 0 && day % arch.gameEvery === 0;
    const isRecoveryDay = !isGameDay && day % 7 === 6;

    const progression = buildProgressionState({
      planDate,
      prescriptions: history,
      logs,
    });
    phaseSequence.push(progression.blockPhase);
    if (progression.isDeloadWeek) seenDeloadWeeks.add(progression.blockIndex);
    check(
      progression.isDeloadWeek === (progression.weekInBlock === 4),
      `${arch.name} ${planDate}: deload flag must match week 4 (week ${progression.weekInBlock})`,
    );

    const dayOfYearSeed = day + 61;

    // ---- bat speed -----------------------------------------------------
    const bs = selectBatSpeedPicks({
      catalog: batCatalog,
      template: {
        seasonPhase: arch.seasonPhase,
        dayType: isGameDay ? "game" : isRecoveryDay ? "recovery" : "training",
        trainingAge: arch.trainingAgeClass,
        primaryAdaptation: "bat_speed_development",
        isGameDay,
        isRecoveryDay,
        isReturnToPlay: false,
      } as never,
      eligible: () => true,
      dayOfYearSeed,
      cnsBudget: isGameDay ? 2 : 6,
      progression,
      isGameDay,
      isRecoveryDay,
      trainingAgeClass: arch.trainingAgeClass,
    });

    check(
      bs.picks.length >= bs.shape.min,
      `${arch.name} ${planDate}: bat speed published ${bs.picks.length} < floor ${bs.shape.min}`,
    );
    check(
      bs.picks.length <= Math.max(bs.shape.max, bs.shape.min),
      `${arch.name} ${planDate}: bat speed exceeded max ${bs.shape.max} with ${bs.picks.length}`,
    );
    let lastStageIdx = -1;
    for (const p of bs.picks) {
      const idx = BAT_SPEED_STAGE_ORDER.indexOf(p.stage);
      check(idx >= lastStageIdx, `${arch.name} ${planDate}: bat speed stage order broken at ${p.stage}`);
      lastStageIdx = Math.max(lastStageIdx, idx);
    }
    const bsSlugs = new Set(bs.picks.map((p) => p.movement.slug));
    check(bsSlugs.size === bs.picks.length, `${arch.name} ${planDate}: duplicate bat-speed movement in one session`);

    // ---- speed ---------------------------------------------------------
    const sp = selectSpeedPicks({
      catalog: speedCatalog,
      template: {
        seasonPhase: arch.seasonPhase,
        dayType: isGameDay ? "game" : isRecoveryDay ? "recovery" : "training",
        trainingAge: arch.trainingAgeClass,
        primaryAdaptation: "speed_development",
        isGameDay,
        isPracticeDay: !isGameDay,
        isRecoveryDay,
        isReturnToPlay: false,
      } as never,
      eligible: () => true,
      sport: arch.sport,
      dayOfYearSeed,
      cnsBudget: 6,
      trainingAgeClass: arch.trainingAgeClass,
      progression,
      isGameDay,
      isRecoveryDay,
    });

    check(
      sp.picks.length >= sp.shape.min,
      `${arch.name} ${planDate}: speed published ${sp.picks.length} < floor ${sp.shape.min}`,
    );
    const spSlugs = new Set(sp.picks.map((p) => p.movement.slug));
    check(spSlugs.size === sp.picks.length, `${arch.name} ${planDate}: duplicate speed movement in one session`);

    // ---- determinism ---------------------------------------------------
    const bsReplay = selectBatSpeedPicks({
      catalog: batCatalog,
      template: {
        seasonPhase: arch.seasonPhase,
        dayType: isGameDay ? "game" : isRecoveryDay ? "recovery" : "training",
        trainingAge: arch.trainingAgeClass,
        primaryAdaptation: "bat_speed_development",
        isGameDay,
        isRecoveryDay,
        isReturnToPlay: false,
      } as never,
      eligible: () => true,
      dayOfYearSeed,
      cnsBudget: isGameDay ? 2 : 6,
      progression,
      isGameDay,
      isRecoveryDay,
      trainingAgeClass: arch.trainingAgeClass,
    });
    check(
      JSON.stringify(bsReplay.picks.map((p) => p.movement.slug)) ===
        JSON.stringify(bs.picks.map((p) => p.movement.slug)),
      `${arch.name} ${planDate}: bat-speed selection is not deterministic`,
    );

    // ---- lineage payload -------------------------------------------------
    for (const p of bs.picks) {
      const payload = buildProgressionPayload({
        state: progression,
        slug: p.movement.slug,
        metricKey: p.stage === "intent" ? "bat_speed_mph" : null,
        sessionName: "audit",
      });
      check(!!payload.builds_on, `${arch.name} ${planDate}: missing builds_on lineage`);
      check(!!payload.next_step, `${arch.name} ${planDate}: missing next_step lineage`);
      check(
        payload.target === null || /\d/.test(payload.target),
        `${arch.name} ${planDate}: fabricated non-numeric target`,
      );
      if (!arch.logs) {
        check(payload.target === null, `${arch.name} ${planDate}: target invented with no logged history`);
        check(payload.baseline === true, `${arch.name} ${planDate}: baseline flag missing with no history`);
      }
      // Re-exposure: a repeat inside the window is only acceptable when the
      // whole category pool was already used today.
      if (isInReExposureWindow(progression, p.movement.slug, p.category)) {
        const freshAlternatives = batCatalog.filter(
          (m) =>
            m.bat_speed_category === p.category &&
            m.slug !== p.movement.slug &&
            !bsSlugs.has(m.slug) &&
            !isInReExposureWindow(progression, m.slug, p.category),
        );
        check(
          freshAlternatives.length === 0,
          `${arch.name} ${planDate}: ${p.movement.slug} repeated inside its re-exposure window while ${freshAlternatives.length} fresh alternative(s) existed`,
        );
      }
    }

    // ---- record history --------------------------------------------------
    for (const p of [...bs.picks, ...sp.picks]) {
      history.push({
        plan_date: planDate,
        movement_slug: p.movement.slug,
        slot: "bat_speed",
        sets: 3,
        reps: 5,
      } as HistoryPrescriptionRow);
      if (arch.logs) {
        logs.push({
          plan_date: planDate,
          movement_slug: p.movement.slug,
          metrics: { bat_speed_mph: 68 + (day % 5) },
          rpe: 7,
        } as HistorySessionLogRow);
      }
    }
  }

  // Wave must advance through all four phases at least once in 60 days.
  for (const phase of ["accumulate", "intensify", "peak", "deload"]) {
    check(phaseSequence.includes(phase), `${arch.name}: never reached block phase ${phase} in 60 days`);
  }
  check(seenDeloadWeeks.size >= 1, `${arch.name}: no deload week landed in 60 days`);
}

if (failures.length) {
  console.error(`❌ Progression audit FAILED — ${failures.length} issue(s):`);
  for (const f of failures.slice(0, 40)) console.error(" •", f);
  Deno.exit(1);
}
console.log("✅ Speed & bat-speed progression audit passed — 4 archetypes × 60 days.");
