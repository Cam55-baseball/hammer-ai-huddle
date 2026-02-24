
-- =============================================
-- Migration 6 & 7: Validation Triggers + Profile Updates
-- =============================================

-- 24-hour soft delete trigger
CREATE OR REPLACE FUNCTION public.validate_session_soft_delete()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF OLD.is_locked = true THEN
    RAISE EXCEPTION 'Cannot modify locked session';
  END IF;
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    IF (now() - OLD.created_at) > interval '24 hours' THEN
      RAISE EXCEPTION 'Sessions can only be deleted within 24 hours of creation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_session_delete_window
  BEFORE UPDATE ON public.performance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_session_soft_delete();

-- 48-hour edit trigger for drill_blocks and composite_indexes
CREATE OR REPLACE FUNCTION public.validate_session_edit_window()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF OLD.is_locked = true THEN
    RAISE EXCEPTION 'Cannot modify locked session';
  END IF;
  IF (OLD.drill_blocks IS DISTINCT FROM NEW.drill_blocks OR OLD.composite_indexes IS DISTINCT FROM NEW.composite_indexes) THEN
    IF (now() - OLD.created_at) > interval '48 hours' THEN
      RAISE EXCEPTION 'Session data can only be edited within 48 hours of creation';
    END IF;
    NEW.edited_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop the previous trigger first since both fire on UPDATE
DROP TRIGGER IF EXISTS validate_session_delete_window ON public.performance_sessions;

CREATE TRIGGER validate_session_modifications
  BEFORE UPDATE ON public.performance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_session_edit_window();

-- Retroactive limit trigger  
CREATE OR REPLACE FUNCTION public.validate_retroactive_session()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.is_retroactive = true THEN
    IF (NEW.created_at::date - NEW.session_date) > 1 THEN
      RAISE EXCEPTION 'Retroactive sessions must have session_date within 24 hours of creation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_retroactive_limit
  BEFORE INSERT ON public.performance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_retroactive_session();

-- Game opponent trigger
CREATE OR REPLACE FUNCTION public.validate_game_session_fields()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.session_type IN ('game', 'live_scrimmage') THEN
    IF NEW.opponent_name IS NULL OR NEW.opponent_level IS NULL THEN
      RAISE EXCEPTION 'Game and scrimmage sessions require opponent_name and opponent_level';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_game_fields
  BEFORE INSERT OR UPDATE ON public.performance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_game_session_fields();

-- Profile updates: Add switch hitter and ambidextrous columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_switch_hitter boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_ambidextrous_thrower boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_batting_side text DEFAULT 'R';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_throwing_hand text DEFAULT 'R';
