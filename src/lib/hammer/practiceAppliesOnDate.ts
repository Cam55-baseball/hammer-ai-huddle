/** Same rule the calendar uses: exact date, or a weekly repeat that has started. */
export interface PracticeDateRow {
  scheduled_date: string;
  recurring_active?: boolean | null;
  recurring_days?: number[] | null;
}

export function practiceAppliesOnDate(row: PracticeDateRow, dateKey: string): boolean {
  if (row.scheduled_date === dateKey) return true;
  if (!row.recurring_active || !row.recurring_days?.length) return false;
  if (row.scheduled_date > dateKey) return false;
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return row.recurring_days.includes(dow);
}
