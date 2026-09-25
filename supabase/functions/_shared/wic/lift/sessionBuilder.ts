// Phase 8 — Session Builder Pipeline
// Deterministic chain used to CERTIFY (and, where possible, augment) an
// already-composed lift block against the constitutional Elite Performance
// Engine. This module NEVER mutates non-lift prescriptions. It attaches
// governance metadata (template, category, substitution ladder, reasoning)
// to each lift row's why_v2 payload and reports fatal issues to the caller.

import type { LiftTemplate, LiftTemplateId, TemplateResolutionInput } from "./templates.ts";
import { LIFT_TEMPLATES, resolveLiftTemplate } from "./templates.ts";
import type { MovementCategory } from "./movementCategories.ts";
import { ALL_CATEGORIES, coverageOf, missingCategories } from "./movementCategories.ts";
import type { CatalogEntry, SubstitutionLadder } from "./substitutions.ts";
import { ladderCompleteness, resolveSubstitutionLadder } from "./substitutions.ts";

export interface LiftRxLike {
  slot: string;
  movement_slug: string;
  movement_name: string;
  sequence_order: number;
  sequence_role?: string | null;
  why_payload?: Record<string, unknown> | null;
  why_v2?: Record<string, unknown> | null;
}

export interface CertifyLiftInput {
  prescriptions: LiftRxLike[];
  catalog: readonly CatalogEntry[];
  template: TemplateResolutionInput;
  availableEquipment?: readonly string[];
  trainingAgeClass?: string;
  /**
   * The day itself removed loaded work (48-hour pre-game primer-only window,
   * a declared rest day, or a Tell Hammers hold). On those days a missing
   * required category is an honest gap, never a build failure: the schedule
   * law already decided nothing loaded may appear.
   */
  loadedWorkSuppressed?: boolean;
}


export interface LiftGovernanceStamp {
  template_id: string;
  template_name: string;
  category: MovementCategory | string | null;
  substitution_family: string | null;
  substitution_ladder: SubstitutionLadder;
  ladder_score: number;
  ladder_complete: boolean;
  why_category: string;
  why_template: string;
  why_substitution_ladder: string;
}

export interface CertifyLiftResult {
  templateId: string;
  templateName: string;
  categoryCoverage: Record<string, number>;
  fullBodyOk: boolean;
  missingRequired: MovementCategory[];
  duplicateCheckOk: boolean;
  duplicatedCategories: string[];
  substitutionCompleteness: number; // 0..1 mean across lift rows
  governanceVersion: string;
  stamps: Map<string, LiftGovernanceStamp>; // keyed by movement_slug
  fatal: Array<{ code: string; message: string; slug?: string }>;
  warn: Array<{ code: string; message: string; slug?: string }>;
}

const GOV_VERSION = "gov_v1";

// Belt-and-braces coercion: if the catalog's movement_category is missing or
// non-canonical, infer the canonical MovementCategory from the row's other
// governance columns (category, pattern) so the certifier never fails purely
// because of a stale/dirty philosophy label in the catalog column. The primary
// fix is the database canonicalization; this is the safety net that keeps
// users unblocked even if a bad seed slips in later.
const CANONICAL_SET = new Set<string>(ALL_CATEGORIES as readonly string[]);

export function coerceCanonicalCategory(cat: Partial<CatalogEntry> | undefined): MovementCategory | null {
  if (!cat) return null;
  const raw = (cat as { movement_category?: string | null }).movement_category ?? null;
  if (raw && CANONICAL_SET.has(raw)) return raw as MovementCategory;

  const pattern = ((cat as { pattern?: string | null }).pattern ?? "").toLowerCase();
  const category = ((cat as { category?: string | null }).category ?? "").toLowerCase();

  // Pattern first (strongest signal).
  if (pattern === "squat") return "compound_lower";
  if (pattern === "hinge") return "posterior_chain";
  if (pattern === "hinge_squat") return "compound_lower";
  if (pattern === "push" || pattern === "upper_push") return "compound_upper_push";
  if (pattern === "pull" || pattern === "upper_pull") return "compound_upper_pull";
  if (pattern === "carry_antirotation") return "carry";
  if (pattern === "rotational") return "rotation";
  if (pattern === "trunk") return "core";
  if (pattern === "mobility") return "mobility";
  if (pattern === "plyometric" || pattern === "plyo") return "jump_landing";
  if (pattern === "arm_care") return "arm_care";

  // Category fallback.
  if (category === "arm_care") return "arm_care";
  if (category === "unilateral_lower") return "single_leg";
  if (category === "unilateral_pull") return "compound_upper_pull";
  if (category === "unilateral_push") return "compound_upper_push";
  if (category === "carry_antirotation") return "carry";
  if (category === "trunk") return "core";
  if (category === "warmup" || category === "conditioning" || category === "cross_sport" || category === "movement_patterning" || category === "functional_patterning") return "mobility";
  if (category === "kot" || category === "posterior_chain" || category === "summers") return "single_leg";
  if (category === "max_effort_strength" || category === "westside" || category === "olympic" || category === "compound" || category === "strength") return "compound_lower";
  if (category === "strongfirst") return "carry";
  if (category === "shoulder_prep" || category === "throwing_plyo" || category === "cressey_sp" || category === "driveline") return "arm_care";
  if (category === "rotational_strength" || category === "movement_capacity" || category === "sprint_mechanics" || category === "heenan" || category === "ido_portal" || category === "marinovich" || category === "speed_lab") return "mobility";
  if (category === "pap_bridge" || category === "bat_speed") return "rotation";
  if (category === "supplemental") return "posterior_chain";

  return null;
}



