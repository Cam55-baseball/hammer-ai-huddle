import { describe, it, expect } from "vitest";
import {
  TIMELINE_TAGS, canUndo, cancelledDates, dayEffect, describeEntry, entryDates, findMergeTarget,
  nextHeavyDay, whatChanged, UNDO_WINDOW_MS, type TimelineEntry, type TimelineTag,
} from "../../../supabase/functions/_shared/wic/schedule/timeline";
import { parseScheduleRequest, weeklyDates } from "@/lib/hammer/tellHammers/parse";

const T = "2026-10-01"; // Thursday
let n = 0;
function e(tag: TimelineTag, start: string, end = start, extra: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    id: `e${++n}`, tag, start_date: start, end_date: end, dates: null, source: "inbox",
    payload: {}, summary: "", created_at: new Date().toISOString(), undone_at: null, ...extra,
  };
}

describe("dedupe", () => {
  it("same tag + same source + overlapping dates → merge into the existing entry", () => {
    const a = e("CANCELLED", "2026-10-05", "2026-10-12");
    expect(findMergeTarget([a], { tag: "CANCELLED", source: "inbox", start_date: "2026-10-10", end_date: "2026-10-19" })?.id).toBe(a.id);
  });
  it("different tag, different source, or no overlap → new entry", () => {
    const a = e("CANCELLED", "2026-10-05", "2026-10-12");
    expect(findMergeTarget([a], { tag: "HOLD", source: "inbox", start_date: "2026-10-05", end_date: "2026-10-05" })).toBeNull();
    expect(findMergeTarget([a], { tag: "CANCELLED", source: "ask_hammer", start_date: "2026-10-05", end_date: "2026-10-05" })).toBeNull();
    expect(findMergeTarget([a], { tag: "CANCELLED", source: "inbox", start_date: "2026-10-13", end_date: "2026-10-14" })).toBeNull();
  });
  it("an undone entry is never a merge target", () => {
    const a = e("GAME", T, T, { undone_at: new Date().toISOString() });
    expect(findMergeTarget([a], { tag: "GAME", source: "inbox", start_date: T, end_date: T })).toBeNull();
  });
  it("merged save says so in plain words", () => {
    const msg = whatChanged({ entry: e("CANCELLED", "2026-10-05", "2026-10-19"), merged: true, heavyBefore: null, heavyAfter: null });
    expect(msg.startsWith("You already told me this — I updated it.")).toBe(true);
  });
});

describe("undo", () => {
  it("undoable for 24 hours, then not", () => {
    const now = Date.now();
    expect(canUndo(e("GAME", T, T, { created_at: new Date(now - 1000).toISOString() }), now)).toBe(true);
    expect(canUndo(e("GAME", T, T, { created_at: new Date(now - UNDO_WINDOW_MS - 1).toISOString() }), now)).toBe(false);
    expect(canUndo(e("GAME", T, T, { undone_at: new Date(now).toISOString() }), now)).toBe(false);
  });
  it("an undone entry has no effect on the plan", () => {
    const hold = e("HOLD", T, T, { undone_at: new Date().toISOString() });
    expect(dayEffect([hold], T).hold).toBe(false);
  });
});

describe("every tag type", () => {
  it("all ten filter tags plus RESUME describe themselves in plain words", () => {
    for (const tag of [...TIMELINE_TAGS, "RESUME" as const]) {
      const text = describeEntry(e(tag, T, T, { payload: { text: "new coach", label: "Combine", which: "starts", regionLabel: "Shoulder", faceLabel: "a little" } }));
      expect(text.length).toBeGreaterThan(2);
      expect(text).not.toMatch(/undefined|null|\bB\d\b|block/i);
    }
  });
  it("GAME / TOURNAMENT / EVENT are hard dates", () => {
    for (const tag of ["GAME", "TOURNAMENT", "EVENT"] as const) expect(dayEffect([e(tag, T)], T).games).toHaveLength(1);
  });
  it("CANCELLED removes timeline games on those dates and reports the dates", () => {
    const eff = dayEffect([e("GAME", T), e("CANCELLED", T)], T);
    expect(eff.games).toHaveLength(0);
    expect(eff.cancelled).toBe(true);
    expect([...cancelledDates([e("CANCELLED", "2026-10-05", "2026-10-07")])]).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
  });
  it("HOLD makes a recovery day; travel is marked; RESUME ends it", () => {
    const hold = e("HOLD", T, "2026-10-10", { payload: { reason: "travel" } });
    expect(dayEffect([hold], "2026-10-03")).toMatchObject({ hold: true, travel: true });
    expect(dayEffect([hold, e("RESUME", "2026-10-03")], "2026-10-04").hold).toBe(false);
    expect(dayEffect([hold, e("RESUME", "2026-10-03")], "2026-10-02").hold).toBe(true);
  });
  it("PRACTICE adds a practice; PAIN / SEASON / GOAL / NOTE never change the day here", () => {
    expect(dayEffect([e("PRACTICE", T)], T).practice).toBe(true);
    for (const tag of ["PAIN", "SEASON", "GOAL", "NOTE"] as const) {
      expect(dayEffect([e(tag, T)], T)).toEqual({ cancelled: false, hold: false, travel: false, games: [], practice: false });
    }
  });
  it("explicit dates win over the range", () => {
    expect(entryDates({ start_date: "2026-10-03", end_date: "2026-10-17", dates: ["2026-10-17", "2026-10-03", "2026-10-10"] })).toEqual(["2026-10-03", "2026-10-10", "2026-10-17"]);
  });
});

