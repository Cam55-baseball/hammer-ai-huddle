/**
 * Plan-context audit simulation (docs/owner/plan-context-audit.md, games row).
 * Proves today's actual behavior: a game pattern reorders cards and adds a cue
 * line but never changes drills or dose; thin samples change nothing.
 */
import { describe, expect, it } from "vitest";
import { buildHammerDailyPlan, type GpSignalForPlan } from "./dailyPlan";
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

const DAY = new Date(2026, 5, 3);
const C = ctx({ ...BASE, equipment_effective: ["tee", "gamer_bat"] });
const gp = (o: Partial<GpSignalForPlan>): GpSignalForPlan => ({
  chasePct: null, whiffPct: null, miscueClusters: [], atBats: 0, pitchesSeen: 0, defensivePlays: 0, ...o,
});
const plan = (g: GpSignalForPlan | null) => buildHammerDailyPlan(C, NORMAL_SIGNAL, null, g, undefined, DAY);
const hit = (p: ReturnType<typeof plan>) => p.blocks.find((b) => b.modality === "hitting")!;

describe("audit: games → plan", () => {
  const base = plan(null);
  it("high whiff with enough at-bats adds a cue and moves hitting first, drills and dose unchanged", () => {
    const p = plan(gp({ whiffPct: 35, atBats: 10, pitchesSeen: 40 }));
    expect(hit(p).cues.some((c) => c.includes("whiff 35%"))).toBe(true);
    expect(p.blocks.find((b) => b.status !== "suppressed")!.modality).toBe("hitting");
    expect(hit(p).drills).toEqual(hit(base).drills);
    expect(hit(p).durationMin).toBe(hit(base).durationMin);
  });
  it("thin sample (3 at-bats) changes nothing", () => {
    const p = plan(gp({ whiffPct: 60, atBats: 3, pitchesSeen: 10 }));
    expect(hit(p).cues).toEqual(hit(base).cues);
    expect(p.blocks.map((b) => b.modality)).toEqual(base.blocks.map((b) => b.modality));
  });
  it("lifting block is identical with or without a game pattern", () => {
    const s = (p: ReturnType<typeof plan>) => p.blocks.find((b) => b.modality === "strength");
    expect(s(plan(gp({ whiffPct: 35, atBats: 10 })))?.drills).toEqual(s(base)?.drills);
  });
});

const speed = (c: HammerAthleteContext) =>
  buildHammerDailyPlan(c, NORMAL_SIGNAL, null, null, undefined, DAY).blocks.find((b) => b.modality === "speed")!;
const strength = (c: HammerAthleteContext) =>
  buildHammerDailyPlan(c, NORMAL_SIGNAL, null, null, undefined, DAY).blocks.find((b) => b.modality === "strength")!;

describe("audit: readiness → plan", () => {
  it("low readiness as {score} turns speed into recover-instead", () => {
    expect(speed(ctx({ ...BASE, readiness: { score: 0.3 } })).ctaLabel).toBe("Recover instead");
  });
  it("gap 8 fixed: the same low readiness as a bare number also turns speed into recover-instead", () => {
    expect(speed(ctx({ ...BASE, readiness: 0.3 })).ctaLabel).toBe("Recover instead");
  });
  it("normal readiness (bare number or {score}) does not trigger recovery", () => {
    expect(speed(ctx({ ...BASE, readiness: 0.8 })).ctaLabel).not.toBe("Recover instead");
    expect(speed(ctx({ ...BASE, readiness: { score: 0.8 } })).ctaLabel).not.toBe("Recover instead");
    expect(speed(ctx(BASE)).ctaLabel).not.toBe("Recover instead");
  });
});

describe("audit: pain → plan", () => {
  const br = (c: HammerAthleteContext) =>
    buildHammerDailyPlan(c, NORMAL_SIGNAL, null, null, undefined, DAY).blocks.find((b) => b.modality === "baserunning")!;
  it("knee injury turns baserunning into leg-protected IQ work; no knee keeps game scenarios", () => {
    expect(br(ctx({ ...BASE, injury_history: ["knee"] })).title).toBe("Baserunning — IQ only (leg-protected)");
    expect(br(ctx(BASE)).title).toBe("Baserunning — game scenarios");
  });
});
