/**
 * Step 20 Part A — the automated safety audit that replaces per-row human
 * approval.
 *
 * PURE. No database, no clock, no network. The nightly job, the edge function
 * and the report script all call `auditRow` so they can never disagree.
 *
 * A row may switch itself on only when EVERY check passes. A check never
 * "tunes" to let a row through: when a rule and a row disagree, the row stays
 * off and the failing check is named.
 */

export const SAFETY_AUDIT_VERSION = "catalog_safety_audit_v1_0";

/** Displayed text may never carry an outside brand or coach name. */
export const OUTSIDE_NAMES =
  /driveline|cressey|westside|heenan|marinovich|ido[ _]?portal|summers|poliquin|triphasic|knees over toes|functional patterns|goata|jaeger|jobes|crossover symmetry|oates|louie simmons|ben patrick|pavel|bosch|cal dietz|seagrave|holler|altis|pfaff/i;

/** Mirrors `EQUIPMENT_VOCABULARY` in src/lib/hammer/context/equipmentVocabulary.ts. */
export const EQUIPMENT_TOKENS = new Set([
  "barbell", "plates", "squat_rack", "bench", "dumbbell", "kettlebell", "trap_bar",
  "cable_stack", "landmine", "box", "mini_band", "jband", "bands", "med_ball",
  "plyo_ball", "ladder", "hurdles", "foam_roller", "lacrosse_ball", "rebounder",
  "gamer_bat", "overload_bat", "underload_bat", "tee", "ball", "net", "screen",
  "pitching_machine", "weighted_ball", "glove", "catchers_gear", "radar",
  "bat_sensor", "mound", "turf", "wall", "sled", "hill", "overspeed_cord",
  "bodyweight", "treadmill", "low_bar", "grain_bucket", "strap", "prowler", "smith_machine", "safety_pins", "mini_hurdle",
]);

export const CANONICAL_BUCKETS = new Set([
  "Movement Prep & Tissue",
  "Lower-Body Elastic",
  "Upper-Body Elastic",
  "Hand & Wrist Chain",
  "Speed",
  "Sleds",
  "Strength",
  "Arm Care & Throwing Support",
  "Med Ball & Rotational Power",
  "Recovery & Regeneration",
]);

export const LEGAL_SEASONS = new Set([
  "os_q1", "os_q2", "os_q3", "os_q4", "pre_season", "in_season", "post_season",
]);

/** Age and training-age floors per tier. Never lowered by this audit. */
export const TIER_AGE_FLOOR: Record<string, { age: number; trainingAge: number }> = {
  T1: { age: 13, trainingAge: 0 },
  T2: { age: 14, trainingAge: 1 },
  T3: { age: 16, trainingAge: 2 },
  U1: { age: 13, trainingAge: 0 },
  U2: { age: 14, trainingAge: 1 },
  U3: { age: 16, trainingAge: 2 },
};

export interface AuditCatalogRow {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  cue: string | null;
  bucket: string | null;
  sub_bucket: string | null;
  intensity_class: string | null;
  cns_cost: number | null;
  min_age_years: number | null;
  min_training_age_years: number | null;
  season_eligibility: string[] | null;
  equipment_requirements: string[] | null;
  equipment: string[] | null;
  regression_slug: string | null;
  eccentric_overload: boolean | null;
  deep_flexion: boolean | null;
  ub_tier: string | null;
  plyo_tier?: string | null;
  dosage_unit: string | null;
  default_sets: number | null;
  default_reps: number | null;
  default_duration_seconds: number | null;
  default_distance_feet: number | null;
  default_total_reps: number | null;
  is_active: boolean | null;
  superseded_by: string | null;
}

export interface AuditResult {
  id: string;
  slug: string;
  pass: boolean;
  failures: string[];
}

const REP_UNITS = new Set(["reps", "rep", ""]);

/**
 * Step 23 A1 — tier labels arrive in two shapes: upper-body tiers as text
 * ("U3") and jump tiers as a plain number (3). Both must land on the same
 * floor table, or a Tier-3 row is silently never age-checked.
 */
