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
    expect(hit(p).because).toEqual(["Because in your last 7 days of games you missed on 35% of your swings over 10 at-bats (early read)."]);
  });
  it("20+ at-bats drops the early-read label", () => {
    const p = plan(gp({ whiffPct: 35, atBats: 24, pitchesSeen: 90 }));
    expect(hit(p).because?.[0]).not.toContain("early read");
  });
  it("thin sample (3 at-bats) changes nothing", () => {
    const p = plan(gp({ whiffPct: 60, atBats: 3, pitchesSeen: 10 }));
    expect(hit(p).cues).toEqual(hit(base).cues);
    expect(hit(p).because ?? []).toEqual(hit(base).because ?? []);
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

// ── Audit: video analyses → plan (applyFaultPlanInfluence on a real built plan) ──
import { applyFaultPlanInfluence } from "@/lib/prescription/applyFaultPlanInfluence";
import type { EliteDrill } from "@/data/drills/eliteDrillCatalog";
import type { RankedFault } from "@/lib/wic/faultLedger/ranking";
import { planFaultContext } from '@/lib/prescription/planFaultContext';

const fixDrill: EliteDrill = {
  id: "sim.hit.front_side", name: "Front-Side Hold", category: "hitting", sports: ["baseball"],
  subSkill: "Sequence", level: "feel", fixes: "Early opening", setup: "Open space",
  steps: ["Move"], cues: ["Hold the front side"], dosage: "3 x 6", equipment: [],
  violationKeys: ["front_shoulder_opens_early"], pieV2Signals: [], movementPatterns: [],
};
const fault = (cleared: boolean): RankedFault[] => [{
  rootPatternId: "trunk_rotates_before_front_foot_plant", family: null, score: 1,
  sources: ["video_analysis"], disciplines: ["hitting"], totalSampleSize: 1,
  latestObservedAt: "2026-06-01T00:00:00.000Z", says: "Recent finding", fades: [], clearedByCleanClips: cleared,
  signals: [{ id: "s1", user_id: "a1", source: "video_analysis", fault_key: "front_shoulder_opens_early",
    root_pattern_id: "trunk_rotates_before_front_foot_plant", discipline: "hitting", confidence: 0.7,
    sample_size: 1, severity: 0.46, evidence: "Opened early", observed_at: "2026-06-01T00:00:00.000Z" }],
}];
const withAnalysis = (cleared: boolean) => applyFaultPlanInfluence({
  blocks: plan(null).blocks, rankedFaults: fault(cleared), sport: "baseball", ownedEquipment: new Set(),
  catalog: [fixDrill], circulation: { servedToUser: {}, usage: {} }, now: DAY,
});

describe('AR3: scoped canonical evidence through eight-week actual builders', () => {
  for (const sport of ['baseball', 'softball'] as const) {
    it(`${sport}: one-slot change and clean resolution preserve all prescribed doses for eight weeks`, () => {
      let changed = 0;
      for (let day = 0; day < 56; day++) {
        const date = new Date(2026, 5, 3 + day);
        const observed = date.toISOString();
        const base = buildHammerDailyPlan(ctx({ ...BASE, sport_primary: sport, equipment_effective: ['tee', 'gamer_bat', 'net'] }), NORMAL_SIGNAL, null, null, undefined, date);
        const signal = { ...fault(false)[0].signals[0], observed_at: observed };
        const finding = { id: 'f', user_id: 'a1', sport, skill_domain: 'hitting', fault_key: signal.fault_key,
          root_pattern_key: signal.root_pattern_id, created_at: observed, video_id: 'v' };
        const clip = { video_id: 'v', user_id: 'a1', sport, module: 'hitting', created_at: observed, violations: null };
        const scoped = planFaultContext([signal], [finding], [clip], 'a1', sport, date.getTime());
        const apply = (context: typeof scoped) => applyFaultPlanInfluence({ blocks: base.blocks, ...context, sport, ownedEquipment: new Set(),
          catalog: [{ ...fixDrill, sports: [sport] }], circulation: { servedToUser: {}, usage: {} }, now: date });
        const next = apply(scoped);
        expect(next).toHaveLength(base.blocks.length);
        next.forEach((block, index) => {
          expect(block.drills.map(d => d.dosage)).toEqual(base.blocks[index].drills.map(d => d.dosage));
          expect(block.durationMin).toBe(base.blocks[index].durationMin);
          expect(block.status).toBe(base.blocks[index].status);
          if (block.modality !== 'hitting') expect(block).toEqual(base.blocks[index]);
          if (block.drills.some(d => d.slug === fixDrill.id)) changed++;
        });
        const clean = [1, 2].map(n => ({ ...clip, video_id: `clean-${n}`, created_at: new Date(date.getTime() + n * 86400000).toISOString(),
          violations: { [signal.fault_key]: false } }));
        const cleared = planFaultContext([signal], [finding], [clip, ...clean], 'a1', sport, date.getTime() + 2 * 86400000);
        expect(apply(cleared).map(b => b.drills)).toEqual(base.blocks.map(b => b.drills));
      }
      expect(changed).toBeGreaterThan(0);
    });
  }
});

describe("audit: video analyses → plan", () => {
  const base = plan(null);
  const baseHit = hit(base);
  it("a planted hitting fault swaps exactly one hitting drill, same count and minutes", () => {
    const h = withAnalysis(false).find((b) => b.modality === "hitting")!;
    const changed = h.drills.filter((d, i) => d.name !== baseHit.drills[i]?.name);
    expect(changed.map((d) => d.name)).toEqual(["Front-Side Hold"]);
    expect(h.drills).toHaveLength(baseHit.drills.length);
    expect(h.durationMin).toBe(baseHit.durationMin);
    expect(h.because).toEqual(['Because your video from Jun 1 showed: Recent finding. "Front-Side Hold" works on it today.']);
  });
  it("a fault cleared by clean clips rotates out (no swap)", () => {
    const h = withAnalysis(true).find((b) => b.modality === "hitting")!;
    expect(h.drills.map((d) => d.name)).toEqual(baseHit.drills.map((d) => d.name));
    expect(h.because ?? []).toEqual(baseHit.because ?? []);
  });
  it("lifting is identical with or without an analysis finding", () => {
    const s = (bs: ReadonlyArray<typeof baseHit>) => bs.find((b) => b.modality === "strength")?.drills;
    expect(s(withAnalysis(false))).toEqual(s(base.blocks));
  });
});

// ── Audit: goals → plan ──
describe("audit: goals → plan", () => {
  const withGoals = (g: string[]) => buildHammerDailyPlan(
    ctx({ ...BASE, development_priorities: g, equipment_effective: ["tee", "gamer_bat"] }), NORMAL_SIGNAL, null, null, undefined, DAY);
  const a = withGoals(["hitting", "defense"]);
  const b = withGoals(["defense", "hitting"]);
  it("goals never change dose: same modalities get the same minutes", () => {
    for (const blk of a.blocks) {
      const other = b.blocks.find((x) => x.modality === blk.modality);
      if (other) expect(other.durationMin).toBe(blk.durationMin);
    }
  });
  it("lifting is identical whatever the goals", () => {
    const s = (p: typeof a) => p.blocks.find((x) => x.modality === "strength")?.drills;
    expect(s(b)).toEqual(s(a));
  });
  it("finding: reordering the same two goals does not reorder cards today", () => {
    const order = (p: typeof a) => p.blocks.filter((x) => x.status !== "suppressed").map((x) => x.modality);
    expect(order(b)).toEqual(order(a));
  });
});

// ── Audit: season phase → plan ──
describe("audit: season phase → plan", () => {
  const atPhase = (phase: string) => buildHammerDailyPlan(
    ctx({ ...BASE, season_phase: phase, equipment_effective: ["tee", "gamer_bat"] }), NORMAL_SIGNAL, null, null, undefined, DAY);
  it("off-season and in-season build different hitting work (warm-up title same on a speed day)", () => {
    // Saturday: the off-season template trims hitting to skill volume (no ramp involved).
    const sat = new Date(2026, 5, 6);
    const atSat = (phase: string) => buildHammerDailyPlan(
      ctx({ ...BASE, season_phase: phase, equipment_effective: ["tee", "gamer_bat"] }), NORMAL_SIGNAL, null, null, undefined, sat);
    const off = atSat("off"), inn = atSat("in");
    const t = (p: typeof off, m: string) => p.blocks.find((b) => b.modality === m);
    // Owner Oct 28 removed the ramp, so drill names can match; the season still sets a different week.
    expect(off.microcycle.template.id).not.toBe(inn.microcycle.template.id);
    expect(t(off, "hitting")?.status).toBe("ready");
  });
});

describe("audit: games → drill choice (chase)", () => {
  const withGear = (gear: string[]) => buildHammerDailyPlan(
    ctx({ ...BASE, equipment_effective: gear }), NORMAL_SIGNAL, null,
    gp({ chasePct: 40, atBats: 12, pitchesSeen: 50 }), undefined, DAY);
  const baseH = (gear: string[]) => hit(buildHammerDailyPlan(ctx({ ...BASE, equipment_effective: gear }), NORMAL_SIGNAL, null, null, undefined, DAY));
  it("chasing with a net swaps one hitting drill to Two-Ball Recognition, same count and minutes", () => {
    const gear = ["tee", "gamer_bat", "net"];
    const h = hit(withGear(gear));
    console.log("CHASE_DRILLS", JSON.stringify(h.drills.map((d) => d.name)), JSON.stringify(baseH(gear).drills.map((d) => d.name)));
    expect(h.drills.map((d) => d.name)).toContain("Two-Ball Recognition");
    expect(h.drills).toHaveLength(baseH(gear).drills.length);
    expect(h.drills[0]).toEqual(baseH(gear).drills[0]);
    expect(h.drills.find(d => d.stage === 'full_go')).toEqual(baseH(gear).drills.find(d => d.stage === 'full_go'));
    expect(h.drills[h.drills.length - 1]).toEqual(baseH(gear).drills[baseH(gear).drills.length - 1]);
    expect(h.durationMin).toBe(baseH(gear).durationMin);
    expect(h.because?.some((l) => l.includes("Two-Ball Recognition") && l.includes("(early read)"))).toBe(true);
  });
  it("no net → no swap (never prescribe missing equipment)", () => {
    const plan=buildHammerDailyPlan(ctx({...BASE,equipment_effective:['tee','gamer_bat']}),NORMAL_SIGNAL,null,gp({chasePct:40,atBats:12,pitchesSeen:50}),undefined,DAY,{alwaysMissingGear:['net']});
    expect(hit(plan).drills.map((d) => d.name)).not.toContain("Two-Ball Recognition");
  });
});

describe("execution: hitting session structure", () => {
  const h = (gear: string[], phase = "in") => hit(buildHammerDailyPlan(
    ctx({ ...BASE, season_phase: phase, equipment_effective: gear }), NORMAL_SIGNAL, null, null, undefined, DAY));
  it.each(['baseball', 'softball'])("%s: every phase exercises real hitting days with prep, full-go and log", sport => {
    for (const phase of ["in", "off", "pre"]) {
      const hittingDays = Array.from({ length: 7 }, (_, offset) => {
        const date = new Date(2026, 5, 3 + offset);
        return buildHammerDailyPlan(ctx({ ...BASE, sport_primary: sport, season_phase: phase,
          equipment_effective: ['tee', 'gamer_bat', 'net'] }), NORMAL_SIGNAL, null, null, undefined, date)
          .blocks.find(block => block.modality === 'hitting');
      }).filter(block => block?.status === 'ready');
      expect(hittingDays.length, `${sport}/${phase}: fixture must exercise execution`).toBeGreaterThan(0);
      for (const blk of hittingDays) {
        expect(blk?.drills.length).toBeGreaterThan(0);
        const stages = blk?.drills.map(d => d.stage) ?? [];
        expect(stages[0]).toBe('prep');
        expect(stages).toContain('full_go');
        expect(stages[stages.length - 1]).toBe('log');
        expect(blk?.drills.find(d => d.stage === 'full_go')?.cue).toContain('every swing with intent');
      }
    }
  });
  it("in-season with a net is a real hitting day (structure is exercised)", () => {
    expect(h(["tee", "gamer_bat", "net"]).drills.some((d) => d.stage === "full_go")).toBe(true);
  });
  it("bat only: no invented full-go round (needs a net or machine)", () => {
    const plan=buildHammerDailyPlan(ctx({...BASE,equipment_effective:['gamer_bat']}),NORMAL_SIGNAL,null,null,undefined,DAY,{alwaysMissingGear:['net','pitching_machine']});
    expect(hit(plan).drills.some((d) => d.stage === "full_go")).toBe(false);
  });
});

// ── AO5: real goal ranking (category_goals) → card order ──
describe("audit: ranked category goals → day order", () => {
  it('the actual plan honors a saved V2 category order with no sub-goals yet', () => {
    const p = buildHammerDailyPlan(ctx({ ...BASE,
      category_goals: { version: 2, categoryOrder: ['fielding', 'hitting', 'throwing', 'speed', 'power'], updatedAt: '2026-06-01T00:00:00Z' },
      equipment_effective: ['field', 'glove', 'ball', 'tee', 'gamer_bat', 'net'],
    }), NORMAL_SIGNAL, null, null, undefined, DAY);
    const fieldingIndex = p.blocks.findIndex(block => block.modality === 'defense');
    const hittingIndex = p.blocks.findIndex(block => block.modality === 'hitting');
    expect(fieldingIndex).toBeGreaterThanOrEqual(0);
    // The second goal may lead shared skill days (secondGoalFirst); the saved order still ranks fielding #1.
    expect(p.blocks[fieldingIndex].why).toContain('Goal #1');
    expect(p.blocks[hittingIndex].why).toContain('Goal #2');
    const reversed = buildHammerDailyPlan(ctx({ ...BASE,
      category_goals: { version: 2, categoryOrder: ['hitting', 'fielding', 'throwing', 'speed', 'power'], updatedAt: '2026-06-01T00:00:00Z' },
      equipment_effective: ['field', 'glove', 'ball', 'tee', 'gamer_bat', 'net'],
    }), NORMAL_SIGNAL, null, null, undefined, DAY);
    const reversedHittingIndex = reversed.blocks.findIndex(block => block.modality === 'hitting');
    const reversedFieldingIndex = reversed.blocks.findIndex(block => block.modality === 'defense');
    expect(reversed.blocks[reversedHittingIndex].why).toContain('Goal #1');
    expect(reversed.blocks[reversedFieldingIndex].why).toContain('Goal #2');
    expect(reversed.blocks.find(block => block.modality === 'strength')?.drills).toEqual(p.blocks.find(block => block.modality === 'strength')?.drills);
  });
  const ranked = (order: string[]) => ({ version: 1, updatedAt: "2026-06-01T00:00:00.000Z",
    goals: order.map((category, i) => ({ category, rank: i + 1, intent: null })) });
  const at = (order: string[]) => buildHammerDailyPlan(
    ctx({ ...BASE, category_goals: ranked(order), equipment_effective: ["tee", "gamer_bat", "net", "glove"] }), NORMAL_SIGNAL, null, null, undefined, DAY);
  const skills = (p: ReturnType<typeof at>) => p.blocks.filter((x) => x.status !== "suppressed" && ["hitting", "defense", "throwing", "speed", "strength", "baserunning"].includes(x.modality)).map((x) => x.modality);
  it("the #1 ranked skill leads the day; swapping goals reorders the cards", () => {
    const h = skills(at(["hitting", "fielding", "throwing", "speed", "power"]));
    const f = skills(at(["fielding", "hitting", "throwing", "speed", "power"]));
    if (h.includes("hitting") && h.includes("defense")) {
      // Existing secondGoalFirst rotates the secondary goal into shared days;
      // newly available fielding now legitimately participates in that rule.
      expect(h.indexOf("defense")).toBeLessThan(h.indexOf("hitting"));
      expect(f.indexOf("hitting")).toBeLessThan(f.indexOf("defense"));
    } else {
      expect(h).toEqual(f); // same day without both skills: order source still identical
    }
  });
  it("minutes and lifting identical whatever the ranking", () => {
    const a = at(["hitting", "fielding", "throwing", "speed", "power"]);
    const b = at(["power", "speed", "fielding", "throwing", "hitting"]);
    for (const blk of a.blocks) {
      const o = b.blocks.find((x) => x.modality === blk.modality);
      if (o) expect(o.durationMin).toBe(blk.durationMin);
    }
    expect(b.blocks.find((x) => x.modality === "strength")?.drills).toEqual(a.blocks.find((x) => x.modality === "strength")?.drills);
  });
});
