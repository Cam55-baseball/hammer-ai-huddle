import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  allocateWindow, buildCreditLedger, planAthlete, stripText, windowWeeksFor, rankNeed, unityViolations, addDays,
  MIN_WEEKS, PHASE_BLOCKS, DISCIPLINES, WHY_PHASE, WHY_BLOCK, WHY_RAMP, WHY_BANNED, GAME_READY_FLOOR,
  type WeekRecord, type AthletePhaseInput, type BuildPhase, type PhaseSegment, type PhaseKey,
} from "../../../supabase/functions/_shared/wic/phases/adaptivePhases";
import { lifeChipDraft, painChipDraft, type EntryDraft } from "@/lib/hammer/tellHammers/parse";
import { findMergeTarget, type TimelineEntry } from "../../../supabase/functions/_shared/wic/schedule/timeline";

const TODAY = "2026-06-01"; // a Monday
const noNeed = { goal: null, openPain: false } as const;
const zero = { P1: 0, P2: 0, P3: 0 };

function weeks(disc: WeekRecord["discipline"], phase: WeekRecord["phase"], n: number, endBefore = TODAY, done = 4, rx = 4): WeekRecord[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.parse(endBefore) - (i + 1) * 7 * 86400000).toISOString().slice(0, 10);
    return { discipline: disc, phase, weekStart: d, sessionsDone: done, sessionsPrescribed: rx };
  });
}
function base(over: Partial<AthletePhaseInput> = {}): AthletePhaseInput {
  return {
    today: TODAY, seasonState: "offseason", lastGameDate: null, hardDate: null, hardDateIsGame: true, yearRound: false,
    offDaysInWindow: 0, holdToday: false, weeksIntoSeason: 0, records: [], need: { ...noNeed }, ...over,
  };
}
const live = (segs: PhaseSegment[]) => segs.filter((s) => s.weeks > 0);

describe("§4 worked example", () => {
  it("pure window maths: P1 banked, 4-week window → 2 wk P2, 2 wk P3 ending sharp", () => {
    const a = allocateWindow({ windowWeeks: 4, hardDateLabel: "play resumes", credit: { P1: 4, P2: 0, P3: 0 }, need: noNeed });
    expect(live(a.segments).map((x) => [x.phase, x.weeks])).toEqual([["P2", 2], ["P3", 2]]);
    expect(live(a.segments)[1].endsWithSharpen).toBe(true);
  });
  it("v1.1: same story end to end — the 7-day ramp comes before the first game back and never overlaps it", () => {
    const records = DISCIPLINES.flatMap((d) => weeks(d, "P1", 4));
    // Played one weekend (last game May 31), next game five weeks later.
    const p = planAthlete(base({ seasonState: "in_season", lastGameDate: "2026-05-31", hardDate: "2026-07-05", records }));
    expect(p.completed).toContain("P1");
    expect(p.ramp!.days).toBeGreaterThanOrEqual(7);
    expect(p.ramp!.end < "2026-07-05").toBe(true);
    expect(live(p.segments).every((s) => s.phase !== "P1")).toBe(true);
    expect(unityViolations(p)).toEqual([]);
  });
});

