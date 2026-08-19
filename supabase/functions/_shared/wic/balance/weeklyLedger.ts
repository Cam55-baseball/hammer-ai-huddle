// Weekly Balance Ledger — enforces the training philosophy ACROSS the week,
// not just inside a single day.
//
// Constitutional bounds:
//   - The ledger is interpretive only. It steers WHICH legal movement fills a
//     discretionary slot and emits warnings; it never authors a dose, never
//     relaxes a gate, and never removes a template-required category.
//   - Pure and deterministic — a replay of the same 7-day history produces the
//     identical shortfalls and warnings.

import type { MovementCategory } from "../lift/movementCategories.ts";

export const WEEKLY_LEDGER_VERSION = "wic_wbl_v1";

/** Minimum exposures per rolling 7 days for the pillars of the program. */
export const WEEKLY_FLOORS: Partial<Record<MovementCategory, number>> = {
  compound_lower: 2,
  compound_upper_push: 2,
  compound_upper_pull: 2,
  single_leg: 2,
  posterior_chain: 2,
  rotation: 2,
  anti_rotation: 1,
  carry: 1,
  core: 3,
};

/**
 * Push : pull band. Throwing athletes stay pull-biased — a shoulder that
 * pushes more than it pulls is a shoulder waiting to fail.
 */
export const PUSH_PULL_BAND = { min: 0.5, max: 1.0 } as const;
export const PUSH_PULL_BAND_THROWER = { min: 0.4, max: 0.85 } as const;

/** Upper : lower band across the week — neither half of the body is skipped. */
export const UPPER_LOWER_BAND = { min: 0.5, max: 1.75 } as const;

export interface LedgerRow {
  plan_date: string;
  movement_slug: string;
  category: MovementCategory | string | null;
}

export interface WeeklyLedger {
  readonly version: string;
  readonly days: number;
  readonly counts: Readonly<Record<string, number>>;
  /** category -> how many exposures short of the weekly floor. */
  readonly shortfalls: Readonly<Record<string, number>>;
  readonly slugs: ReadonlySet<string>;
  readonly pushPullRatio: number | null;
  readonly upperLowerRatio: number | null;
}

export function buildWeeklyLedger(
  rows: readonly LedgerRow[],
  opts: { days?: number } = {},
): WeeklyLedger {
  const counts: Record<string, number> = {};
  const slugs = new Set<string>();
  for (const r of rows) {
    const c = String(r.category ?? "__unknown__");
    counts[c] = (counts[c] ?? 0) + 1;
    if (r.movement_slug) slugs.add(r.movement_slug);
  }

  const shortfalls: Record<string, number> = {};
  for (const [cat, floor] of Object.entries(WEEKLY_FLOORS)) {
    const have = counts[cat] ?? 0;
    if (have < (floor as number)) shortfalls[cat] = (floor as number) - have;
  }

  const push = counts["compound_upper_push"] ?? 0;
  const pull = counts["compound_upper_pull"] ?? 0;
  const upper = push + pull;
  const lower = (counts["compound_lower"] ?? 0) + (counts["single_leg"] ?? 0) +
    (counts["posterior_chain"] ?? 0);

  return Object.freeze({
    version: WEEKLY_LEDGER_VERSION,
    days: opts.days ?? 7,
    counts: Object.freeze(counts),
    shortfalls: Object.freeze(shortfalls),
    slugs,
    pushPullRatio: pull > 0 ? Math.round((push / pull) * 100) / 100 : null,
    // Zero lower-body work with upper work present is the worst imbalance
    // there is — it must never read as "no data".
    upperLowerRatio: lower > 0
      ? Math.round((upper / lower) * 100) / 100
      : (upper > 0 ? Infinity : null),
  }) as WeeklyLedger;
}

/**
 * Bounded steering bonus for a candidate category. A category the week is
 * short on gets picked ahead of one already covered — but the bonus is capped
 * so it can never outrank safety, legality or the template requirement.
 */
export function shortfallBonus(ledger: WeeklyLedger, category: string | null | undefined): number {
  if (!category) return 0;
  const missing = ledger.shortfalls[category] ?? 0;
  return Math.min(0.45, missing * 0.15);
}

/** Variety penalty — a slug already used this week is a weaker pick. */
export function varietyPenalty(ledger: WeeklyLedger, slug: string): number {
  return ledger.slugs.has(slug) ? 0.25 : 0;
}

export interface BalanceWarning {
  code: string;
  message: string;
  detail?: Record<string, unknown>;
}

export function evaluateWeeklyBalance(
  ledger: WeeklyLedger,
  opts: { isThrower?: boolean } = {},
): BalanceWarning[] {
  const out: BalanceWarning[] = [];
  const band = opts.isThrower ? PUSH_PULL_BAND_THROWER : PUSH_PULL_BAND;

  if (ledger.pushPullRatio !== null) {
    if (ledger.pushPullRatio > band.max) {
      out.push({
        code: "weekly_push_pull_imbalance",
        message: `Weekly push:pull is ${ledger.pushPullRatio} — above the ${band.max} ceiling. Next sessions bias pulling.`,
        detail: { ratio: ledger.pushPullRatio, band },
      });
    } else if (ledger.pushPullRatio < band.min) {
      out.push({
        code: "weekly_push_pull_imbalance",
        message: `Weekly push:pull is ${ledger.pushPullRatio} — below the ${band.min} floor. Next sessions restore pressing.`,
        detail: { ratio: ledger.pushPullRatio, band },
      });
    }
  }

  if (ledger.upperLowerRatio !== null) {
    if (ledger.upperLowerRatio > UPPER_LOWER_BAND.max || ledger.upperLowerRatio < UPPER_LOWER_BAND.min) {
      out.push({
        code: "weekly_upper_lower_imbalance",
        message: `Weekly upper:lower is ${Number.isFinite(ledger.upperLowerRatio) ? ledger.upperLowerRatio : "all upper, no lower"} — outside the ${UPPER_LOWER_BAND.min}–${UPPER_LOWER_BAND.max} band.`,
        detail: { ratio: ledger.upperLowerRatio, band: UPPER_LOWER_BAND },
      });
    }
  }

  for (const [cat, missing] of Object.entries(ledger.shortfalls)) {
    out.push({
      code: "weekly_category_shortfall",
      message: `${cat.replace(/_/g, " ")} is ${missing} exposure${missing === 1 ? "" : "s"} short of the weekly floor.`,
      detail: { category: cat, missing },
    });
  }

  return out;
}
