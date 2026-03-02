
-- 1. New table: activity_card_versions
CREATE TABLE public.activity_card_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_item_id uuid NOT NULL REFERENCES public.activity_folder_items(id) ON DELETE CASCADE,
  edited_by uuid NOT NULL,
  editor_role text NOT NULL DEFAULT 'player',
  version_number integer NOT NULL,
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folder_item_id, version_number)
);

ALTER TABLE public.activity_card_versions ENABLE ROW LEVEL SECURITY;

-- 2. New table: activity_edit_logs
CREATE TABLE public.activity_edit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_item_id uuid NOT NULL REFERENCES public.activity_folder_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_edit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Add locking columns to activity_folder_items
ALTER TABLE public.activity_folder_items
  ADD COLUMN IF NOT EXISTS locked_by uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz DEFAULT NULL;

-- 4. Security definer function: can_edit_folder_item
CREATE OR REPLACE FUNCTION public.can_edit_folder_item(p_user_id uuid, p_folder_item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.activity_folder_items afi
    JOIN public.activity_folders af ON af.id = afi.folder_id
    WHERE afi.id = p_folder_item_id
      AND (
        -- Owner
        af.owner_id = p_user_id
        -- Head coach (primary_coach_id)
        OR EXISTS (
          SELECT 1 FROM public.athlete_mpi_settings ams
          WHERE ams.user_id = af.owner_id
            AND ams.primary_coach_id = p_user_id
        )
        -- Explicit folder permission
        OR EXISTS (
          SELECT 1 FROM public.folder_coach_permissions fcp
          WHERE fcp.folder_id = af.id
            AND fcp.coach_user_id = p_user_id
            AND fcp.permission_level IN ('edit', 'view')
            AND fcp.revoked_at IS NULL
        )
        -- Legacy coach_edit mechanism
        OR (af.coach_edit_allowed = true AND af.coach_edit_user_id = p_user_id)
      )
  )
$$;

-- 5. RLS policies for activity_card_versions
CREATE POLICY "Users can view versions for their own folder items"
ON public.activity_card_versions FOR SELECT
USING (
  public.can_edit_folder_item(auth.uid(), folder_item_id)
);

CREATE POLICY "Users can insert versions for editable items"
ON public.activity_card_versions FOR INSERT
WITH CHECK (
  auth.uid() = edited_by
  AND public.can_edit_folder_item(auth.uid(), folder_item_id)
);

-- 6. RLS policies for activity_edit_logs
CREATE POLICY "Users can view edit logs for their folder items"
ON public.activity_edit_logs FOR SELECT
USING (
  public.can_edit_folder_item(auth.uid(), folder_item_id)
);

CREATE POLICY "Users can insert edit logs for editable items"
ON public.activity_edit_logs FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.can_edit_folder_item(auth.uid(), folder_item_id)
);

-- 7. RLS policy for activity_folder_items UPDATE by coaches
CREATE POLICY "Coaches can update items they have edit access to"
ON public.activity_folder_items FOR UPDATE
USING (
  public.can_edit_folder_item(auth.uid(), id)
);

-- 8. Stale lock cleanup trigger
CREATE OR REPLACE FUNCTION public.clear_stale_folder_item_locks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.locked_by IS NOT NULL AND NEW.locked_at IS NOT NULL THEN
    IF NEW.locked_at < now() - interval '10 minutes' THEN
      NEW.locked_by := NULL;
      NEW.locked_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER clear_stale_locks_on_folder_items
  BEFORE UPDATE ON public.activity_folder_items
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_stale_folder_item_locks();
