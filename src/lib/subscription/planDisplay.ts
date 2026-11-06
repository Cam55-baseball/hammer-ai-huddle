// Owner Nov 6 r5: what plan-naming screens show, from the one shared activePlans judge.
import { PROGRAM_NAMES, heldPlans, planForStoredKey, type ProgramSport, type TrainingProgram } from "../../../supabase/functions/_shared/programAccess";

const SPORT_NAME: Record<ProgramSport, string> = { baseball: "Baseball", softball: "Softball" };

/** "Baseball · The Golden 2Way" — one label per plan the player really holds. */
export function heldPlanLabels(storedModules: readonly string[], primarySport: string): string[] {
  return heldPlans(storedModules, primarySport).map(({ sport, plan }) => `${SPORT_NAME[sport]} · ${PROGRAM_NAMES[plan]}`);
}

export type BillingRow = { key: string; sport: ProgramSport; module: string; plan: TrainingProgram; planTitle: string; note?: string; details: any };

/** One billing row per stored payment, titled by the held plan it belongs to. A payment that is
 *  already part of Golden 2Way keeps its controls but never names a second plan. */
export function billingRows(moduleDetails: Record<string, any> | null | undefined, storedModules: readonly string[], primarySport: string): BillingRow[] {
  const rows: BillingRow[] = [];
  for (const [key, details] of Object.entries(moduleDetails ?? {})) {
    const p = planForStoredKey(key, storedModules, primarySport);
    if (!p || !details) continue;
    const module = key.includes("_") ? key.slice(key.indexOf("_") + 1) : key;
    rows.push({
      key, sport: p.sport, module, plan: p.plan, planTitle: PROGRAM_NAMES[p.plan], details,
      note: p.included ? `Your own payment. It's already part of ${PROGRAM_NAMES[p.plan]}.` : undefined,
    });
  }
  // The plan's own row first, then payments that are part of it.
  return rows.sort((a, b) => a.sport.localeCompare(b.sport) || Number(!!a.note) - Number(!!b.note));
}
