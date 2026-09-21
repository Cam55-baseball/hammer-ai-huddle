import { describe, expect, it } from "vitest";
import {
  amountPerSet,
  buildLedger,
  type CatalogMap,
  classify,
  computeRm28,
  isoAdd,
  ledgerRows,
  wasBuildDay,
} from "../../../supabase/functions/_shared/wic/exposure/ledger";
import {
  BUILD_RATIO,
  MAINTAIN_RATIO,
  ratioFor,
  runGovernor,
} from "../../../supabase/functions/_shared/wic/exposure/governor";
import type {
  Channel,
  ExposureDay,
  GovAlternative,
  GovItem,
  Rm28,
} from "../../../supabase/functions/_shared/wic/exposure/types";
import { governorTrimNote, WATCH } from "../../../supabase/functions/_shared/wic/watch/rules";

// Step 14 C — the Exposure Ledger and Spike Governor, tested against §5.

const jumpT1 = {
  slug: "depth_jump",
  exposure_channel: "elastic",
  plyo_tier: 1,
  contacts_per_rep: 1,
  category: "speed_lab",
  intensity_class: "high",
  substitution_family: "jump_vertical",
};
const jumpT3 = {
  slug: "pogo_hop",
  exposure_channel: "elastic",
  plyo_tier: 3,
  contacts_per_rep: 1,
  category: "speed_lab",
  intensity_class: "low",
  substitution_family: "jump_vertical",
};

const rm28Of = (byChannel: Partial<Record<Channel, number>>, byTier: Record<string, number> = {}): Rm28 => ({
  byChannel: { LIFT: 0, JUMP: 0, UB_PLYO: 0, SPRINT: 0, THROW: 0, SWING: 0, SPORT: 0, ...byChannel },
  byTier,
  loggedDaysByChannel: { LIFT: 28, JUMP: 28, UB_PLYO: 28, SPRINT: 28, THROW: 28, SWING: 28, SPORT: 28 },
  onDate: {},
  daysObserved: 28,
});

const jumpItem = (over: Partial<GovItem> = {}): GovItem => ({
  slug: "depth_jump",
  name: "Depth Jump",
  channel: "JUMP",
  tier: "T1",
  sets: 6,
  amountPerSet: 10,
  floorSets: 1,
  substitutionFamily: "jump_vertical",
  ...over,
});

