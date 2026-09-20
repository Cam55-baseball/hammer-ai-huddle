/**
 * Generation matrix — the card-coverage check, as a pure function.
 *
 * 6 phases × 6 training-age bands × 3 equipment levels × 3 ages × 4 day types
 * = 1,296 cells. A card must be produced in 100% of them.
 *
 * Extracted from scripts/audits/evidence/generation-matrix.ts so the same code
 * runs in the sandbox script AND in the edge function that guards a batch of
 * newly activated catalog rows (Step 9 §D2b).
 */
import { resolveLiftTemplate } from "../lift/templates.ts";
import { isRepDosed } from "../dosage/doctrine.ts";
import { resolveWaveDose } from "../dosage/wave.ts";
import { validate } from "../validator.ts";
import { buildSafePlan } from "../safePlan.ts";
import { checkSafetyGate } from "../domainGate.ts";
import { blockedClassesFor } from "../schedule/tissueCost/apply.ts";
import type { AllowedClass } from "../schedule/tissueCost/types.ts";
import { amountPerSet, type CatalogFact, classify } from "../exposure/ledger.ts";
import { type GovAlternative, type GovItem, type Rm28 } from "../exposure/types.ts";
import { type GovernorContext, runGovernor } from "../exposure/governor.ts";

export const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"] as const;

export const TRAINING_AGE_BANDS: Array<{ band: string; years: number }> = [
  { band: "beginner", years: 0.5 },
  { band: "developing", years: 1.5 },
  { band: "intermediate", years: 2.5 },
  { band: "advanced", years: 4 },
  { band: "elite", years: 8 },
  { band: "professional", years: 12 },
];

export const EQUIPMENT_LEVELS: Array<{ level: string; available: string[] }> = [
  { level: "bodyweight", available: ["bodyweight", "none"] },
  {
    level: "minimal",
    available: [
      "bodyweight", "none", "band", "bands", "dumbbell", "dumbbells",
      "kettlebell", "mat", "wall", "bench",
    ],
  },
  { level: "full_gym", available: [] as string[] }, // [] = no restriction
];

export const AGES = [13, 16, 19];
export const DAY_TYPES = ["train", "recovery", "game", "travel"] as const;
export const EXPECTED_CELLS = 1296;

const ROLE_BY_CATEGORY: Record<string, string> = {
  compound_lower: "compound_lower",
  posterior_chain: "compound_lower",
  single_leg: "unilateral_lower",
  compound_upper_push: "upper_push",
  compound_upper_pull: "upper_pull",
  core: "trunk_primer",
  arm_care: "arm_care",
  carry: "carry_antirotation",
  rotation: "rotation",
  jump_landing: "supplemental",
  mobility: "trunk_primer",
};
const REQUIRED_ROLES = ["compound_lower", "upper_push", "upper_pull", "trunk_primer", "arm_care"];

export type MatrixCatalogRow = {
  slug: string;
  name: string;
  movement_category: string | null;
  dosage_unit: string | null;
  equipment_requirements: string[] | null;
  equipment: string[] | null;
  min_age_years: number | null;
  min_training_age_years: number | null;
  season_eligibility: string[] | null;
  game_day_legal: boolean | null;
  deep_flexion: boolean | null;
  eccentric_overload: boolean | null;
  default_duration_seconds: number | null;
  default_distance_feet: number | null;
  default_total_reps: number | null;
  category: string | null;
  intensity_class?: string | null;
  exposure_channel?: string | null;
  plyo_tier?: number | null;
  contacts_per_rep?: number | null;
  substitution_family?: string | null;
};

export const MATRIX_CATALOG_COLUMNS =
  "slug,name,movement_category,dosage_unit,equipment_requirements,equipment,min_age_years," +
  "min_training_age_years,season_eligibility,season_legality,training_age_legality,game_day_legal," +
  "deep_flexion,eccentric_overload,default_duration_seconds,default_distance_feet," +
  "default_total_reps,category,intensity_class,exposure_channel,plyo_tier,contacts_per_rep," +
  "substitution_family";

export type MatrixCell = {
  phase: string;
  band: string;
  equipment: string;
  age: number;
  day_type: string;
  template: string;
  rows: number;
  tier: string;
  validator_ok: boolean;
  fatal_codes: string[];
  /** Step 14 proof only — omitted (and outside the fingerprint) when the governor is off. */
  spike_trims?: Array<{ slug: string; channel: string; action: string; reason: string }>;
};

export type MatrixResult = {
  cells: number;
  empty_cells: number;
  tiers: Record<string, number>;
  results: MatrixCell[];
  fingerprint: string;
  passed: boolean;
};

const equipOf = (c: MatrixCatalogRow) =>
  (c.equipment_requirements ?? c.equipment ?? []).map((e) => String(e).toLowerCase());

