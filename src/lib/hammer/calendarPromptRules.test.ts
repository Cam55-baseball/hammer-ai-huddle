import { describe, expect, it } from "vitest";
import { practicesDueToday, completedPracticeIds, calendarPracticesDueToday, completedCalendarPracticeIds, type CalendarPracticeSource, type PracticePromptSource, type PracticeCompletionSource } from "./calendarPromptRules";
const row: PracticePromptSource = { id: "practice", scheduled_date: "2026-10-20", status: "scheduled", recurring_active: false, recurring_days: null, sport: "baseball", session_module: "hitting", title: "Team practice" };
describe("calendar-only practice logging", () => {
  const event: CalendarPracticeSource = { id: "calendar-practice", event_date: "2026-10-20", event_type: "practice", sport: "baseball", title: "Team practice", deleted_at: null, ignored_for_training: false, related_id: null };
  const log: PracticeCompletionSource = { session_date: "2026-10-20", sport: "baseball", module: "throwing", deleted_at: null, fatigue_state_at_session: { calendar_practice: { id: event.id, date: "2026-10-20", module: "throwing" } } };
  it("today's calendar practice needs no invented module", () => expect(calendarPracticesDueToday([event], "2026-10-20", "baseball")).toEqual([event]));
  it("only today and this sport appear", () => {
    expect(calendarPracticesDueToday([event], "2026-10-21", "baseball")).toEqual([]);
    expect(calendarPracticesDueToday([event], "2026-10-20", "softball")).toEqual([]);
  });
  it("deleted and ignored events stay suppressed", () => {
    expect(calendarPracticesDueToday([{ ...event, deleted_at: "2026-10-20" }, { ...event, ignored_for_training: true }], "2026-10-20", "baseball")).toEqual([]);
  });
  it("linked scheduled practice is not shown twice", () => expect(calendarPracticesDueToday([{ ...event, related_id: "scheduled" }], "2026-10-20", "baseball", new Set(["scheduled"]))).toEqual([]));
  it("only its exact canonical log clears the event", () => {
    expect(calendarPracticesDueToday([event], "2026-10-20", "baseball", new Set(), completedCalendarPracticeIds([log], "2026-10-20", "baseball"))).toEqual([]);
    expect(completedCalendarPracticeIds([{ ...log, fatigue_state_at_session: {} }], "2026-10-20", "baseball").size).toBe(0);
  });
  it("deleted, wrong sport/date/module logs never clear it", () => {
    expect(completedCalendarPracticeIds([{ ...log, deleted_at: "2026-10-20" }, { ...log, sport: "softball" }, { ...log, session_date: "2026-10-19" }, { ...log, module: "pitching" }], "2026-10-20", "baseball").size).toBe(0);
  });
  it("eight weeks of calendar events clear individually, never another date", () => {
    for (let week = 0; week < 8; week++) {
      const d = new Date("2026-10-20T12:00:00Z"); d.setUTCDate(d.getUTCDate() + week * 7);
      const today = d.toISOString().slice(0, 10);
      const datedEvent = { ...event, id: `calendar-${week}`, event_date: today };
      const datedLog = { ...log, session_date: today, fatigue_state_at_session: { calendar_practice: { id: datedEvent.id, date: today, module: "throwing" } } };
      expect(calendarPracticesDueToday([datedEvent], today, "baseball")).toHaveLength(1);
      expect(calendarPracticesDueToday([datedEvent], today, "baseball", new Set(), completedCalendarPracticeIds([datedLog], today, "baseball"))).toEqual([]);
      expect(calendarPracticesDueToday([datedEvent], today, "baseball", new Set(), completedCalendarPracticeIds([log], today, "baseball"))).toHaveLength(1);
    }
  });
});
describe("calendar practice prompts", () => {
  it("only today's event appears", () => expect(practicesDueToday([row], "2026-10-21", "baseball", ["hitting"])).toEqual([]));
  it("today's subscribed practice appears", () => expect(practicesDueToday([row], "2026-10-20", "baseball", ["hitting"])).toEqual([row]));
  it("completed practices disappear", () => expect(practicesDueToday([{ ...row, status: "completed" }], "2026-10-20", "baseball", ["hitting"])).toEqual([]));
  it("cancelled practices disappear", () => expect(practicesDueToday([{ ...row, status: "cancelled" }], "2026-10-20", "baseball", ["hitting"])).toEqual([]));
  it("another sport cannot create a prompt", () => expect(practicesDueToday([row], "2026-10-20", "softball", ["hitting"])).toEqual([]));
  it("unavailable modules cannot create a prompt", () => expect(practicesDueToday([row], "2026-10-20", "baseball", ["pitching"])).toEqual([]));
  it("pending approval never prompts a player to start", () => {
    expect(practicesDueToday([{ ...row, requires_approval: true, status: "pending_approval" }], "2026-10-20", "baseball", ["hitting"])).toEqual([]);
  });
  it("approved practice may appear", () => {
    expect(practicesDueToday([{ ...row, requires_approval: true, status: "scheduled" }], "2026-10-20", "baseball", ["hitting"])).toHaveLength(1);
  });
  it("declined practice never appears", () => {
    expect(practicesDueToday([{ ...row, status: "rejected" }], "2026-10-20", "baseball", ["hitting"])).toEqual([]);
  });
  it("a completed recurring occurrence does not cancel later weeks", () => {
    const recurring = { ...row, status: "completed", recurring_active: true, recurring_days: [2] };
    expect(practicesDueToday([recurring], "2026-10-20", "baseball", ["hitting"])).toEqual([recurring]);
    expect(practicesDueToday([recurring], "2026-10-27", "baseball", ["hitting"])).toEqual([recurring]);
  });
  it("a recurring first occurrence requires its non-deleted dated session, not row status", () => {
    const recurring = { ...row, status: "completed", recurring_active: true, recurring_days: [2] };
    const log: PracticeCompletionSource = { session_date: "2026-10-20", sport: "baseball", module: "hitting", deleted_at: null, fatigue_state_at_session: { scheduled_practice: { id: row.id, date: "2026-10-20", module: "hitting" } } };
    expect(practicesDueToday([recurring], "2026-10-20", "baseball", ["hitting"], completedPracticeIds([log], "2026-10-20", "baseball"))).toEqual([]);
    expect(practicesDueToday([recurring], "2026-10-20", "baseball", ["hitting"], completedPracticeIds([{ ...log, deleted_at: "2026-10-20" }], "2026-10-20", "baseball"))).toEqual([recurring]);
  });
  it("eight-week Tuesday recurrence yields exactly eight reminders", () => {
    const recurring = { ...row, recurring_active: true, recurring_days: [2] };
    const hits = Array.from({ length: 56 }, (_, day) => {
      const date = new Date("2026-10-20T12:00:00Z"); date.setUTCDate(date.getUTCDate() + day);
      return practicesDueToday([recurring], date.toISOString().slice(0,10), "baseball", ["hitting"]).length;
    });
    expect(hits.reduce((a,b) => a+b,0)).toBe(8);
    expect(hits.slice(0,7)).toEqual([1,0,0,0,0,0,0]);
  });
});