describe("window cases", () => {
  it("4-week window with nothing banked runs two phases and ends sharp, naming what was cut", () => {
    const a = allocateWindow({ windowWeeks: 4, hardDateLabel: "Jul 1", credit: zero, need: noNeed });
    const s = live(a.segments);
    expect(s.length).toBe(2);
    expect(s[s.length - 1].endsWithSharpen).toBe(true);
    for (const x of a.segments) if (x.shortened) expect(x.shortenedReason).toBeTruthy();
  });
  it("2-week window is Bridge", () => {
    const a = allocateWindow({ windowWeeks: 2, hardDateLabel: "x", credit: zero, need: noNeed });
    expect(a.segments.map((x) => [x.phase, x.weeks])).toEqual([["P1", 1], ["P3", 1]]);
    expect(a.segments.every((x) => x.noNewHeavy)).toBe(true);
  });
  it("W ≥ 7 uses 50/25/25 clamped to 3/2/2", () => {
    expect(allocateWindow({ windowWeeks: 7, hardDateLabel: "x", credit: zero, need: noNeed }).segments.map((x) => x.weeks)).toEqual([3, 2, 2]);
    expect(allocateWindow({ windowWeeks: 12, hardDateLabel: "x", credit: zero, need: noNeed }).segments.map((x) => x.weeks)).toEqual([6, 3, 3]);
  });
  it("4-week offseason before the first game: ramp ≥ 10 days, window gives way with a reason", () => {
    const p = planAthlete(base({ hardDate: addDays(TODAY, 28) }));
    expect(p.ramp!.days).toBeGreaterThanOrEqual(10);
    expect(p.ramp!.days).toBeLessThanOrEqual(14);
    for (const s of p.segments) if (s.shortened) expect(s.shortenedReason).toBeTruthy();
  });
  it("2-week offseason before the first game: the whole time is the ramp, reason shown", () => {
    const p = planAthlete(base({ hardDate: addDays(TODAY, 14) }));
    expect(p.ramp!.days).toBeGreaterThanOrEqual(10);
    expect(p.ramp!.end).toBe(addDays(TODAY, 13));
    expect(p.shortened.length).toBeGreaterThan(0);
  });
  it("year-round athlete rotates three-week micro-phases inside P4", () => {
    const e = [0, 3, 6, 9].map((w) => planAthlete(base({ seasonState: "in_season", yearRound: true, weeksIntoSeason: w })));
    expect(e.every((p) => p.phase === "P4")).toBe(true);
    expect(e.map((p) => p.emphasis)).toEqual(["strength", "speed", "sharpen", "strength"]);
  });
  it("mid-season injury hold keeps P4 for everyone, flags the hold, loses no credit", () => {
    const records = weeks("lifting", "P2", 3);
    const before = planAthlete(base({ seasonState: "in_season", records }));
    const held = planAthlete(base({ seasonState: "in_season", records, holds: [{ discipline: "throwing", reason: "Shoulder reported" }] }));
    expect(held.disciplines.every((d) => d.phase === "P4")).toBe(true);
    expect(held.disciplines.find((d) => d.discipline === "throwing")!.hold!.reason).toMatch(/Shoulder/);
    expect(held.credit).toEqual(before.credit);
  });
  it("no dates at all → safe maintenance with the floor, never a heavy block (v1.1 §D)", () => {
    const p = planAthlete(base());
    expect(p.mode).toBe("maintenance");
    expect(p.phase).toBe("P4");
    expect(p.noNewHeavy).toBe(true);
    expect(p.gameReadyFloor).toEqual(GAME_READY_FLOOR);
    expect(p.schedule.askNextGame).toBe(true);
    expect(stripText(p)).not.toMatch(/B\d/);
  });
  it("holds shrink the window", () => {
    expect(windowWeeksFor(TODAY, "2026-07-13", 0)).toBe(6);
    expect(windowWeeksFor(TODAY, "2026-07-13", 14)).toBe(4);
  });
});

describe("credit ledger", () => {
  it("weights by adherence, capped at 1", () => {
    const l = buildCreditLedger([...weeks("speed", "P1", 2, TODAY, 2, 4), ...weeks("speed", "P2", 1, TODAY, 9, 4)], TODAY);
    expect(l.speed.P1).toBe(1);
    expect(l.speed.P2).toBe(1);
  });
  it("halves after eight idle weeks", () => {
    expect(buildCreditLedger(weeks("lifting", "P1", 4, "2026-03-01"), TODAY).lifting.P1).toBe(2);
    expect(buildCreditLedger(weeks("lifting", "P1", 4), TODAY).lifting.P1).toBe(4);
  });
  it("credit survives ten schedule changes in a row", () => {
    const records = [...weeks("lifting", "P1", 3), ...weeks("lifting", "P2", 1)];
    const hardDates = ["2026-06-20", null, "2026-09-01", "2026-06-08", "2026-07-15", null, "2026-06-03", "2026-12-01", "2026-06-29", "2026-08-10"];
    const first = planAthlete(base({ records })).credit;
    hardDates.forEach((h, i) => {
      const p = planAthlete(base({ records, hardDate: h, offDaysInWindow: i, seasonState: i === 5 ? "in_season" : "offseason" }));
      expect(p.credit).toEqual(first);
      expect(p.completed).toContain("P1");
    });
  });
  it("a phase past its minimum is never restarted", () => {
    for (let w = 4; w <= 30; w++) {
      const a = allocateWindow({ windowWeeks: w, hardDateLabel: "x", credit: { P1: MIN_WEEKS.P1, P2: 0, P3: 0 }, need: { goal: "stay_healthy", openPain: true } });
      expect(live(a.segments).some((s) => s.phase === "P1")).toBe(false);
    }
  });
});