function eligible(
  c: MatrixCatalogRow,
  cell: { phase: string; age: number; taYears: number; band: string; available: string[]; isGameDay: boolean },
) {
  if (!checkSafetyGate(c as never, { ageYears: cell.age, trainingAgeClass: cell.band, seasonPhase: cell.phase }).allowed) {
    return false;
  }
  if (cell.available.length > 0) {
    const need = equipOf(c).filter((e) => e && e !== "none" && e !== "bodyweight");
    if (!need.every((e) => cell.available.includes(e))) return false;
  }
  if (c.min_age_years != null && cell.age < c.min_age_years) return false;
  if (c.min_training_age_years != null && cell.taYears < Number(c.min_training_age_years)) return false;
  if (Array.isArray(c.season_eligibility) && c.season_eligibility.length > 0) {
    if (!c.season_eligibility.includes(cell.phase)) return false;
  }
  const flagged = c.deep_flexion === true || c.eccentric_overload === true;
  if (flagged && (cell.phase === "in_season" || cell.phase === "post_season" || cell.isGameDay)) return false;
  if (cell.isGameDay && c.game_day_legal === false) return false;
  return true;
}

/** FNV-1a over the cell outputs — two runs with the same cards share a fingerprint. */
function fingerprintOf(results: MatrixCell[]): string {
  const text = results
    .map((r) =>
      [r.phase, r.band, r.equipment, r.age, r.day_type, r.template, r.rows, r.tier, r.validator_ok, r.fatal_codes.join("+")]
        .join("|"),
    )
    .join("\n");
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i) + 1, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

/**
 * TCS stage S4 proof hook. When `tcsClass` is supplied the matrix runs as if
 * the rest-day calculator were on and had allowed exactly that class today:
 * every movement whose intensity class is blocked at that class is removed
 * from the pool before selection. Omitted (the default) the matrix behaves
 * byte-for-byte as it did before Step 11.
 */
