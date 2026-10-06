// Under 13 (owner ruling 2026-10-06, Round 2 Part C + stress tests 12–14).
import { describe, expect, it } from "vitest";
import {
  PITCH_SMART_BANDS, bandIndex, restDaysFor, inningsCap, checkCaps, pitchTypeAllowed, weightedBallAllowed,
  under13ThirdDay, under13YearlyRestBlocks, U13_REST,
} from "../../supabase/functions/_shared/wic/phases/youthThrowing";
import { u13ThrowBlockFrom, type LedgerDay } from "../../supabase/functions/_shared/wic/phases/u13ThrowGate";
import { finalRuleCheck, rowKinds, isWeightedBallCard, isThrowCard, type CatalogFacts } from "../../supabase/functions/_shared/wic/schedule/finalCheck";
import catalogRows from "./fixtures/wkCatalogRules.json";

const add = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

describe("Pitch Smart rest by band (case 12)", () => {
  const cases: Array<[number, Record<number, number | "over">]> = [
    [8, { 20: 0, 35: 1, 50: 2, 65: "over", 66: "over" }],
    [10, { 20: 0, 35: 1, 50: 2, 65: 3, 66: 4 }],
    [12, { 20: 0, 35: 1, 50: 2, 65: 3, 66: 4 }],
  ];
  for (const [age, want] of cases) {
    const band = PITCH_SMART_BANDS[bandIndex(age)];
    for (const [p, r] of Object.entries(want)) {
      it(`age ${age}, ${p} pitches → ${r}`, () => {
        if (r === "over") expect(Number(p)).toBeGreaterThan(band.dailyMax);
        else expect(restDaysFor(band, Number(p))).toBe(r);
      });
    }
  }
  it("daily maximums 50 / 75 / 85", () => {
    expect(PITCH_SMART_BANDS[bandIndex(7)].dailyMax).toBe(50);
    expect(PITCH_SMART_BANDS[bandIndex(9)].dailyMax).toBe(75);
    expect(PITCH_SMART_BANDS[bandIndex(11)].dailyMax).toBe(85);
  });
  it("innings caps 60 at 8 and under, 80 at 9–12, 100 at 13+", () => {
    expect(inningsCap(7, null)).toBe(60); expect(inningsCap(8, null)).toBe(60);
    expect(inningsCap(9, null)).toBe(80); expect(inningsCap(12, null)).toBe(80);
    expect(inningsCap(13, null)).toBe(100);
    expect(checkCaps(8, null, { week: 0, season: 0, year: 0, inningsYear: 59 }, 0, 2).blocked).toBe(true);
    expect(checkCaps(11, null, { week: 0, season: 0, year: 0, inningsYear: 79 }, 0, 1).blocked).toBe(false);
    expect(checkCaps(11, null, { week: 0, season: 0, year: 0, inningsYear: 80 }, 0, 1).blocked).toBe(true);
  });
  it("three days in a row blocked", () => {
    expect(under13ThirdDay(["2026-05-01", "2026-05-02"], "2026-05-03")).toBe(true);
    expect(u13ThrowBlockFrom(10, [{ date: "2026-05-01", pitches: 10, throws: 0 }, { date: "2026-05-02", pitches: 10, throws: 0 }], "2026-05-03")).toMatch(/three days/);
  });
  it("rest after an outing blocks throwing cards", () => {
    expect(u13ThrowBlockFrom(10, [{ date: "2026-05-01", pitches: 66, throws: 0 }], "2026-05-04")).toMatch(/4 days/);
    expect(u13ThrowBlockFrom(10, [{ date: "2026-05-01", pitches: 66, throws: 0 }], "2026-05-06")).toBeNull();
  });
  it("fastball and changeup only under 13", () => {
    expect(pitchTypeAllowed(12, "Fastball")).toBe(true);
    expect(pitchTypeAllowed(12, "changeup")).toBe(true);
    expect(pitchTypeAllowed(12, "curveball")).toBe(false);
    expect(pitchTypeAllowed(12, "slider")).toBe(false);
    expect(pitchTypeAllowed(13, "curveball")).toBe(true);
    expect(weightedBallAllowed(12)).toBe(false);
  });
  it("4 months off a year, 2+ in a row", () => {
    // Threw every day for 245 days: the 246th is blocked.
    const today = "2026-12-31";
    const dates = Array.from({ length: 245 }, (_, i) => add(today, -1 - i));
    expect(under13YearlyRestBlocks(dates, today).blocked).toBe(true);
    // With a 70-day break in the window and under 245 days thrown: allowed.
    const withBreak = Array.from({ length: 290 }, (_, i) => add(today, -1 - i)).filter((_, i) => i < 100 || i > 170);
    expect(under13YearlyRestBlocks(withBreak, today).blocked).toBe(false);
    expect(U13_REST.offDaysPerYear).toBe(120);
  });
});

