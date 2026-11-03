/**
 * Hammers Today start readiness (owner 2026-10-27). Pure and shared by the app
 * contract tests; app and generator call the canonical initial_plan_missing RPC.
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
  bats_hand?: string | null;
  throws_hand?: string | null;
  height_in?: number | null;
  weight_lb?: number | null;
  sleep_target_hrs?: number | null;
  lifting_age_years?: number | null;
  season_dates_reviewed?: boolean;
  nutrition?: Record<string, unknown> | null;
  health_setup_completed?: boolean;
  current_pain_answered?: boolean;
  current_pain?: boolean | null;
  pain_area?: string | null;
  starting_point_answered?: boolean;
  is_pitcher?: boolean;
  pitching_role?: string | null;
}

export interface StartMissingItem { key: string; label: string; to: string; required?: boolean }

export const REQUIRED_PLAN_QUESTIONS = [
  { key: 'birthday', label: 'Your birthday' },
  { key: 'sport', label: 'Your sport' },
  { key: 'position', label: 'Main position' },
  { key: 'bats_throws', label: 'Which side you bat and throw from' },
  { key: 'level', label: 'Playing level' },
  { key: 'season', label: 'Season status' },
  { key: 'goals', label: 'Top goals' },
  { key: 'health', label: 'Anything hurt right now?' },
  { key: 'starting_point', label: 'Where are you starting from?' },
  { key: 'pitching_role', label: 'Pitching role' },
] as const;

export const requiredPlanQuestionCount = (pitcher: boolean) => pitcher ? 10 : 9;
export const isRequiredPlanQuestion = (key: string) => REQUIRED_PLAN_QUESTIONS.some(q => q.key === key);

const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;

function hasGoals(i: StartReadinessInput): boolean {
  const cg = i.category_goals;
  if (!cg || typeof cg !== "object") return false;
  return JSON.stringify(cg) !== "{}" && JSON.stringify(cg) !== "[]";
}

export function startMissing(i: StartReadinessInput): StartMissingItem[] {
  const out: StartMissingItem[] = [];
  const add = (key: string, label: string, to = '/hammers-today') => out.push({ key, label, to, required: true });
  if (!text(i.date_of_birth)) add('birthday', 'Your birthday', '/signup');
  if (i.sport_primary !== 'baseball' && i.sport_primary !== 'softball') add('sport', 'Your sport', '/signup');
  if (!text(i.position_primary)) add('position', 'Your position');
  if (!text(i.competition_level)) add('level', 'Your level of play');
  if (!hasGoals(i)) add('goals', 'Your goals');
  if (!['off_season','preseason','in_season','post_season'].includes(i.season_status ?? '')) add('season', 'Your season phase');
  if (!['L','R','S','B'].includes(i.bats_hand ?? '') || !['L','R','S','B'].includes(i.throws_hand ?? '')) add('bats_throws', 'Which side you bat and throw from');
  if (!i.current_pain_answered || (i.current_pain === true && !text(i.pain_area))) add('health', 'Anything hurt right now?');
  if (!i.starting_point_answered) add('starting_point', 'Where are you starting from?');
  if (i.is_pitcher && !['starter','bullpen','closer'].includes(i.pitching_role ?? '')) add('pitching_role', 'Pitching role');
  return REQUIRED_PLAN_QUESTIONS.flatMap(q => out.filter(item => item.key === q.key));
}