export function normalizeTier(row: { ub_tier?: string | null; plyo_tier?: string | number | null }): string {
  const ub = String(row.ub_tier ?? "").trim().toUpperCase();
  if (ub) return /^\d+$/.test(ub) ? `U${ub}` : ub;
  const plyo = String(row.plyo_tier ?? "").trim().toUpperCase();
  if (!plyo) return "";
  return /^\d+$/.test(plyo) ? `T${plyo}` : plyo;
}


/** One row against every check. Returns the exact failing checks by name. */
export function auditRow(
  row: AuditCatalogRow,
  index: { activeSlugs: Set<string>; allSlugs: Set<string>; liveEquipment: Set<string> },
): AuditResult {
  const f: string[] = [];
  const tier = normalizeTier(row);

  // 1. age and training-age floors match the tier.
  //    Step 23 A1 — U3 (and T3) are 16+ and advanced only. This is the check
  //    the two active rows slipped past, because they were never candidates:
  //    `auditActiveRows` now runs it over live rows too.
  if (tier && TIER_AGE_FLOOR[tier]) {
    const floor = TIER_AGE_FLOOR[tier];
    if ((row.min_age_years ?? 0) < floor.age) {
      f.push(`min age ${row.min_age_years ?? "none"} is below the ${tier} floor of ${floor.age}`);
    }
    if (Number(row.min_training_age_years ?? 0) < floor.trainingAge) {
      f.push(`training-age floor below the ${tier} minimum of ${floor.trainingAge}`);
    }
  }
  if (row.min_age_years == null) f.push("no minimum age set");


  // 2. phase and season legality consistent with the laws
  const seasons = row.season_eligibility ?? [];
  if (seasons.length === 0) f.push("no season eligibility");
  for (const s of seasons) {
    if (!LEGAL_SEASONS.has(String(s))) f.push(`season "${s}" is not a legal season name`);
  }
  if (row.eccentric_overload === true) {
    // Law L0.3 / TI-0a-1 — eccentric overload is offseason only, never in or
    // after the season, on any path.
    for (const s of seasons) {
      if (s === "in_season" || s === "post_season") {
        f.push("eccentric overload is not legal in season or post-season (law L0.3)");
      }
    }
    if ((row.min_age_years ?? 0) < 16) f.push("eccentric overload below age 16");
  }
  if (row.deep_flexion === true && (row.min_age_years ?? 0) < 14) {
    f.push("deep-flexion row below age 14");
  }

  // 3. equipment tags exist in the vocabulary. The vocabulary is the onboarding
  // token list PLUS every tag already carried by a live row — a tag the app has
  // been matching against for months is in use, and an unknown new tag is the
  // real risk.
  const equip = [...(row.equipment_requirements ?? []), ...(row.equipment ?? [])];
  for (const e of equip) {
    if (!EQUIPMENT_TOKENS.has(String(e)) && !index.liveEquipment.has(String(e))) {
      f.push(`equipment tag "${e}" is not in the vocabulary`);
    }
  }

  // 4. no outside brand or coach name anywhere the athlete can see
  for (const [label, text] of [
    ["name", row.name],
    ["cue", row.cue ?? ""],
    ["category", String(row.category ?? "").replace(/_/g, " ")],
    ["slug", row.slug],
  ] as const) {
    if (OUTSIDE_NAMES.test(String(text))) f.push(`outside name in the ${label}`);
  }

  // 5. the regression chain resolves to a legal, active row
  if (row.regression_slug) {
    if (!index.allSlugs.has(row.regression_slug)) {
      f.push(`regression "${row.regression_slug}" does not exist`);
    } else if (!index.activeSlugs.has(row.regression_slug)) {
      f.push(`regression "${row.regression_slug}" is not active`);
    }
  }

  // 6. dose fields sane for the declared unit.
  //
  // Sets and reps are NOT the catalog's to hold: the dosage doctrine is the
  // only authority allowed to produce a set or rep number, and the catalog's
  // default_sets / default_reps are legacy placeholders. So the check here is
  // the one that actually matters — a row that measures itself in seconds,
  // feet or total reps must carry that number, and must never hide it in
  // default_reps (the bug that took every card down once before).
  const unit = String(row.dosage_unit ?? "reps").toLowerCase().trim();
  if (!REP_UNITS.has(unit) && row.default_reps != null) {
    f.push(`unit "${unit}" but the dose is stored in default_reps`);
  }
  if (!REP_UNITS.has(unit)) {
    const dose = unit.startsWith("sec") || unit.startsWith("min")
      ? row.default_duration_seconds
      : unit.startsWith("yard") || unit.startsWith("feet") || unit.startsWith("dist")
      ? row.default_distance_feet
      : row.default_total_reps ?? row.default_duration_seconds ?? row.default_distance_feet;
    if (!dose || dose <= 0) f.push(`unit "${unit}" but no dose for it`);
  }

  // 7. bucket and sub-bucket set, inside the canonical tree
  if (!row.bucket) f.push("no bucket");
  else if (!CANONICAL_BUCKETS.has(row.bucket)) f.push(`bucket "${row.bucket}" is outside the tree`);
  if (!row.sub_bucket) f.push("no sub-bucket");

  // 8. an intensity class the ceiling check can read
  if (!resolveIntensityClass(row)) f.push("no intensity class and none can be derived");

  if (row.superseded_by) f.push("superseded by another row");

  return { id: row.id, slug: row.slug, pass: f.length === 0, failures: f };
}

