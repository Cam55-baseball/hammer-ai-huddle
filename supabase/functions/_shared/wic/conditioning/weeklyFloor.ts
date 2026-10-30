// Owner Oct 28: every player gets at least 2 running-conditioning sessions a week,
// inside the 6-day week, never on the Sunday rest day. Position players run base
// routes (90-ft baseball / 60-ft softball bases); pitchers use the existing
// explosive-pitcher conditioning. Low readiness → the easy-flush run (lower
// volume, still counts). Existing safety (game day, HOLD, post-start flush) wins.

export const CONDITIONING_WEEKLY_MINIMUM = 2;
export const REST_DOW = 0; // Sunday

/** Conditioning work that is not running (walks, breathing, travel reset) never counts toward the floor. */
export const NON_RUNNING = new Set(["rc_breathing_reset", "rc_travel_reset", "rc_long_reach_walk"]);

export function isRunningConditioning(slugs: readonly string[]): boolean {
  return slugs.some((s) => ['bases_home_2nd','bases_1st_3rd','bases_double_sb','bases_triple_sb','repeat_90ft_bb','repeat_43ft_sb','inning_restart_sim_bb','inning_restart_sim_sb','pc_ankle_pogos_bb','pc_buildup_strides_bb','sp_drive_bounds_sb','sp_stride_stick_sb'].includes(s) || s.startsWith('owner_cond_'));
}

const dow = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const shift = (iso: string, n: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

/** Monday of the plan date's training week. */
export function weekStart(planDate: string): string {
  const d = dow(planDate);
  return shift(planDate, d === 0 ? -6 : 1 - d);
}

/**
 * Due when the training days left this week (today through Saturday) are no more
 * than the running sessions still needed. Never due on the rest day.
 */
export function conditioningFloorDue(input: { planDate: string; priorRunningDates: readonly string[]; minimum?: number }) {
  const min = input.minimum ?? CONDITIONING_WEEKLY_MINIMUM;
  const start = weekStart(input.planDate);
  const done = new Set(input.priorRunningDates.filter((d) => d >= start && d < input.planDate)).size;
  const needed = Math.max(0, min - done);
  const today = dow(input.planDate);
  const remaining = today === REST_DOW ? 0 : 7 - today; // Mon=1 → 6 days left incl. today … Sat=6 → 1
  return { due: today !== REST_DOW && needed > 0 && remaining <= needed, needed, remaining, done };
}

/** The floor session's movements (existing library slugs only). */
export function floorConditioningSlugs(input: { sport: "baseball" | "softball"; isPitcher: boolean; lowReadiness: boolean }): string[] {
  if (input.lowReadiness) return ["rc_easy_flush"];
  if (input.isPitcher) return input.sport === "softball" ? ["sp_drive_bounds_sb", "sp_stride_stick_sb"] : ["pc_ankle_pogos_bb", "pc_buildup_strides_bb"];
  return [input.sport === "softball" ? "bases_double_sb" : "bases_home_2nd"];
}