describe("priority need (§5)", () => {
  it("open pain → P1, then goal, then least credit", () => {
    expect(rankNeed({ goal: "get_faster", openPain: true }, zero)[0]).toBe("P1");
    expect(rankNeed({ goal: "get_faster", openPain: false }, zero)[0]).toBe("P3");
    expect(rankNeed({ goal: null, openPain: false }, { P1: 3, P2: 1, P3: 0 })[0]).toBe("P3");
  });
});

// ------------------------------------------------------------------ v1.1 §G
describe("v1.1 §G", () => {
  it("weekend-only athlete never gets an offseason block; mid-week is in-season", () => {
    for (let dow = 0; dow < 7; dow++) {
      const today = addDays(TODAY, dow); // Mon..Sun
      const lastSun = addDays(TODAY, -1);
      const nextSat = addDays(TODAY, 5 + (dow >= 6 ? 7 : 0));
      const p = planAthlete(base({ today, seasonState: "offseason", lastGameDate: dow === 6 ? addDays(TODAY, 6) : lastSun, hardDate: dow === 6 ? addDays(TODAY, 12) : nextSat }));
      expect(p.seasonState).toBe("in_season");
      expect(p.phase).toBe("P4");
      expect(p.ramp).toBeNull();
      expect(p.segments.every((s) => s.phase === "P4")).toBe(true);
      expect(p.gameReadyFloor).toEqual(GAME_READY_FLOOR);
    }
  });
  it("three-week postponement → mini block + ≥5-day ramp that never overlaps the game", () => {
    const last = addDays(TODAY, -1), next = addDays(last, 21);
    const p = planAthlete(base({ seasonState: "in_season", lastGameDate: last, hardDate: next }));
    expect(p.mode).toBe("mini_block");
    expect(p.seasonState).toBe("in_season");
    expect(["P2", "P3"]).toContain(p.phase);
    expect(live(p.segments).find((s) => s.phase !== "P4")!.weeks).toBe(2);
    expect(p.ramp!.days).toBeGreaterThanOrEqual(5);
    expect(p.ramp!.end < next).toBe(true);
    expect(p.ramp!.steps.map((s) => s.step)).toEqual(["elastic_primers", "max_velocity", "sport_speed", "game_ready_day"]);
    // Walk every day: the ramp is present and never on the game day.
    for (let d = 0; d < 20; d++) {
      const q = planAthlete(base({ today: addDays(TODAY, d), seasonState: "in_season", lastGameDate: last, hardDate: next }));
      expect(q.ramp!.days).toBeGreaterThanOrEqual(Math.min(5, 20 - d));
      expect(q.ramp!.end < next).toBe(true);
    }
  });
  it("six-week shutdown → full short arc + 10–14 day ramp", () => {
    const last = addDays(TODAY, -1), next = addDays(last, 42);
    const p = planAthlete(base({ seasonState: "in_season", lastGameDate: last, hardDate: next }));
    expect(p.mode).toBe("short_arc");
    expect(live(p.segments).map((s) => s.phase)).toEqual(["P1", "P2", "P3"]);
    expect(p.ramp!.days).toBeGreaterThanOrEqual(10);
    expect(p.ramp!.days).toBeLessThanOrEqual(14);
    expect(p.ramp!.end < next).toBe(true);
  });
  it('"not sure" keeps in-season maintenance with the game-ready floor, no heavy block', () => {
    for (const s of ["offseason", "preseason", "post_season"] as const) {
      const p = planAthlete(base({ seasonState: s, scheduleAnswer: "not_sure", records: DISCIPLINES.flatMap((d) => weeks(d, "P1", 1)) }));
      expect(p.phase).toBe("P4");
      expect(p.mode).toBe("maintenance");
      expect(p.noNewHeavy).toBe(true);
      expect(p.gameReadyFloor).toEqual(GAME_READY_FLOOR);
      expect(p.schedule.askNextGame).toBe(true);
    }
    const guess = planAthlete(base({ scheduleAnswer: "month_plus" }));
    expect(guess.schedule.estimated).toBe(true);
    for (const x of guess.segments) if (x.phase !== "P4") expect(x.noNewHeavy).toBe(true);
  });
  it("unity: disciplines never split across phases; a hold is flagged, never a different phase", () => {
    const p = planAthlete(base({ seasonState: "in_season", holds: [{ discipline: "speed", reason: "Knee reported" }] }));
    expect(unityViolations(p)).toEqual([]);
    expect(new Set(p.disciplines.map((d) => d.phase)).size).toBe(1);
    const broken = { ...p, disciplines: p.disciplines.map((d, i) => (i === 1 ? { ...d, phase: "P1" as PhaseKey } : d)) };
    expect(unityViolations(broken).length).toBeGreaterThan(0);
  });
  it("every phase and block has a why, with no medical or proven-science claim", () => {
    const all = [WHY_RAMP, ...Object.values(WHY_PHASE), ...Object.values(WHY_BLOCK).flatMap((r) => Object.values(r))];
    expect(all.length).toBe(1 + 4 + 16);
    for (const t of all) {
      expect(t.length).toBeGreaterThan(20);
      expect(t).not.toMatch(WHY_BANNED);
      expect(t.split(/[.!?](\s|$)/).filter((x) => x && x.trim().length > 2).length).toBeLessThanOrEqual(3);
    }
    expect(WHY_BANNED.test("This is proven by science")).toBe(true);
    const p = planAthlete(base({ hardDate: addDays(TODAY, 70) }));
    expect(p.why).toBeTruthy();
    for (const d of p.disciplines) expect(d.why).toBe(WHY_BLOCK[p.phase][d.discipline]);
  });
  it("check-in chips create the same entries as the inbox, with no duplicates", () => {
    const today = TODAY;
    // Inbox buttons: Just today break/travel, This week cancelled, Back to normal, pain region+face.
    const inbox: EntryDraft[] = [
      { tag: "HOLD", start_date: today, end_date: today, dates: null, payload: { reason: "travel" } },
      { tag: "HOLD", start_date: today, end_date: today, dates: null, payload: { reason: "break" } },
      { tag: "CANCELLED", start_date: today, end_date: addDays(today, 6), dates: null, payload: {} },
      { tag: "RESUME", start_date: today, end_date: today, dates: null, payload: {} },
    ];
    const chips = (["travel", "break", "cancelled", "resume"] as const).map((c) => lifeChipDraft(c, today));
    expect(chips).toEqual(inbox);
    expect(painChipDraft(today, { key: "knee", label: "Knee" }, "lot").payload).toEqual({ region: "knee", regionLabel: "Knee", face: "lot", faceLabel: expect.any(String) });
    // Dedupe: a chip after the same inbox entry merges into it.
    const saved: TimelineEntry[] = [];
    const store = (d: EntryDraft) => {
      const hit = findMergeTarget(saved, { ...d, source: "inbox" });
      if (!hit) saved.push({ ...d, id: String(saved.length), source: "inbox", summary: "", created_at: new Date().toISOString(), undone_at: null } as TimelineEntry);
    };
    inbox.forEach(store);
    chips.forEach(store);
    chips.forEach(store);
    expect(saved.length).toBe(3); // two HOLDs on the same day merge, like the database rule
  });
});

