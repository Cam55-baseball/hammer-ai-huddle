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
}

export interface StartMissingItem { key: string; label: string; to: string }

const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;

function hasGoals(i: StartReadinessInput): boolean {
  const cg = i.category_goals;
  if (!cg || typeof cg !== "object") return false;
  return JSON.stringify(cg) !== "{}" && JSON.stringify(cg) !== "[]";
}

function hasRanking(i: StartReadinessInput): boolean {
  const order = (i.category_goals as { categoryOrder?: unknown } | null)?.categoryOrder;
  return Array.isArray(order) && order.length > 0;
}

export function startMissing(i: StartReadinessInput): StartMissingItem[] {
  const out: StartMissingItem[] = [];
  const add = (key: string, label: string, to = '/assessment?review=profile') => out.push({ key, label, to });
  if (!text(i.date_of_birth)) add('birthday', 'Your birthday', '/signup');
  if (i.sport_primary !== 'baseball' && i.sport_primary !== 'softball') add('sport', 'Your sport', '/signup');
  if (!text(i.position_primary)) add('position', 'Your position');
  if (!text(i.competition_level)) add('level', 'Your level of play');
  if (!hasGoals(i)) add('goals', 'Your goals');
  if (!hasRanking(i)) add('ranking', 'Rank your goals');
  if (!['off_season','preseason','in_season','post_season'].includes(i.season_status ?? '')) add('season', 'Your season phase');
  if (!(typeof i.weekly_availability_days === 'number' && i.weekly_availability_days >= 1 && i.weekly_availability_days <= 7)) add('days', 'Days available each week');
  if (!i.equipment_saved) add('equipment', 'Your equipment (bodyweight is an answer)');
  if (!i.assessment_completed) add('assessment', 'Finish your starting assessment', '/assessment');
  if (!['L','R','S'].includes(i.bats_hand ?? '')) add('bats', 'Which side you bat from');
  if (!['L','R','S'].includes(i.throws_hand ?? '')) add('throws', 'Which hand you throw with');
  const positive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0;
  if (!positive(i.height_in)) add('height', 'Your height');
  if (!positive(i.weight_lb)) add('weight', 'Your weight');
  if (!positive(i.sleep_target_hrs)) add('sleep', 'Usual sleep (hours a night)');
  const nonnegative = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  if (!nonnegative(i.lifting_age_years)) add('lifting', 'Years of lifting (0 if never)');
  if (!i.season_dates_reviewed) add('season_dates', 'Review your season dates (or say not known yet)');
  for (const [key,label] of [['calorie_goal','Daily calories (kcal)'],['protein_goal','Protein (g)'],['carbs_goal','Carbohydrates (g)'],['fats_goal','Fat (g)'],['hydration_goal','Water (oz)']]) {
    if (!nonnegative(i.nutrition?.[key])) add(key,label);
  }
  if (!i.health_setup_completed) add('health', 'Your health & physio setup');
  return out;
}
