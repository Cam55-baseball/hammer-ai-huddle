// Phase 9 — Speed Session Builder / Certifier
// Deterministic pipeline that certifies a composed Speed block against the
// constitutional Explosive Performance Engine. Never mutates non-speed rows.

import type { SpeedTemplate, SpeedTemplateResolutionInput } from "./templates.ts";
import { SPEED_TEMPLATES, resolveSpeedTemplate } from "./templates.ts";
import type { SpeedCategory } from "./movementCategories.ts";
import { ALL_SPEED_CATEGORIES, coverageOf, missingCategories } from "./movementCategories.ts";
import type { SpeedCatalogEntry, SpeedSubstitutionLadder } from "./substitutions.ts";
import { resolveSpeedSubstitutionLadder, speedLadderCompleteness } from "./substitutions.ts";

export interface SpeedRxLike {
  slot: string;
  movement_slug: string;
  movement_name: string;
  sequence_order: number;
  why_payload?: Record<string, unknown> | null;
  why_v2?: Record<string, unknown> | null;
}

export interface SpeedCatalogEntryFull extends SpeedCatalogEntry {
  pap_classification?: string | null;
  movement_velocity?: string | null;
  game_day_legal?: boolean | null;
  practice_day_legal?: boolean | null;
}

export interface CertifySpeedInput {
  prescriptions: SpeedRxLike[];
  catalog: readonly SpeedCatalogEntryFull[];
  template: SpeedTemplateResolutionInput;
  availableEquipment?: readonly string[];
  environment?: "indoor" | "outdoor" | string;
  trainingAgeClass?: string;
}

export interface SpeedGovernanceStamp {
  template_id: string;
  template_name: string;
  category: SpeedCategory | string | null;
  pap_classification: string | null;
  movement_velocity: string | null;
  substitution_family: string | null;
  substitution_ladder: SpeedSubstitutionLadder;
  ladder_score: number;
  ladder_complete: boolean;
  why_category: string;
  why_template: string;
  why_athlete: string;
  why_season: string;
  why_pap: string;
  why_substitution_ladder: string;
}

export interface CertifySpeedResult {
  templateId: string;
  templateName: string;
  categoryCoverage: Record<string, number>;
  papScore: number;         // 0..1 utilization vs template budget
  substitutionCompleteness: number;
  duplicateCheckOk: boolean;
  validationStatus: "passed" | "failed" | "empty";
  governanceVersion: string;
  stamps: Map<string, SpeedGovernanceStamp>;
  fatal: Array<{ code: string; message: string; slug?: string }>;
  warn: Array<{ code: string; message: string; slug?: string }>;
}

const GOV_VERSION = "explosive_v1";

// PAP class → weight for scoring block potentiation cost.
const PAP_WEIGHT: Record<string, number> = { heavy: 1.0, moderate: 0.6, light: 0.3 };

