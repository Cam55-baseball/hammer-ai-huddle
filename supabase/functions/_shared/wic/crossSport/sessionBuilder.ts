// Phase 10 — Cross-Sport Session Builder / Certifier

import type { CrossSportTemplateResolutionInput } from "./templates.ts";
import { CROSS_SPORT_TEMPLATES, resolveCrossSportTemplate } from "./templates.ts";
import type { CrossSportCategory } from "./movementCategories.ts";
import { coverageOf, missingCategories } from "./movementCategories.ts";
import type { CrossSportCatalogEntry, CrossSportSubstitutionLadder } from "./substitutions.ts";
import { resolveCrossSportSubstitutionLadder, crossSportLadderCompleteness } from "./substitutions.ts";

export interface CrossSportRxLike {
  slot: string;
  movement_slug: string;
  movement_name: string;
  sequence_order: number;
  why_payload?: Record<string, unknown> | null;
  why_v2?: Record<string, unknown> | null;
}

export interface CertifyCrossSportInput {
  prescriptions: CrossSportRxLike[];
  catalog: readonly CrossSportCatalogEntry[];
  template: CrossSportTemplateResolutionInput;
  availableEquipment?: readonly string[];
  environment?: "indoor" | "outdoor" | string;
  trainingAgeClass?: string;
}

export interface CrossSportGovernanceStamp {
  template_id: string;
  template_name: string;
  category: string | null;
  movement_transfer: string | null;
  sport_transfer: unknown;
  substitution_family: string | null;
  substitution_ladder: CrossSportSubstitutionLadder;
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

export interface CertifyCrossSportResult {
  templateId: string;
  templateName: string;
  categoryCoverage: Record<string, number>;
  substitutionCompleteness: number;
  validationStatus: "passed" | "failed" | "empty";
  governanceVersion: string;
  stamps: Map<string, CrossSportGovernanceStamp>;
  fatal: Array<{ code: string; message: string; slug?: string }>;
  warn: Array<{ code: string; message: string; slug?: string }>;
}

const GOV_VERSION = "cross_sport_v1";

export function certifyCrossSport(input: CertifyCrossSportInput): CertifyCrossSportResult {
  const template = resolveCrossSportTemplate(input.template);
  const rxs = input.prescriptions.filter((r) => r.slot === "sport_block" || r.slot === "cross_sport");
  const catBySlug = new Map(input.catalog.map((c) => [c.slug, c] as const));
  const stamps = new Map<string, CrossSportGovernanceStamp>();
  const fatal: CertifyCrossSportResult["fatal"] = [];
  const warn: CertifyCrossSportResult["warn"] = [];
  const ladderScores: number[] = [];

  if (rxs.length === 0) {
    return { templateId: template.id, templateName: template.displayName, categoryCoverage: {}, substitutionCompleteness: 1, validationStatus: "empty", governanceVersion: GOV_VERSION, stamps, fatal, warn };
  }

  for (const rx of rxs) {
    const cat = catBySlug.get(rx.movement_slug);
    if (!cat) { fatal.push({ code: "xs_governance_missing", message: `${rx.movement_slug} missing from catalog`, slug: rx.movement_slug }); continue; }
    if (!cat.cross_sport_category) fatal.push({ code: "xs_governance_missing", message: `${rx.movement_slug} missing cross_sport_category`, slug: rx.movement_slug });
    const phase = input.template.seasonPhase;
    if (phase && cat.season_legality && cat.season_legality[phase] === false) fatal.push({ code: "xs_illegal_transfer", message: `${rx.movement_slug} not season-legal in ${phase}`, slug: rx.movement_slug });

    const ladder = resolveCrossSportSubstitutionLadder({
      movement: cat, catalog: input.catalog, availableEquipment: input.availableEquipment,
      environment: input.environment, phase: input.template.seasonPhase, trainingAgeClass: input.trainingAgeClass,
    });
    const familySize = input.catalog.filter((c) => c.slug !== cat.slug && ((c.substitution_family && c.substitution_family === cat.substitution_family) || (c.transfer_group && c.transfer_group === cat.transfer_group))).length;
    const { complete, score } = crossSportLadderCompleteness(ladder, familySize);
    ladderScores.push(score);
    if (!complete && familySize > 0) fatal.push({ code: "xs_unresolved_substitution", message: `${rx.movement_slug} ladder incomplete`, slug: rx.movement_slug });

    stamps.set(rx.movement_slug, {
      template_id: template.id, template_name: template.displayName,
      category: cat.cross_sport_category ?? null,
      movement_transfer: cat.movement_transfer ?? null,
      sport_transfer: cat.sport_transfer ?? null,
      substitution_family: cat.substitution_family ?? cat.transfer_group ?? null,
      substitution_ladder: ladder, ladder_score: score, ladder_complete: complete,
      why_template: `Placed under ${template.displayName} (adaptation=${input.template.primaryAdaptation ?? "n/a"}).`,
      why_athlete: `Cross-sport transfer for training-age class ${input.trainingAgeClass ?? "n/a"}.`,
      why_season: `Season phase ${input.template.seasonPhase ?? "n/a"} permits this transfer stimulus.`,
      why_recovery: `Time budget ${template.timeBudgetMin} min — bounded to preserve primary training.`,
      why_readiness: `CNS budget ${(template.cnsBudget * 100).toFixed(0)}%.`,
      why_substitution: familySize > 0 ? `${familySize} transfer alternates.` : `Family singleton.`,
      why_category: cat.cross_sport_category ? `Cross-sport category: ${cat.cross_sport_category}.` : `Category missing.`,
    });
  }

  const categorized = rxs.map((r) => ({ slug: r.movement_slug, cross_sport_category: catBySlug.get(r.movement_slug)?.cross_sport_category ?? null }));
  const categoryCoverage = coverageOf(categorized);
  const missing = missingCategories(template.requiredCategories, categorized);
  if (missing.length > 0) fatal.push({ code: "xs_unresolved_template", message: `Template ${template.id} requires: ${missing.join(", ")}` });

  const SINGLE = new Set<CrossSportCategory>(["explosive_transfer", "rotational_power", "reflex", "visual_reaction"]);
  for (const [k, n] of Object.entries(categoryCoverage)) {
    if (n > 1 && SINGLE.has(k as CrossSportCategory)) fatal.push({ code: "xs_duplicate_category", message: `Category "${k}" appears ${n}x (max 1).` });
  }

  const substitutionCompleteness = ladderScores.length ? ladderScores.reduce((s, v) => s + v, 0) / ladderScores.length : 1;
  return { templateId: template.id, templateName: template.displayName, categoryCoverage, substitutionCompleteness, validationStatus: fatal.length === 0 ? "passed" : "failed", governanceVersion: GOV_VERSION, stamps, fatal, warn };
}

export { CROSS_SPORT_TEMPLATES, resolveCrossSportTemplate };