describe("laws", () => {
  it("phases only name existing blocks and never carry a dose", () => {
    const p = planAthlete(base({ hardDate: "2026-09-01" }));
    for (const s of p.segments) {
      expect(PHASE_BLOCKS[s.phase]).toBeTruthy();
      for (const k of Object.keys(s)) expect(k).not.toMatch(/sets|reps|load|dose|intensity|age/i);
    }
  });
  it("switch off is byte-identical: the card builder only reads the phase plan behind the adaptive_phases switch, and only as a label", () => {
    const gen = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");
    expect(gen).not.toMatch(/adaptivePhases/);
    const reads = [...gen.matchAll(/adaptive_phase_shadow/g)].length;
    expect(reads).toBe(1);
    const i = gen.indexOf("adaptive_phase_shadow");
    const block = gen.slice(gen.lastIndexOf("if (isSwitchOnFor(", i), gen.indexOf("let contextValidationOutcome", i));
    expect(block).toMatch(/feature_key === "adaptive_phases"/);
    expect(block).not.toMatch(/\b(sets|reps|load|dose|movement_slug|intensity)\b/);
    const shadow = readFileSync("supabase/functions/adaptive-phases-shadow/index.ts", "utf8");
    const writes = [...shadow.matchAll(/from\("([a-z_]+)"\)\.(upsert|insert|update|delete)/g)].map((m) => m[1]);
    expect(new Set(writes)).toEqual(new Set(["adaptive_phase_credit", "adaptive_phase_shadow", "phase_insights"]));
  });
});

