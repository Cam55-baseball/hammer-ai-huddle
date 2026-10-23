export const TOOL_WINDOW_SAVED = "hammers.tool-window.saved";
export type ToolOccurrence = { exerciseId: string; planDate: string };

export function toolWindowContext(search: string) {
  const params = new URLSearchParams(search);
  const token = params.get("today_tool_token");
  const exercise_id = params.get("today_exercise_id");
  const plan_date = params.get("today_plan_date");
  return token && exercise_id && plan_date ? { token, exercise_id, plan_date } : null;
}

export function toolOccurrenceMatches(value: unknown, occurrence: ToolOccurrence, token?: string): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return row.exercise_id === occurrence.exerciseId && row.plan_date === occurrence.planDate && (token == null || row.token === token);
}

/** Successful canonical saves emit only a refetch hint to their same-origin parent. */
export function notifyToolSaved(sessionId: string) {
  const context = toolWindowContext(window.location.search);
  if (context && window.parent !== window) window.parent.postMessage({ type: TOOL_WINDOW_SAVED, token: context.token, sessionId }, window.location.origin);
}