/**
 * Step 20 C2, extended by Step 23 A2 — the documented intensity-class mapping.
 *
 * Every row gets an intensity class so the ceiling check can always compare
 * like with like. A stored `intensity_class` always wins. When it is missing
 * the class is derived from the row's own category, method family and effort
 * cost (`cns_cost`) — the same information a human would use. Nothing is
 * guessed: a row with no category and no effort cost returns null and stays
 * flagged in the report.
 *
 *   MAPPING v1.1 (Step 23)
 *   a. stored intensity_class                                  → itself
 *   b. warmup / shoulder_prep / movement_patterning            → supplemental
 *   c. hand_wrist_chain                                        → supplemental
 *   d. arm_care                                                → arm_care
 *   e. speed_lab / sprint_mechanics / throwing_plyo /
 *      upper_body_plyo / lower_body_plyo / plyometric          → elastic
 *   f. trunk / kot / movement_capacity / posterior_chain /
 *      cross_sport                                             → low
 *   g. conditioning                                            → moderate
 *   h. max_effort_strength / pap_bridge (contrast pairs)       → maximal
 *   i. anything else, by effort cost:
 *        0 or 1 → supplemental · 2 → low · 3 → moderate
 *        4 → high · 5 and above → maximal
 *   j. no category and no effort cost                          → null (flagged)
 *
 * Deriving never widens anything: it can only give a row a class where it had
 * none, and the ceiling only ever removes work.
 */
export const INTENSITY_MAPPING_VERSION = "intensity_class_mapping_v1_1";

export function resolveIntensityClass(row: {
  intensity_class?: string | null;
  category?: string | null;
  cns_cost?: number | null;
}): string | null {
  const stored = String(row.intensity_class ?? "").trim();
  if (stored) return stored;
  const cat = String(row.category ?? "").toLowerCase();
  if (!cat && row.cns_cost == null) return null;
  if (cat === "warmup" || cat === "shoulder_prep" || cat === "movement_patterning") return "supplemental";
  if (cat === "hand_wrist_chain") return "supplemental";
  if (cat === "arm_care") return "arm_care";
  if (
    cat === "speed_lab" || cat === "sprint_mechanics" || cat === "throwing_plyo" ||
    cat === "upper_body_plyo" || cat === "lower_body_plyo" || cat === "plyometric"
  ) return "elastic";
  if (
    cat === "trunk" || cat === "kot" || cat === "movement_capacity" ||
    cat === "posterior_chain" || cat === "cross_sport"
  ) return "low";
  if (cat === "conditioning") return "moderate";
  if (cat === "max_effort_strength" || cat === "pap_bridge") return "maximal";
  const cns = row.cns_cost;
  if (cns == null) return cat ? "low" : null;
  const n = Number(cns);
  if (!Number.isFinite(n)) return cat ? "low" : null;
  if (n <= 1) return "supplemental";
  if (n === 2) return "low";
  if (n === 3) return "moderate";
  if (n === 4) return "high";
  return "maximal";
}