describe("what changed", () => {
  it("names the next heavy day when it moves", () => {
    // Friday Oct 2 is a lift day; a game Saturday Oct 3 makes Friday the day before a game.
    const before = nextHeavyDay([], [], "2026-10-02");
    const after = nextHeavyDay([e("GAME", "2026-10-03")], [], "2026-10-02");
    expect(before).toBe("2026-10-02");
    expect(after).not.toBe(before);
    const msg = whatChanged({ entry: e("GAME", "2026-10-03"), merged: false, heavyBefore: before, heavyAfter: after });
    expect(msg).toMatch(/^Got it — game on October 3\. Next heavy day moves to/);
  });
  it("a cancellation gives heavy days back", () => {
    const games = ["2026-10-03"];
    const before = nextHeavyDay([], games, "2026-10-02");
    const after = nextHeavyDay([e("CANCELLED", "2026-10-03")], games, "2026-10-02");
    expect(after).toBe("2026-10-02");
    expect(before).not.toBe(after);
  });
  it("notes say plainly that nothing needed to change", () => {
    expect(whatChanged({ entry: e("NOTE", T, T, { payload: { text: "hi" } }), merged: false, heavyBefore: "x", heavyAfter: "x" })).toMatch(/Nothing needed to change/);
  });
  it("switch off = empty timeline = no effect on any day", () => {
    for (let i = 0; i < 10; i++) {
      const d = `2026-10-${String(i + 1).padStart(2, "0")}`;
      expect(dayEffect([], d)).toEqual({ cancelled: false, hold: false, travel: false, games: [], practice: false });
    }
    expect(cancelledDates([]).size).toBe(0);
  });
});

describe("Ask Hammer parser", () => {
  const cases: Array<[string, TimelineTag]> = [
    ["Games cancelled Oct 5 to 19", "CANCELLED"],
    ["I have a game on Oct 10", "GAME"],
    ["tournament oct 17 - 19", "TOURNAMENT"],
    ["my season starts March 1", "SEASON"],
    ["my shoulder hurts a lot", "PAIN"],
    ["I need a break for 2 weeks", "HOLD"],
    ["travelling for 3 days", "HOLD"],
    ["showcase on nov 2", "EVENT"],
    ["back to normal", "RESUME"],
    ["practice tomorrow", "PRACTICE"],
    ["my goal is to throw harder", "GOAL"],
    ["new coach this week", "NOTE"],
  ];
  for (const [text, tag] of cases) {
    it(`"${text}" → ${tag}`, () => {
      const r = parseScheduleRequest(text, T);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.draft.tag).toBe(tag);
    });
  }
  it("reads a date range", () => {
    const r = parseScheduleRequest("Games cancelled Oct 5 to 19", T);
    expect(r.ok && r.draft).toMatchObject({ start_date: "2026-10-05", end_date: "2026-10-19" });
  });
  it("every Saturday until…", () => {
    const r = parseScheduleRequest("games every saturday until oct 24", T);
    expect(r.ok && r.draft.dates).toEqual(["2026-10-03", "2026-10-10", "2026-10-17", "2026-10-24"]);
    expect(weeklyDates(6, T, "2026-10-02")).toEqual([]);
  });
  it("asks instead of guessing when a date is missing", () => {
    const r = parseScheduleRequest("games got cancelled", T);
    expect(r.ok).toBe(false);
  });
  it("pain wording goes to PAIN, never to a lighter path", () => {
    const r = parseScheduleRequest("my elbow is sore, can't throw", T);
    expect(r.ok && r.draft.tag).toBe("PAIN");
  });
});
