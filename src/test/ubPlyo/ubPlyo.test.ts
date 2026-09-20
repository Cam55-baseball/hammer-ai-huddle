/**
 * Upper-Body Plyometric System v1 — §9 invariants and golden scenarios.
 *
 * Fast tier: runs on every build (UBP_CASES defaults to 2,000 athlete-weeks).
 * Full tier: nightly, UBP_CASES=100000.
 */

import { describe, expect, it } from "vitest";
import {
  UB_MOVEMENTS,
  effectiveSlug,
  regressionChain,
} from "../../../supabase/functions/_shared/wic/ubPlyo/families";
import {
  EXPOSURE_CHANNEL,
  WEEKLY_U2_U3_SESSION_CAP,
  doseCap,
  resolveUbMovement,
  ubExposure,
  type Block,
  type Phase,
  type TrainingAge,
  type UbHistory,
  type UbProfile,
} from "../../../supabase/functions/_shared/wic/ubPlyo/rules";
import { ubPlyoCost } from "../../../supabase/functions/_shared/wic/ubPlyo/tcsConfigV11";
import { TCS_CONFIG } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/config";

const SEED = Number(process.env.UBP_SEED ?? 20260920);
const CASES = Number(process.env.UBP_CASES ?? 2000);

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PHASES: Phase[] = ["os_q1", "os_q2", "os_q3", "os_q4", "pre_season", "in_season", "post_season"];
const BLOCKS: Block[] = ["B1", "B2", "B3", "B4", "B5"];
const AGES: TrainingAge[] = ["beginner", "developing", "intermediate", "advanced", "elite", "professional"];
const ALL_EQUIPMENT = [
  "box", "low_bar", "pull_up_bar", "bands", "landmine", "med_ball", "plyo_ball", "partner",
  "bench", "wall", "anchor", "sled", "strap", "prowler", "cable", "dumbbells", "barbell",
  "smith_machine", "safety_pins", "rebounder",
];

const ELITE: UbProfile = {
  ageYears: 17, trainingAge: "advanced", growthMode: false, role: "position",
  throwingArmAthlete: false, phase: "os_q4", block: "B4", bodyWeightLb: 180,
};
const STRONG: UbHistory = {
  u1SessionsLast8w: 10, u2SessionsLast10w: 10, u2u3SessionsThisWeek: 0,
  strictPushUps: 25, strictInvertedRows: 20, strictPullUps: 12, benchEstimatedMaxLb: 200,
  landmineWeeksNoPain: 8, startDayOffsets: [], bullpenDayOffsets: [], highIntentThrowDayOffsets: [],
};

describe("UBP catalog shape", () => {
  it("covers 16 families, 79 movements, every letter", () => {
    expect(UB_MOVEMENTS.length).toBe(79);
    expect(new Set(UB_MOVEMENTS.map((m) => m.family)).size).toBe(16);
    expect(new Set(UB_MOVEMENTS.map((m) => m.slug)).size).toBe(79);
  });

  it("every U2/U3 regression chain ends at a U1 anchor — never empty", () => {
    for (const m of UB_MOVEMENTS) {
      if (m.tier === "U1") continue;
      const chain = regressionChain(m);
      expect(chain.length).toBeGreaterThan(0);
      const last = chain[chain.length - 1];
      const row = UB_MOVEMENTS.find((x) => x.slug === last || effectiveSlug(x) === last);
      expect(row?.tier ?? "U1").toBe("U1");
    }
  });

  it("no outside program, brand or coach names", () => {
    const banned = /driveline|cressey|westside|heenan|marinovich|portal|slingshot|crossfit|nike|rogue/i;
    for (const m of UB_MOVEMENTS) {
      expect(banned.test(`${m.slug} ${m.name} ${m.cue}`)).toBe(false);
    }
  });
});

