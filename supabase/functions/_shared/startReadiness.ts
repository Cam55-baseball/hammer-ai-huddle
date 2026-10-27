/**
 * Hammers Today start readiness (owner 2026-10-27). Pure and shared by the app
 * and its tests; `start_hammers_today` repeats the same checks on the server.
 * A player cannot start until every detail a full plan needs is saved.
 */
export interface StartReadinessInput {
  date_of_birth?: string | null;
  sport_primary?: string | null;
  position_primary?: string | null;
  competition_level?: string | null;
  category_goals?: unknown;
  goal_summary?: string | null;
  goal_priority_rank?: number | null;
  season_status?: string | null;
  weekly_availability_days?: number | null;
  equipment_saved?: boolean;
  assessment_completed?: boolean;
}

export interface StartMissingItem { key: string; label: string; to: string }

const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;

function hasGoals(i: StartReadinessInput): boolean {
  const cg = i.category_goals;
  if (text(i.goal_summary)) return true;
  if (!cg || typeof cg !== "object") return false;
  return JSON.stringify(cg) !== "{}" && JSON.stringify(cg) !== "[]";
}

function hasRanking(i: StartReadinessInput): boolean {
  const order = (i.category_goals as { categoryOrder?: unknown } | null)?.categoryOrder;
  return (Array.isArray(order) && order.length > 0) || i.goal_priority_rank != null;
}

export function startMissing(i: StartReadinessInput): StartMissingItem[] {
  const out: StartMissingItem[] = [];
  if (!text(i.date_of_birth)) out.push({ key: "birthday", label: "Your birthday", to: "/onboarding/athlete?edit=profile" });
  if (i.sport_primary !== "baseball" && i.sport_primary !== "softball") out.push({ key: "sport", label: "Your sport", to: "/onboarding/athlete?edit=profile" });
  if (!text(i.position_primary)) out.push({ key: "position", label: "Your position", to: "/onboarding/athlete?edit=profile" });
  if (!text(i.competition_level)) out.push({ key: "level", label: "Your level of play", to: "/finish-profile?step=level" });
  if (!hasGoals(i)) out.push({ key: "goals", label: "Your goals", to: "/onboarding/athlete?edit=goals" });
  else if (!hasRanking(i)) out.push({ key: "ranking", label: "Which goal matters most (rank them)", to: "/onboarding/athlete?edit=goals" });
  if (!text(i.season_status)) out.push({ key: "season", label: "Where you are in your season", to: "/onboarding/athlete?edit=schedule" });
  if (!(typeof i.weekly_availability_days === "number" && i.weekly_availability_days > 0)) out.push({ key: "days", label: "How many days a week you can train", to: "/onboarding/athlete?edit=schedule" });
  if (!i.equipment_saved) out.push({ key: "equipment", label: "Your equipment", to: "/onboarding/athlete?edit=equipment" });
  if (!i.assessment_completed) out.push({ key: "assessment", label: "Your starting assessment (tap Completed)", to: "/assessment" });
  return out;
}
