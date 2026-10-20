export interface PracticePromptSource {
  id: string; scheduled_date: string; status: string | null; recurring_active: boolean | null;
  recurring_days: number[] | null; sport: string; session_module: string; title: string;
  requires_approval?: boolean | null;
}
/** Reminder only: source completion is written by PracticeHub, never a prompt tap. */
export interface PracticeCompletionSource {
  session_date: string; sport: string; module: string | null;
  fatigue_state_at_session: unknown; deleted_at: string | null;
}

export interface CalendarPracticeSource {
  id: string; event_date: string; event_type: string; sport: string | null;
  title: string; deleted_at: string | null; ignored_for_training: boolean; related_id: string | null;
}

export function completedCalendarPracticeIds(logs: readonly PracticeCompletionSource[], today: string, sport: string): Set<string> {
  const ids = new Set<string>();
  for (const log of logs) {
    if (log.deleted_at || log.session_date !== today || log.sport !== sport) continue;
    const metadata = log.fatigue_state_at_session;
    if (!metadata || typeof metadata !== "object" || !("calendar_practice" in metadata)) continue;
    const source = metadata.calendar_practice;
    if (!source || typeof source !== "object" || !("id" in source) || !("date" in source) || !("module" in source)) continue;
    if (typeof source.id === "string" && source.date === today && source.module === log.module) ids.add(source.id);
  }
  return ids;
}

/** Generic calendar practices do not invent a prescribed module or dose. */
export function calendarPracticesDueToday(rows: readonly CalendarPracticeSource[], today: string, sport: string, scheduledIds: ReadonlySet<string> = new Set(), completedIds: ReadonlySet<string> = new Set()) {
  return rows.filter(row => row.event_type === "practice" && row.event_date === today && row.sport === sport
    && !row.deleted_at && !row.ignored_for_training && !completedIds.has(row.id)
    && !(row.related_id && scheduledIds.has(row.related_id)));
}

/** Exact source/date/module identity; an unrelated practice never clears a reminder. */
export function completedPracticeIds(logs: readonly PracticeCompletionSource[], today: string, sport: string): Set<string> {
  const ids = new Set<string>();
  for (const log of logs) {
    if (log.deleted_at || log.session_date !== today || log.sport !== sport) continue;
    const metadata = log.fatigue_state_at_session;
    if (!metadata || typeof metadata !== "object" || !("scheduled_practice" in metadata)) continue;
    const source = metadata.scheduled_practice;
    if (!source || typeof source !== "object" || !("id" in source) || !("date" in source) || !("module" in source)) continue;
    if (typeof source.id === "string" && source.date === today && source.module === log.module) ids.add(`${source.id}:${log.module}`);
  }
  return ids;
}

export function practicesDueToday(rows: readonly PracticePromptSource[], today: string, sport: string, allowedModules: readonly string[], completedIds: ReadonlySet<string> = new Set()) {
  const weekday = new Date(`${today}T12:00:00`).getDay();
  return rows.filter(row => row.sport === sport && allowedModules.includes(row.session_module)
    && !completedIds.has(`${row.id}:${row.session_module}`)
    && row.status !== "pending_approval" && row.status !== "rejected"
    && !(row.requires_approval && !["scheduled", "completed"].includes(row.status ?? ""))
    && !(row.status === "completed" && !row.recurring_active)
    && row.status !== "cancelled" && row.status !== "canceled" && row.status !== "rescheduled"
    && (row.scheduled_date === today || (row.recurring_active && row.scheduled_date <= today && row.recurring_days?.includes(weekday))));
}