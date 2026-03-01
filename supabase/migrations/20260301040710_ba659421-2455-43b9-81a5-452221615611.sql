
-- Create folder_coach_permissions table for granular per-folder coach access
CREATE TABLE public.folder_coach_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.activity_folders(id) ON DELETE CASCADE NOT NULL,
  coach_user_id uuid NOT NULL,
  permission_level text NOT NULL DEFAULT 'edit',
  granted_by uuid NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (folder_id, coach_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.folder_coach_permissions ENABLE ROW LEVEL SECURITY;

-- Players can manage permissions on their own folders
CREATE POLICY "Players manage own folder permissions"
  ON public.folder_coach_permissions FOR ALL TO authenticated
  USING (granted_by = auth.uid())
  WITH CHECK (granted_by = auth.uid());

-- Coaches can read permissions granted to them
CREATE POLICY "Coaches read own permissions"
  ON public.folder_coach_permissions FOR SELECT TO authenticated
  USING (coach_user_id = auth.uid() AND revoked_at IS NULL);
