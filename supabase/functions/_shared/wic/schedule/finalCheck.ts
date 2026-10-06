/**
 * Final rule check — runs on every plan immediately before it is saved.
 *
 * Owner ruling 2026-10-06: every training rule holds, every day, for every
 * player. Whatever the engines upstream decided, a card that breaks a rule is
 * removed here and the swap is reported, so a broken plan can never be saved.
 * The day's recovery cards (warm-up, mobility, arm care) remain as the allowed
 * recovery option. PURE: no database, no clock.
 */
import { loadedLiftRows } from "./tissueCost/shadow/adapter.ts";

export interface FinalCheckRow {
  slot?: string | null;
  sequence_role?: string | null;
  movement_slug?: string | null;
}

export interface CatalogFacts {
  min_age_years?: number | null;
  eccentric_overload?: boolean | null;
  season_legality?: Record<string, unknown> | null;
}

export interface FinalCheckContext {
  planDate: string;
  phase: string;
  /** Athlete age in whole years; null when unknown (age rules then use the strictest reading: any min age > 13 fails). */
  age: number | null;
  /** Lift days already planned before planDate (done, skipped or missed alike). */
  priorLiftDates: readonly string[];
  /** Full rest days required between lift days for this phase (null = rule not enforced for this player). */
  restDaysBetweenLifts: number | null;
  /** Most lift days in one Monday–Sunday week (null = no weekly rule for this phase). */
  weeklyLiftMax: number | null;
  /** The rest-day calculator removed today's lift. */
  liftRemoved: boolean;
  catalog: ReadonlyMap<string, CatalogFacts>;
}

export interface FinalCheckSwap {
  rule: "lift_spacing" | "weekly_lift_max" | "rest_day" | "min_age" | "eccentric_in_season" | "season_legality";
  movement_slug: string | null;
  slot: string | null;
  detail: string;
}

const dayNum = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
const mondayOf = (iso: string) => {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return dayNum(iso) - ((dow + 6) % 7);
};
const IN_SEASON = new Set(["in_season", "post_season"]);
const APP_MIN_AGE = 13;

export function finalRuleCheck<T extends FinalCheckRow>(
  rows: readonly T[],
  ctx: FinalCheckContext,
): { rows: T[]; swaps: FinalCheckSwap[] } {
  const swaps: FinalCheckSwap[] = [];
  const drop = new Set<T>();

  // 1. Per-movement rules: age, season, eccentric overload in season.
  for (const r of rows) {
    const slug = r.movement_slug ?? "";
    const facts = ctx.catalog.get(slug);
    if (!facts) continue;
    const age = ctx.age ?? APP_MIN_AGE;
    if (facts.min_age_years != null && age < facts.min_age_years) {
      drop.add(r);
      swaps.push({ rule: "min_age", movement_slug: slug, slot: r.slot ?? null, detail: `needs age ${facts.min_age_years}, athlete ${ctx.age ?? "unknown"}` });
      continue;
    }
    if (facts.eccentric_overload === true && IN_SEASON.has(ctx.phase)) {
      drop.add(r);
      swaps.push({ rule: "eccentric_in_season", movement_slug: slug, slot: r.slot ?? null, detail: ctx.phase });
      continue;
    }
    const legal = facts.season_legality?.[ctx.phase];
    if (legal === false) {
      drop.add(r);
      swaps.push({ rule: "season_legality", movement_slug: slug, slot: r.slot ?? null, detail: ctx.phase });
    }
  }

  // 2. Lift-day rules apply to the whole loaded lift, on the plan itself.
  const kept = rows.filter((r) => !drop.has(r));
  const loaded = loadedLiftRows(kept);
  if (loaded.length > 0) {
    let rule: FinalCheckSwap["rule"] | null = null;
    let detail = "";
    const today = dayNum(ctx.planDate);
    const prior = ctx.priorLiftDates.filter((d) => d < ctx.planDate).map(dayNum).sort((a, b) => a - b);
    const last = prior.length ? prior[prior.length - 1] : null;
    if (ctx.liftRemoved) {
      rule = "rest_day";
      detail = "rest-day calculator removed the lift";
    } else if (ctx.restDaysBetweenLifts != null && last != null && today - last - 1 < ctx.restDaysBetweenLifts) {
      rule = "lift_spacing";
      detail = `${today - last - 1} rest days since last planned lift, need ${ctx.restDaysBetweenLifts}`;
    } else if (ctx.weeklyLiftMax != null) {
      const wk = mondayOf(ctx.planDate);
      const inWeek = prior.filter((d) => d >= wk).length;
      if (inWeek >= ctx.weeklyLiftMax) {
        rule = "weekly_lift_max";
        detail = `${inWeek} lift days already this week, max ${ctx.weeklyLiftMax}`;
      }
    }
    if (rule) {
      for (const r of loaded) {
        drop.add(r);
        swaps.push({ rule, movement_slug: r.movement_slug ?? null, slot: r.slot ?? null, detail });
      }
    }
  }

  return { rows: rows.filter((r) => !drop.has(r)), swaps };
}
