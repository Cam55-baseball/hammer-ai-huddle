// Owner Oct 28 additions: Mind placement, running 14-day readiness, conditioning floor.
import { describe, expect, it } from "vitest";
import { dailyMindItem, mindPlacement } from "./weeklyVolume";
import { runningReadiness, readinessLine, loadRatio } from "../../../../supabase/functions/_shared/readiness/runningReadiness";
import {
  conditioningFloorDue, floorConditioningSlugs, isRunningConditioning, CONDITIONING_WEEKLY_MINIMUM,
} from "../../../../supabase/functions/_shared/wic/conditioning/weeklyFloor";
import { selectConditioning } from "../../../../supabase/functions/_shared/wic/conditioning/selectConditioning";

const iso = (base: string, n: number) => new Date(new Date(`${base}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

describe("Mind item placement", () => {
  it("study items go Before you start; reflection items are last in recovery; rest days the same", () => {
    expect(mindPlacement("film_study")).toBe("before_you_start");
    expect(mindPlacement("situations")).toBe("before_you_start");
    expect(mindPlacement("tex_vision")).toBe("before_you_start");
    expect(mindPlacement("breathing")).toBe("recovery_last");
    expect(mindPlacement("journaling")).toBe("recovery_last");
    for (let d = 0; d < 56; d++) { // every day incl. Sundays still has exactly one placed item
      const k = dailyMindItem(d, d % 2 === 0).kind;
      expect(["before_you_start", "recovery_last"]).toContain(mindPlacement(k));
    }
  });
});

describe("running readiness (14 days)", () => {
  const today = "2026-06-10";
  const base = { today, workUnitsByDate: {}, prescribedPast14: 0, completedPast14: 0 };
  it("no history → no score, plan stays normal", () => {
    const r = runningReadiness({ ...base, checkins: [] });
    expect(r.score).toBeNull();
    expect(readinessLine(r)).toContain("not enough");
  });
  it("a good today check-in does not erase a worn-down two weeks", () => {
    const checkins = Array.from({ length: 13 }, (_, i) => ({ date: iso(today, -(i + 1)), bodyReadiness: 1, hoursSlept: 5, sorenessAreas: 3 }));
    const r = runningReadiness({ ...base, checkins: [...checkins, { date: today, readiness10: 9 }] });
    expect(r.band).toBe("low");
    expect(readinessLine(r)).toMatch(/^Readiness from your last 14 days: Take it lighter/);
  });
  it("load spike lowers readiness; steady load does not", () => {
    const units: Record<string, number> = {};
    for (let d = 7; d < 28; d++) units[iso(today, -d)] = 2;
    for (let d = 0; d < 7; d++) units[iso(today, -d)] = 6;
    expect(loadRatio(today, units)).toBeCloseTo(3, 1);
    const spike = runningReadiness({ ...base, checkins: [], workUnitsByDate: units });
    expect(spike.band).toBe("low");
    for (let d = 0; d < 7; d++) units[iso(today, -d)] = 2;
    expect(runningReadiness({ ...base, checkins: [], workUnitsByDate: units }).band).not.toBe("low");
  });
  it("skipped work counts; recent pain always caps at low", () => {
    const good = Array.from({ length: 10 }, (_, i) => ({ date: iso(today, -i), bodyReadiness: 5, hoursSlept: 8.5, sorenessAreas: 0 }));
    expect(runningReadiness({ ...base, checkins: good, prescribedPast14: 20, completedPast14: 20 }).band).toBe("high");
    const skipped = runningReadiness({ ...base, checkins: good, prescribedPast14: 20, completedPast14: 2 });
    expect(skipped.reasons.join(" ")).toContain("18 planned items not logged");
    const pain = runningReadiness({ ...base, checkins: [...good, { date: today, painScale: 6, painAreas: 1 }] });
    expect(pain.band).toBe("low");
    expect(pain.painFlag).toBe(true);
  });
  it("a game within a day never reads as push", () => {
    const good = Array.from({ length: 10 }, (_, i) => ({ date: iso(today, -i), bodyReadiness: 5, hoursSlept: 9, sorenessAreas: 0 }));
    expect(runningReadiness({ ...base, checkins: good, gameWithinOneDay: true }).band).toBe("normal");
  });
});

describe("conditioning floor — 8 weeks, every player type, both sports", () => {
  // Worst case: the normal conditioning path builds NOTHING running all week (every day
  // suppressed / travel / post-start flush). The floor alone must still reach 2, never Sunday.
  for (const sport of ["baseball", "softball"] as const)
    for (const isPitcher of [false, true])
      for (const lowEveryOtherDay of [false, true]) {
        it(`${sport} ${isPitcher ? "pitcher" : "position"}${lowEveryOtherDay ? " (low readiness days)" : ""}: ≥2 running sessions/week, never Sunday`, () => {
          const start = "2026-06-01"; // Monday
          const ran: string[] = [];
          for (let w = 0; w < 8; w++) {
            let weekCount = 0;
            for (let d = 0; d < 7; d++) {
              const date = iso(start, w * 7 + d);
              const due = conditioningFloorDue({ planDate: date, priorRunningDates: ran });
              const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
              if (dow === 0) { expect(due.due).toBe(false); continue; }
              if (due.due) {
                const low = lowEveryOtherDay && d % 2 === 0;
                const slugs = floorConditioningSlugs({ sport, isPitcher, lowReadiness: low });
                expect(isRunningConditioning(slugs)).toBe(true);
                if (low) expect(slugs).toEqual(["rc_easy_flush"]);
                else if (!isPitcher) expect(slugs[0]).toBe(sport === "baseball" ? "bases_home_2nd" : "bases_double_sb");
                ran.push(date); weekCount++;
              }
            }
            expect(weekCount).toBe(CONDITIONING_WEEKLY_MINIMUM);
          }
        });
      }

  it("normal weeks: when regular conditioning already ran twice, the floor adds nothing", () => {
    const ran = ["2026-06-01", "2026-06-03"];
    for (let d = 3; d < 6; d++) expect(conditioningFloorDue({ planDate: iso("2026-06-01", d), priorRunningDates: ran }).due).toBe(false);
  });

  it("walks, breathing and travel resets never count as running conditioning", () => {
    const travel = selectConditioning({ sport: "baseball", position: "SS", phase: "off" as never, isTournamentDay: false, hoursToNearestGame: null,
      pitcherStartedYesterday: false, isPitcher: false, pitcherStartsTomorrow: false, relieverAvailableSoon: false, isTravelDay: true,
      outingSource: "none", returningAfterGap: false, dialDownReasons: [] } as never);
    expect(isRunningConditioning(travel.slugs)).toBe(false);
  });
});
