/**
 * Stage 1 acceptance evidence #1 — Generation matrix.
 *
 * Spec (docs/wic/lifting-enhancement-plan-v4.md §6.1):
 *   6 phases × 6 training-age bands × 3 equipment levels × 3 ages × 4 day types
 *   = 1,080 runs. A card must be produced in 100% of cells.
 *
 * Pure / in-process, following the house pattern of
 * scripts/audits/spine-differentiation-test.ts. It reads the REAL active
 * catalog (service role, read-only) and drives the real constitutional chain:
 *
 *   resolveLiftTemplate → catalog selection under equipment/age/season legality
 *   → resolveDose (untouched dosage authority) → validate → buildSafePlan
 *
 * It writes NOTHING to the database and generates no plan for any real user.
 *
 * Run: bun scripts/audits/evidence/generation-matrix.ts
 * Evidence: scripts/audits/evidence/generation-matrix.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { resolveLiftTemplate } from "../../../supabase/functions/_shared/wic/lift/templates.ts";
import { isRepDosed } from "../../../supabase/functions/_shared/wic/dosage/doctrine.ts";
import { resolveWaveDose } from "../../../supabase/functions/_shared/wic/dosage/wave.ts";

/** Matrix honours the live flag; override with LIFTING_V2=1/0 for A/B runs. */
const LIFTING_V2 = process.env.LIFTING_V2 === "1";
import { validate } from "../../../supabase/functions/_shared/wic/validator.ts";
import { buildSafePlan } from "../../../supabase/functions/_shared/wic/safePlan.ts";
import { checkSafetyGate } from "../../../supabase/functions/_shared/wic/domainGate.ts";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("[matrix] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(2);
}
const db = createClient(url, key);

// ─── Matrix axes ────────────────────────────────────────────────────────────
const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"] as const;
// The six bands `trainingAge.ts` actually emits. The earlier five-band list
// included `novice` / `trained`, which the classifier never produces, and
// omitted `professional` entirely — so that axis was testing fiction.
const TRAINING_AGE_BANDS: Array<{ band: string; years: number }> = [
  { band: "beginner", years: 0.5 },
  { band: "developing", years: 1.5 },
  { band: "intermediate", years: 2.5 },
  { band: "advanced", years: 4 },
  { band: "elite", years: 8 },
  { band: "professional", years: 12 },
];

const EQUIPMENT_LEVELS: Array<{ level: string; available: string[] }> = [
  { level: "bodyweight", available: ["bodyweight", "none"] },
  { level: "minimal", available: ["bodyweight", "none", "band", "bands", "dumbbell", "dumbbells", "kettlebell", "mat", "wall", "bench"] },
  { level: "full_gym", available: [] as string[] }, // [] = no restriction
];
const AGES = [13, 16, 19];
const DAY_TYPES = ["train", "recovery", "game", "travel"] as const;

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

type Cat = {
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
};

const PAGE = 1000;
async function loadCatalog(): Promise<Cat[]> {
  const out: Cat[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("wk_movement_catalog")
      .select(
        "slug,name,movement_category,dosage_unit,equipment_requirements,equipment,min_age_years,min_training_age_years,season_eligibility,season_legality,training_age_legality,game_day_legal,deep_flexion,eccentric_overload,default_duration_seconds,default_distance_feet,default_total_reps,category",
      )
      .eq("is_active", true)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as Cat[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

const equipOf = (c: Cat) => (c.equipment_requirements ?? c.equipment ?? []).map((e) => String(e).toLowerCase());

function eligible(c: Cat, cell: { phase: string; age: number; taYears: number; band: string; available: string[]; isGameDay: boolean }) {
  // Real gate, not a copy of it — the same code the generator runs.
  if (!checkSafetyGate(c as never, { ageYears: cell.age, trainingAgeClass: cell.band, seasonPhase: cell.phase }).allowed) return false;
  if (cell.available.length > 0) {
    const need = equipOf(c).filter((e) => e && e !== "none" && e !== "bodyweight");
    if (!need.every((e) => cell.available.includes(e))) return false;
  }
  if (c.min_age_years != null && cell.age < c.min_age_years) return false;
  if (c.min_training_age_years != null && cell.taYears < Number(c.min_training_age_years)) return false;
  if (Array.isArray(c.season_eligibility) && c.season_eligibility.length > 0) {
    if (!c.season_eligibility.includes(cell.phase)) return false;
  }
  // Safety flags: never in a competitive phase, never on a game day.
  const flagged = c.deep_flexion === true || c.eccentric_overload === true;
  if (flagged && (cell.phase === "in_season" || cell.phase === "post_season" || cell.isGameDay)) return false;
  if (cell.isGameDay && c.game_day_legal === false) return false;
  return true;
}

const catalog = await loadCatalog();
console.log(`[matrix] active catalog rows: ${catalog.length}`);

type CellResult = {
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
};

const results: CellResult[] = [];

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

          const pool = catalog.filter((c) => eligible(c, cell));
          // One movement per canonical role, deterministic pick (slug sort).
          const byRole = new Map<string, Cat>();
          for (const c of [...pool].sort((a, b) => a.slug.localeCompare(b.slug))) {
            const role = ROLE_BY_CATEGORY[c.movement_category ?? ""] ?? null;
            if (!role) continue;
            if (!byRole.has(role)) byRole.set(role, c);
          }
          const chosen = REQUIRED_ROLES.map((r) => [r, byRole.get(r)] as const).filter(
            (t): t is readonly [string, Cat] => Boolean(t[1]),
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
                }, LIFTING_V2)
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

          const plan = buildSafePlan({ rxs, phase, isGameDay, validate });
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
          });
        }
      }
    }
  }
}

const empty = results.filter((r) => r.rows === 0);
const byTier = results.reduce<Record<string, number>>((a, r) => ((a[r.tier] = (a[r.tier] ?? 0) + 1), a), {});
const outPath = join(dirname(fileURLToPath(import.meta.url)), "generation-matrix.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify(
    { generated_at: new Date().toISOString(), cells: results.length, empty_cells: empty.length, tiers: byTier, results },
    null,
    2,
  ),
);

console.log(`[matrix] cells: ${results.length} (expected 1296)`);
console.log(`[matrix] tiers:`, byTier);
console.log(`[matrix] cells with no card: ${empty.length}`);
console.log(`[matrix] evidence → ${outPath}`);
if (results.length !== 1296 || empty.length > 0) {
  console.error("[matrix] ❌ FAILED — a cell produced no card, or the axis count is wrong.");
  process.exit(1);
}
console.log("[matrix] ✅ PASSED — a card in 100% of cells.");
