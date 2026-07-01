// Phase 10 — Conditioning Session Builder / Certifier

import type { ConditioningTemplateResolutionInput } from "./templates.ts";
import { CONDITIONING_TEMPLATES, resolveConditioningTemplate } from "./templates.ts";
import type { ConditioningCategory } from "./movementCategories.ts";
import { coverageOf, missingCategories } from "./movementCategories.ts";
import type { ConditioningCatalogEntry, ConditioningSubstitutionLadder } from "./substitutions.ts";
import { resolveConditioningSubstitutionLadder, conditioningLadderCompleteness } from "./substitutions.ts";

export interface ConditioningRxLike {
  slot: string;
  movement_slug: string;
  movement_name: string;
  sequence_order: number;
  why_payload?: Record<string, unknown> | null;
  why_v2?: Record<string, unknown> | null;
}

export interface CertifyConditioningInput {
  prescriptions: ConditioningRxLike[];
  catalog: readonly ConditioningCatalogEntry[];
  template: ConditioningTemplateResolutionInput;
  availableEquipment?: readonly string[];
  environment?: "indoor" | "outdoor" | string;
  trainingAgeClass?: string;
}

export interface ConditioningGovernanceStamp {
  template_id: string;
  template_name: string;
  category: string | null;
  energy_system: string | null;
  substitution_family: string | null;
  substitution_ladder: ConditioningSubstitutionLadder;
  ladder_score: number;
  ladder_complete: boolean;
  why_template: string;
  why_athlete: string;
  why_season: string;
  why_recovery: string;
  why_readiness: string;
  why_substitution: string;
  why_category: string;
}

export interface CertifyConditioningResult {
  templateId: string;
  templateName: string;
  categoryCoverage: Record<string, number>;
  substitutionCompleteness: number;
  validationStatus: "passed" | "failed" | "empty";
  governanceVersion: string;
  stamps: Map<string, ConditioningGovernanceStamp>;
  fatal: Array<{ code: string; message: string; slug?: string }>;
  warn: Array<{ code: string; message: string; slug?: string }>;
}

const GOV_VERSION = "conditioning_v1";

export function certifyConditioning(input: CertifyConditioningInput): CertifyConditioningResult {
  const template = resolveConditioningTemplate(input.template);
  const rxs = input.prescriptions.filter((r) => r.slot === "conditioning");
  const catBySlug = new Map(input.catalog.map((c) => [c.slug, c] as const));
  const stamps = new Map<string, ConditioningGovernanceStamp>();
  const fatal: CertifyConditioningResult["fatal"] = [];
  const warn: CertifyConditioningResult["warn"] = [];
  const ladderScores: number[] = [];

  if (rxs.length === 0) {
    return { templateId: template.id, templateName: template.displayName, categoryCoverage: {}, substitutionCompleteness: 1, validationStatus: "empty", governanceVersion: GOV_VERSION, stamps, fatal, warn };
  }

  for (const rx of rxs) {
    const cat = catBySlug.get(rx.movement_slug);
    if (!cat) { fatal.push({ code: "cond_governance_missing", message: `${rx.movement_slug} missing from catalog`, slug: rx.movement_slug }); continue; }
    if (!cat.conditioning_category) fatal.push({ code: "cond_governance_missing", message: `${rx.movement_slug} missing conditioning_category`, slug: rx.movement_slug });
    const phase = input.template.seasonPhase;
    if (phase && cat.season_legality && cat.season_legality[phase] === false) fatal.push({ code: "cond_illegal_category", message: `${rx.movement_slug} not legal in ${phase}`, slug: rx.movement_slug });
    if (input.environment === "indoor" && cat.indoor_legal === false) warn.push({ code: "cond_illegal_category", message: `${rx.movement_slug} not indoor-legal`, slug: rx.movement_slug });
    if (input.environment === "outdoor" && cat.outdoor_legal === false) warn.push({ code: "cond_illegal_category", message: `${rx.movement_slug} not outdoor-legal`, slug: rx.movement_slug });

    const ladder = resolveConditioningSubstitutionLadder({
      movement: cat, catalog: input.catalog,
      availableEquipment: input.availableEquipment, environment: input.environment,
      phase: input.template.seasonPhase, trainingAgeClass: input.trainingAgeClass,
    });
    const familySize = input.catalog.filter((c) => c.slug !== cat.slug && ((c.substitution_family && c.substitution_family === cat.substitution_family) || (c.transfer_group && c.transfer_group === cat.transfer_group))).length;
    const { complete, score } = conditioningLadderCompleteness(ladder, familySize);
    ladderScores.push(score);
    if (!complete && familySize > 0) fatal.push({ code: "cond_unresolved_substitution", message: `${rx.movement_slug} substitution ladder incomplete`, slug: rx.movement_slug });

    stamps.set(rx.movement_slug, {
      template_id: template.id, template_name: template.displayName,
      category: cat.conditioning_category ?? null,
      energy_system: cat.energy_system ?? null,
      substitution_family: cat.substitution_family ?? cat.transfer_group ?? null,
      substitution_ladder: ladder, ladder_score: score, ladder_complete: complete,
      why_template: `Placed under ${template.displayName} (season=${input.template.seasonPhase ?? "n/a"}, day=${input.template.dayType ?? "n/a"}).`,
      why_athlete: `Conditioning for training-age class ${input.trainingAgeClass ?? "n/a"}.`,
      why_season: `Season phase ${input.template.seasonPhase ?? "n/a"} permits this conditioning stimulus.`,
      why_recovery: `Tissue budget ${(template.tissueBudget * 100).toFixed(0)}%, metabolic budget ${(template.metabolicBudget * 100).toFixed(0)}%.`,
      why_readiness: `CNS budget ${(template.cnsBudget * 100).toFixed(0)}% — bounded to protect priority training.`,
      why_substitution: familySize > 0 ? `${familySize} alternates across five substitution rungs.` : `Family singleton.`,
      why_category: cat.conditioning_category ? `Categorized as ${cat.conditioning_category} (${cat.energy_system ?? "n/a"} energy system).` : `Category missing.`,
    });
  }

  const categorized = rxs.map((r) => ({ slug: r.movement_slug, conditioning_category: catBySlug.get(r.movement_slug)?.conditioning_category ?? null }));
  const categoryCoverage = coverageOf(categorized);
  const missing = missingCategories(template.requiredCategories, categorized);
  if (missing.length > 0) fatal.push({ code: "cond_unresolved_template", message: `Template ${template.id} requires: ${missing.join(", ")}` });

  const dupCats: string[] = [];
  const SINGLE = new Set<ConditioningCategory>(["repeated_sprint", "alactic_power", "lactic_capacity"]);
  for (const [k, n] of Object.entries(categoryCoverage)) {
    if (n > 1 && SINGLE.has(k as ConditioningCategory)) { dupCats.push(k); fatal.push({ code: "cond_duplicate_category", message: `Category "${k}" appears ${n}x (max 1).` }); }
  }

  const substitutionCompleteness = ladderScores.length ? ladderScores.reduce((s, v) => s + v, 0) / ladderScores.length : 1;
  return {
    templateId: template.id, templateName: template.displayName,
    categoryCoverage, substitutionCompleteness,
    validationStatus: fatal.length === 0 ? "passed" : "failed",
    governanceVersion: GOV_VERSION, stamps, fatal, warn,
  };
}

export { CONDITIONING_TEMPLATES, resolveConditioningTemplate };