// ── 8-week simulation, ages 7, 9, 11, 12 (case 13) ───────────────────────
const CATALOG = new Map<string, CatalogFacts>((catalogRows as any[]).map((c) => [c.slug, c]));
CATALOG.set("ac_rocker", { min_age_years: 14, exposure_channel: "throwing", equipment: ["plyo_balls"] });
CATALOG.set("dl_weighted_ball_hold", { min_age_years: 13, exposure_channel: "throwing", equipment: ["weighted_ball"] });
CATALOG.set("u_catch_play", { min_age_years: 0, exposure_channel: "throwing", equipment: ["glove"] });
CATALOG.set("bs_light_bat_swings", { min_age_years: 0, exposure_channel: "low_load", bat_speed_category: "underload" });
const SLUGS = [...CATALOG.keys()].sort();
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

describe("8-week under-13 simulation (case 13)", () => {
  const v = { weighted: 0, overAge: 0, throwOnBlockedDay: 0, growthHighJump: 0, pitchRest: 0, third: 0 };
  let days = 0, blockedDays = 0, swaps = 0;
  for (const age of [7, 9, 11, 12])
    for (const sport of ["baseball", "softball"])
      for (const role of ["pitcher", "position", "two_way"])
        for (const behaviour of ["all", "none", "mix"])
          for (const growth of [false, true]) {
            const r = rng(age * 1000 + sport.length * 100 + role.length * 10 + behaviour.length + (growth ? 7 : 0));
            const ledger: LedgerDay[] = [];
            for (let d = 0; d < 56; d++) {
              const date = add("2026-03-02", d);
              const block = u13ThrowBlockFrom(age, ledger, date);
              if (block) blockedDays++;
              const rows = Array.from({ length: 8 }, () => ({ slot: "lift", movement_slug: SLUGS[Math.floor(r() * SLUGS.length)] }));
              rows.push({ slot: "throwing", movement_slug: "u_catch_play" }, { slot: "throwing", movement_slug: "ac_rocker" },
                { slot: "throwing", movement_slug: "dl_weighted_ball_hold" }, { slot: "bat_speed", movement_slug: "bs_light_bat_swings" });
              const out = finalRuleCheck(rows, { planDate: date, phase: "offseason", age, growthMode: growth, priorLiftDates: [], restDaysBetweenLifts: null,
                weeklyLiftMax: null, liftRemoved: false, u13ThrowBlock: block, catalog: CATALOG });
              swaps += out.swaps.length; days++;
              for (const k of out.rows) {
                const f = CATALOG.get(k.movement_slug);
                if (isWeightedBallCard(k.movement_slug, f)) v.weighted++;
                if ((f?.min_age_years ?? 0) > age) v.overAge++;
                if (block && isThrowCard(k, f)) v.throwOnBlockedDay++;
                if (growth && (rowKinds(k, f).includes("high_jump") || f?.eccentric_overload)) v.growthHighJump++;
              }
              // The player pitches on allowed days (pitchers / 2-Way), per behaviour.
              const pitches = role !== "position" && !block && (behaviour === "all" || (behaviour === "mix" && r() < 0.5))
                ? Math.min(PITCH_SMART_BANDS[bandIndex(age)].dailyMax, Math.floor(r() * 90) + 1) : 0;
              ledger.push({ date, pitches, throws: block ? 0 : 20 });
            }
            // Re-check the realised pitch history against Pitch Smart.
            const band = PITCH_SMART_BANDS[bandIndex(age)];
            ledger.forEach((l, i) => {
              if (l.pitches <= 0) return;
              const rest = restDaysFor(band, l.pitches);
              for (let j = i + 1; j <= i + rest && j < ledger.length; j++) if (ledger[j].pitches > 0) v.pitchRest++;
              if (i >= 2 && ledger[i - 1].pitches > 0 && ledger[i - 2].pitches > 0) v.third++;
            });
          }
  it("zero violations across every age, sport, role, behaviour and growth state", () => {
    expect(days).toBe(4 * 2 * 3 * 3 * 2 * 56);
    expect(v).toEqual({ weighted: 0, overAge: 0, throwOnBlockedDay: 0, growthHighJump: 0, pitchRest: 0, third: 0 });
    expect(blockedDays).toBeGreaterThan(0);
    expect(swaps).toBeGreaterThan(0);
  });
});

describe("turns 13 mid-plan (case 14)", () => {
  it("next plan uses the 13–14 band and lifts the under-13 gates", () => {
    expect(PITCH_SMART_BANDS[bandIndex(12)].label).toBe("11–12");
    expect(PITCH_SMART_BANDS[bandIndex(13)].label).toBe("13–14");
    expect(u13ThrowBlockFrom(13, [{ date: "2026-05-01", pitches: 10, throws: 0 }, { date: "2026-05-02", pitches: 10, throws: 0 }], "2026-05-03")).toBeNull();
    expect(pitchTypeAllowed(13, "curveball")).toBe(true);
    expect(inningsCap(13, null)).toBe(100);
  });
});
