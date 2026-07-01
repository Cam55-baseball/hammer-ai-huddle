// Phase 10 — Arm Care Session Builder / Certifier

import type { ArmCareTemplateResolutionInput } from "./templates.ts";
import { ARM_CARE_TEMPLATES, resolveArmCareTemplate } from "./templates.ts";
import type { ArmCareCategory } from "./movementCategories.ts";
import { coverageOf, missingCategories } from "./movementCategories.ts";
import type { ArmCareCatalogEntry, ArmCareSubstitutionLadder } from "./substitutions.ts";
import { resolveArmCareSubstitutionLadder, armCareLadderCompleteness } from "./substitutions.ts";

export interface ArmCareRxLike {
  slot: string;
  movement_slug: string;
  movement_name: string;
  sequence_order: number;
  why_payload?: Record<string, unknown> | null;
  why_v2?: Record<string, unknown> | null;
}

export interface CertifyArmCareInput {
  prescriptions: ArmCareRxLike[];
  catalog: readonly ArmCareCatalogEntry[];
  template: ArmCareTemplateResolutionInput;
  availableEquipment?: readonly string[];
  environment?: "indoor" | "outdoor" | string;
  trainingAgeClass?: string;
}

export interface ArmCareGovernanceStamp {
  template_id: string;
  template_name: string;
  category: string | null;
  throwing_phase: string | null;
  substitution_family: string | null;
  substitution_ladder: ArmCareSubstitutionLadder;
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

export interface CertifyArmCareResult {
  templateId: string;
  templateName: string;
  categoryCoverage: Record<string, number>;
  substitutionCompleteness: number;
  validationStatus: "passed" | "failed" | "empty";
  governanceVersion: string;
  stamps: Map<string, ArmCareGovernanceStamp>;
  fatal: Array<{ code: string; message: string; slug?: string }>;
  warn: Array<{ code: string; message: string; slug?: string }>;
}

const GOV_VERSION = "arm_care_v1";

export function certifyArmCare(input: CertifyArmCareInput): CertifyArmCareResult {
  const template = resolveArmCareTemplate(input.template);
  const rxs = input.prescriptions.filter((r) => r.slot === "arm_care" || r.slot === "throwing");
  const catBySlug = new Map(input.catalog.map((c) => [c.slug, c] as const));
  const stamps = new Map<string, ArmCareGovernanceStamp>();
  const fatal: CertifyArmCareResult["fatal"] = [];
  const warn: CertifyArmCareResult["warn"] = [];
  const ladderScores: number[] = [];

  if (rxs.length === 0) {
    return { templateId: template.id, templateName: template.displayName, categoryCoverage: {}, substitutionCompleteness: 1, validationStatus: "empty", governanceVersion: GOV_VERSION, stamps, fatal, warn };
  }

  for (const rx of rxs) {
    const cat = catBySlug.get(rx.movement_slug);
    if (!cat) { fatal.push({ code: "ac_governance_missing", message: `${rx.movement_slug} missing from catalog`, slug: rx.movement_slug }); continue; }
    if (!cat.arm_care_category) fatal.push({ code: "ac_governance_missing", message: `${rx.movement_slug} missing arm_care_category`, slug: rx.movement_slug });

    // Illegal throwing phase: e.g., bullpen-only movement scheduled on a recovery day.
    if (cat.throwing_phase && template.throwingPhaseTag !== cat.throwing_phase &&
        !(template.optionalCategories as readonly string[]).some((c) => c === cat.throwing_phase) &&
        !(template.requiredCategories as readonly string[]).some((c) => c === cat.arm_care_category)) {
      fatal.push({ code: "ac_illegal_throwing_phase", message: `${rx.movement_slug} throwing_phase=${cat.throwing_phase} conflicts with template ${template.id}.`, slug: rx.movement_slug });
    }

    const ladder = resolveArmCareSubstitutionLadder({
      movement: cat, catalog: input.catalog, availableEquipment: input.availableEquipment,
      environment: input.environment, phase: input.template.seasonPhase, trainingAgeClass: input.trainingAgeClass,
    });
    const familySize = input.catalog.filter((c) => c.slug !== cat.slug && ((c.substitution_family && c.substitution_family === cat.substitution_family) || (c.transfer_group && c.transfer_group === cat.transfer_group))).length;
    const { complete, score } = armCareLadderCompleteness(ladder, familySize);
    ladderScores.push(score);
    if (!complete && familySize > 0) warn.push({ code: "ac_unresolved_substitution", message: `${rx.movement_slug} ladder incomplete`, slug: rx.movement_slug });

    stamps.set(rx.movement_slug, {
      template_id: template.id, template_name: template.displayName,
      category: cat.arm_care_category ?? null,
      throwing_phase: cat.throwing_phase ?? null,
      substitution_family: cat.substitution_family ?? cat.transfer_group ?? null,
      substitution_ladder: ladder, ladder_score: score, ladder_complete: complete,
      why_template: `Placed under ${template.displayName} (pitcher=${input.template.isPitcher ?? false}, two-way=${input.template.isTwoWay ?? false}, throwing=${input.template.isThrowingDay ?? false}).`,
      why_athlete: `Arm care for position=${input.template.position ?? "n/a"}, training-age class ${input.trainingAgeClass ?? "n/a"}.`,
      why_season: `Season phase ${input.template.seasonPhase ?? "n/a"} permits this arm-care modality.`,
      why_recovery: `Tissue budget ${(template.tissueBudget * 100).toFixed(0)}%, throwing-phase tag ${template.throwingPhaseTag}.`,
      why_readiness: `CNS budget ${(template.cnsBudget * 100).toFixed(0)}%; workload last 72h = ${input.template.workloadUnitsLast72h ?? "n/a"}.`,
      why_substitution: familySize > 0 ? `${familySize} alternates.` : `Family singleton.`,
      why_category: cat.arm_care_category ? `Arm-care category: ${cat.arm_care_category} (${cat.throwing_phase ?? "n/a"}).` : `Category missing.`,
    });
  }

  const categorized = rxs.map((r) => ({ slug: r.movement_slug, arm_care_category: catBySlug.get(r.movement_slug)?.arm_care_category ?? null }));
  const categoryCoverage = coverageOf(categorized);
  const missing = missingCategories(template.requiredCategories, categorized);
  if (missing.length > 0) fatal.push({ code: "ac_unresolved_template", message: `Template ${template.id} requires: ${missing.join(", ")}` });

  const SINGLE = new Set<ArmCareCategory>(["bullpen", "starter", "reliever", "return_to_throwing"]);
  for (const [k, n] of Object.entries(categoryCoverage)) {
    if (n > 1 && SINGLE.has(k as ArmCareCategory)) fatal.push({ code: "ac_duplicate_category", message: `Category "${k}" appears ${n}x (max 1).` });
  }

  const substitutionCompleteness = ladderScores.length ? ladderScores.reduce((s, v) => s + v, 0) / ladderScores.length : 1;
  return { templateId: template.id, templateName: template.displayName, categoryCoverage, substitutionCompleteness, validationStatus: fatal.length === 0 ? "passed" : "failed", governanceVersion: GOV_VERSION, stamps, fatal, warn };
}

export { ARM_CARE_TEMPLATES, resolveArmCareTemplate };
