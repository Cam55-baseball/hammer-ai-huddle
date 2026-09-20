// Emits the INACTIVE insert SQL for the Upper-Body Plyometric System (UBP §6/§8).
//   npx -y tsx scripts/audits/ubp-insert.ts > /tmp/ubp-insert.sql
// Rows are inserted with is_active = false. Nothing is activated here.

import {
  QUALITY_GATE_CUE,
  UB_MOVEMENTS,
  type UbMovement,
  regressionSlug,
} from "../../supabase/functions/_shared/wic/ubPlyo/families.ts";

const q = (s: string | null) => (s === null ? "null" : `'${s.replace(/'/g, "''")}'`);
const arr = (a: string[]) => `ARRAY[${a.map(q).join(",")}]::text[]`;

const PHASES: Record<string, string[]> = {
  U1: ["os_q1", "os_q2", "os_q3", "os_q4", "pre_season", "in_season", "post_season"],
  U2: ["os_q1", "os_q2", "os_q3", "os_q4"],
  U3: ["os_q3", "os_q4"],
};
const MIN_AGE: Record<string, number> = { U1: 13, U2: 14, U3: 16 };
const CNS: Record<string, number> = { U1: 1, U2: 3, U3: 5 };
const MIN_TA: Record<string, number> = { U1: 0, U2: 2, U3: 3 };
const TA_LEGAL: Record<string, Record<string, boolean>> = {
  U1: { beginner: true, developing: true, intermediate: true, advanced: true, elite: true, professional: true },
  U2: { beginner: false, developing: false, intermediate: true, advanced: true, elite: true, professional: true },
  U3: { beginner: false, developing: false, intermediate: false, advanced: true, elite: true, professional: true },
};
const CATEGORY: Record<string, string> = {
  push: "compound_upper_push",
  pull_h: "compound_upper_pull",
  pull_v: "compound_upper_pull",
  overhead: "shoulder",
  rotation: "rotation",
};

function seasonLegality(tier: string) {
  const p = PHASES[tier];
  const o: Record<string, boolean> = {};
  for (const k of ["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"]) o[k] = p.includes(k);
  return o;
}

function pitcherFlags(m: UbMovement): string[] {
  const f = ["u1_only_in_season"];
  if (m.tier !== "U1") f.push("no_start_day_window");
  if (m.tier === "U3") f.push("no_bullpen_day", "no_within_48h_of_start");
  if (m.plane === "overhead") f.push("landmine_versions_only");
  return f;
}

const rows = UB_MOVEMENTS.filter((m) => !m.reuseOf);

const values = rows.map((m) => {
  const tier = m.tier;
  const phases = PHASES[tier];
  const reg = regressionSlug(m);
  return `(
  ${q(m.slug)}, ${q(m.name)}, ${q("upper_body_plyo")}, ${q("upper_body_plyo")}, ${q(CATEGORY[m.plane])},
  ${arr(m.equipment)}, ${arr(m.equipment)},
  ${arr(phases)}, ${arr(phases)}, ${q(JSON.stringify(seasonLegality(tier)))}::jsonb,
  ${q(JSON.stringify(TA_LEGAL[tier]))}::jsonb, ${MIN_AGE[tier]}, ${MIN_TA[tier]},
  ${CNS[tier]}, ${q(`${m.cue} ${QUALITY_GATE_CUE}`)},
  ${q(`${m.familyName} family, ${m.letter} version: ${tier} upper-body elastic work in the ${m.plane} plane.`)},
  ${q(tier)}, ${q(m.plane)}, ${q("UB_PLYO")}, ${m.contactsPerRep},
  ${arr(pitcherFlags(m))}, ${q(reg)}, ${q(`ubp_${m.plane}`)}, ${q("reps")},
  false, ${tier === "U1"}, ${q("gov_v1")}, ${q("both")}, false, false
)`;
});

console.log(`-- Upper-Body Plyometric System v1 — ${rows.length} INACTIVE rows
INSERT INTO public.wk_movement_catalog (
  slug, name, family, category, movement_category,
  equipment, equipment_requirements,
  phase_allow, season_eligibility, season_legality,
  training_age_legality, min_age_years, min_training_age_years,
  cns_cost, cue, why_prescribed,
  ub_tier, plane, exposure_channel, contacts_per_rep,
  pitcher_flags, regression_slug, substitution_family, dosage_unit,
  is_active, game_day_legal, governance_version, sport_scope,
  deep_flexion, eccentric_overload
) VALUES
${values.join(",\n")}
ON CONFLICT (slug) DO NOTHING;`);
