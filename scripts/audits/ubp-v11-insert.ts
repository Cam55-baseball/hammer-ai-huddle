// Emits the INACTIVE insert SQL for Upper-Body Plyos v1.1 (Hammers v1.2 §C).
//   npx -y tsx scripts/audits/ubp-v11-insert.ts > /tmp/ubp-v11.sql
// Rows are inserted with is_active = false. Nothing is activated here.
// Tier-derived fields (phases, ages, legality, cns) are expanded in SQL so the
// emitted statement stays small and every row is derived the same way.

import { QUALITY_GATE_CUE } from "../../supabase/functions/_shared/wic/ubPlyo/families.ts";
import {
  ALL_V11_ROWS,
  HAND_CHAIN_STAFF_CUE,
} from "../../supabase/functions/_shared/wic/ubPlyo/v11Movements.ts";
import type { HandChainMovement } from "../../supabase/functions/_shared/wic/ubPlyo/v11Movements.ts";

const q = (s: string | null | undefined) => (s == null ? "null" : `'${s.replace(/'/g, "''")}'`);
const arr = (a: string[]) => `ARRAY[${a.map(q).join(",")}]`;

const isHandChain = (m: { family: number }) => m.family === 21;

const rows = ALL_V11_ROWS.map((m) => {
  const hc = isHandChain(m) ? (m as HandChainMovement) : null;
  const bucket = hc ? "Hand & Wrist Chain" : m.family === 23 ? "Sleds" : "Upper-Body Elastic";
  const sub = m.family === 23 ? "strap / banded press" : m.tier;
  return `(${q(m.slug)},${q(m.name)},${q(m.tier)},${q(m.plane)},${q(m.familyName)},${arr(m.equipment)},${m.contactsPerRep},${q(m.cue)},${hc ? 'true' : 'false'},${q((m as { regressionOverride?: string | null }).regressionOverride ?? null)},${q(bucket)},${q(sub)},${q(hc ? hc.surface : null)},${hc?.maxFingertipLoading ?? false},${!!hc})`;
});

console.log(`-- Upper-Body Plyos v1.1 (Hammers v1.2 §C) — ${rows.length} INACTIVE rows
WITH src(slug,name,tier,plane,family_name,equipment,contacts,cue,staff,regression,bucket,sub_bucket,surface,max_fingertip,hand_chain) AS (VALUES
${rows.join(",\n")}
), tier_map(tier,phases,min_age,min_ta,cns,ta_legal) AS (VALUES
 ('U1', ARRAY['os_q1','os_q2','os_q3','os_q4','pre_season','in_season','post_season'], 13, 0, 1, '{"beginner":true,"developing":true,"intermediate":true,"advanced":true,"elite":true,"professional":true}'::jsonb),
 ('U2', ARRAY['os_q1','os_q2','os_q3','os_q4'], 14, 2, 3, '{"beginner":false,"developing":false,"intermediate":true,"advanced":true,"elite":true,"professional":true}'::jsonb),
 ('U3', ARRAY['os_q3','os_q4'], 16, 3, 5, '{"beginner":false,"developing":false,"intermediate":false,"advanced":true,"elite":true,"professional":true}'::jsonb)
)
INSERT INTO public.wk_movement_catalog (
  slug, name, family, category, movement_category,
  equipment, equipment_requirements,
  phase_allow, season_eligibility, season_legality,
  training_age_legality, min_age_years, min_training_age_years,
  cns_cost, cue, coach_cue, why_prescribed,
  ub_tier, plane, exposure_channel, contacts_per_rep,
  pitcher_flags, regression_slug, substitution_family, dosage_unit,
  is_active, game_day_legal, governance_version, sport_scope,
  deep_flexion, eccentric_overload,
  bucket, sub_bucket, method, evidence_grade, surface_hint
)
SELECT s.slug, s.name,
  CASE WHEN s.hand_chain THEN 'hand_wrist_chain' ELSE 'upper_body_plyo' END,
  CASE WHEN s.hand_chain THEN 'hand_wrist_chain' ELSE 'upper_body_plyo' END,
  CASE s.plane WHEN 'push' THEN 'compound_upper_push' WHEN 'pull_h' THEN 'compound_upper_pull'
       WHEN 'pull_v' THEN 'compound_upper_pull' WHEN 'overhead' THEN 'shoulder' ELSE 'rotation' END,
  s.equipment, s.equipment,
  t.phases, t.phases,
  jsonb_build_object(
    'os_q1', true, 'os_q2', true, 'os_q3', true, 'os_q4', true,
    'in_season', s.tier = 'U1', 'post_season', s.tier = 'U1'),
  t.ta_legal, t.min_age, t.min_ta,
  t.cns, s.cue || ' ' || ${q(QUALITY_GATE_CUE)}, CASE WHEN s.hand_chain THEN ${q(HAND_CHAIN_STAFF_CUE)} END,
  s.family_name || ' family: ' || s.tier || CASE WHEN s.hand_chain THEN ' hand and wrist chain' ELSE ' upper-body elastic' END || ' work in the ' || s.plane || ' plane.',
  s.tier, s.plane, 'UB_PLYO', s.contacts,
  ARRAY['u1_only_in_season']
    || CASE WHEN s.tier <> 'U1' THEN ARRAY['no_start_day_window'] ELSE ARRAY[]::text[] END
    || CASE WHEN s.tier = 'U3' THEN ARRAY['no_bullpen_day','no_within_48h_of_start'] ELSE ARRAY[]::text[] END
    || CASE WHEN s.max_fingertip THEN ARRAY['no_max_fingertip_start_day','no_max_fingertip_day_before_start'] ELSE ARRAY[]::text[] END,
  s.regression,
  CASE WHEN s.hand_chain THEN 'hwc_' ELSE 'ubp_' END || s.plane,
  CASE WHEN s.hand_chain AND s.contacts = 0 THEN 'seconds' ELSE 'reps' END,
  false, s.tier = 'U1', 'gov_v1', 'both',
  false, false,
  s.bucket, s.sub_bucket, 'elastic', 'E3', s.surface
FROM src s JOIN tier_map t ON t.tier = s.tier
ON CONFLICT (slug) DO NOTHING;`);
