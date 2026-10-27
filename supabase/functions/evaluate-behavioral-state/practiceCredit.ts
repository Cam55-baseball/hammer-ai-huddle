export const PRACTICE_SESSION_TYPES = ['solo_work', 'team_session', 'lesson', 'live_abs', 'game'] as const;
export interface PracticeCreditRow { id: string; user_id: string; sport: string; session_date: string; session_type: string; deleted_at: string | null }
/** A saved session grants activity credit only, never standard/NN completion. */
export function practiceCreditDates(rows: readonly PracticeCreditRow[], userId: string, sport: string | null, from: string, to: string): Set<string> {
  if (!sport || !['baseball', 'softball'].includes(sport)) return new Set();
  return new Set(rows.filter(row => row.user_id === userId && row.sport === sport && !row.deleted_at &&
    PRACTICE_SESSION_TYPES.some(type => type === row.session_type) && row.session_date >= from && row.session_date <= to).map(row => row.session_date));
}