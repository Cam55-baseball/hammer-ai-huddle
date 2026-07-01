// Phase 10 — Recovery Session Builder / Certifier

import type { RecoveryTemplateResolutionInput } from "./templates.ts";
import { RECOVERY_TEMPLATES, resolveRecoveryTemplate } from "./templates.ts";
import { coverageOf, missingCategories } from "./movementCategories.ts";
import type { RecoveryCatalogEntry, RecoverySubstitutionLadder } from "./substitutions.ts";
import { resolveRecoverySubstitutionLadder, recoveryLadderCompleteness } from "./substitutions.ts";

export interface RecoveryRxLike {
  slot: string;
  movement_slug: string;
  movement_name: string;
  sequence_order: number;
  why_payload?: Record<string, unknown> | null;
  why_v2?: Record<string, unknown> | null;
}

export interface CertifyRecoveryInput {
  prescriptions: RecoveryRxLike[];
  catalog: readonly RecoveryCatalogEntry[];
  template: RecoveryTemplateResolutionInput;
  availableEquipment?: readonly string[];
  environment?: "indoor" | "outdoor" | string;
  trainingAgeClass?: string;
}

export interface RecoveryGovernanceStamp {
  template_id: string;
  template_name: string;
  category: string | null;
  recovery_class: string | null;
  substitution_family: string | null;
  substitution_ladder: RecoverySubstitutionLadder;
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

export interface CertifyRecoveryResult {
  templateId: string;
  templateName: string;
  categoryCoverage: Record<string, number>;
  substitutionCompleteness: number;
  validationStatus: "passed" | "failed" | "empty";
  governanceVersion: string;
  stamps: Map<string, RecoveryGovernanceStamp>;
  fatal: Array<{ code: string; message: string; slug?: string }>;
  warn: Array<{ code: string; message: string; slug?: string }>;
}

const GOV_VERSION = "recovery_v1";

export function certifyRecovery(input: CertifyRecoveryInput): CertifyRecoveryResult {
  const template = resolveRecoveryTemplate(input.template);
  const rxs = input.prescriptions.filter((r) => r.slot === "recovery" || r.slot === "mobility");
  const catBySlug = new Map(input.catalog.map((c) => [c.slug, c] as const));
  const stamps = new Map<string, RecoveryGovernanceStamp>();
  const fatal: CertifyRecoveryResult["fatal"] = [];
  const warn: CertifyRecoveryResult["warn"] = [];
  const ladderScores: number[] = [];

  if (rxs.length === 0) {
    return { templateId: template.id, templateName: template.displayName, categoryCoverage: {}, substitutionCompleteness: 1, validationStatus: "empty", governanceVersion: GOV_VERSION, stamps, fatal, warn };
  }

  // Conflicting recovery detection: same session cannot mix CNS-suppressing high-tissue work
  // with a pure sleep/regeneration template.
  const templateExpects = new Set<string>(template.requiredCategories);

  for (const rx of rxs) {
    const cat = catBySlug.get(rx.movement_slug);
    if (!cat) { fatal.push({ code: "rec_governance_missing", message: `${rx.movement_slug} missing from catalog`, slug: rx.movement_slug }); continue; }
    if (!cat.recovery_category) fatal.push({ code: "rec_governance_missing", message: `${rx.movement_slug} missing recovery_category`, slug: rx.movement_slug });
    const phase = input.template.seasonPhase;
    if (phase && cat.season_legality && cat.season_legality[phase] === false) fatal.push({ code: "rec_illegal_recovery", message: `${rx.movement_slug} not legal in ${phase}`, slug: rx.movement_slug });

    // Conflicting recovery: tissue-heavy movement in a pure sleep template.
    if (template.id === "rec.sleep" && cat.recovery_category && cat.recovery_category !== "sleep" && cat.recovery_category !== "regeneration") {
      fatal.push({ code: "rec_conflicting_recovery", message: `${rx.movement_slug} (${cat.recovery_category}) conflicts with sleep-optimization template.`, slug: rx.movement_slug });
    }

    const ladder = resolveRecoverySubstitutionLadder({
      movement: cat, catalog: input.catalog, availableEquipment: input.availableEquipment,
      environment: input.environment, phase: input.template.seasonPhase, trainingAgeClass: input.trainingAgeClass,
    });
    const familySize = input.catalog.filter((c) => c.slug !== cat.slug && ((c.substitution_family && c.substitution_family === cat.substitution_family) || (c.transfer_group && c.transfer_group === cat.transfer_group))).length;
    const { complete, score } = recoveryLadderCompleteness(ladder, familySize);
    ladderScores.push(score);
    if (!complete && familySize > 0) warn.push({ code: "rec_unresolved_substitution", message: `${rx.movement_slug} ladder incomplete`, slug: rx.movement_slug });

    stamps.set(rx.movement_slug, {
      template_id: template.id, template_name: template.displayName,
      category: cat.recovery_category ?? null,
      recovery_class: cat.recovery_class ?? null,
      substitution_family: cat.substitution_family ?? cat.transfer_group ?? null,
      substitution_ladder: ladder, ladder_score: score, ladder_complete: complete,
      why_template: `Placed under ${template.displayName} (cnsFatigue=${input.template.cnsFatigue ?? "n/a"}, tissueFatigue=${input.template.tissueFatigue ?? "n/a"}).`,
      why_athlete: `Recovery scaled for training-age class ${input.trainingAgeClass ?? "n/a"}.`,
      why_season: `Season phase ${input.template.seasonPhase ?? "n/a"} permits this recovery modality.`,
      why_recovery: `Tissue budget ${(template.tissueBudget * 100).toFixed(0)}%.`,
      why_readiness: `CNS budget ${(template.cnsBudget * 100).toFixed(0)}% — protects tomorrow's key session.`,
      why_substitution: familySize > 0 ? `${familySize} alternates.` : `Family singleton.`,
      why_category: cat.recovery_category ? `Recovery category: ${cat.recovery_category} (${cat.recovery_class ?? "n/a"}).` : `Category missing.`,
    });
  }

  const categorized = rxs.map((r) => ({ slug: r.movement_slug, recovery_category: catBySlug.get(r.movement_slug)?.recovery_category ?? null }));
  const categoryCoverage = coverageOf(categorized);
  const missing = missingCategories(template.requiredCategories, categorized);
  if (missing.length > 0) fatal.push({ code: "rec_unresolved_template", message: `Template ${template.id} requires: ${missing.join(", ")}` });

  const substitutionCompleteness = ladderScores.length ? ladderScores.reduce((s, v) => s + v, 0) / ladderScores.length : 1;
  return { templateId: template.id, templateName: template.displayName, categoryCoverage, substitutionCompleteness, validationStatus: fatal.length === 0 ? "passed" : "failed", governanceVersion: GOV_VERSION, stamps, fatal, warn };
}

export { RECOVERY_TEMPLATES, resolveRecoveryTemplate };
