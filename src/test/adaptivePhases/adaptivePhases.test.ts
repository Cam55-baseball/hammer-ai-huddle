import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  allocateWindow, buildCreditLedger, planAthlete, stripText, windowWeeksFor, rankNeed,
  MIN_WEEKS, PHASE_BLOCKS, DISCIPLINES, type WeekRecord, type AthletePhaseInput, type BuildPhase,
} from "../../../supabase/functions/_shared/wic/phases/adaptivePhases";

const TODAY = "2026-06-01";
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
    today: TODAY, hardDate: null, inSeason: false, yearRound: false, nextGameGapDays: null,
    offDaysInWindow: 0, holdToday: false, weeksIntoSeason: 0, records: [], need: { ...noNeed }, ...over,
  };
}
const live = (segs: { weeks: number }[]) => segs.filter((s) => s.weeks > 0);

describe("§4 worked example", () => {
  it("summer ball cancelled, P1 banked → 2 wk P2, 2 wk P3 ending with a sharpening week", () => {
    const records = DISCIPLINES.flatMap((d) => weeks(d, "P1", 4));
    // Expected three months of ball; one weekend played; four weeks cancelled → hard date 4 weeks out.
    const p = planAthlete(base({ hardDate: "2026-06-29", hardDateLabel: "play resumes", records }));
    expect(p.windowWeeks).toBe(4);
    for (const d of p.disciplines) {
      expect(d.completed).toContain("P1");
      const s = live(d.segments);
      expect(s.map((x) => [x.phase, x.weeks])).toEqual([["P2", 2], ["P3", 2]]);
      expect(s[1].endsWithSharpen).toBe(true);
      expect(d.next).toBe("P3");
    }
  });
});

