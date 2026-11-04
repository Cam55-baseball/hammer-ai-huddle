/** One program judge for tier keys and historical skill subscriptions.
 * Unprefixed historical keys belong only to the saved primary sport. This is
 * a read-time projection, never a subscription write or cross-sport grant.
 */
export type ProgramSport = "baseball" | "softball";
export type TrainingProgram = "pitcher" | "5tool" | "golden2way";
export function programOf(sport: string, modules: readonly string[], primarySport: string = sport): TrainingProgram | null {
  if (sport !== "baseball" && sport !== "softball") return null;
  const keys = new Set(modules.map(m => m.trim().toLowerCase()));
  const has = (key: string) => keys.has(`${sport}_${key}`) || (sport === primarySport && keys.has(key));
  const hitting = has("hitting") || has("5tool") || has("golden2way");
  const pitching = has("pitching") || has("pitcher") || has("golden2way");
  const throwing = has("throwing") || has("5tool") || has("golden2way");
  if (hitting && pitching) return "golden2way";
  if (pitching) return "pitcher";
  return hitting || throwing ? "5tool" : null;
}

/** Preserve original keys while exposing canonical program/skill aliases to
 * existing subscription-specific readers. Never turn the other sport's keys
 * into an entitlement for the selected sport.
 */
export function normalizeProgramModules(modules: readonly string[], primarySport: string): string[] {
  const keys = new Set(modules.map(m => m.trim().toLowerCase()));
  for (const sport of ["baseball", "softball"] as const) {
    const program = programOf(sport, modules, primarySport);
    if (!program) continue;
    keys.add(`${sport}_${program}`);
    if (program !== "pitcher") { keys.add(`${sport}_hitting`); keys.add(`${sport}_throwing`); }
    if (program !== "5tool") keys.add(`${sport}_pitching`);
  }
  // Once scoped, bare aliases must not be reinterpreted for the other sport.
  for (const key of ['hitting', 'pitching', 'throwing', 'pitcher', '5tool', 'golden2way']) keys.delete(key);
  return [...keys];
}
/** Owner Nov 4 r2 #3: the single owner-account planning rule. Cam Williams keeps every
 * purchased module for ACCESS (check-subscription is untouched), but his Hammers Today
 * plan is built exactly like a 5Tool Player (position player) in the plan's sport.
 * Exactly one literal ID; no other account (including other owner-role accounts). */
export const OWNER_PLAN_AS_5TOOL_USER_ID = "95de827d-7418-460b-8b79-267bf79bdca4";
export function planningProgramModules(userId: string | null | undefined, modules: readonly string[], primarySport: string): string[] {
  if (userId === OWNER_PLAN_AS_5TOOL_USER_ID && (primarySport === "baseball" || primarySport === "softball")) {
    return normalizeProgramModules([`${primarySport}_5tool`], primarySport);
  }
  return normalizeProgramModules(modules, primarySport);
}