describe("dated recurring practice completion", () => {
  const log: PracticeCompletionSource = { session_date: "2026-10-27", sport: "baseball", module: "hitting", deleted_at: null, fatigue_state_at_session: { scheduled_practice: { id: "practice", date: "2026-10-27", module: "hitting" } } };
  const recurring = { ...row, status: "completed", recurring_active: true, recurring_days: [2] };
  it("a later logged occurrence clears only that day's reminder", () => {
    const ids = completedPracticeIds([log], "2026-10-27", "baseball");
    expect(practicesDueToday([recurring], "2026-10-27", "baseball", ["hitting"], ids)).toEqual([]);
    expect(practicesDueToday([recurring], "2026-11-03", "baseball", ["hitting"], completedPracticeIds([log], "2026-11-03", "baseball"))).toHaveLength(1);
  });
  it("unlinked practice cannot clear a scheduled reminder", () => expect(completedPracticeIds([{ ...log, fatigue_state_at_session: {} }], "2026-10-27", "baseball").size).toBe(0));
  it("wrong sport never clears a reminder", () => expect(completedPracticeIds([log], "2026-10-27", "softball").size).toBe(0));
  it("mismatched module never clears a reminder", () => expect(completedPracticeIds([{ ...log, module: "pitching" }], "2026-10-27", "baseball").size).toBe(0));
  it("a different logged module with the same schedule ID cannot clear hitting", () => {
    const ids = completedPracticeIds([{ ...log, module: "pitching", fatigue_state_at_session: { scheduled_practice: { id: "practice", date: "2026-10-27", module: "pitching" } } }], "2026-10-27", "baseball");
    expect(practicesDueToday([recurring], "2026-10-27", "baseball", ["hitting"], ids)).toHaveLength(1);
  });
  it("deleted practice never clears a reminder", () => expect(completedPracticeIds([{ ...log, deleted_at: "2026-10-27T12:00:00Z" }], "2026-10-27", "baseball").size).toBe(0));
});