describe("window cases", () => {
  it("4-week offseason with nothing banked runs two phases and ends sharp, naming what was cut", () => {
    const a = allocateWindow({ windowWeeks: 4, hardDateLabel: "Jul 1", credit: zero, need: noNeed });
    expect(a.mode).toBe("two_phase");
    const s = live(a.segments);
    expect(s.length).toBe(2);
    expect(s.every((x) => x.weeks >= 2)).toBe(true);
    expect(s[s.length - 1].phase).toBe("P3");
    expect(s[s.length - 1].endsWithSharpen).toBe(true);
    for (const x of a.segments) if (x.shortened) expect(x.shortenedReason).toBeTruthy();
  });
  it("2-week offseason is Bridge: capacity then one sharpening week, no new heavy", () => {
    const a = allocateWindow({ windowWeeks: 2, hardDateLabel: "x", credit: zero, need: noNeed });
    expect(a.mode).toBe("bridge");
    expect(a.segments.map((x) => [x.phase, x.weeks])).toEqual([["P1", 1], ["P3", 1]]);
    expect(a.segments.every((x) => x.noNewHeavy)).toBe(true);
    expect(a.segments[1].endsWithSharpen).toBe(true);
  });
  it("W ≥ 7 uses 50/25/25 clamped to 3/2/2", () => {
    const a = allocateWindow({ windowWeeks: 7, hardDateLabel: "x", credit: zero, need: noNeed });
    expect(a.segments.map((x) => x.weeks)).toEqual([3, 2, 2]);
    const b = allocateWindow({ windowWeeks: 12, hardDateLabel: "x", credit: zero, need: noNeed });
    expect(b.segments.map((x) => x.weeks)).toEqual([6, 3, 3]);
    const c = allocateWindow({ windowWeeks: 13, hardDateLabel: "x", credit: zero, need: { goal: "get_faster", openPain: false } });
    expect(c.segments.map((x) => x.weeks)).toEqual([6, 3, 4]);
  });
  it("year-round athlete rotates three-week micro-phases inside P4", () => {
    const e = [0, 3, 6, 9].map((w) => planAthlete(base({ inSeason: true, yearRound: true, weeksIntoSeason: w })).disciplines[0]);
    expect(e.every((d) => d.current === "P4")).toBe(true);
    expect(e.map((d) => d.emphasis)).toEqual(["strength", "speed", "sharpen", "strength"]);
    const gap10 = planAthlete(base({ inSeason: true, yearRound: true, nextGameGapDays: 14 })).disciplines[0];
    expect(gap10.mode).toBe("mini_block");
    expect(["P2", "P3"]).toContain(gap10.current);
    const gap21 = planAthlete(base({ inSeason: true, yearRound: true, nextGameGapDays: 28 })).disciplines[0];
    expect(gap21.mode).toBe("short_arc");
    expect(gap21.shortened.length).toBe(3);
  });
  it("mid-season injury hold keeps P4, pauses, and loses no credit", () => {
    const records = weeks("lifting", "P2", 3);
    const before = planAthlete(base({ inSeason: true, records })).disciplines[0];
    const held = planAthlete(base({ inSeason: true, holdToday: true, records })).disciplines[0];
    expect(held.current).toBe("P4");
    expect(held.paused).toBe(true);
    expect(held.credit).toEqual(before.credit);
  });
  it("no dates at all → Bridge mode, every discipline has a phase", () => {
    const p = planAthlete(base());
    for (const d of p.disciplines) {
      expect(d.mode).toBe("bridge");
      expect(d.current).toBe("P1");
      expect(d.noNewHeavy).toBe(true);
    }
    expect(stripText(p.disciplines[0], null)).not.toMatch(/B\d/);
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
  it("halves after eight weeks without work in that quality", () => {
    const old = weeks("lifting", "P1", 4, "2026-03-01");
    const l = buildCreditLedger(old, TODAY);
    expect(l.lifting.P1).toBe(2);
    expect(buildCreditLedger(weeks("lifting", "P1", 4), TODAY).lifting.P1).toBe(4);
  });
  it("credit survives ten schedule changes in a row", () => {
    const records = [...weeks("lifting", "P1", 3), ...weeks("lifting", "P2", 1)];
    const hardDates = ["2026-06-20", null, "2026-09-01", "2026-06-08", "2026-07-15", null, "2026-06-03", "2026-12-01", "2026-06-29", "2026-08-10"];
    const first = planAthlete(base({ records })).disciplines[0].credit;
    hardDates.forEach((h, i) => {
      const d = planAthlete(base({ records, hardDate: h, offDaysInWindow: i, inSeason: i === 5 })).disciplines[0];
      expect(d.credit).toEqual(first);
      expect(d.completed).toContain("P1");
    });
  });
  it("a phase past its minimum is never restarted", () => {
    for (let w = 0; w <= 30; w++) {
      const credit = { P1: MIN_WEEKS.P1, P2: 0, P3: 0 };
      const a = allocateWindow({ windowWeeks: w, hardDateLabel: "x", credit, need: { goal: "stay_healthy", openPain: true } });
      if (w >= 4) expect(live(a.segments).some((s) => s.phase === "P1")).toBe(false);
    }
  });
});

describe("priority need (§5)", () => {
  it("open pain pulls toward P1 first, then goal, then least credit", () => {
    expect(rankNeed({ goal: "get_faster", openPain: true }, zero)[0]).toBe("P1");
    expect(rankNeed({ goal: "get_faster", openPain: false }, zero)[0]).toBe("P3");
    expect(rankNeed({ goal: null, openPain: false }, { P1: 3, P2: 1, P3: 0 })[0]).toBe("P3");
  });
});

describe("laws", () => {
  it("phases only name existing blocks and never carry a dose", () => {
    const p = planAthlete(base({ hardDate: "2026-09-01" }));
    for (const d of p.disciplines) for (const s of d.segments) {
      expect(PHASE_BLOCKS[s.phase]).toBeTruthy();
      for (const k of Object.keys(s)) expect(k).not.toMatch(/sets|reps|load|dose|intensity|age/i);
    }
  });
  it("switch off is byte-identical: the card builder never reads the phase engine", () => {
    const gen = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");
    expect(gen).not.toMatch(/adaptivePhases|adaptive_phase/);
    const shadow = readFileSync("supabase/functions/adaptive-phases-shadow/index.ts", "utf8");
    const writes = [...shadow.matchAll(/from\("([a-z_]+)"\)\.(upsert|insert|update|delete)/g)].map((m) => m[1]);
    expect(new Set(writes)).toEqual(new Set(["adaptive_phase_credit", "adaptive_phase_shadow"]));
  });
});

describe("simulated-season sweep", () => {
  it("holds every phase invariant across 5,000 random athlete-days", () => {
    let seed = 20260924;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const goals = [null, "throw_harder", "get_faster", "hit_harder", "stay_healthy"] as const;
    for (let i = 0; i < 5000; i++) {
      const records: WeekRecord[] = [];
      for (const d of DISCIPLINES) for (const ph of ["P1", "P2", "P3", "P4"] as const) {
        const n = Math.floor(rnd() * 5);
        records.push(...weeks(d, ph, n, new Date(Date.parse(TODAY) - Math.floor(rnd() * 120) * 86400000).toISOString().slice(0, 10), Math.floor(rnd() * 5), 4));
      }
      const hasDate = rnd() > 0.15;
      const inp = base({
        records,
        hardDate: hasDate ? new Date(Date.parse(TODAY) + Math.floor(rnd() * 200) * 86400000).toISOString().slice(0, 10) : null,
        inSeason: rnd() < 0.3, yearRound: rnd() < 0.5, nextGameGapDays: rnd() < 0.5 ? Math.floor(rnd() * 35) : null,
        offDaysInWindow: Math.floor(rnd() * 20), holdToday: rnd() < 0.1, weeksIntoSeason: Math.floor(rnd() * 30),
        need: { goal: goals[Math.floor(rnd() * 5)], openPain: rnd() < 0.2 },
      });
      const p = planAthlete(inp);
      for (const d of p.disciplines) {
        expect(d.current).toBeTruthy(); // always a phase
        if (inp.inSeason) expect(["P4", "P1", "P2", "P3"]).toContain(d.current);
        if (inp.inSeason && d.mode !== "mini_block" && d.mode !== "short_arc") expect(d.current).toBe("P4");
        if (p.windowWeeks !== null && p.windowWeeks >= 1 && !inp.inSeason) {
          expect(live(d.segments).reduce((a, s) => a + s.weeks, 0)).toBe(p.windowWeeks);
        }
        for (const s of d.segments) {
          if (s.phase === "P4") continue;
          const rem = Math.max(0, Math.ceil(MIN_WEEKS[s.phase as BuildPhase] - d.credit[s.phase as BuildPhase] - 1e-9));
          if (s.weeks < rem && !(d.mode === "bridge")) expect(s.shortenedReason).toBeTruthy(); // never silent
        }
        if (d.mode === "full_arc" || d.mode === "two_phase") {
          for (const c of d.completed) expect(live(d.segments).some((s) => s.phase === c && !s.sharpenOnly && !(d.completed.length === 3))).toBe(false);
          const last = live(d.segments).at(-1);
          if (d.mode === "two_phase") expect(last?.endsWithSharpen).toBe(true);
        }
        if (d.mode === "bridge") expect(d.segments.every((s) => s.noNewHeavy)).toBe(true);
      }
    }
  });
});
