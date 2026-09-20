// Tissue Cost Scheduler — golden scenarios (spec §7).
// Expected outputs are written down here BEFORE the run. A golden failure is
// reported, never "fixed" by moving a floor, hard rule or threshold.

import { describe, expect, it } from "vitest";
import { addDays, decide, TCS_CONFIG } from "./harness.ts";
import { TCS_CONFIG_V12 } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/config.ts";
import type {
  CheckIn,
  DaySchedule,
  Profile,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/types.ts";

const TZ = "America/Chicago";

function run(
  profile: Profile,
  days: DaySchedule[],
  today: string,
  checkIns: CheckIn[] = [],
) {
  const history = days.filter((d) => d.date < today);
  const calendar = days.filter((d) => d.date >= today);
  return decide(profile, history, calendar, checkIns, TCS_CONFIG, today, TZ);
}

const ADV17: Profile = {
  age: 17,
  growthMode: false,
  trainingAgeBand: "advanced",
  position: "position",
  phase: "offseason",
  isStartingPitcher: false,
};

const practice = (date: string, min = 60): DaySchedule => ({
  date,
  practiceMinutes: min,
  practiceIntensity: "moderate",
});
const game = (date: string, extra: Partial<DaySchedule["games"]> = {}): DaySchedule => ({
  date,
  games: { role: "position", count: 1, ...extra },
});

describe("TCS goldens — reference cases (owner law, I6)", () => {
  it("REF-OFF: offseason, practice Mon–Thu, H lift Mon → next H allowed Friday (3 full rest days)", () => {
    const days = [
      { ...practice("2026-01-05"), lift: { class: "H" as const, method: "standard" as const } },
      practice("2026-01-06"),
      practice("2026-01-07"),
      practice("2026-01-08"),
    ];
    expect(run(ADV17, days, "2026-01-09").allowedClass).toBe("H"); // Friday
    expect(run(ADV17, days.slice(0, 3), "2026-01-08").allowedClass).not.toBe("H"); // Thursday
    expect(run(ADV17, days, "2026-01-09").timing).toBe("after_skill_work");
  });

  it("REF-IN: daily games, H lift post-game Day 1 → next lift Day 4 post-game (2 full rest days)", () => {
    const days = [
      { ...game("2026-05-04"), lift: { class: "H" as const, method: "standard" as const } },
      game("2026-05-05"),
      game("2026-05-06"),
      game("2026-05-07"),
    ];
    const p = { ...ADV17, phase: "in_season" as const };
    const d = run(p, days, "2026-05-07");
    expect(d.allowedClass).toBe("H");
    expect(d.timing).toBe("post_game");
    expect(run(p, days.slice(0, 3), "2026-05-06").allowedClass).toBe("none"); // Day 3 — floor
  });

  it("REF-M: M lift Mon → next lift 2 full rest days later (Thursday)", () => {
    const days = [
      { ...practice("2026-01-05"), lift: { class: "M" as const } },
      practice("2026-01-06"),
      practice("2026-01-07"),
      practice("2026-01-08"),
    ];
    expect(run(ADV17, days.slice(0, 3), "2026-01-07").allowedClass).toBe("none"); // Wed — floor
    // Step 6 decision 2: M -> H now needs 3 full rest days, so Thursday is M and
    // heavy cannot land before Friday.
    expect(run(ADV17, days, "2026-01-08").allowedClass).toBe("M"); // Thu
    expect(
      run(ADV17, [...days, practice("2026-01-09")], "2026-01-09").allowedClass,
    ).toBe("H"); // Fri — 3 full rest days
  });

  it("REF-L: L lift Mon → next lift 2 full rest days later (Thursday)", () => {
    const days = [
      { ...practice("2026-01-05"), lift: { class: "L" as const } },
      practice("2026-01-06"),
      practice("2026-01-07"),
      practice("2026-01-08"),
    ];
    expect(run(ADV17, days.slice(0, 3), "2026-01-07").allowedClass).toBe("none");
    // OPEN CONFLICT (Step 6 decision 2): the floor table says "previous L ->
    // next anything: 2", which clears H on Thursday; the golden text for the
    // same decision says Thursday should be M unless the previous loaded lift
    // is >= 3 full rest days back. The table is implemented as written and the
    // conflict is reported to the owner — NOT tuned away.
    expect(run(ADV17, days, "2026-01-08").allowedClass).toBe("H");
  });
});

describe("TCS goldens — schedule shapes", () => {
  // v1.2 §A, made precise: REF-OFF (60-min moderate practice every day Mon–Fri,
  // H lift Monday after practice) plus ONE extra 90-min high-intensity practice
  // on Wednesday → next H Saturday (4 rest days).
  const heavyWeek = () => [
    { ...practice("2026-01-05"), lift: { class: "H" as const, method: "standard" as const } },
    practice("2026-01-06"),
    { ...practice("2026-01-07", 90), practiceIntensity: "high" as const },
    practice("2026-01-08"),
    practice("2026-01-09"),
  ];

  it("SPEC GOLDEN (v1.2 §A): offseason heavy week with one extra practice → 4 rest days", () => {
    const d = run(ADV17, heavyWeek(), "2026-01-09");
    expect(d.allowedClass).not.toBe("H"); // Friday is still too early
    expect(d.nextHeavyDate).toBe("2026-01-10"); // Saturday
  });

  it("v1.2 §A: the same heavy week resolves identically with baseline subtraction on", () => {
    const days = heavyWeek();
    const d = decide(
      ADV17,
      days.filter((x) => x.date < "2026-01-09"),
      days.filter((x) => x.date >= "2026-01-09"),
      [],
      TCS_CONFIG_V12,
      "2026-01-09",
      TZ,
    );
    expect(d.nextHeavyDate).toBe("2026-01-10");
  });

  it("MLB 6-game week: post-game lift clears on Day 4", () => {
    const p = { ...ADV17, phase: "in_season" as const, trainingAgeBand: "professional" as const, age: 24 };
    const days = [
      { ...game("2026-06-01"), lift: { class: "H" as const, method: "standard" as const } },
      game("2026-06-02"),
      game("2026-06-03"),
      game("2026-06-04"),
      game("2026-06-05"),
      game("2026-06-06"),
    ];
    expect(run(p, days.slice(0, 3), "2026-06-03").allowedClass).toBe("none");
    const d = run(p, days, "2026-06-04");
    expect(d.allowedClass).not.toBe("none");
    expect(d.timing).toBe("post_game");
  });

  it("high-school spring, 3 games a week: lift returns after the 2-day floor", () => {
    const p = { ...ADV17, phase: "in_season" as const, age: 16 };
    const days = [
      { date: "2026-04-06", practiceMinutes: 90, lift: { class: "M" as const } },
      game("2026-04-07"),
      { date: "2026-04-08", practiceMinutes: 90 },
      game("2026-04-09"),
      { date: "2026-04-10", practiceMinutes: 90 },
      game("2026-04-11"),
    ];
    expect(run(p, days.slice(0, 2), "2026-04-07").allowedClass).toBe("none");
    const d = run(p, days, "2026-04-09");
    expect(d.allowedClass).not.toBe("none");
    expect(d.timing).toBe("post_game");
  });

  it("travel-ball tournament weekend: no lift on tournament days", () => {
    const p = { ...ADV17, phase: "in_season" as const };
    const days = [
      game("2026-07-10", { tournament: true }),
      game("2026-07-11", { tournament: true, count: 2 }),
      game("2026-07-12", { tournament: true }),
    ];
    for (const d of days) {
      expect(run(p, days, d.date).allowedClass).toBe("none");
    }
    expect(run(p, days, "2026-07-11").reasons.join(" ")).toMatch(/Tournament|Doubleheader/);
  });

  it("doubleheader: no lift", () => {
    const p = { ...ADV17, phase: "in_season" as const };
    const days = [game("2026-05-16", { doubleheader: true, count: 2 })];
    expect(run(p, days, "2026-05-16").allowedClass).toBe("none");
  });

  it("starting pitcher on a 5-day rotation: no lift on start day, none the day before", () => {
    const p = {
      ...ADV17,
      phase: "in_season" as const,
      position: "starting_pitcher" as const,
      isStartingPitcher: true,
    };
    const days: DaySchedule[] = [];
    for (let i = 0; i < 12; i++) {
      const date = addDays("2026-05-01", i);
      days.push(
        i % 5 === 0
          ? { ...game(date), games: { role: "starting_pitcher", count: 1 }, pitcherStartDay: true }
          : { date, practiceMinutes: 45 },
      );
    }
    expect(run(p, days, "2026-05-06").allowedClass).toBe("none"); // start day
    expect(run(p, days, "2026-05-05").allowedClass).toBe("none"); // day before a start
    expect(run(p, days, "2026-05-02").allowedClass).not.toBe("none"); // day after a start
  });

  it("reliever pitching back-to-back is not blocked by starting-pitcher rules", () => {
    const p = { ...ADV17, phase: "in_season" as const, position: "position" as const, isStartingPitcher: false };
    const days = [
      { ...game("2026-05-01"), maxIntentThrows: 20 },
      { ...game("2026-05-02"), maxIntentThrows: 25 },
      game("2026-05-03"),
      game("2026-05-04"),
    ];
    expect(run(p, days, "2026-05-04").allowedClass).not.toBe("none");
  });

  it("catcher never gets the heavy day earlier than a position player on the same schedule", () => {
    const build = (role: "position" | "catcher") => {
      const days: DaySchedule[] = [];
      for (let i = 0; i < 8; i++) {
        const date = addDays("2026-05-01", i);
        days.push({ date, games: { role, count: 1 } });
      }
      days[0] = { ...days[0], lift: { class: "H", method: "standard" } };
      return days;
    };
    const p = { ...ADV17, phase: "in_season" as const };
    const pos = run({ ...p, position: "position" }, build("position"), "2026-05-04");
    const cat = run({ ...p, position: "catcher" }, build("catcher"), "2026-05-04");
    const rank = { none: 0, L: 1, M: 2, H: 3 } as const;
    expect(rank[cat.allowedClass]).toBeLessThanOrEqual(rank[pos.allowedClass]);
  });

  it("13-year-old in Growth Mode never gets the heavy day earlier than a 17-year-old", () => {
    const days = [
      { ...practice("2026-01-05"), lift: { class: "H" as const, method: "standard" as const } },
      practice("2026-01-06"),
      practice("2026-01-07"),
      practice("2026-01-08"),
    ];
    const young = run(
      { ...ADV17, age: 13, growthMode: true, trainingAgeBand: "beginner" },
      days,
      "2026-01-09",
    );
    const older = run(ADV17, days, "2026-01-09");
    const rank = { none: 0, L: 1, M: 2, H: 3 } as const;
    expect(rank[young.allowedClass]).toBeLessThanOrEqual(rank[older.allowedClass]);
  });

  it("athlete who never logs: the prescribed lift still counts as done", () => {
    const days = [
      { date: "2026-01-05", lift: { class: "H" as const, method: "standard" as const } },
      { date: "2026-01-06" },
    ];
    expect(run(ADV17, days, "2026-01-06").allowedClass).toBe("none");
    // marked skipped → it never stacks
    const skipped = [
      { date: "2026-01-05", lift: { class: "H" as const, method: "standard" as const, skipped: true } },
      { date: "2026-01-06" },
    ];
    expect(run(ADV17, skipped, "2026-01-06").allowedClass).toBe("H");
  });

  it("no inputs at all: class M max, never H", () => {
    const d = run(ADV17, [], "2026-01-09");
    expect(d.allowedClass).toBe("M");
    expect(d.diagnostics).toContain("no_inputs_safe_default");
  });

  // v1.2 §B1.5 on-ramp. Before Step 5 this golden expected H straight away,
  // which contradicted the on-ramp rule; the rule wins, the golden moves.
  it("return after 21 days off: class is capped at M for the on-ramp", () => {
    const days = [{ date: "2026-01-05", lift: { class: "H" as const, method: "standard" as const } }];
    const d = run(ADV17, days, "2026-01-26");
    expect(d.allowedClass).toBe("M");
    expect(d.onRampUntil).toBe("2026-02-09"); // 14 days, gap was 21
    expect(d.reasons).toContain("Easing back in after time off.");
    expect(d.nextHeavyDate).toBe(null); // no heavy inside the 10-day horizon
  });

  it("return after 40 days off: the on-ramp runs 28 days", () => {
    const days = [{ date: "2026-01-05", lift: { class: "H" as const, method: "standard" as const } }];
    const d = run(ADV17, days, "2026-02-14");
    expect(d.allowedClass).toBe("M");
    expect(d.onRampUntil).toBe("2026-03-14");
  });

  it("on-ramp keeps running after the first lift back", () => {
    const days = [
      { date: "2026-01-05", lift: { class: "H" as const, method: "standard" as const } },
      { date: "2026-01-26", lift: { class: "M" as const, method: "standard" as const } },
    ];
    const d = run(ADV17, days, "2026-02-02");
    expect(d.onRampUntil).toBe("2026-02-09");
    expect(d.allowedClass).not.toBe("H");
    // and it ends
    const after = run(ADV17, days.concat([{ date: "2026-02-02", lift: { class: "M" as const, method: "standard" as const } }]), "2026-02-13");
    expect(after.onRampUntil).toBe(null);
  });

  it("missing check-ins behave exactly like neutral check-ins", () => {
    const days = [
      { ...practice("2026-01-05"), lift: { class: "H" as const, method: "standard" as const } },
      practice("2026-01-06"),
      practice("2026-01-07"),
      practice("2026-01-08"),
    ];
    const withNone = run(ADV17, days, "2026-01-09", []);
    const neutral = run(ADV17, days, "2026-01-09", [
      { date: "2026-01-09", poorSleep: false, highSoreness: false, pain: [] },
    ]);
    expect(neutral.allowedClass).toBe(withNone.allowedClass);
    expect(neutral.nextHeavyDate).toBe(withNone.nextHeavyDate);
    expect(neutral.tankLevels).toEqual(withNone.tankLevels);
  });

  it("cross-time-zone travel: the same local dates give the same decision", () => {
    const days = [
      { ...practice("2026-03-06"), lift: { class: "H" as const, method: "standard" as const } },
      { ...practice("2026-03-07"), travel: true },
      practice("2026-03-08"), // US DST change
      practice("2026-03-09"),
    ];
    const history = days.filter((d) => d.date < "2026-03-10");
    const a = decide(ADV17, history, [], [], TCS_CONFIG, "2026-03-10", "America/Chicago");
    const b = decide(ADV17, history, [], [], TCS_CONFIG, "2026-03-10", "Australia/Sydney");
    expect(b.allowedClass).toBe(a.allowedClass);
    expect(b.nextHeavyDate).toBe(a.nextHeavyDate);
  });
});