describe("Exposure Ledger (TI-1, §5.1/§5.2)", () => {
  it("classifies each catalog row into one channel and tier", () => {
    expect(classify(jumpT1 as never)).toEqual({ channel: "JUMP", tier: "T1" });
    expect(classify({ ...jumpT1, exposure_channel: "lifting", intensity_class: "max_effort" } as never))
      .toEqual({ channel: "LIFT", tier: "main" });
    expect(classify({ ...jumpT1, exposure_channel: "low_load", category: "warmup" } as never)).toBeNull();
  });

  it("counts a day per channel and never adds channels together", () => {
    const catalog: CatalogMap = {
      depth_jump: jumpT1 as never,
      back_squat: {
        slug: "back_squat",
        exposure_channel: "lifting",
        plyo_tier: null,
        contacts_per_rep: 0,
        category: "strength",
        intensity_class: "max_effort",
      } as never,
    };
    const raw = {
      userId: "u1",
      today: "2026-09-30",
      timezone: "UTC",
      windowStart: "2026-09-01",
      horizonEnd: "2026-10-14",
      mpi: null,
      context: null,
      prescriptions: [
        { plan_date: "2026-09-20", slot: "speed", movement_slug: "depth_jump", cns_cost: 3, sets: 4, status: "done" },
        { plan_date: "2026-09-20", slot: "lift", movement_slug: "back_squat", cns_cost: 4, sets: 5, status: "done" },
      ],
      sessionLogs: [],
      games: [],
      calendarEvents: [],
      practices: [],
      throwingReps: [],
      speedSessions: [],
      quizzes: [],
      dailyLogs: [],
    } as never;
    const days = buildLedger(raw, catalog);
    expect(days).toHaveLength(1);
    const rm = computeRm28(days, "2026-09-30");
    expect(rm.byChannel.JUMP).toBe(4);
    expect(rm.byChannel.LIFT).toBe(5);
    expect(rm.byChannel.SPRINT).toBe(0);
    const rows = ledgerRows("u1", days[0]);
    expect(rows.some((r) => r.channel === "JUMP" && r.tier === "all" && r.total === 4)).toBe(true);
    expect(rows.some((r) => r.channel === "LIFT" && r.tier === "main" && r.total === 5)).toBe(true);
  });

  it("RM28 is the biggest single day, not a sum, and only looks back 28 days", () => {
    const days: ExposureDay[] = [
      { date: "2026-09-01", entries: [{ channel: "JUMP", tier: "T1", amount: 90, source: "prescribed" }] },
      { date: "2026-09-25", entries: [{ channel: "JUMP", tier: "T1", amount: 36, source: "prescribed" }] },
      { date: "2026-09-26", entries: [{ channel: "JUMP", tier: "T1", amount: 20, source: "prescribed" }] },
    ];
    const rm = computeRm28(days, "2026-09-30");
    expect(rm.byChannel.JUMP).toBe(36);
    expect(rm.onDate.JUMP).toBe("2026-09-25");
  });

  it("a skipped prescription does not count; a missing log still does", () => {
    const catalog: CatalogMap = { depth_jump: jumpT1 as never };
    const base = {
      userId: "u1", today: "2026-09-30", timezone: "UTC", windowStart: "2026-09-01",
      horizonEnd: "2026-10-14", mpi: null, context: null, sessionLogs: [], games: [],
      calendarEvents: [], practices: [], throwingReps: [], speedSessions: [], quizzes: [], dailyLogs: [],
    };
    const done = buildLedger({
      ...base,
      prescriptions: [{ plan_date: "2026-09-20", slot: "speed", movement_slug: "depth_jump", cns_cost: 3, sets: 4, status: null }],
    } as never, catalog);
    expect(computeRm28(done, "2026-09-30").byChannel.JUMP).toBe(4);
    const skip = buildLedger({
      ...base,
      prescriptions: [{ plan_date: "2026-09-20", slot: "speed", movement_slug: "depth_jump", cns_cost: 3, sets: 4, status: "skipped" }],
    } as never, catalog);
    expect(computeRm28(skip, "2026-09-30").byChannel.JUMP).toBe(0);
  });

  it("amount per set follows the channel's own unit", () => {
    expect(amountPerSet(jumpT1 as never, "JUMP", 5, null)).toBe(5);
    expect(amountPerSet({ ...jumpT1, exposure_channel: "sprint" } as never, "SPRINT", 3, 90)).toBe(90);
  });
});

