// A game on any of the app's schedules (Game Plan games, calendar games, Tell Hammers
// timeline) makes the plan date a game day. Ignored or cancelled games never do.
export function isPlanGameDay(planDate: string, src: {
  gpGames: { game_date: unknown; ignored_for_training?: unknown }[];
  calendarGames: { event_date: unknown; ignored_for_training?: unknown }[];
  timelineGamesToday: number;
  cancelled: Set<string>;
}): boolean {
  const ok = (d: unknown, ig: unknown) => String(d) === planDate && ig !== true && !src.cancelled.has(planDate);
  return src.timelineGamesToday > 0 ||
    src.gpGames.some((g) => ok(g.game_date, g.ignored_for_training)) ||
    src.calendarGames.some((e) => ok(e.event_date, e.ignored_for_training));
}
