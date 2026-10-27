import { describe, expect, it } from "vitest";
import { completion, currentStreak, loggingConsistency } from "./discipline";
import { practiceLogging, type PracticeLog } from "./practiceLogging";

const day = { date: "2026-10-19", prescribed: 2, done: 0, logged: false };
const log: PracticeLog = { id: "practice-1", session_date: day.date, session_type: "solo_work", deleted_at: null };
const project = (logs: PracticeLog[]) => practiceLogging([day], logs, "2026-07-23", "2026-10-20");

describe("practice feeds Discipline without authoring workout completion", () => {
  it("a saved practice changes logging only, never dose completion or streak", () => {
    const result = project([log]);
    expect(loggingConsistency(result.days)).toBe(100);
    expect(completion(result.days)).toBe(0);
    expect(currentStreak(result.days)).toBe(0);
    expect(result.days[0].prescribed).toBe(2);
    expect(result.days[0].done).toBe(0);
  });
  it("deleted practice never counts", () => {
    const result = project([{ ...log, deleted_at: "2026-10-20T02:35:00Z" }]);
    expect(result.sessions).toBe(0);
    expect(loggingConsistency(result.days)).toBe(0);
  });
  it("duplicate session reads count once, multiple sessions on one date mark one day", () => {
    const result = project([log, log, { ...log, id: "practice-2" }]);
    expect(result.sessions).toBe(2);
    expect(result.dates).toEqual([day.date]);
  });
  it("saved games count as logging, never as prescribed work", () => {
    const result = project([{ ...log, session_type: "game" }]);
    expect(result.sessions).toBe(1);
    expect(result.days[0]).toEqual({ ...day, logged: true });
    expect(completion(result.days)).toBe(0);
  });
  it("unrecognized records never count as sessions", () => {
    expect(project([{ ...log, session_type: "unknown" }]).sessions).toBe(0);
  });
  it("out-of-window and future sessions never count", () => {
    expect(project([{ ...log, session_date: "2026-07-22" }, { ...log, id: "future", session_date: "2026-10-21" }]).sessions).toBe(0);
  });
  it("unscheduled practice never creates work-set denominators", () => {
    const result = practiceLogging([], [log], "2026-07-23", "2026-10-20");
    expect(result.sessions).toBe(1);
    expect(result.days).toEqual([]);
    expect(completion(result.days)).toBeNull();
  });
  it("all four real PracticeHub types count", () => {
    expect(project(["solo_work", "team_session", "lesson", "live_abs"].map((session_type, i) => ({ ...log, id: String(i), session_type }))).sessions).toBe(4);
  });
});