describe("UBP invariants (§9)", () => {
  it("no U2/U3 in-season or post-season", () => {
    for (const phase of ["in_season", "post_season"] as Phase[]) {
      for (const m of UB_MOVEMENTS) {
        const d = resolveUbMovement(m.slug, { ...ELITE, phase }, STRONG, ALL_EQUIPMENT);
        expect(d.tier).toBe("U1");
      }
    }
  });

  it("no U3 under 16 or below advanced", () => {
    for (const m of UB_MOVEMENTS.filter((x) => x.tier === "U3")) {
      const young = resolveUbMovement(m.slug, { ...ELITE, ageYears: 15 }, STRONG, ALL_EQUIPMENT);
      expect(young.tier).not.toBe("U3");
      const junior = resolveUbMovement(m.slug, { ...ELITE, trainingAge: "intermediate" }, STRONG, ALL_EQUIPMENT);
      expect(junior.tier).not.toBe("U3");
    }
  });

  it("no U2/U3 for a starting pitcher on the start day, the day before or the day after", () => {
    for (const off of [-1, 0, 1]) {
      for (const m of UB_MOVEMENTS) {
        const d = resolveUbMovement(
          m.slug,
          { ...ELITE, role: "starting_pitcher", throwingArmAthlete: true },
          { ...STRONG, startDayOffsets: [off] },
          ALL_EQUIPMENT,
        );
        expect(d.tier).toBe("U1");
      }
    }
  });

  it("no U3 within 48 h of a bullpen or start, or on a high-intent throwing day", () => {
    for (const h of [
      { ...STRONG, bullpenDayOffsets: [0] },
      { ...STRONG, highIntentThrowDayOffsets: [0] },
      { ...STRONG, bullpenDayOffsets: [2] },
    ]) {
      for (const m of UB_MOVEMENTS.filter((x) => x.tier === "U3")) {
        const d = resolveUbMovement(m.slug, { ...ELITE, role: "reliever", throwingArmAthlete: true }, h, ALL_EQUIPMENT);
        expect(d.tier).not.toBe("U3");
      }
    }
  });

  it("pitchers never get a barbell overhead catch", () => {
    for (const m of UB_MOVEMENTS.filter((x) => x.plane === "overhead")) {
      const d = resolveUbMovement(m.slug, { ...ELITE, throwingArmAthlete: true }, STRONG, ALL_EQUIPMENT);
      const row = UB_MOVEMENTS.find((x) => x.slug === d.slug || effectiveSlug(x) === d.slug);
      expect(row?.barbellOverhead ?? false).toBe(false);
    }
  });

  it("strength gates are respected", () => {
    const weak: UbHistory = { ...STRONG, strictPushUps: 0, strictInvertedRows: 0, strictPullUps: 0, benchEstimatedMaxLb: 0, landmineWeeksNoPain: 0 };
    for (const m of UB_MOVEMENTS.filter((x) => x.tier !== "U1" && x.plane !== "rotation")) {
      const d = resolveUbMovement(m.slug, ELITE, weak, ALL_EQUIPMENT);
      expect(d.tier).toBe("U1");
    }
  });

  it("weekly U2/U3 session cap holds", () => {
    for (const m of UB_MOVEMENTS.filter((x) => x.tier !== "U1")) {
      const d = resolveUbMovement(m.slug, ELITE, { ...STRONG, u2u3SessionsThisWeek: WEEKLY_U2_U3_SESSION_CAP }, ALL_EQUIPMENT);
      expect(d.tier).toBe("U1");
    }
  });

  it("every decision is non-empty and carries the quality-gate cue and UB_PLYO channel", () => {
    for (const m of UB_MOVEMENTS) {
      const d = resolveUbMovement(m.slug, { ...ELITE, ageYears: 13, trainingAge: "beginner", growthMode: true }, { ...STRONG, u1SessionsLast8w: 0, u2SessionsLast10w: 0 }, []);
      expect(d.slug).toBeTruthy();
      expect(d.tier).toBe("U1");
      expect(d.label).toBe("Today's version");
      expect(d.cue).toContain("Stop the set");
      expect(d.exposureChannel).toBe(EXPOSURE_CHANNEL);
    }
  });

  it("dose caps match §2", () => {
    expect(doseCap("U1", "Base")).toBe(40);
    expect(doseCap("U2", "Base")).toBe(20);
    expect(doseCap("U3", "Base")).toBe(15);
    expect(doseCap("U3", "B")).toBe(12);
    expect(doseCap("U3", "C")).toBe(12);
  });

  it("UB_PLYO exposure totals contacts by tier", () => {
    const e = ubExposure([{ tier: "U1", contacts: 20 }, { tier: "U3", contacts: 10 }, { tier: "U3", contacts: 5 }]);
    expect(e.channel).toBe("UB_PLYO");
    expect(e.byTier).toEqual({ U1: 20, U2: 0, U3: 15 });
    expect(e.total).toBe(35);
  });

  it("proposed tcs_config_v1.1 adds arm and nerve cost without touching v1", () => {
    expect(ubPlyoCost("U1", 10)).toMatchObject({ nerve: 1, arm: 1 });
    expect(ubPlyoCost("U2", 10)).toMatchObject({ nerve: 2, arm: 3 });
    expect(ubPlyoCost("U3", 20)).toMatchObject({ nerve: 10, arm: 10 });
    expect((TCS_CONFIG.costs as Record<string, unknown>).ub_plyo_u1_per_10).toBeUndefined();
  });
});

