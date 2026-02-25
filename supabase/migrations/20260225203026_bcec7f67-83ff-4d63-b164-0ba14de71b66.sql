
-- =============================================
-- Coach Activity Folders System (ordered correctly)
-- =============================================

-- 1. activity_folders
CREATE TABLE public.activity_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  owner_type text NOT NULL CHECK (owner_type IN ('coach', 'player')),
  name text NOT NULL,
  description text,
  label text,
  sport text NOT NULL DEFAULT 'baseball',
  start_date date,
  end_date date,
  frequency_days integer[],
  cycle_type text DEFAULT 'weekly',
  cycle_length_weeks integer,
  placement text DEFAULT 'after' CHECK (placement IN ('before', 'after', 'separate_day', 'layered')),
  priority_level integer DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  color text DEFAULT '#3b82f6',
  icon text DEFAULT 'folder',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. activity_folder_items
CREATE TABLE public.activity_folder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.activity_folders(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  item_type text DEFAULT 'exercise',
  assigned_days integer[],
  cycle_week integer,
  order_index integer DEFAULT 0,
  exercises jsonb,
  attachments jsonb,
  duration_minutes integer,
  notes text,
  completion_tracking boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. folder_assignments
CREATE TABLE public.folder_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.activity_folders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  accepted_at timestamptz,
  declined_at timestamptz,
  sent_at timestamptz DEFAULT now(),
  player_notes jsonb
);

-- 4. folder_item_completions
CREATE TABLE public.folder_item_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_item_id uuid NOT NULL REFERENCES public.activity_folder_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  folder_assignment_id uuid REFERENCES public.folder_assignments(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  notes text,
  UNIQUE(folder_item_id, user_id, entry_date)
);

-- Enable RLS on all tables
ALTER TABLE public.activity_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_folder_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_item_completions ENABLE ROW LEVEL SECURITY;

-- RLS: activity_folders
CREATE POLICY "Folder owner full access"
  ON public.activity_folders FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Assigned players can view folders"
  ON public.activity_folders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.folder_assignments fa
      WHERE fa.folder_id = activity_folders.id AND fa.recipient_id = auth.uid()
    )
  );

-- RLS: activity_folder_items
CREATE POLICY "Folder owner manages items"
  ON public.activity_folder_items FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.activity_folders af WHERE af.id = folder_id AND af.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.activity_folders af WHERE af.id = folder_id AND af.owner_id = auth.uid())
  );

CREATE POLICY "Assigned players can view items"
  ON public.activity_folder_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.folder_assignments fa
      WHERE fa.folder_id = activity_folder_items.folder_id AND fa.recipient_id = auth.uid()
    )
  );

-- RLS: folder_assignments
CREATE POLICY "Sender can insert assignments"
  ON public.folder_assignments FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Sender can view assignments"
  ON public.folder_assignments FOR SELECT TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Recipient can view assignments"
  ON public.folder_assignments FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Recipient can update assignments"
  ON public.folder_assignments FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- RLS: folder_item_completions
CREATE POLICY "Users manage own completions"
  ON public.folder_item_completions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.folder_assignments;

-- Updated_at trigger
CREATE TRIGGER update_activity_folders_updated_at
  BEFORE UPDATE ON public.activity_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
