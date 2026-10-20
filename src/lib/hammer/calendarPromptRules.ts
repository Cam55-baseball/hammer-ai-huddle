export interface PracticePromptSource {
  id: string; scheduled_date: string; status: string | null; recurring_active: boolean | null;
  recurring_days: number[] | null; sport: string; session_module: string; title: string;
}
/** Reminder only: source completion is written by PracticeHub, never a prompt tap. */
export function practicesDueToday(rows: readonly PracticePromptSource[], today: string, sport: string, allowedModules: readonly string[]) {
  const weekday = new Date(`${today}T12:00:00`).getDay();
  return rows.filter(row => row.sport === sport && allowedModules.includes(row.session_module)
    && row.status !== "completed" && row.status !== "cancelled" && row.status !== "canceled" && row.status !== "rescheduled"
    && (row.scheduled_date === today || (row.recurring_active && row.scheduled_date <= today && row.recurring_days?.includes(weekday))));
}