describe("simulated-season sweep", () => {
  it("holds every v1 and v1.1 invariant across 5,000 random athlete-days", () => {
    let seed = 20260924;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const goals = [null, "throw_harder", "get_faster", "hit_harder", "stay_healthy"] as const;
    const states = ["offseason", "preseason", "in_season", "post_season"] as const;
    const answers = [null, "this_week", "2_3_weeks", "month_plus", "not_sure"] as const;
    for (let i = 0; i < 5000; i++) {
      const records: WeekRecord[] = [];
      for (const d of DISCIPLINES) for (const ph of ["P1", "P2", "P3", "P4"] as const) {
        records.push(...weeks(d, ph, Math.floor(rnd() * 5), addDays(TODAY, -Math.floor(rnd() * 120)), Math.floor(rnd() * 5), 4));
      }
      const hard = rnd() > 0.2 ? addDays(TODAY, Math.floor(rnd() * 200)) : null;
      const last = rnd() > 0.4 ? addDays(TODAY, -Math.floor(rnd() * 60)) : null;
      const inp = base({
        records, hardDate: hard, lastGameDate: last, seasonState: states[Math.floor(rnd() * 4)],
        yearRound: rnd() < 0.5, offDaysInWindow: Math.floor(rnd() * 10), holdToday: rnd() < 0.1,
        holds: rnd() < 0.2 ? [{ discipline: DISCIPLINES[Math.floor(rnd() * 4)], reason: "Pain reported" }] : [],
        weeksIntoSeason: Math.floor(rnd() * 30), scheduleAnswer: answers[Math.floor(rnd() * 5)],
        need: { goal: goals[Math.floor(rnd() * 5)], openPain: rnd() < 0.2 },
      });
      const p = planAthlete(inp);
      expect(p.phase).toBeTruthy();
      expect(unityViolations(p)).toEqual([]);
      if (p.ramp && p.hardDate) {
        expect(p.ramp.end < p.hardDate).toBe(true); // never overlaps the game
        if (!p.ramp.calendarShortReason) expect(p.ramp.days).toBeGreaterThanOrEqual(p.ramp.minDays);
      }
      // A gap of ≤ 14 days between games never produces a build block.
      if (last && hard && inp.hardDateIsGame && (Date.parse(hard) - Date.parse(last)) / 86400000 <= 14) {
        expect(p.segments.every((s) => s.phase === "P4")).toBe(true);
        expect(p.seasonState).toBe("in_season");
      }
      if (!p.hardDate) expect(p.noNewHeavy || p.seasonState === "in_season").toBe(true);
      if (p.seasonState === "in_season" || p.ramp?.activeToday) expect(p.gameReadyFloor).toEqual(GAME_READY_FLOOR);
      // v1.2 §C splits a phase into blocks (Absorb + Capacity): the minimum applies to the phase total.
      for (const ph of ["P1", "P2", "P3"] as BuildPhase[]) {
        const segsP = p.segments.filter((s) => s.phase === ph);
        const tot = segsP.reduce((a, s) => a + s.weeks, 0);
        const rem = Math.max(0, Math.ceil(MIN_WEEKS[ph] - p.credit[ph] - 1e-9));
        if (segsP.length && tot < rem && p.mode !== "bridge" && !segsP.some((s) => s.shortenedReason)) throw new Error(JSON.stringify({ inp: { ...inp, records: undefined }, mode: p.mode, arc: p.arc, segs: p.segments, credit: p.credit }));
      }
    }
  }, 60_000);
});