export function certifySpeed(input: CertifySpeedInput): CertifySpeedResult {
  const template = resolveSpeedTemplate(input.template);
  const speedRxs = input.prescriptions.filter((r) => r.slot === "speed");
  const catalogBySlug = new Map(input.catalog.map((c) => [c.slug, c] as const));
  const stamps = new Map<string, SpeedGovernanceStamp>();
  const fatal: CertifySpeedResult["fatal"] = [];
  const warn: CertifySpeedResult["warn"] = [];
  const ladderScores: number[] = [];
  let papCost = 0;

  if (speedRxs.length === 0) {
    return {
      templateId: template.id,
      templateName: template.displayName,
      categoryCoverage: {},
      papScore: 0,
      substitutionCompleteness: 1,
      duplicateCheckOk: true,
      validationStatus: "empty",
      governanceVersion: GOV_VERSION,
      stamps,
      fatal,
      warn,
    };
  }

  for (const rx of speedRxs) {
    const cat = catalogBySlug.get(rx.movement_slug);
    if (!cat) {
      fatal.push({
        code: "speed_governance_missing",
        message: `Speed movement ${rx.movement_slug} not present in catalog.`,
        slug: rx.movement_slug,
      });
      continue;
    }
    if (!cat.speed_category) {
      fatal.push({
        code: "speed_governance_missing",
        message: `${rx.movement_slug} has no speed_category (explosive_v1 required).`,
        slug: rx.movement_slug,
      });
    }
    const phase = input.template.seasonPhase;
    if (phase && cat.season_legality && cat.season_legality[phase] === false) {
      fatal.push({
        code: "speed_illegal_season",
        message: `${rx.movement_slug} is not season-legal for phase ${phase}.`,
        slug: rx.movement_slug,
      });
    }
    const taClass = input.trainingAgeClass;
    if (taClass && cat.training_age_legality && cat.training_age_legality[taClass] === false) {
      fatal.push({
        code: "speed_illegal_training_age",
        message: `${rx.movement_slug} is not legal for training-age class ${taClass}.`,
        slug: rx.movement_slug,
      });
    }
    if (input.template.isGameDay && cat.game_day_legal === false) {
      fatal.push({
        code: "speed_illegal_equipment",
        message: `${rx.movement_slug} is not game-day-legal.`,
        slug: rx.movement_slug,
      });
    }

    const ladder = resolveSpeedSubstitutionLadder({
      movement: cat,
      catalog: input.catalog,
      availableEquipment: input.availableEquipment,
      environment: input.environment,
      phase: input.template.seasonPhase,
      trainingAgeClass: input.trainingAgeClass,
    });
    // Family size approximation across substitution_family OR transfer_group.
    const familySize = input.catalog.filter(
      (c) =>
        c.slug !== cat.slug &&
        ((c.substitution_family && c.substitution_family === cat.substitution_family) ||
          (c.transfer_group && c.transfer_group === cat.transfer_group)),
    ).length;
    const { complete, score } = speedLadderCompleteness(ladder, familySize);
    ladderScores.push(score);
    if (!complete && familySize > 0) {
      fatal.push({
        code: "speed_unresolved_substitution",
        message: `${rx.movement_slug} has ${familySize} alternates but resolver produced <2 rungs.`,
        slug: rx.movement_slug,
      });
    }
    // Equipment legality (warn if inventory known and missing).
    if (input.availableEquipment && input.availableEquipment.length > 0 && cat.equipment_requirements) {
      const avail = new Set(input.availableEquipment.map((s) => String(s).toLowerCase()));
      const missing = (cat.equipment_requirements ?? []).filter(
        (r) => !avail.has(String(r).toLowerCase()),
      );
      if (missing.length > 0) {
        warn.push({
          code: "speed_illegal_equipment",
          message: `${rx.movement_slug} requires equipment not listed as available: ${missing.join(", ")}`,
          slug: rx.movement_slug,
        });
      }
    }

    papCost += PAP_WEIGHT[(cat.pap_classification ?? "light").toLowerCase()] ?? 0.3;

    stamps.set(rx.movement_slug, {
      template_id: template.id,
      template_name: template.displayName,
      category: (cat.speed_category ?? null) as SpeedCategory | null,
      pap_classification: cat.pap_classification ?? null,
      movement_velocity: cat.movement_velocity ?? null,
      substitution_family: cat.substitution_family ?? cat.transfer_group ?? null,
      substitution_ladder: ladder,
      ladder_score: score,
      ladder_complete: complete,
      why_category: cat.speed_category
        ? `Categorized as ${cat.speed_category} in the Phase 9 Speed governance registry.`
        : `Category missing — governance version pending.`,
      why_template: `Placed under the ${template.displayName} template because season=${input.template.seasonPhase ?? "n/a"}, adaptation=${input.template.primaryAdaptation ?? "n/a"}, day_type=${input.template.dayType ?? "n/a"}.`,
      why_athlete: `Selected for training-age class ${input.trainingAgeClass ?? "n/a"}; velocity=${cat.movement_velocity ?? "n/a"}.`,
      why_season: `Season phase ${input.template.seasonPhase ?? "n/a"} — legality registry permits this movement.`,
      why_pap: `PAP class = ${cat.pap_classification ?? "light"}; template budget ${(template.papBudget * 100).toFixed(0)}%.`,
      why_substitution_ladder: familySize > 0
        ? `Substitution family exposes ${familySize} alternates across equipment / environment / injury / time / coach-override rungs.`
        : `No known alternates — movement is family-singleton.`,
    });
  }

  // Category coverage / duplicate check / missing acceleration.
  const categorized = speedRxs.map((r) => ({
    slug: r.movement_slug,
    speed_category: catalogBySlug.get(r.movement_slug)?.speed_category ?? null,
  }));
  const categoryCoverage = coverageOf(categorized);
  const missing = missingCategories(template.requiredCategories, categorized);
  if (missing.length > 0) {
    fatal.push({
      code: "speed_unresolved_template",
      message: `Template ${template.id} requires categories: ${missing.join(", ")}.`,
    });
    if (missing.includes("acceleration")) {
      fatal.push({ code: "speed_missing_acceleration", message: `Template ${template.id} requires an acceleration slot.` });
    }
  }

  // Duplicate categories — speed sessions may repeat mobility/pap but not the
  // primary intent categories.
  const SINGLE_SLOT = new Set<SpeedCategory>([
    "acceleration",
    "top_speed",
    "overspeed",
    "resisted",
    "elastic",
  ]);
  const dupCats: string[] = [];
  for (const [k, n] of Object.entries(categoryCoverage)) {
    if (n > 1 && SINGLE_SLOT.has(k as SpeedCategory)) {
      dupCats.push(k);
      fatal.push({
        code: "speed_duplicate_category",
        message: `Category "${k}" appears ${n} times (max 1 per session).`,
      });
    }
  }

  // Recovery balance — non-recovery templates must not exceed papBudget * 3.
  const papScore = Math.min(1, papCost / Math.max(0.1, template.papBudget * 3));
  if (papScore > 1) {
    fatal.push({
      code: "speed_missing_recovery_balance",
      message: `Speed block PAP cost ${papCost.toFixed(2)} exceeds template budget ${(template.papBudget * 3).toFixed(2)}.`,
    });
  }

  const substitutionCompleteness = ladderScores.length
    ? ladderScores.reduce((s, v) => s + v, 0) / ladderScores.length
    : 1;

  return {
    templateId: template.id,
    templateName: template.displayName,
    categoryCoverage,
    papScore,
    substitutionCompleteness,
    duplicateCheckOk: dupCats.length === 0,
    validationStatus: fatal.length === 0 ? "passed" : "failed",
    governanceVersion: GOV_VERSION,
    stamps,
    fatal,
    warn,
  };
}

export { SPEED_TEMPLATES, resolveSpeedTemplate, ALL_SPEED_CATEGORIES };
