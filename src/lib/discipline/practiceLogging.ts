import type { DayRecord } from "./discipline";

export interface PracticeLog {
  id: string;
  session_date: string;
  session_type: string;
  deleted_at: string | null;
}

const PRACTICE_TYPES = new Set(["solo_work", "team_session", "lesson", "live_abs"]);

/** Saved practice is evidence of logging, never evidence of completing a workout dose. */
export function practiceLogging(days: DayRecord[], logs: PracticeLog[], from: string, to: string) {
  const unique = new Map(logs.filter(log => !log.deleted_at && PRACTICE_TYPES.has(log.session_type)
    && log.session_date >= from && log.session_date <= to).map(log => [log.id, log]));
  const dates = new Set([...unique.values()].map(log => log.session_date));
  return {
    days: days.map(day => ({ ...day, logged: day.logged || dates.has(day.date) })),
    sessions: unique.size,
    dates: [...dates].sort(),
  };
}