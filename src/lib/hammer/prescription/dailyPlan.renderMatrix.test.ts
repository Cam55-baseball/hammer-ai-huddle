/**
 * ALWAYS-RENDERABLE MATRIX.
 *
 * Structural guarantee, not a per-bug patch: every Today-plan modality must
 * return something an athlete can read for EVERY day type (training, game,
 * tournament, travel, camp, team practice, taper, off day) and every state of
 * athlete context (nothing known, equipment known, position unknown).
 *
 * Also asserts the equipment read path: a declared inventory must actually
 * reach hitting drill selection and must remove the "assuming" line.
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

const DAY_TYPES: ReadonlyArray<[string, ScheduleSignal]> = [
  ["training day", NORMAL_SIGNAL],
  ["game day", posture("game")],
  ["tournament day", posture("tournament")],
  ["travel day", posture("travel")],
  ["camp day", posture("camp")],
  ["team practice day", posture("team_practice")],
  ["taper day", posture("taper")],
];

const ALL: ReadonlyArray<ModalityKey> = [
  "warmup", "speed", "strength", "hitting", "throwing",
  "defense", "baserunning", "game_iq", "fueling", "recovery",
];

describe("every card renders for every day type and context state", () => {
  for (const [ctxName, context] of CONTEXTS) {
    for (const [dayName, signal] of DAY_TYPES) {
      it(`${dayName} / ${ctxName}`, () => {
        const plan = buildHammerDailyPlan(context, signal);
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
            expect(JSON.stringify(b)).not.toMatch(/equipment_effective|position_primary/);
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
    expect(d.gameDayPrimer).toBe(true);
    expect(d.drills.length).toBeGreaterThan(0);
    expect(d.why).toMatch(/save your legs|saved for the games/i);
  });

  it("an off/rest day still renders defense, explained and overridable", () => {
    // Force the rest path by asking for a day the microcycle does not schedule.
    const plan = buildHammerDailyPlan(
      ctx({ ...BASE, equipment_effective: OWNER_EQUIPMENT }),
      posture("camp"),
    );
    const d = plan.blocks.find((b) => b.modality === "defense")!;
    expect(d.drills.length + d.steps.length).toBeGreaterThan(0);
    expect(d.offDayOverridable).toBe(true);
  });

  it("override turns a rest-day defense card into a light block", () => {
    const plan = buildHammerDailyPlan(
      ctx({ ...BASE, equipment_effective: OWNER_EQUIPMENT }),
      posture("camp"),
      null,
      null,
      undefined,
      new Date(),
      { defenseFullOverride: true },
    );
    const d = plan.blocks.find((b) => b.modality === "defense")!;
    expect(d.status).toBe("ready");
    expect(d.drills.length).toBeGreaterThan(0);
  });
});

describe("declared equipment reaches drill selection", () => {
  it("a machine + tee owner gets machine and tee work and no assumption line", () => {
    const plan = buildHammerDailyPlan(ctx({ ...BASE, equipment_effective: OWNER_EQUIPMENT }));
    const h = plan.blocks.find((b) => b.modality === "hitting")!;
    const text = JSON.stringify(h.drills);
    expect(text).toMatch(/machine/i);
    expect(text).toMatch(/tee/i);
    expect(h.assumption).toBeUndefined();
    expect(h.missingContextKeys).toHaveLength(0);
  });

  it("a bat-only athlete gets dry/mirror swings and no machine work", () => {
    const plan = buildHammerDailyPlan(ctx({ ...BASE, equipment_effective: ["gamer_bat"] }));
    const h = plan.blocks.find((b) => b.modality === "hitting")!;
    const text = JSON.stringify(h.drills);
    expect(text).toMatch(/dry swings/i);
    expect(text).not.toMatch(/machine/i);
    expect(h.assumption).toBeUndefined();
  });
});