export function certifyLift(input: CertifyLiftInput): CertifyLiftResult {
  const template = resolveLiftTemplate(input.template);
  const liftRxs = input.prescriptions.filter((r) => r.slot === "lift");
  const catalogBySlug = new Map(input.catalog.map((c) => [c.slug, c] as const));
  const familyCounts = new Map<string, number>();
  for (const c of input.catalog) {
    const f = c.substitution_family;
    if (!f) continue;
    familyCounts.set(f, (familyCounts.get(f) ?? 0) + 1);
  }

  const stamps = new Map<string, LiftGovernanceStamp>();
  const fatal: CertifyLiftResult["fatal"] = [];
  const warn: CertifyLiftResult["warn"] = [];
  const ladderScores: number[] = [];

  // Governance metadata presence check (per-slug).
  for (const rx of liftRxs) {
    const cat = catalogBySlug.get(rx.movement_slug);
    if (!cat) {
      fatal.push({
        code: "lift_governance_missing",
        message: `Movement ${rx.movement_slug} not present in catalog.`,
        slug: rx.movement_slug,
      });
      continue;
    }
    if (!cat.movement_category) {
      fatal.push({
        code: "lift_governance_missing",
        message: `Movement ${rx.movement_slug} has no movement_category (gov_v1 required).`,
        slug: rx.movement_slug,
      });
    }
    const resolvedCategory = coerceCanonicalCategory(cat);

    // Season / age legality using the new registry (belt-and-braces on top of
    // legacy phase_allow, which the generator already enforces).
    const phase = input.template.seasonPhase;
    if (phase && cat.season_legality && cat.season_legality[phase] === false) {
      fatal.push({
        code: "lift_illegal_season",
        message: `${rx.movement_slug} is not season-legal for phase ${phase}.`,
        slug: rx.movement_slug,
      });
    }
    const taClass = input.trainingAgeClass;
    if (taClass && cat.training_age_legality && cat.training_age_legality[taClass] === false) {
      fatal.push({
        code: "lift_illegal_training_age",
        message: `${rx.movement_slug} is not legal for training-age class ${taClass}.`,
        slug: rx.movement_slug,
      });
    }
    // Equipment legality.
    if (input.availableEquipment && cat.equipment_requirements) {
      const avail = new Set(input.availableEquipment.map((s) => String(s).toLowerCase()));
      const missing = (cat.equipment_requirements ?? []).filter(
        (r) => !avail.has(String(r).toLowerCase()),
      );
      if (missing.length > 0 && input.availableEquipment.length > 0) {
        // Warn only — availableEquipment may be an incomplete inventory.
        warn.push({
          code: "lift_illegal_equipment",
          message: `${rx.movement_slug} requires equipment not listed as available: ${missing.join(", ")}`,
          slug: rx.movement_slug,
        });
      }
    }

    const ladder = resolveSubstitutionLadder({
      movement: cat,
      catalog: input.catalog,
      availableEquipment: input.availableEquipment,
      phase: input.template.seasonPhase,
      trainingAgeClass: input.trainingAgeClass,
    });
    const familySize = cat.substitution_family ? (familyCounts.get(cat.substitution_family) ?? 1) - 1 : 0;
    const { complete, score } = ladderCompleteness(ladder, familySize);
    ladderScores.push(score);
    if (!complete && familySize > 0) {
      fatal.push({
        code: "lift_unresolved_substitution",
        message: `${rx.movement_slug} has ${familySize} known alternates but resolver produced <2 rungs.`,
        slug: rx.movement_slug,
      });
    }

    stamps.set(rx.movement_slug, {
      template_id: template.id,
      template_name: template.displayName,
      category: resolvedCategory,
      substitution_family: cat.substitution_family ?? null,
      substitution_ladder: ladder,
      ladder_score: score,
      ladder_complete: complete,
      why_category: resolvedCategory
        ? `Categorized as ${resolvedCategory} in the Phase 8 governance registry.`
        : `Category missing — governance version pending.`,
      why_template: `Placed under the ${template.displayName} template because season=${input.template.seasonPhase ?? "n/a"}, adaptation=${input.template.primaryAdaptation ?? "n/a"}, day_type=${input.template.dayType ?? "n/a"}.`,
      why_substitution_ladder: familySize > 0
        ? `Substitution family "${cat.substitution_family}" exposes ${familySize} alternates across equipment / facility / injury / time / coach-override rungs.`
        : `No known alternates — movement is family-singleton.`,
    });
  }

  // Category coverage → full-body check. Use the coerced canonical category so
  // the certifier is resilient to legacy philosophy labels in the catalog.
  const categorized = liftRxs.map((r) => ({
    slug: r.movement_slug,
    movement_category: coerceCanonicalCategory(catalogBySlug.get(r.movement_slug)),
  }));

  const categoryCoverage = coverageOf(categorized);
  let missing = missingCategories(template.requiredCategories, categorized);
  let fullBodyOk = missing.length === 0;
  let certifiedTemplate: LiftTemplate = template;

  // General rule for every template: a required category the day's filters
  // emptied is never a build failure while a template exists whose
  // requirements the legal rows already meet. Swap to the lighter template and
  // say so on the card. Legality is never widened — this only re-labels rows
  // that already passed every gate.
  if (liftRxs.length > 0 && !fullBodyOk && input.loadedWorkSuppressed !== true) {
    const swap = pickSatisfiableTemplate(template, categorized);
    if (swap) {
      const before = missing;
      certifiedTemplate = swap;
      missing = [];
      fullBodyOk = true;
      const reason = `Today's limits left no legal ${before.join(", ").replace(/_/g, " ")} option, so this lift uses the ${swap.displayName} plan instead of ${template.displayName}.`;
      warn.push({ code: "lift_template_swapped", message: reason });
      for (const st of stamps.values()) {
        st.template_id = swap.id;
        st.template_name = swap.displayName;
        st.why_template = reason;
      }
    }
  }

  if (liftRxs.length > 0 && !fullBodyOk) {
    // A day that legally removed loaded work cannot also be required to carry
    // a compound lift. Report the gap, never fail the build.
    const sink = input.loadedWorkSuppressed === true ? warn : fatal;
    sink.push({
      code: "lift_not_full_body",
      message: input.loadedWorkSuppressed === true
        ? `Loaded work is suppressed today (pre-game primer window, rest day or hold) — missing categories for template ${template.id}: ${missing.join(", ")}.`
        : `Missing required categories for template ${template.id}: ${missing.join(", ")}.`,
    });
    // Also emit specific missing-category codes for the audit surface.
    const CODE_MAP: Record<string, string> = {
      compound_lower: "lift_missing_compound_lower",
      compound_upper_push: "lift_missing_upper_push",
      compound_upper_pull: "lift_missing_upper_pull",
      core: "lift_missing_core",
      rotation: "lift_missing_rotational_demand",
    };
    for (const m of missing) {
      const code = CODE_MAP[m];
      if (code) sink.push({ code, message: `Template ${template.id} requires ${m}.` });
    }
  }


  // Duplicate category — only single-slot categories flagged as illegal
  // duplicates (compound lower/push/pull may appear only once).
  const SINGLE_SLOT = new Set<MovementCategory>([
    "compound_lower",
    "compound_upper_push",
    "compound_upper_pull",
  ]);
  const dupCats: string[] = [];
  for (const [k, n] of Object.entries(categoryCoverage)) {
    if (n > 1 && SINGLE_SLOT.has(k as MovementCategory)) {
      dupCats.push(k);
      fatal.push({
        code: "lift_duplicate_category",
        message: `Category "${k}" appears ${n} times (max 1 per session).`,
      });
    }
  }
  const duplicateCheckOk = dupCats.length === 0;

  const substitutionCompleteness = ladderScores.length
    ? ladderScores.reduce((s, v) => s + v, 0) / ladderScores.length
    : 1;

  return {
    templateId: certifiedTemplate.id,
    templateName: certifiedTemplate.displayName,
    categoryCoverage,
    fullBodyOk,
    missingRequired: missing,
    duplicateCheckOk,
    duplicatedCategories: dupCats,
    substitutionCompleteness,
    governanceVersion: GOV_VERSION,
    stamps,
    fatal,
    warn,
  };
}

/**
 * Lighter templates the certifier may fall back to, safest first after the
 * in-season maintenance plan. Return-to-play is excluded: it is not activated
 * by the resolver and needs a human decision.
 */
const SWAP_ORDER: readonly LiftTemplateId[] = [
  "full_body_in_season_maintenance",
  "full_body_recovery",
];

export function pickSatisfiableTemplate(
  current: LiftTemplate,
  categorized: Array<{ slug: string; movement_category: MovementCategory | null }>,
): LiftTemplate | null {
  for (const id of SWAP_ORDER) {
    if (id === current.id) continue;
    const t = LIFT_TEMPLATES[id];
    if (t.cnsShare > current.cnsShare) continue; // never swap UP in intensity
    if (missingCategories(t.requiredCategories, categorized).length === 0) return t;
  }
  return null;
}

// Re-export for callers that want to reason about templates directly.
export { LIFT_TEMPLATES, resolveLiftTemplate, ALL_CATEGORIES };
