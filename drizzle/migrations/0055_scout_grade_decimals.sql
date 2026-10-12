-- Snapshot before changing grade storage (owner: decimals YES, 2026-10-12)
CREATE TABLE IF NOT EXISTS public._snapshot_scout_grades_20261012 AS SELECT * FROM public.vault_scout_grades;
CREATE TABLE IF NOT EXISTS public._snapshot_scout_grade_bat_sides_20261012 AS SELECT * FROM public.vault_scout_grade_bat_sides;
CREATE TABLE IF NOT EXISTS public._snapshot_scout_grade_pitching_sides_20261012 AS SELECT * FROM public.vault_scout_grade_pitching_sides;
CREATE TABLE IF NOT EXISTS public._snapshot_scout_grade_positions_20261012 AS SELECT * FROM public.vault_scout_grade_positions;
GRANT ALL ON public._snapshot_scout_grades_20261012, public._snapshot_scout_grade_bat_sides_20261012, public._snapshot_scout_grade_pitching_sides_20261012, public._snapshot_scout_grade_positions_20261012 TO service_role;
ALTER TABLE public._snapshot_scout_grades_20261012 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._snapshot_scout_grade_bat_sides_20261012 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._snapshot_scout_grade_pitching_sides_20261012 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._snapshot_scout_grade_positions_20261012 ENABLE ROW LEVEL SECURITY;

-- Old rules forbade anything below 20, so the decimal scale could never be stored.
ALTER TABLE public.vault_scout_grades
  DROP CONSTRAINT IF EXISTS vault_scout_grades_defense_grade_check,
  DROP CONSTRAINT IF EXISTS vault_scout_grades_hitting_grade_check,
  DROP CONSTRAINT IF EXISTS vault_scout_grades_speed_grade_check,
  DROP CONSTRAINT IF EXISTS vault_scout_grades_power_grade_check,
  DROP CONSTRAINT IF EXISTS vault_scout_grades_throwing_grade_check,
  DROP CONSTRAINT IF EXISTS vault_scout_grades_self_efficacy_grade_check,
  DROP CONSTRAINT IF EXISTS vault_scout_grades_leadership_grade_check;

-- Widen every whole-number grade column to one decimal (existing values convert exactly).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name LIKE 'vault_scout_grade%'
      AND table_name NOT LIKE '\_snapshot%' AND data_type IN ('integer','smallint')
      AND column_name ILIKE '%grade%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE numeric(3,1)', r.table_name, r.column_name);
  END LOOP;
END $$;

-- Normalize: below 20 keep one decimal; 20+ round to nearest 5; range 0–80.
CREATE OR REPLACE FUNCTION public.normalize_scout_grades()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE j jsonb := to_jsonb(NEW); k text; v numeric;
BEGIN
  FOR k IN SELECT key FROM jsonb_each(j) WHERE key LIKE '%grade%' AND jsonb_typeof(value)='number' LOOP
    v := (j->>k)::numeric;
    IF v < 0 OR v > 80 THEN RAISE EXCEPTION 'Grade % must be between 0 and 80', k; END IF;
    IF v >= 20 THEN v := LEAST(80, round(v/5)*5); ELSE v := round(v,1); END IF;
    j := jsonb_set(j, ARRAY[k], to_jsonb(v));
  END LOOP;
  NEW := jsonb_populate_record(NEW, j);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_normalize_grades ON public.vault_scout_grades;
CREATE TRIGGER trg_normalize_grades BEFORE INSERT OR UPDATE ON public.vault_scout_grades FOR EACH ROW EXECUTE FUNCTION public.normalize_scout_grades();
DROP TRIGGER IF EXISTS trg_normalize_grades ON public.vault_scout_grade_bat_sides;
CREATE TRIGGER trg_normalize_grades BEFORE INSERT OR UPDATE ON public.vault_scout_grade_bat_sides FOR EACH ROW EXECUTE FUNCTION public.normalize_scout_grades();
DROP TRIGGER IF EXISTS trg_normalize_grades ON public.vault_scout_grade_pitching_sides;
CREATE TRIGGER trg_normalize_grades BEFORE INSERT OR UPDATE ON public.vault_scout_grade_pitching_sides FOR EACH ROW EXECUTE FUNCTION public.normalize_scout_grades();
DROP TRIGGER IF EXISTS trg_normalize_grades ON public.vault_scout_grade_positions;
CREATE TRIGGER trg_normalize_grades BEFORE INSERT OR UPDATE ON public.vault_scout_grade_positions FOR EACH ROW EXECUTE FUNCTION public.normalize_scout_grades();