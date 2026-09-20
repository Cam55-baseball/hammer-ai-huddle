// Addendum §6 coverage audit — role × phase × age band × equipment tier.
// READ-ONLY. Counts legal ACTIVE options per cell. A cell under 3 is a gap.
//
//   npx -y tsx scripts/audits/coverage-matrix.ts
//
// Role membership is derived from catalog fields only (slug, name, category,
// substitution_family, speed_category, movement_category, equipment). The rules
// are listed here so the owner can correct any mis-assignment.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// CATALOG_JSON=/path/to/rows.json lets this run from a local dump when the
// sandbox has no key that can read the catalog through the API.
const localDump = process.env.CATALOG_JSON;
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const db = localDump ? (null as any) : createClient(url, key);

type Row = Record<string, any>;

const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "pre_season", "in_season", "post_season"] as const;
const AGE_BANDS = [
  { id: "13_15", age: 15, trainingAge: "developing" },
  { id: "16_plus", age: 16, trainingAge: "advanced" },
] as const;

/** Equipment tiers. "none" = nothing at all; "minimal" = portable kit. */
const MINIMAL_GEAR = new Set([
  "bodyweight", "bands", "mini_bands", "resistance_band", "xband", "jband", "dumbbell",
  "dumbbells", "light_db", "kettlebell", "med_ball", "medicine_ball", "plyo_ball",
  "plyo_balls", "wall", "open_space", "field", "foam_roller", "lacrosse_ball", "dowel",
  "ball", "towel", "slant_board", "slantboard", "box", "bench", "partner", "anchor",
  "weighted_ball", "shoulder_tube", "crossover_symmetry", "mini_hurdles", "hurdles",
  "tee", "bat", "gamer_bat", "plate",
]);

function tierOf(equip: string[]): "none" | "minimal" | "full_gym" {
  const e = (equip ?? []).filter((x) => x && x !== "none");
  if (e.length === 0 || e.every((x) => x === "bodyweight" || x === "open_space" || x === "field" || x === "wall")) {
    return "none";
  }
  return e.every((x) => MINIMAL_GEAR.has(x)) ? "minimal" : "full_gym";
}

/** An option in a lower tier is also available in a richer tier. */
const TIER_ORDER = ["none", "minimal", "full_gym"] as const;
function availableInTier(rowTier: string, cellTier: string): boolean {
  return TIER_ORDER.indexOf(rowTier as any) <= TIER_ORDER.indexOf(cellTier as any);
}

const ROLES: { id: string; phases: readonly string[]; match: (r: Row) => boolean }[] = [
  { id: "heavy_triples_main", phases: PHASES, match: (r) => /trap_bar|pin_squat|block_pull|box_squat|dead_stop|heavy_triple/.test(r.slug) },
  { id: "banded_velocity", phases: PHASES, match: (r) => /band/.test(r.slug) && /squat|bench|pull|deadlift|press/.test(r.slug) },
  { id: "overcoming_isometric", phases: PHASES, match: (r) => /iso|isometric|wall_drive|pin_press|pin_pull|mid_thigh/.test(r.slug) },
  { id: "double_eccentric", phases: ["os_q1", "os_q2", "os_q3", "os_q4"], match: (r) => r.eccentric_overload === true || r.is_eccentric_dominant === true },
  { id: "jump_tier1", phases: PHASES, match: (r) => /pogo|ankle_hop|line_hop|jump_rope|low_hop/.test(r.slug) },
  { id: "jump_tier2", phases: PHASES, match: (r) => /broad_jump|vertical_jump|box_jump|hurdle_hop|bound/.test(r.slug) },
  { id: "jump_tier3", phases: ["os_q3", "os_q4"], match: (r) => /depth_jump|depth_drop|shock|drop_jump/.test(r.slug) },
  { id: "sled_tools", phases: PHASES, match: (r) => /sled|prowler|drag|march_heavy/.test(r.slug) },
  { id: "acl_shield", phases: PHASES, match: (r) => /land|decel|cut_|stick_|absorb/.test(r.slug) },
  { id: "pregame_primer", phases: ["pre_season", "in_season", "post_season"], match: (r) => r.game_day_legal === true && /primer|activation|elastic|pogo|skip|drill/.test(r.slug) },
  { id: "growth_mode_mobility", phases: PHASES, match: (r) => r.category === "warmup" && /mobility|hip|thoracic|ankle|adductor/.test(r.slug) },
  { id: "catcher_deep_flexion", phases: PHASES, match: (r) => r.deep_flexion === true || /kot_|atg_|tibialis|calf|adductor|hip_ir/.test(r.slug) },
  { id: "softball_windmill_arm_care", phases: PHASES, match: (r) => r.category === "arm_care" && (r.sport_scope === "softball" || r.sport_scope === "both") },
  { id: "b4_contrast_pairs", phases: PHASES, match: (r) => r.pap_compatible === true || r.pap_classification != null },
  { id: "max_velocity_buildup", phases: PHASES, match: (r) => r.speed_category === "top_speed" || /build_up|flying|max_velocity/.test(r.slug) },
  { id: "fast_eccentrics", phases: PHASES, match: (r) => /drop_catch|push_jerk|chest_pass|catch_/.test(r.slug) },
  { id: "tissue_kot_progression", phases: PHASES, match: (r) => r.category === "kot" || /tibialis|backward_drag|kot_/.test(r.slug) },
];

function phaseLegal(r: Row, phase: string): boolean {
  const list: string[] = r.season_eligibility ?? [];
  const allow: string[] = r.phase_allow ?? [];
  return list.includes(phase) && allow.includes(phase);
}

function ageLegal(r: Row, band: (typeof AGE_BANDS)[number]): boolean {
  if ((r.min_age_years ?? 0) > band.age) return false;
  const ta = r.training_age_legality as Record<string, boolean> | null;
  if (ta && Object.keys(ta).length > 0 && ta[band.trainingAge] !== true) return false;
  return true;
}

const { data, error } = localDump
  ? { data: JSON.parse(readFileSync(localDump, "utf8")), error: null }
  : await db
  .from("wk_movement_catalog")
  .select(
    "slug,name,category,equipment,equipment_requirements,season_eligibility,phase_allow,min_age_years,training_age_legality,deep_flexion,eccentric_overload,is_eccentric_dominant,game_day_legal,pap_compatible,pap_classification,speed_category,sport_scope,is_active,substitution_family,movement_category",
  )
  .eq("is_active", true);
if (error) throw error;
const rows = (data ?? []) as Row[];

const cells: any[] = [];
for (const role of ROLES) {
  const members = rows.filter((r) => role.match(r));
  for (const phase of role.phases) {
    for (const band of AGE_BANDS) {
      for (const tier of TIER_ORDER) {
        const n = members.filter(
          (r) =>
            phaseLegal(r, phase) &&
            ageLegal(r, band) &&
            availableInTier(tierOf(r.equipment ?? r.equipment_requirements ?? []), tier),
        ).length;
        cells.push({ role: role.id, phase, age: band.id, tier, count: n, gap: n < 3 });
      }
    }
  }
}

const gaps = cells.filter((c) => c.gap);
console.log(`[coverage] cells=${cells.length} gaps=${gaps.length} (a cell under 3 legal active options is a gap)`);
console.log("role,phase,age_band,equipment_tier,legal_active_options,gap");
for (const c of cells) console.log(`${c.role},${c.phase},${c.age},${c.tier},${c.count},${c.gap ? "GAP" : ""}`);
