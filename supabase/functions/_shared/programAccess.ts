import { ownerPositionOnly } from "./owner/ownerPositionException.ts";
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
export function planningProgramModules(userId: string | null | undefined, modules: readonly string[], primarySport: string): string[] {
  if (ownerPositionOnly(userId) && (primarySport === "baseball" || primarySport === "softball")) {
    return normalizeProgramModules([`${primarySport}_5tool`], primarySport);
  }
  return normalizeProgramModules(modules, primarySport);
}

/** Owner Nov 5 #2: the ONE player-facing program judge input. Every screen that decides which
 * questions, prompts or cards a player sees passes its modules through here. Access (purchases,
 * navigation) keeps the raw subscription; only the owner-only planning rule changes the result. */
export function playerProgramModules(userId: string | null | undefined, modules: readonly string[]): string[] {
  if (ownerPositionOnly(userId)) return normalizeProgramModules(["baseball_5tool", "softball_5tool"], "baseball");
  return [...modules];
}

/** Owner Nov 6 r5: the ONE "active plans" judge for every screen that names a plan or marks it
 * unlocked. Reads the STORED keys only (never the read-time aliases from normalizeProgramModules,
 * which would turn Complete Pitcher + 5Tool into a fake Golden 2Way, or Golden 2Way into 5Tool).
 * - Golden 2Way is its own plan and already includes Complete Pitcher and 5Tool: show only it.
 * - A tier key wins over the old skill keys it covers (never infer a tier from them).
 * - Old skill-only purchases keep Option A: pitching → Complete Pitcher, hitting/throwing → 5Tool.
 * - Two genuinely separate plans (own Complete Pitcher + sponsored 5Tool) both show. */
export const PROGRAM_ORDER: readonly TrainingProgram[] = ["pitcher", "5tool", "golden2way"];
export const PROGRAM_NAMES: Record<TrainingProgram, string> = { pitcher: "Complete Pitcher", "5tool": "5Tool Player", golden2way: "The Golden 2Way" };
export function activePlans(sport: string, storedModules: readonly string[], primarySport: string = sport): TrainingProgram[] {
  if (sport !== "baseball" && sport !== "softball") return [];
  const keys = new Set(storedModules.map(m => m.trim().toLowerCase()));
  const has = (key: string) => keys.has(`${sport}_${key}`) || (sport === primarySport && keys.has(key));
  if (has("golden2way")) return ["golden2way"];
  // Older accounts with only skill keys keep their legacy reading (pitching + hitting/throwing = Golden 2Way).
  if (!has("pitcher") && !has("5tool") && has("pitching") && (has("hitting") || has("throwing"))) return ["golden2way"];
  const out = new Set<TrainingProgram>();
  if (has("pitcher") || has("pitching")) out.add("pitcher");
  if (has("5tool") || has("hitting") || has("throwing")) out.add("5tool");
  return PROGRAM_ORDER.filter(p => out.has(p));
}
/** Every plan held across both sports, for lists that name plans (Profile, owner lists). */
export function heldPlans(storedModules: readonly string[], primarySport: string): { sport: ProgramSport; plan: TrainingProgram }[] {
  return (["baseball", "softball"] as const).flatMap(sport => activePlans(sport, storedModules, primarySport).map(plan => ({ sport, plan })));
}
/** Which held plan a stored subscription key belongs to (for billing rows). Golden 2Way absorbs the rest. */
export function planForStoredKey(key: string, storedModules: readonly string[], primarySport: string): { sport: ProgramSport; plan: TrainingProgram; included: boolean } | null {
  const k = key.trim().toLowerCase();
  const [first, rest] = k.includes("_") ? [k.slice(0, k.indexOf("_")), k.slice(k.indexOf("_") + 1)] : [primarySport, k];
  if (first !== "baseball" && first !== "softball") return null;
  const own: TrainingProgram | null = rest === "golden2way" ? "golden2way" : rest === "pitcher" || rest === "pitching" ? "pitcher" : rest === "5tool" || rest === "hitting" || rest === "throwing" ? "5tool" : null;
  if (!own) return null;
  const plans = activePlans(first, storedModules, primarySport);
  if (plans.includes(own)) return { sport: first, plan: own, included: false };
  if (!plans.includes("golden2way")) return null;
  // "included" only when a separate Golden 2Way payment exists; legacy skill-key bundles ARE the Golden plan.
  const goldenKey = storedModules.some(m => { const x = m.trim().toLowerCase(); return x === `${first}_golden2way` || (first === primarySport && x === "golden2way"); });
  return { sport: first, plan: "golden2way", included: goldenKey };
}

/** Which question families a program may see. Complete Pitcher: no hitting/bunting; 5Tool: no pitching. */
export function programQuestionScope(program: TrainingProgram | null): { hitting: boolean; bunting: boolean; pitching: boolean; throwing: boolean } {
  if (!program) return { hitting: false, bunting: false, pitching: false, throwing: false };
  return { hitting: program !== "pitcher", bunting: program !== "pitcher", pitching: program !== "5tool", throwing: true };
}
