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
  exposure_channel?: string | null;
  intensity_class?: string | null;
  movement_velocity?: string | null;
  plyo_tier?: number | null;
  speed_category?: string | null;
  conditioning_category?: string | null;
  bat_speed_category?: string | null;
}

/** Catalog columns the final check needs (select list for callers). */
export const FINAL_CHECK_CATALOG_COLUMNS =
  "slug, min_age_years, eccentric_overload, season_legality, exposure_channel, intensity_class, movement_velocity, plyo_tier, speed_category, conditioning_category, bat_speed_category";

export type DayKind = "hard_run" | "high_jump" | "bat_over_under";

const HARD_SPEED = new Set(["acceleration", "top_speed", "resisted", "change_of_direction"]);
const HIGH_INTENSITY = new Set(["high", "maximal", "supra_maximal"]);
const LOWER_JUMP_CHANNELS = new Set(["elastic", "shock"]);

/**
 * Owner-approved 2026-10-06. Which spaced kinds a single card is.
 *  hard_run: base-running conditioning (anything but the easy recovery flush)
 *            and max-speed sprints (speed slot, sprint channel, not sub-max,
 *            acceleration / top speed / resisted / change of direction).
 *  high_jump: lower-body jumps at plyo tier 2+ or high/maximal intensity.
 *  bat_over_under: overload or underload bat work.
 */
export function rowKinds(r: FinalCheckRow, f: CatalogFacts | undefined): DayKind[] {
  const out: DayKind[] = [];
  const slot = r.slot ?? r.sequence_role ?? "";
  const slug = r.movement_slug ?? "";
  if (slot === "conditioning" && f?.conditioning_category !== "recovery_flush" && !slug.startsWith("rc_")) out.push("hard_run");
  if (slot === "speed" && f && f.exposure_channel === "sprint" && f.movement_velocity !== "submax"
    && HARD_SPEED.has(String(f.speed_category ?? ""))) out.push("hard_run");
  if (f && LOWER_JUMP_CHANNELS.has(String(f.exposure_channel ?? ""))
    && ((f.plyo_tier ?? 0) >= 2 || HIGH_INTENSITY.has(String(f.intensity_class ?? "")))) out.push("high_jump");
  if (f && (f.bat_speed_category === "overload" || f.bat_speed_category === "underload")) out.push("bat_over_under");
  return out;
}

/** The spaced kinds present on one day's rows. */
export function dayKinds(rows: readonly FinalCheckRow[], catalog: ReadonlyMap<string, CatalogFacts>): Set<DayKind> {
  const s = new Set<DayKind>();
  for (const r of rows) for (const k of rowKinds(r, catalog.get(r.movement_slug ?? ""))) s.add(k);
  return s;
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
  /** Days before planDate (planned, whether done or not) carrying each spaced kind. */
  priorKindDates?: Partial<Record<DayKind, readonly string[]>>;
  /** A game or tournament is on the day after planDate. */
  gameTomorrow?: boolean;
  /** Training already completed today in another program (Iron Bambino, Speed Lab …). */
  sameDayExternal?: { lift?: boolean; hard_run?: boolean };
  /** Growth Mode from measured height (growth/growthMode.ts). */
  growthMode?: boolean;
  catalog: ReadonlyMap<string, CatalogFacts>;
}

export interface FinalCheckSwap {
  rule: "lift_spacing" | "weekly_lift_max" | "rest_day" | "min_age" | "eccentric_in_season" | "season_legality"
    | "run_spacing" | "run_before_game" | "jump_spacing" | "bat_consecutive" | "trained_elsewhere_today" | "growth_mode";
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
    // Growth Mode (§10.2): easy, rhythmic jumps only; no eccentric overload.
    if (ctx.growthMode === true && (facts.eccentric_overload === true || rowKinds(r, facts).includes("high_jump"))) {
      drop.add(r);
      swaps.push({ rule: "growth_mode", movement_slug: slug, slot: r.slot ?? null, detail: facts.eccentric_overload ? "eccentric overload" : "high-intensity jump" });
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
    } else if (ctx.sameDayExternal?.lift) {
      rule = "trained_elsewhere_today";
      detail = "a lift was already completed today in another program";
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

  // 3. Owner-approved spacing for runs, jumps and bat over/underload:
  //    at least one full day between such days (yesterday's plan counts,
  //    done or not), and no hard running the day before a game.
  const yesterday = new Date(Date.parse(`${ctx.planDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const hadYesterday = (k: DayKind) => (ctx.priorKindDates?.[k] ?? []).includes(yesterday);
  for (const r of rows) {
    if (drop.has(r)) continue;
    const kinds = rowKinds(r, ctx.catalog.get(r.movement_slug ?? ""));
    let rule: FinalCheckSwap["rule"] | null = null;
    let detail = "";
    if (kinds.includes("hard_run") && ctx.gameTomorrow) { rule = "run_before_game"; detail = "hard running the day before a game"; }
    else if (kinds.includes("hard_run") && ctx.sameDayExternal?.hard_run) { rule = "trained_elsewhere_today"; detail = "hard running already completed today in another program"; }
    else if (kinds.includes("hard_run") && hadYesterday("hard_run")) { rule = "run_spacing"; detail = "hard running planned yesterday"; }
    else if (kinds.includes("high_jump") && hadYesterday("high_jump")) { rule = "jump_spacing"; detail = "high-intensity jumps planned yesterday"; }
    else if (kinds.includes("bat_over_under") && hadYesterday("bat_over_under")) { rule = "bat_consecutive"; detail = "overload/underload bat work planned yesterday"; }
    if (rule) {
      drop.add(r);
      swaps.push({ rule, movement_slug: r.movement_slug ?? null, slot: r.slot ?? null, detail });
    }
  }

  return { rows: rows.filter((r) => !drop.has(r)), swaps };
}
