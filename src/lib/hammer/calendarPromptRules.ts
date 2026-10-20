export interface PracticePromptSource {
  id: string; scheduled_date: string; status: string | null; recurring_active: boolean | null;
  recurring_days: number[] | null; sport: string; session_module: string; title: string;
  requires_approval?: boolean | null;
}
/** Reminder only: source completion is written by PracticeHub, never a prompt tap. */
export function practicesDueToday(rows: readonly PracticePromptSource[], today: string, sport: string, allowedModules: readonly string[]) {
  const weekday = new Date(`${today}T12:00:00`).getDay();
  return rows.filter(row => row.sport === sport && allowedModules.includes(row.session_module)
    && row.status !== "pending_approval" && row.status !== "rejected"
    && !(row.requires_approval && !["scheduled", "completed"].includes(row.status ?? ""))
    && !(row.status === "completed" && row.scheduled_date === today)
    && !(row.status === "completed" && !row.recurring_active)
    && row.status !== "cancelled" && row.status !== "canceled" && row.status !== "rescheduled"
    && (row.scheduled_date === today || (row.recurring_active && row.scheduled_date <= today && row.recurring_days?.includes(weekday))));
}