export function runGenerationMatrix(
  catalog: MatrixCatalogRow[],
  liftingV2 = false,
  opts?: {
    tcsClass?: AllowedClass;
    /**
     * Step 14 proof hook. `rm28Fraction` sets each channel's recent max to that
     * fraction of the day's planned amount (0.6 → a real spike the governor must
     * trim); `null` runs the cold-start path (nothing logged in 28 days).
     */
    spike?: { rm28Fraction: number | null; inSeason?: boolean; growthMode?: boolean };
  },
): MatrixResult {
  const tcsBlocked = opts?.tcsClass ? blockedClassesFor(opts.tcsClass) : null;
  const results: MatrixCell[] = [];

  for (const phase of PHASES) {
    for (const ta of TRAINING_AGE_BANDS) {
      for (const eq of EQUIPMENT_LEVELS) {
        for (const age of AGES) {
          for (const dayType of DAY_TYPES) {
            const isGameDay = dayType === "game";
            const isRecoveryDay = dayType === "recovery";
            const cell = { phase, age, taYears: ta.years, band: ta.band, available: eq.available, isGameDay };

            const template = resolveLiftTemplate({
              seasonPhase: phase,
              dayType,
              trainingAge: ta.band,
              isGameDay,
              isRecoveryDay,
            });

            const poolAll = catalog.filter((c) => eligible(c, cell));
            const pool = tcsBlocked
              ? poolAll.filter((c) => !tcsBlocked.includes(String(c.intensity_class ?? "")))
              : poolAll;
            const byRole = new Map<string, MatrixCatalogRow>();
            for (const c of [...pool].sort((a, b) => a.slug.localeCompare(b.slug))) {
              const role = ROLE_BY_CATEGORY[c.movement_category ?? ""] ?? null;
              if (!role) continue;
              if (!byRole.has(role)) byRole.set(role, c);
            }
            const chosen = REQUIRED_ROLES.map((r) => [r, byRole.get(r)] as const).filter(
              (t): t is readonly [string, MatrixCatalogRow] => Boolean(t[1]),
            );

            const rxs = chosen.map(([role, c], i) => {
              const unit = c.dosage_unit ?? "reps";
              const repDosed = isRepDosed(unit);
              const dose = repDosed
                ? resolveWaveDose({
                    phase,
                    role,
                    category: c.category,
                    dosageUnit: unit,
                    trainingAgeYears: ta.years,
                    weekInBlock: 2,
                  }, liftingV2)
                : null;
              return {
                engine: "lift",
                slot: isGameDay || isRecoveryDay ? "warmup" : "lift",
                sequence_role: isGameDay || isRecoveryDay ? "trunk_primer" : role,
                sequence_order: i,
                movement_slug: c.slug,
                movement_name: c.name,
                sets: dose?.sets ?? null,
                reps: dose?.reps ?? null,
                dosage_unit: repDosed && !(isGameDay || isRecoveryDay) ? unit : "seconds",
                duration_seconds: repDosed && !(isGameDay || isRecoveryDay) ? null : (c.default_duration_seconds ?? 60),
                distance_feet: c.default_distance_feet ?? null,
                total_reps: c.default_total_reps ?? null,
                why_v2: { stage: "matrix_harness" },
              };
            });

            let finalRxs = rxs;
            let spikeTrims: MatrixCell["spike_trims"];
            if (opts?.spike) {
              const factOf = (c: MatrixCatalogRow): CatalogFact => ({
                slug: c.slug,
                exposure_channel: c.exposure_channel ?? null,
                plyo_tier: c.plyo_tier ?? null,
                contacts_per_rep: c.contacts_per_rep ?? null,
                category: c.category ?? null,
                intensity_class: c.intensity_class ?? null,
                default_total_reps: c.default_total_reps ?? null,
                default_distance_feet: c.default_distance_feet ?? null,
                substitution_family: c.substitution_family ?? null,
              });
              const bySlug = new Map(pool.map((c) => [c.slug, c]));
              const items: GovItem[] = [];
              for (const rx of rxs) {
                const row = bySlug.get(rx.movement_slug);
                if (!row) continue;
                const fact = factOf(row);
                const cl = classify(fact);
                if (!cl) continue;
                const per = amountPerSet(fact, cl.channel, rx.reps, rx.distance_feet);
                if (!(per > 0)) continue;
                items.push({
                  slug: rx.movement_slug,
                  name: rx.movement_name,
                  channel: cl.channel,
                  tier: cl.tier,
                  sets: rx.sets ?? 1,
                  amountPerSet: per,
                  floorSets: 1,
                  substitutionFamily: fact.substitution_family ?? null,
                });
              }
              const alternatives: GovAlternative[] = [];
              for (const c of pool) {
                if (items.some((i) => i.slug === c.slug)) continue;
                const fact = factOf(c);
                const cl = classify(fact);
                if (!cl || !fact.substitution_family) continue;
                const per = amountPerSet(fact, cl.channel, c.default_total_reps ?? 1, c.default_distance_feet);
                if (!(per > 0)) continue;
                alternatives.push({
                  slug: c.slug,
                  name: c.name,
                  channel: cl.channel,
                  tier: cl.tier,
                  amountPerSet: per,
                  floorSets: 1,
                  substitutionFamily: fact.substitution_family,
                });
              }
              const rm28: Rm28 = { byChannel: {}, byTier: {}, onDate: {}, daysObserved: 28 };
              if (opts.spike.rm28Fraction != null) {
                for (const it of items) {
                  const planned = it.sets * it.amountPerSet;
                  rm28.byChannel[it.channel] = (rm28.byChannel[it.channel] ?? 0) +
                    planned * opts.spike.rm28Fraction;
                }
              }
              const ctx: GovernorContext = {
                block: phase === "os_q1"
                  ? "B1"
                  : phase === "os_q2"
                  ? "B2"
                  : phase === "os_q3"
                  ? "B3"
                  : phase === "os_q4"
                  ? "B4"
                  : phase === "post_season"
                  ? "B5"
                  : null,
                inSeason: opts.spike.inSeason ?? phase === "in_season",
                growthMode: opts.spike.growthMode ?? age <= 15,
              };
              const gov = runGovernor({ items, rm28, ctx, alternatives });
              const kept = new Map(gov.items.map((i) => [i.slug, i]));
              const swapped = new Map(
                gov.trims
                  .filter((t) => t.action === "tier_step_down" && t.to)
                  .map((t) => [t.slug, t.to!]),
              );
              finalRxs = rxs
                .map((rx) => {
                  const swap = swapped.get(rx.movement_slug);
                  const keptItem = kept.get(swap ? swap.slug : rx.movement_slug);
                  if (!keptItem) {
                    // governed row that was dropped
                    const governed = items.some((i) => i.slug === rx.movement_slug);
                    return governed ? null : rx;
                  }
                  return {
                    ...rx,
                    movement_slug: keptItem.slug,
                    movement_name: keptItem.name,
                    sets: keptItem.sets,
                  };
                })
                .filter((rx): rx is typeof rxs[number] => rx !== null);
              spikeTrims = gov.trims.map((t) => ({
                slug: t.slug,
                channel: t.channel,
                action: t.action,
                reason: t.reason,
              }));
            }

            const plan = buildSafePlan({ rxs: finalRxs, phase, isGameDay, validate });
            results.push({
              phase,
              band: ta.band,
              equipment: eq.level,
              age,
              day_type: dayType,
              template: template.id ?? String((template as { name?: string }).name ?? "?"),
              rows: plan.rows.length,
              tier: plan.tier,
              validator_ok: plan.report.ok,
              fatal_codes: [...new Set(plan.fatals.map((f) => f.code))],
              ...(spikeTrims ? { spike_trims: spikeTrims } : {}),
            });
          }
        }
      }
    }
  }

  const empty = results.filter((r) => r.rows === 0).length;
  const tiers = results.reduce<Record<string, number>>((a, r) => ((a[r.tier] = (a[r.tier] ?? 0) + 1), a), {});
  return {
    cells: results.length,
    empty_cells: empty,
    tiers,
    results,
    fingerprint: fingerprintOf(results),
    passed: results.length === EXPECTED_CELLS && empty === 0,
  };
}