describe("Spike Governor (TI-2, §5.3)", () => {
  it("build ratio 1.10 in build blocks, 1.00 in-season, in B5 and in Growth Mode", () => {
    expect(ratioFor("JUMP", { block: "B1", inSeason: false, growthMode: false })).toBe(BUILD_RATIO);
    expect(ratioFor("JUMP", { block: "B4", inSeason: false, growthMode: false })).toBe(BUILD_RATIO);
    expect(ratioFor("JUMP", { block: "B5", inSeason: false, growthMode: false })).toBe(MAINTAIN_RATIO);
    expect(ratioFor("JUMP", { block: "B1", inSeason: true, growthMode: false })).toBe(MAINTAIN_RATIO);
    expect(ratioFor("JUMP", { block: "B1", inSeason: false, growthMode: true })).toBe(MAINTAIN_RATIO);
  });

  it("B3 holds lifts, jumps and sprints while throwing and swinging still build", () => {
    const ctx = { block: "B3" as const, inSeason: false, growthMode: false };
    expect(ratioFor("LIFT", ctx)).toBe(MAINTAIN_RATIO);
    expect(ratioFor("JUMP", ctx)).toBe(MAINTAIN_RATIO);
    expect(ratioFor("SPRINT", ctx)).toBe(MAINTAIN_RATIO);
    expect(ratioFor("THROW", ctx)).toBe(BUILD_RATIO);
    expect(ratioFor("SWING", ctx)).toBe(BUILD_RATIO);
  });

  it("RM28 36 with 60 contacts planned trims to 39 or less, and says why", () => {
    const out = runGovernor({
      items: [jumpItem()],
      rm28: rm28Of({ JUMP: 36 }),
      ctx: { block: "B1", inSeason: false, growthMode: false },
    });
    const total = out.items.filter((i) => i.channel === "JUMP").reduce((s, i) => s + i.sets * i.amountPerSet, 0);
    expect(total).toBeLessThanOrEqual(39.6);
    expect(out.trims.length).toBeGreaterThan(0);
    expect(out.reasons[0]).toContain("your biggest jumps day in the last 4 weeks was 36");
  });

  it("a floor above the cap steps down a tier instead of leaving the spike", () => {
    const alt: GovAlternative = {
      slug: "pogo_hop",
      name: "Pogo Hop",
      channel: "JUMP",
      tier: "T3",
      amountPerSet: 2,
      floorSets: 1,
      substitutionFamily: "jump_vertical",
    };
    const out = runGovernor({
      items: [jumpItem({ sets: 1, amountPerSet: 30, floorSets: 1 })],
      rm28: rm28Of({ JUMP: 10 }),
      ctx: { block: "B1", inSeason: false, growthMode: false },
      alternatives: [alt],
    });
    expect(out.trims.some((t) => t.action === "tier_step_down")).toBe(true);
    expect(out.items[0].slug).toBe("pogo_hop");
    expect(out.items[0].sets * out.items[0].amountPerSet).toBeLessThanOrEqual(11);
  });

  it("with no lighter sibling the row is dropped and the rest of the card survives", () => {
    const out = runGovernor({
      items: [
        jumpItem({ sets: 1, amountPerSet: 40, floorSets: 1 }),
        { ...jumpItem({ slug: "arm_care_a" }), channel: "THROW", tier: "low", sets: 1, amountPerSet: 1 },
      ],
      rm28: rm28Of({ JUMP: 10, THROW: 50 }),
      ctx: { block: "B1", inSeason: false, growthMode: false },
    });
    expect(out.items.some((i) => i.slug === "depth_jump")).toBe(false);
    expect(out.items.some((i) => i.slug === "arm_care_a")).toBe(true);
  });

  it("cold start: nothing in the channel for 28 days starts at the floor", () => {
    const out = runGovernor({
      items: [jumpItem({ sets: 6 })],
      rm28: rm28Of({ JUMP: 0 }),
      ctx: { block: "B1", inSeason: false, growthMode: false },
    });
    expect(out.items[0].sets).toBe(1);
    expect(out.reasons.join(" ")).toContain("restart easy");
  });

  it("no two build days in a row in the same channel", () => {
    const out = runGovernor({
      items: [jumpItem({ sets: 4, amountPerSet: 10 })],
      rm28: rm28Of({ JUMP: 36 }),
      ctx: { block: "B1", inSeason: false, growthMode: false, buildYesterday: ["JUMP"] },
    });
    expect(out.diagnostics.JUMP.ratio).toBe(MAINTAIN_RATIO);
    expect(out.diagnostics.JUMP.planned_after as number).toBeLessThanOrEqual(36);
  });

  it("a build day is the day that sets a new channel high", () => {
    const days: ExposureDay[] = [
      { date: "2026-09-10", entries: [{ channel: "JUMP", tier: "T1", amount: 20, source: "prescribed" }] },
      { date: "2026-09-29", entries: [{ channel: "JUMP", tier: "T1", amount: 30, source: "prescribed" }] },
    ];
    expect(wasBuildDay(days, "2026-09-29", "JUMP")).toBe(true);
    expect(wasBuildDay(days, "2026-09-10", "JUMP")).toBe(false);
  });

  it("Pitch Smart rest days block prescribed high-intent throwing", () => {
    const out = runGovernor({
      items: [{ ...jumpItem({ slug: "bullpen" }), channel: "THROW", tier: "high", sets: 3, amountPerSet: 10 }],
      rm28: rm28Of({ THROW: 100 }),
      ctx: { block: "B1", inSeason: false, growthMode: false, pitchSmartRestDay: true },
    });
    expect(out.items).toHaveLength(0);
    expect(out.trims[0].action).toBe("blocked");
    expect(out.reasons.join(" ")).toContain("needs the rest days");
  });

  it("team practice is counted but never trimmed", () => {
    const out = runGovernor({
      items: [{ ...jumpItem({ slug: "solo_swings" }), channel: "SWING", tier: "high", sets: 4, amountPerSet: 10 }],
      teamLoad: [{ channel: "SPORT", amount: 120 }],
      rm28: rm28Of({ SWING: 30, SPORT: 60 }),
      ctx: { block: "B1", inSeason: false, growthMode: false },
    });
    expect(out.trims.every((t) => t.channel !== "SPORT")).toBe(true);
  });

  it("channels never merge — a jump spike leaves the lift alone", () => {
    const out = runGovernor({
      items: [
        jumpItem({ sets: 6 }),
        { ...jumpItem({ slug: "back_squat" }), channel: "LIFT", tier: "main", sets: 5, amountPerSet: 1 },
      ],
      rm28: rm28Of({ JUMP: 20, LIFT: 5 }),
      ctx: { block: "B1", inSeason: false, growthMode: false },
    });
    expect(out.items.find((i) => i.slug === "back_squat")!.sets).toBe(5);
    expect(out.trims.every((t) => t.channel === "JUMP")).toBe(true);
  });

  it("is deterministic — the same input trims the same way every time", () => {
    const run = () =>
      JSON.stringify(
        runGovernor({
          items: [jumpItem(), { ...jumpItem({ slug: "bound" }), tier: "T2", sets: 4, amountPerSet: 8 }],
          rm28: rm28Of({ JUMP: 30 }),
          ctx: { block: "B2", inSeason: false, growthMode: false },
        }),
      );
    expect(run()).toBe(run());
  });

  it("the card always ships — trimming never returns nothing when a floor row exists", () => {
    const out = runGovernor({
      items: [
        jumpItem({ sets: 8 }),
        { ...jumpItem({ slug: "arm_care_a" }), channel: "THROW", tier: "low", sets: 2, amountPerSet: 1 },
      ],
      rm28: rm28Of({ JUMP: 10, THROW: 40 }),
      ctx: { block: "B1", inSeason: false, growthMode: false },
    });
    expect(out.items.length).toBeGreaterThan(0);
  });
});

describe("Watchdog — governor trims above the expected rate", () => {
  it("stays quiet at or under the limit", () => {
    expect(governorTrimNote({ checkedDate: "2026-09-30", cardsGenerated: 100, cardsTrimmed: 25 })).toBeNull();
  });
  it("writes a warning above the limit", () => {
    const n = governorTrimNote({ checkedDate: "2026-09-30", cardsGenerated: 100, cardsTrimmed: 40 });
    expect(n?.severity).toBe("warn");
    expect(n?.category).toBe("governor_trim");
    expect((n?.detail as Record<string, unknown>).limit).toBe(WATCH.GOVERNOR_TRIM_RATE);
  });
});

describe("date maths", () => {
  it("steps whole days without timezone surprises", () => {
    expect(isoAdd("2026-03-01", -1)).toBe("2026-02-28");
    expect(isoAdd("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("arm care is never governed as throwing volume", () => {
  it("classifies an arm-care throwing row as ungoverned", () => {
    expect(
      classify({
        slug: "arm_care_band_er",
        exposure_channel: "throwing",
        plyo_tier: null,
        contacts_per_rep: null,
        category: "arm_care",
        intensity_class: null,
      }),
    ).toBeNull();
  });
});
