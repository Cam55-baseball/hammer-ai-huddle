// Phase 9 — Bat Speed Session Builder / Certifier

import type { BatSpeedTemplate, BatSpeedTemplateResolutionInput } from "./templates.ts";
import { BAT_SPEED_TEMPLATES, resolveBatSpeedTemplate } from "./templates.ts";
import type { BatSpeedCategory } from "./movementCategories.ts";
import { ALL_BAT_SPEED_CATEGORIES, coverageOf, missingCategories } from "./movementCategories.ts";
import type { BatSpeedCatalogEntry, BatSpeedSubstitutionLadder } from "./substitutions.ts";
import { resolveBatSpeedSubstitutionLadder, batSpeedLadderCompleteness } from "./substitutions.ts";

export interface BatSpeedRxLike {
  slot: string;
  movement_slug: string;
  movement_name: string;
  sequence_order: number;
  why_payload?: Record<string, unknown> | null;
  why_v2?: Record<string, unknown> | null;
}

export interface BatSpeedCatalogEntryFull extends BatSpeedCatalogEntry {
  pap_classification?: string | null;
  movement_velocity?: string | null;
  game_day_legal?: boolean | null;
  practice_day_legal?: boolean | null;
  bat_speed_adaptation?: string | null;
}

export interface CertifyBatSpeedInput {
  prescriptions: BatSpeedRxLike[];
  catalog: readonly BatSpeedCatalogEntryFull[];
  template: BatSpeedTemplateResolutionInput;
  availableEquipment?: readonly string[];
  environment?: "indoor" | "outdoor" | string;
  trainingAgeClass?: string;
}

export interface BatSpeedGovernanceStamp {
  template_id: string;
  template_name: string;
  category: BatSpeedCategory | string | null;
  pap_classification: string | null;
  movement_velocity: string | null;
  substitution_family: string | null;
  substitution_ladder: BatSpeedSubstitutionLadder;
  ladder_score: number;
  ladder_complete: boolean;
  why_category: string;
  why_template: string;
  why_athlete: string;
  why_season: string;
  why_pap: string;
  why_substitution_ladder: string;
}

export interface CertifyBatSpeedResult {
  templateId: string;
  templateName: string;
  categoryCoverage: Record<string, number>;
  papScore: number;
  substitutionCompleteness: number;
  duplicateCheckOk: boolean;
  validationStatus: "passed" | "failed" | "empty";
  governanceVersion: string;
  stamps: Map<string, BatSpeedGovernanceStamp>;
  fatal: Array<{ code: string; message: string; slug?: string }>;
  warn: Array<{ code: string; message: string; slug?: string }>;
}

const GOV_VERSION = "explosive_v1";
const PAP_WEIGHT: Record<string, number> = { heavy: 1.0, moderate: 0.6, light: 0.3 };