describe("UBP golden scenarios (§9)", () => {
  const cases: [string, UbProfile, UbHistory, string, string][] = [
    ["17yo position player, B4", ELITE, STRONG, "ubp_f02_base_plyo_pushup", "U3"],
    [
      "starting pitcher, B4, start tomorrow",
      { ...ELITE, role: "starting_pitcher", throwingArmAthlete: true },
      { ...STRONG, startDayOffsets: [1] },
      "ubp_f02_base_plyo_pushup",
      "U1",
    ],
    [
      "14-year-old, B2",
      { ...ELITE, ageYears: 14, trainingAge: "intermediate", phase: "os_q2", block: "B2" },
      { ...STRONG, strictPushUps: 12 },
      "ubp_f01_base_pushup_drop_catch",
      "U2",
    ],
    [
      "in-season reliever",
      { ...ELITE, role: "reliever", throwingArmAthlete: true, phase: "in_season", block: "B5" },
      STRONG,
      "ubp_f09_base_repeat_chest_pass",
      "U1",
    ],
    [
      "pro athlete, offseason",
      { ...ELITE, ageYears: 26, trainingAge: "professional" },
      STRONG,
      "ubp_f11_base_bench_drop_catch",
      "U3",
    ],
  ];

  for (const [label, profile, history, slug, expectedTier] of cases) {
    it(label, () => {
      const d = resolveUbMovement(slug, profile, history, ALL_EQUIPMENT);
      expect(d.tier).toBe(expectedTier);
      expect(d.slug).toBeTruthy();
    });
  }
});

describe(`UBP property sweep (${CASES} cases, seed ${SEED})`, () => {
  it("holds every invariant across random athletes", () => {
    const rnd = mulberry32(SEED);
    const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
    let checked = 0;

    for (let i = 0; i < CASES; i++) {
      const profile: UbProfile = {
        ageYears: 12 + Math.floor(rnd() * 16),
        trainingAge: pick(AGES),
        growthMode: rnd() < 0.2,
        role: pick(["position", "catcher", "starting_pitcher", "reliever"] as const),
        throwingArmAthlete: rnd() < 0.5,
        phase: pick(PHASES),
        block: pick(BLOCKS),
        bodyWeightLb: 120 + Math.floor(rnd() * 100),
      };
      const history: UbHistory = {
        u1SessionsLast8w: Math.floor(rnd() * 12),
        u2SessionsLast10w: Math.floor(rnd() * 12),
        u2u3SessionsThisWeek: Math.floor(rnd() * 4),
        strictPushUps: rnd() < 0.3 ? undefined : Math.floor(rnd() * 30),
        strictInvertedRows: rnd() < 0.3 ? undefined : Math.floor(rnd() * 25),
        strictPullUps: rnd() < 0.3 ? undefined : Math.floor(rnd() * 15),
        benchEstimatedMaxLb: rnd() < 0.3 ? undefined : Math.floor(rnd() * 300),
        landmineWeeksNoPain: Math.floor(rnd() * 8),
        startDayOffsets: rnd() < 0.4 ? [Math.floor(rnd() * 7) - 3] : [],
        bullpenDayOffsets: rnd() < 0.4 ? [Math.floor(rnd() * 7) - 3] : [],
        highIntentThrowDayOffsets: rnd() < 0.3 ? [0] : [],
        painFlag: rnd() < 0.1,
      };
      const equipment = ALL_EQUIPMENT.filter(() => rnd() < 0.7);
      const m = pick(UB_MOVEMENTS);
      const d = resolveUbMovement(m.slug, profile, history, equipment);
      checked++;

      // I1 never empty
      expect(d.slug).toBeTruthy();
      expect(Number.isFinite(d.contactsCap)).toBe(true);
      // I2 deterministic
      expect(resolveUbMovement(m.slug, profile, history, equipment)).toEqual(d);
      // I3 no U2/U3 in competitive phases
      if (profile.phase === "in_season" || profile.phase === "post_season" || profile.phase === "pre_season") {
        expect(d.tier).toBe("U1");
      }
      // I4 U3 floors
      if (d.tier === "U3") {
        expect(profile.ageYears).toBeGreaterThanOrEqual(16);
        expect(["advanced", "elite", "professional"]).toContain(profile.trainingAge);
        expect(profile.growthMode).toBe(false);
        expect(history.u2SessionsLast10w).toBeGreaterThanOrEqual(6);
        expect(["B4", "B5"]).toContain(profile.block);
      }
      // I5 U2 floors
      if (d.tier === "U2") {
        expect(profile.ageYears).toBeGreaterThanOrEqual(14);
        expect(history.u1SessionsLast8w).toBeGreaterThanOrEqual(6);
        expect(profile.growthMode).toBe(false);
      }
      // I6 growth mode is U1 only
      if (profile.growthMode) expect(d.tier).toBe("U1");
      // I7 weekly cap
      if (history.u2u3SessionsThisWeek >= WEEKLY_U2_U3_SESSION_CAP) expect(d.tier).toBe("U1");
      // I8 starting-pitcher window
      if (profile.throwingArmAthlete && profile.role === "starting_pitcher" &&
          history.startDayOffsets.some((x) => x >= -1 && x <= 1)) {
        expect(d.tier).toBe("U1");
      }
      // I9 dose cap matches the resolved tier
      const row = UB_MOVEMENTS.find((x) => x.slug === d.slug || effectiveSlug(x) === d.slug);
      expect(d.contactsCap).toBe(doseCap(d.tier, row?.letter ?? "Base"));
    }
    expect(checked).toBe(CASES);
  });
});
