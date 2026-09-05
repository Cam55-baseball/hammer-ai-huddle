/**
 * ALWAYS-RENDERABLE MATRIX.
 *
 * Structural guarantee, not a per-bug patch: all ten Today-plan modalities
 * (warm-up, speed, strength, hitting, throwing, defense, baserunning, game IQ,
 * fueling, recovery) must return something an athlete can read for every day
 * type in DAY_TYPES — training, game, tournament, travel, camp, team practice,
 * taper, and off day — crossed with every context state in CONTEXTS: nothing
 * known, equipment known, and position unknown with equipment known.
 *
 * Day types are pinned to fixed dates because the weekly microcycle schedules
 * by weekday; the off-day row is a real microcycle rest day, not a posture.
 *
 * Also asserts the equipment read path: a declared inventory must actually
 * reach hitting drill selection and must remove the "assuming" line.
 *
 * Not covered here: injury restrictions, switch-hitter side splits, and
 * off-season / pre-season phases — those live in their own suites.
 */
import { describe, expect, it } from "vitest";
import { buildHammerDailyPlan, type ModalityKey } from "./dailyPlan";
import type { HammerAthleteContext, ContextVariable } from "@/lib/hammer/context/athleteContext";
import type { ScheduleSignal } from "@/lib/hammer/prescription/scheduleContext";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";

function variable(key: string, value: unknown): ContextVariable {
  const missing = value == null || value === "";
  return {
    key,
    label: key,
    domain: "identity",
    value: missing ? null : value,
    source: "test",
    confidence: missing ? "missing" : "high",
    missing,
    lastUpdated: null,
    lineage: { owner: "test", source: "test", rawConfidence: missing ? "missing" : "high" },
  };
}

function ctx(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]) => variable(key, value));
  return {
    variables,
    missing: variables.filter((v) => v.missing),
    isLoading: false,
    missingCount: variables.filter((v) => v.missing).length,
    envelope: null,
    get<T = unknown>(key: string) {
      return variables.find((v) => v.key === key) as ContextVariable<T> | undefined;
    },
  };
}

const BASE = {
  sport_primary: "baseball",
  position_primary: "SS",
  lifecycle_band: "u18",
  season_phase: "in",
  lifting_age_years: 2,
  weekly_availability_days: 6,
  development_priorities: ["hitting", "defense"],
  injury_history: [],
};

/** Canonical envelope shape: `value` IS the declared inventory array. */
const OWNER_EQUIPMENT = ["gamer_bat", "overload_bat", "underload_bat", "tee", "pitching_machine"];

const CONTEXTS: ReadonlyArray<[string, HammerAthleteContext]> = [
  ["nothing known", ctx({ ...BASE, equipment_effective: null, lifting_age_years: null, position_primary: null })],
  ["equipment known", ctx({ ...BASE, equipment_effective: OWNER_EQUIPMENT })],
  ["position unknown, equipment known", ctx({ ...BASE, position_primary: null, equipment_effective: OWNER_EQUIPMENT })],
];

const posture = (p: ScheduleSignal["postureToday"]): ScheduleSignal =>
  ({ ...NORMAL_SIGNAL, postureToday: p, rationale: `posture ${p}` }) as ScheduleSignal;

/**
 * Fixed dates keep the matrix deterministic: the weekly microcycle schedules
 * modalities by weekday, so "today" must be pinned rather than inherited from
 * the clock. 2026-06-03 is a Wednesday (a training weekday); 2026-06-07 is a
 * Sunday, the microcycle's rest day — that is the off-day state, the one the
 * owner hit when defense vanished from his phone.
 */
const TRAINING_WEEKDAY = new Date(2026, 5, 3);
const REST_WEEKDAY = new Date(2026, 5, 7);

const DAY_TYPES: ReadonlyArray<[string, ScheduleSignal, Date]> = [
  ["training day", NORMAL_SIGNAL, TRAINING_WEEKDAY],
  ["game day", posture("game"), TRAINING_WEEKDAY],
  ["tournament day", posture("tournament"), TRAINING_WEEKDAY],
  ["travel day", posture("travel"), TRAINING_WEEKDAY],
  ["camp day", posture("camp"), TRAINING_WEEKDAY],
  ["team practice day", posture("team_practice"), TRAINING_WEEKDAY],
  ["taper day", posture("taper"), TRAINING_WEEKDAY],
  ["off day", NORMAL_SIGNAL, REST_WEEKDAY],
];

const ALL: ReadonlyArray<ModalityKey> = [
  "warmup", "speed", "strength", "hitting", "throwing",
  "defense", "baserunning", "game_iq", "fueling", "recovery",
];

