/** Explicit gentle identities only. A mobility label cannot certify training as recovery. */
export const SOFT_RECOVERY_SLUGS = new Set([
  "rc_breathing_reset", "ac_recovery_belly_breathing", "wu_crocodile_breathing",
  "wu_9020_reset", "wu_foam_roll_tspine", "thoracic_foam_roll", "plantar_fascia_release",
  "wu_lacrosse_ball_pec", "wu_lacrosse_ball_glute", "wu_calf_softball_pin",
  "wu_tspine_open_book", "wu_thoracic_windmill", "wu_thread_the_needle_slow",
  "wu_lateral_line_reach", "wu_ankle_cars", "wu_wrist_cars", "wu_90_90_switch",
]);
export function isSoftRecovery(slug: string | null | undefined): boolean {
  return typeof slug === "string" && SOFT_RECOVERY_SLUGS.has(slug);
}
/** Read legacy saved context as well as the canonical current builder spelling. */
export function isWholeRestDayType(dayType: unknown): boolean {
  return dayType === "recovery" || dayType === "recovery_day" || dayType === "off_day";
}