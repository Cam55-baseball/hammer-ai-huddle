// ---------------------------------------------------------------------------
// WIC Pre-Selection Legality — single source of truth for the gates that used
// to live ONLY inside the post-hoc certifiers.
//
// Root cause this module exists to kill:
//   The generator's eligibility filter consulted the flat numeric
//   `min_training_age_years`, while every certifier consults the categorical
//   `training_age_legality` JSONB map. A movement could therefore be *picked*
//   legally and then *rejected* fatally — the athlete saw a failed plan
//   instead of a legal substitute.
//
// Same story for category counts: selection reasons in sequence ROLES, while
// certification reasons in canonical CATEGORIES, so two different roles could
// resolve to the same single-slot category (e.g. `lift_atg_split_squat` is a
// unilateral role but a `compound_lower` category) and trip
// `lift_duplicate_category` after the fact.
//
// Everything here is pure and deterministic — it never authors a dose and
// never relaxes a constitutional gate. It only tells the selector, up front,
// which candidates the certifier would refuse.
// ---------------------------------------------------------------------------

export const PRE_SELECTION_VERSION = "pre_selection_v1";

export type EngineDomain =
  | "lift"
  | "speed"
  | "bat_speed"
  | "conditioning"
  | "cross_sport"
  | "arm_care";

/** Minimal shape shared by every catalog row we gate. */
export interface LegalityCatalogRow {
  slug: string;
  training_age_legality?: Record<string, boolean> | null;
  season_legality?: Record<string, boolean> | null;
}

/**
 * Mirrors the certifiers exactly: a row is illegal only when the legality map
 * explicitly says `false` for this class. A missing map or a missing key is
 * not an accusation — the certifier treats it as legal, so must we, or the
 * selector would starve slots the certifier would happily accept.
 */
export function isTrainingAgeLegal(
  row: LegalityCatalogRow | null | undefined,
  trainingAgeClass: string | null | undefined,
): boolean {
  if (!row) return false;
  if (!trainingAgeClass) return true;
  const map = row.training_age_legality;
  if (!map) return true;
  return map[trainingAgeClass] !== false;
}

export function trainingAgeIllegalReason(
  row: LegalityCatalogRow,
  trainingAgeClass: string,
): string {
  return `${row.slug} is not legal for training-age class ${trainingAgeClass}.`;
}

/**
 * Categories a session may contain at most once. These sets are copies of the
 * `SINGLE_SLOT` / `SINGLE` sets inside each engine's certifier — keep them in
 * lockstep. A drift here reintroduces exactly the duplicate-category failures
 * this module was built to prevent.
 */
export const SINGLE_SLOT_CATEGORIES: Record<EngineDomain, ReadonlySet<string>> = {
  lift: new Set(["compound_lower", "compound_upper_push", "compound_upper_pull"]),
  speed: new Set(["acceleration", "top_speed", "overspeed", "resisted", "plyometric"]),
  bat_speed: new Set(["overload", "underload", "elastic_rotation"]),
  conditioning: new Set<string>([]),
  cross_sport: new Set(["explosive_transfer", "rotational_power", "reflex", "visual_reaction"]),
  arm_care: new Set(["bullpen", "starter", "reliever", "return_to_throwing"]),
};

export interface CategoryBudget {
  /** False when this category is single-slot and already committed. */
  hasRoom(domain: EngineDomain, category: string | null | undefined): boolean;
  /** Record a category as consumed by an actually-published prescription. */
  commit(domain: EngineDomain, category: string | null | undefined): void;
  counts(): Record<string, number>;
}

export function createCategoryBudget(): CategoryBudget {
  const used = new Map<string, number>();
  const key = (d: EngineDomain, c: string) => `${d}:${c}`;
  return {
    hasRoom(domain, category) {
      if (!category) return true;
      if (!SINGLE_SLOT_CATEGORIES[domain]?.has(category)) return true;
      return (used.get(key(domain, category)) ?? 0) < 1;
    },
    commit(domain, category) {
      if (!category) return;
      const k = key(domain, category);
      used.set(k, (used.get(k) ?? 0) + 1);
    },
    counts() {
      return Object.fromEntries(used.entries());
    },
  };
}

/** A block or slot that was deliberately left out, with an athlete-readable reason. */
export interface SelectionSkip {
  domain: EngineDomain | "session";
  requirement: string;
  reason: string;
  detail?: string;
}

export interface SkipLog {
  record(skip: SelectionSkip): void;
  list(): SelectionSkip[];
  /** Warn-severity validator issues — a skipped block is never fatal. */
  warnings(): Array<{ code: string; severity: "warn"; message: string }>;
  has(domain: EngineDomain): boolean;
}

export function createSkipLog(): SkipLog {
  const skips: SelectionSkip[] = [];
  return {
    record(skip) {
      if (skips.some((s) => s.domain === skip.domain && s.requirement === skip.requirement)) return;
      skips.push(skip);
    },
    list() {
      return [...skips];
    },
    warnings() {
      return skips.map((s) => ({
        code: `selection_skipped:${s.domain}`,
        severity: "warn" as const,
        message: `${s.requirement} — ${s.reason}${s.detail ? ` (${s.detail})` : ""}`,
      }));
    },
    has(domain) {
      return skips.some((s) => s.domain === domain);
    },
  };
}

/**
 * Plain-language explanation shown to the athlete when a block is dropped
 * instead of retried. Never technical — the athlete did nothing wrong.
 */
export function skipReasonCopy(domain: EngineDomain, requirement: string): string {
  const label: Record<EngineDomain, string> = {
    lift: "Lift",
    speed: "Speed",
    bat_speed: "Bat speed",
    conditioning: "Conditioning",
    cross_sport: "Crossover",
    arm_care: "Arm care",
  };
  return `${label[domain]} is paused today: no movement in your library is cleared for your training level and this session's required ${requirement.replace(/_/g, " ")} work. The rest of today's plan is unaffected.`;
}
