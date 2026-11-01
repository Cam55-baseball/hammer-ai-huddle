/** Owner Nov 1 B3: ask "When's your next game?" only when the schedule is unclear. */
export interface NextGameQuestionInput {
  season: string | null;
  today: string;
  entries: ReadonlyArray<{ tag: string; undone_at?: string | null; start_date: string; end_date?: string | null; dates?: string[] | null }>;
  /** Upcoming logged games; null = could not be read (never ask on unknown). */
  loggedGameDates: ReadonlyArray<string> | null;
}

export function nextGameQuestionNeeded(i: NextGameQuestionInput): boolean {
  if (i.season !== "in_season") return false;
  if (i.loggedGameDates === null) return false;
  if (i.loggedGameDates.some(d => d >= i.today)) return false;
  const upcoming = i.entries.some(e => !e.undone_at && e.tag === "GAME" &&
    ((e.dates ?? []).some(d => d >= i.today) || (e.end_date ?? e.start_date) >= i.today));
  return !upcoming;
}