/** Audit a whole catalog. Only inactive, non-superseded rows are candidates. */
export function auditCatalog(rows: AuditCatalogRow[]): {
  candidates: AuditResult[];
  passing: AuditResult[];
  failing: AuditResult[];
} {
  const activeSlugs = new Set(rows.filter((r) => r.is_active).map((r) => r.slug));
  const allSlugs = new Set(rows.map((r) => r.slug));
  const liveEquipment = new Set<string>();
  for (const r of rows) {
    if (r.is_active !== true) continue;
    for (const e of [...(r.equipment_requirements ?? []), ...(r.equipment ?? [])]) liveEquipment.add(String(e));
  }
  const candidates = rows
    .filter((r) => r.is_active !== true && !r.superseded_by)
    .map((r) => auditRow(r, { activeSlugs, allSlugs, liveEquipment }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return {
    candidates,
    passing: candidates.filter((c) => c.pass),
    failing: candidates.filter((c) => !c.pass),
  };
}

/**
 * Step 23 A1 — the drift audit over rows that are ALREADY ON.
 *
 * `auditCatalog` only ever looked at switched-off rows, so a live row whose
 * age floor was wrong from the start was never checked by anything. This runs
 * the hard safety laws — tier age/training-age floors, the eccentric-overload
 * season law, the deep-flexion floor, outside names — over every active row.
 *
 * Data-completeness checks (missing unit, missing sub-bucket) are deliberately
 * NOT included: they are activation gates, not safety laws, and a live row
 * failing one is a report item, not a reason to pull a working card.
 */
export type ActiveAuditResult = AuditResult & { blocking: boolean };


export function auditActiveRows(rows: AuditCatalogRow[]): ActiveAuditResult[] {
  const out: ActiveAuditResult[] = [];
  for (const row of rows) {
    if (row.is_active !== true) continue;
    const f: string[] = [];
    // A breach only blocks the night's run when it is one of the named hard
    // laws (advanced-tier 16+, eccentric overload, athlete-visible outside
    // names). Everything else is reported for the owner, never acted on
    // silently — no threshold is moved to make a check pass.
    let blocking = false;
    const tier = normalizeTier(row);
    if (tier && TIER_AGE_FLOOR[tier]) {
      const floor = TIER_AGE_FLOOR[tier];
      const hard = tier === "U3" || tier === "T3";
      if ((row.min_age_years ?? 0) < floor.age) {
        f.push(`${tier} row is live with a minimum age of ${row.min_age_years ?? "none"}; the ${tier} floor is ${floor.age}`);
        blocking ||= hard;
      }
      if (Number(row.min_training_age_years ?? 0) < floor.trainingAge) {
        f.push(`${tier} row is live with a training-age floor below the ${tier} minimum of ${floor.trainingAge}`);
        blocking ||= hard;
      }
    }
    if (row.eccentric_overload === true) {
      for (const s of row.season_eligibility ?? []) {
        if (s === "in_season" || s === "post_season") {
          f.push("eccentric overload is live in season or post-season (law L0.3)");
          blocking = true;
        }
      }
      if ((row.min_age_years ?? 0) < 16) {
        f.push("eccentric overload live below age 16");
        blocking = true;
      }
    }
    if (row.deep_flexion === true && (row.min_age_years ?? 0) < 14) {
      f.push("deep-flexion row live below age 14");
    }
    for (const [label, text] of [
      ["name", row.name],
      ["cue", row.cue ?? ""],
      ["category", String(row.category ?? "").replace(/_/g, " ")],
      ["slug", row.slug],
    ] as const) {
      if (OUTSIDE_NAMES.test(String(text))) {
        f.push(`outside name in the ${label}`);
        // A slug is internal plumbing; only text an athlete can read blocks.
        blocking ||= label !== "slug";
      }
    }
    if (f.length > 0) out.push({ id: row.id, slug: row.slug, pass: false, failures: f, blocking });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}


/** Step 23 A2 — how much of the live catalog the ceiling check can read. */
export function intensityClassCoverage(rows: AuditCatalogRow[]): {
  active: number;
  stored: number;
  derived: number;
  unmapped: string[];
} {
  const active = rows.filter((r) => r.is_active === true);
  const unmapped: string[] = [];
  let stored = 0;
  let derived = 0;
  for (const r of active) {
    if (String(r.intensity_class ?? "").trim()) stored++;
    else if (resolveIntensityClass(r)) derived++;
    else unmapped.push(r.slug);
  }
  return { active: active.length, stored, derived, unmapped: unmapped.sort() };
}