/** Only athlete-visible copy — internal keys such as `missingContextKeys` are not copy. */
function visibleCopy(b: {
  title: string; why: string; assumption?: string; roadmapReason?: string;
  steps: readonly string[]; drills: readonly unknown[];
}): string {
  return [b.title, b.why, b.assumption ?? "", b.roadmapReason ?? "", ...b.steps, JSON.stringify(b.drills)].join(" | ");
}

/** The microcycle schedules modalities by weekday — scan a week for a day the modality is on. */
function findDayWith(
  context: HammerAthleteContext,
  modality: ModalityKey,
  signal: ScheduleSignal = NORMAL_SIGNAL,
) {
  for (let i = 0; i < 14; i++) {
    const day = new Date(2026, 5, 1 + i);
    const plan = buildHammerDailyPlan(context, signal, null, null, undefined, day);
    const b = plan.blocks.find((x) => x.modality === modality && x.status === "ready");
    if (b) return b;
  }
  throw new Error(`${modality} never scheduled in a two-week window`);
}

describe("every card renders for every day type and context state", () => {
  for (const [ctxName, context] of CONTEXTS) {
    for (const [dayName, signal, day] of DAY_TYPES) {
      it(`${dayName} / ${ctxName}`, () => {
        const plan = buildHammerDailyPlan(context, signal, null, null, undefined, day);
        for (const modality of ALL) {
          const found = plan.blocks.filter((b) => b.modality === modality);
          expect(found.length, `${modality} missing on ${dayName}`).toBeGreaterThan(0);
          for (const b of found) {
            expect(b.title.trim(), `${modality} title`).not.toBe("");
            expect(b.why.trim(), `${modality} why`).not.toBe("");
            expect(
              b.drills.length + b.steps.length,
              `${modality} rendered empty on ${dayName} / ${ctxName}`,
            ).toBeGreaterThan(0);
            expect(visibleCopy(b), `${modality} leaked a raw key`).not.toMatch(
              /equipment_effective|position_primary|lifting_age_years|lifecycle_band/,
            );
          }
        }
      });
    }
  }
});

describe("defense is present on every day type, including an off day", () => {
  it("game day shows the pregame primer", () => {
    const plan = buildHammerDailyPlan(CONTEXTS[1][1], posture("game"));
    const d = plan.blocks.find((b) => b.modality === "defense")!;
    expect(d.drills.length + d.steps.length).toBeGreaterThan(0);
    expect(d.why.trim()).not.toBe("");
  });

  it("defense never renders empty on any day type", () => {
    for (const [, context] of CONTEXTS) {
      for (const [dayName, signal] of DAY_TYPES) {
        for (let i = 0; i < 7; i++) {
          const plan = buildHammerDailyPlan(context, signal, null, null, undefined, new Date(2026, 5, 1 + i));
          const d = plan.blocks.find((b) => b.modality === "defense")!;
          expect(d, `defense missing on ${dayName}`).toBeTruthy();
          expect(d.drills.length + d.steps.length, `defense empty on ${dayName}`).toBeGreaterThan(0);
          if (d.status === "off-day") expect(d.offDayOverridable).toBe(true);
        }
      }
    }
  });

  it("override turns a rest-day defense card into a light block", () => {
    for (let i = 0; i < 7; i++) {
      const day = new Date(2026, 5, 1 + i);
      const resting = buildHammerDailyPlan(CONTEXTS[1][1], NORMAL_SIGNAL, null, null, undefined, day)
        .blocks.find((b) => b.modality === "defense")!;
      if (resting.status !== "off-day") continue;
      const overridden = buildHammerDailyPlan(
        CONTEXTS[1][1], NORMAL_SIGNAL, null, null, undefined, day, { defenseFullOverride: true },
      ).blocks.find((b) => b.modality === "defense")!;
      expect(overridden.status).toBe("ready");
      expect(overridden.drills.length).toBeGreaterThan(0);
      return;
    }
  });
});

describe("declared equipment reaches drill selection", () => {
  it("a machine + tee owner gets machine and tee work and no assumption line", () => {
    const h = findDayWith(ctx({ ...BASE, equipment_effective: OWNER_EQUIPMENT }), "hitting");
    const text = JSON.stringify(h.drills);
    expect(text).toMatch(/machine|tee/i);
    expect(h.assumption).toBeUndefined();
  });

  it("a bat-only athlete gets no machine work", () => {
    const h = findDayWith(ctx({ ...BASE, equipment_effective: ["gamer_bat"] }), "hitting");
    expect(JSON.stringify(h.drills)).not.toMatch(/machine/i);
    expect(h.assumption).toBeUndefined();
  });
});
