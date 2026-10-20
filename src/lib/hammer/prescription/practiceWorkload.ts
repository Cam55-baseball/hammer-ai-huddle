/**
 * Practice logs → workload signal (plan-context link c).
 * Practice logs record only date + type (no swing/throw counts), so this reads
 * only what is really there: how many logged practices, and whether live
 * at-bats were logged yesterday. Never estimates reps.
 */
import type { PracticeLog } from "@/lib/discipline/practiceLogging";

export interface PracticeWorkloadSignal {
  /** Logged practice sessions in the 7 days before today. */
  readonly sessionsLast7: number;
  /** Logged practice sessions yesterday and the day before. */
  readonly sessionsLast2: number;
  readonly liveAbsYesterday: boolean;
  /** Two or more practices in the last two days. */
  readonly heavy: boolean;
  /** Plain line for the card, or null when nothing applies. */
  readonly because: string | null;
}

const TYPES = new Set(["solo_work", "team_session", "lesson", "live_abs"]);

function isoDaysBefore(today: string, n: number): string {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function practiceWorkloadSignal(logs: ReadonlyArray<PracticeLog>, today: string): PracticeWorkloadSignal {
  const live = logs.filter((l) => !l.deleted_at && TYPES.has(l.session_type) && l.session_date < today);
  const unique = new Map(live.map((l) => [l.id, l]));
  const list = [...unique.values()];
  const yesterday = isoDaysBefore(today, 1);
  const since7 = isoDaysBefore(today, 7);
  const since2 = isoDaysBefore(today, 2);
  const sessionsLast7 = list.filter((l) => l.session_date >= since7).length;
  const sessionsLast2 = list.filter((l) => l.session_date >= since2).length;
  const liveAbsYesterday = list.some((l) => l.session_date === yesterday && l.session_type === "live_abs");
  const heavy = sessionsLast2 >= 2;
  const because = heavy
    ? `Because you logged ${sessionsLast2} practices in the last 2 days.`
    : liveAbsYesterday
      ? "Because you logged live at-bats yesterday."
      : null;
  return { sessionsLast7, sessionsLast2, liveAbsYesterday, heavy, because };
}
