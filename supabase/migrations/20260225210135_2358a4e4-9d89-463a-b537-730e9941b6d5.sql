
-- ============================================
-- Feature 2: Coach Editing Player-Created Folders
-- ============================================

-- Add coach edit permission columns to activity_folders
ALTER TABLE public.activity_folders
  ADD COLUMN IF NOT EXISTS coach_edit_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_edit_user_id uuid;

-- Security definer function to check coach edit permission (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.folder_allows_coach_edit(p_folder_id uuid, p_coach_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.activity_folders
    WHERE id = p_folder_id
      AND coach_edit_allowed = true
      AND coach_edit_user_id = p_coach_id
  )
$$;

-- RLS: Allow coach to update folders they have permission for
CREATE POLICY "Coach can update player folders with permission"
ON public.activity_folders
FOR UPDATE
TO authenticated
USING (
  auth.uid() = owner_id
  OR public.folder_allows_coach_edit(id, auth.uid())
);

-- RLS: Allow coach to SELECT player folders they can edit
CREATE POLICY "Coach can view editable player folders"
ON public.activity_folders
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
  OR public.folder_allows_coach_edit(id, auth.uid())
);

-- RLS on activity_folder_items: coach can manage items in editable folders
CREATE POLICY "Coach can insert items in editable folders"
ON public.activity_folder_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.folder_allows_coach_edit(folder_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.activity_folders WHERE id = folder_id AND owner_id = auth.uid())
);

CREATE POLICY "Coach can update items in editable folders"
ON public.activity_folder_items
FOR UPDATE
TO authenticated
USING (
  public.folder_allows_coach_edit(folder_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.activity_folders WHERE id = folder_id AND owner_id = auth.uid())
);

CREATE POLICY "Coach can delete items in editable folders"
ON public.activity_folder_items
FOR DELETE
TO authenticated
USING (
  public.folder_allows_coach_edit(folder_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.activity_folders WHERE id = folder_id AND owner_id = auth.uid())
);

-- ============================================
-- Feature 3: Folder Template Library
-- ============================================

ALTER TABLE public.activity_folders
  ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_category text,
  ADD COLUMN IF NOT EXISTS template_description text,
  ADD COLUMN IF NOT EXISTS use_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_template_id uuid REFERENCES public.activity_folders(id);

-- RLS: Any authenticated user can view templates
CREATE POLICY "Anyone can view published templates"
ON public.activity_folders
FOR SELECT
TO authenticated
USING (is_template = true);

-- RLS: Template items are viewable
CREATE POLICY "Anyone can view template items"
ON public.activity_folder_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.activity_folders
    WHERE id = folder_id AND (owner_id = auth.uid() OR is_template = true OR public.folder_allows_coach_edit(id, auth.uid()))
  )
);

-- ============================================
-- Feature 4: Date-Based Scheduling
-- ============================================

ALTER TABLE public.activity_folder_items
  ADD COLUMN IF NOT EXISTS specific_dates date[];
