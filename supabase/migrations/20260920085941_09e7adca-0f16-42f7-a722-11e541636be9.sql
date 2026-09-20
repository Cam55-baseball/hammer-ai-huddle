-- TI-0a-1 safety hotfix — tighten only. Enforces law L0.3.

CREATE TABLE IF NOT EXISTS public.wk_ti0a1_backup (
  slug text PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.wk_ti0a1_backup TO service_role;
ALTER TABLE public.wk_ti0a1_backup ENABLE ROW LEVEL SECURITY;

INSERT INTO public.wk_ti0a1_backup (slug, payload)
SELECT slug, jsonb_build_object(
  'min_age_years', min_age_years,
  'training_age_legality', training_age_legality,
  'season_eligibility', to_jsonb(season_eligibility),
  'phase_allow', to_jsonb(phase_allow),
  'season_legality', season_legality,
  'game_day_legal', game_day_legal,
  'equipment', to_jsonb(equipment),
  'is_eccentric_dominant', is_eccentric_dominant
)
FROM public.wk_movement_catalog
WHERE is_active AND (
  eccentric_overload = true
  OR slug IN ('plyo_depth_jump','lift_box_jump_depth_drop','sp_nordic_hamstring',
              'sp_heavy_sled_30','sp_sled_march_heavy','sp_prowler_push_10','sp_prowler_contrast',
              'sp_band_resisted_start','sp_band_start_release')
  OR (name ~* '(sled|prowler)' AND name !~* 'sledgehammer')
)
ON CONFLICT (slug) DO NOTHING;

-- 1. Overload rows: no in-season / post-season / game-day legality.
UPDATE public.wk_movement_catalog SET
  season_eligibility = ARRAY(SELECT e FROM unnest(coalesce(season_eligibility, '{}'::text[])) e
                             WHERE e NOT IN ('in_season','post_season')),
  phase_allow        = ARRAY(SELECT e FROM unnest(coalesce(phase_allow, '{}'::text[])) e
                             WHERE e NOT IN ('in_season','post_season')),
  season_legality    = coalesce(season_legality, '{}'::jsonb)
                       || jsonb_build_object('in_season', false, 'post_season', false),
  game_day_legal     = false
WHERE is_active AND eccentric_overload = true;

-- 2. Age / training-age raised to the runtime safety floor (16+, advanced+).
UPDATE public.wk_movement_catalog SET min_age_years = 16
WHERE is_active AND eccentric_overload = true AND coalesce(min_age_years, 0) = 0;

UPDATE public.wk_movement_catalog SET
  training_age_legality = coalesce(training_age_legality, '{}'::jsonb)
    || '{"beginner":false,"developing":false,"intermediate":false}'::jsonb
WHERE is_active AND eccentric_overload = true;

-- 3. Nordic 3×5 is eccentric-dominant.
UPDATE public.wk_movement_catalog SET is_eccentric_dominant = true
WHERE slug = 'sp_nordic_hamstring';

-- 4. Depth jumps: os_q3 / os_q4 only, advanced+, 16+.
UPDATE public.wk_movement_catalog SET
  phase_allow           = ARRAY['os_q3','os_q4'],
  season_eligibility    = ARRAY['os_q3','os_q4'],
  season_legality       = coalesce(season_legality, '{}'::jsonb)
    || '{"os_q1":false,"os_q2":false,"pre_season":false,"in_season":false,"post_season":false}'::jsonb,
  training_age_legality = coalesce(training_age_legality, '{}'::jsonb)
    || '{"beginner":false,"developing":false,"intermediate":false,"advanced":true,"elite":true,"professional":true}'::jsonb,
  min_age_years         = greatest(coalesce(min_age_years, 0), 16)
WHERE slug IN ('plyo_depth_jump','lift_box_jump_depth_drop');

UPDATE public.wk_movement_catalog SET
  equipment = ARRAY(SELECT DISTINCT e FROM unnest(coalesce(equipment, '{}'::text[]) || ARRAY['box']) e)
WHERE slug = 'plyo_depth_jump' AND NOT coalesce(equipment, '{}'::text[]) @> ARRAY['box'];

-- 5. Gear tags.
UPDATE public.wk_movement_catalog SET
  equipment = ARRAY(SELECT DISTINCT e FROM unnest(coalesce(equipment, '{}'::text[]) || ARRAY['sled']) e)
WHERE is_active
  AND NOT coalesce(equipment, '{}'::text[]) @> ARRAY['sled']
  AND (slug IN ('sp_heavy_sled_30','sp_sled_march_heavy','sp_prowler_push_10','sp_prowler_contrast')
       OR (name ~* '(sled|prowler)' AND name !~* 'sledgehammer'));

UPDATE public.wk_movement_catalog SET
  equipment = ARRAY(SELECT DISTINCT e FROM unnest(coalesce(equipment, '{}'::text[]) || ARRAY['bands']) e)
WHERE slug IN ('sp_band_resisted_start','sp_band_start_release')
  AND NOT coalesce(equipment, '{}'::text[]) @> ARRAY['bands'];