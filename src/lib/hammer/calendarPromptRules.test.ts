import { describe, expect, it } from "vitest";
import { practicesDueToday, type PracticePromptSource } from "./calendarPromptRules";
const row: PracticePromptSource = { id: "practice", scheduled_date: "2026-10-20", status: "scheduled", recurring_active: false, recurring_days: null, sport: "baseball", session_module: "hitting", title: "Team practice" };
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
    expect(practicesDueToday([recurring], "2026-10-20", "baseball", ["hitting"])).toEqual([]);
    expect(practicesDueToday([recurring], "2026-10-27", "baseball", ["hitting"])).toEqual([recurring]);
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