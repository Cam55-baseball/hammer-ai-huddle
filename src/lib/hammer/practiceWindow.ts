export const PRACTICE_WINDOW_SAVED = "hammers.practice-window.saved";
export const PRACTICE_MODULES = ["hitting", "pitching", "throwing", "fielding", "baserunning", "bunting"] as const;
export const PRACTICE_TYPES = ["solo_work", "team_session", "lesson", "live_abs"] as const;

/** A message is only a refetch hint. Counts come from the successfully saved self-owned session. */
export function savedPracticeCount(session: {
  user_id: string; sport: string; module: string | null; deleted_at?: string | null;
  fatigue_state_at_session: unknown; micro_layer_data: unknown;
}, expected: { userId: string; sport: string; module: string; token: string }): number | null {
  if (session.user_id !== expected.userId || session.sport !== expected.sport || session.module !== expected.module || session.deleted_at) return null;
  const fatigue = session.fatigue_state_at_session;
  if (!fatigue || typeof fatigue !== "object" || !("today_exercise" in fatigue)) return null;
  const context = fatigue.today_exercise;
  if (!context || typeof context !== "object" || !("token" in context) || context.token !== expected.token) return null;
  return Array.isArray(session.micro_layer_data) && session.micro_layer_data.length > 0 ? session.micro_layer_data.length : null;
}

export function practiceWindowRoute(route: string, token: string) {
  const url = new URL(route, "https://hammersmodality.org");
  if (url.pathname !== "/practice") return route;
  url.searchParams.set("today_window", token);
  return `${url.pathname}${url.search}`;
}