export function certifyBatSpeed(input: CertifyBatSpeedInput): CertifyBatSpeedResult {
  const template = resolveBatSpeedTemplate(input.template);
  const rxs = input.prescriptions.filter((r) => r.slot === "bat_speed");
  const catalogBySlug = new Map(input.catalog.map((c) => [c.slug, c] as const));
  const stamps = new Map<string, BatSpeedGovernanceStamp>();
  const fatal: CertifyBatSpeedResult["fatal"] = [];
  const warn: CertifyBatSpeedResult["warn"] = [];
  const ladderScores: number[] = [];
  let papCost = 0;

  if (rxs.length === 0) {
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

  for (const rx of rxs) {
    const cat = catalogBySlug.get(rx.movement_slug);
    if (!cat) {
      fatal.push({
        code: "bs_governance_missing",
        message: `Bat-speed movement ${rx.movement_slug} not present in catalog.`,
        slug: rx.movement_slug,
      });
      continue;
    }
    if (!cat.bat_speed_category) {
      fatal.push({
        code: "bs_governance_missing",
        message: `${rx.movement_slug} has no bat_speed_category (explosive_v1 required).`,
        slug: rx.movement_slug,
      });
    }
    const phase = input.template.seasonPhase;
    if (phase && cat.season_legality && cat.season_legality[phase] === false) {
      fatal.push({
        code: "bs_illegal_season",
        message: `${rx.movement_slug} not season-legal for ${phase}.`,
        slug: rx.movement_slug,
      });
    }
    const taClass = input.trainingAgeClass;
    if (taClass && cat.training_age_legality && cat.training_age_legality[taClass] === false) {
      fatal.push({
        code: "bs_illegal_training_age",
        message: `${rx.movement_slug} not legal for training-age class ${taClass}.`,
        slug: rx.movement_slug,
      });
    }
    if (input.template.isGameDay && cat.game_day_legal === false) {
      fatal.push({
        code: "bs_illegal_equipment",
        message: `${rx.movement_slug} is not game-day-legal.`,
        slug: rx.movement_slug,
      });
    }

    const ladder = resolveBatSpeedSubstitutionLadder({
      movement: cat,
      catalog: input.catalog,
      availableEquipment: input.availableEquipment,
      environment: input.environment,
      phase: input.template.seasonPhase,
      trainingAgeClass: input.trainingAgeClass,
    });
    const familySize = input.catalog.filter(
      (c) =>
        c.slug !== cat.slug &&
        ((c.substitution_family && c.substitution_family === cat.substitution_family) ||
          (c.transfer_group && c.transfer_group === cat.transfer_group)),
    ).length;
    const { complete, score } = batSpeedLadderCompleteness(ladder, familySize);
    ladderScores.push(score);
    if (!complete && familySize > 0) {
      fatal.push({
        code: "bs_unresolved_substitution",
        message: `${rx.movement_slug} has ${familySize} alternates but resolver produced <2 rungs.`,
        slug: rx.movement_slug,
      });
    }
    if (input.availableEquipment && input.availableEquipment.length > 0 && cat.equipment_requirements) {
      const avail = new Set(input.availableEquipment.map((s) => String(s).toLowerCase()));
      const missing = (cat.equipment_requirements ?? []).filter(
        (r) => !avail.has(String(r).toLowerCase()),
      );
      if (missing.length > 0) {
        warn.push({
          code: "bs_illegal_equipment",
          message: `${rx.movement_slug} requires equipment not listed as available: ${missing.join(", ")}`,
          slug: rx.movement_slug,
        });
      }
    }

    papCost += PAP_WEIGHT[(cat.pap_classification ?? "light").toLowerCase()] ?? 0.3;

    stamps.set(rx.movement_slug, {
      template_id: template.id,
      template_name: template.displayName,
      category: (cat.bat_speed_category ?? null) as BatSpeedCategory | null,
      pap_classification: cat.pap_classification ?? null,
      movement_velocity: cat.movement_velocity ?? null,
      substitution_family: cat.substitution_family ?? cat.transfer_group ?? null,
      substitution_ladder: ladder,
      ladder_score: score,
      ladder_complete: complete,
      why_category: cat.bat_speed_category
        ? `Categorized as ${cat.bat_speed_category} in the Phase 9 Bat Speed governance registry.`
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

  const categorized = rxs.map((r) => ({
    slug: r.movement_slug,
    bat_speed_category: catalogBySlug.get(r.movement_slug)?.bat_speed_category ?? null,
  }));
  const categoryCoverage = coverageOf(categorized);
  const missing = missingCategories(template.requiredCategories, categorized);
  if (missing.length > 0) {
    fatal.push({
      code: "bs_unresolved_template",
      message: `Template ${template.id} requires categories: ${missing.join(", ")}.`,
    });
  }

  // Rotational demand — at least one rotation-producing category must be
  // present in every non-recovery / non-RTP template.
  const ROTATIONAL = new Set<BatSpeedCategory>([
    "overload",
    "underload",
    "elastic_rotation",
    "rotational_strength",
    "med_ball",
    "heavy_implement",
    "light_implement",
  ]);
  const hasRotational = categorized.some((c) => ROTATIONAL.has(c.bat_speed_category as BatSpeedCategory));
  if (template.rotationalDemand >= 0.5 && !hasRotational) {
    fatal.push({
      code: "bs_missing_rotational_demand",
      message: `Template ${template.id} requires a rotational-demand movement.`,
    });
  }

  // PAP balance — mixed_pap must include both overload and underload.
  if (template.id === "bs.mixed_pap") {
    const cov = new Set(Object.keys(categoryCoverage));
    if (!cov.has("overload") || !cov.has("underload")) {
      fatal.push({
        code: "bs_missing_pap_balance",
        message: `Template ${template.id} requires both overload and underload categories.`,
      });
    }
  }

  const SINGLE_SLOT = new Set<BatSpeedCategory>([
    "overload",
    "underload",
    "elastic_rotation",
  ]);
  const dupCats: string[] = [];
  for (const [k, n] of Object.entries(categoryCoverage)) {
    if (n > 1 && SINGLE_SLOT.has(k as BatSpeedCategory)) {
      dupCats.push(k);
      fatal.push({
        code: "bs_duplicate_category",
        message: `Category "${k}" appears ${n} times (max 1 per session).`,
      });
    }
  }

  const papScore = Math.min(1, papCost / Math.max(0.1, template.papBudget * 3));

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

export { BAT_SPEED_TEMPLATES, resolveBatSpeedTemplate, ALL_BAT_SPEED_CATEGORIES };
