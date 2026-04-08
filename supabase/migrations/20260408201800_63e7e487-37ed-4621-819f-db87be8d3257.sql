
-- Create drill_assignments table
CREATE TABLE public.drill_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id uuid REFERENCES public.drills(id) ON DELETE CASCADE NOT NULL,
  coach_id uuid NOT NULL,
  player_id uuid NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  notes text,
  completed boolean DEFAULT false,
  completed_at timestamptz
);

-- Indexes
CREATE INDEX idx_drill_assignments_coach ON public.drill_assignments(coach_id);
CREATE INDEX idx_drill_assignments_player ON public.drill_assignments(player_id);
CREATE INDEX idx_drill_assignments_drill ON public.drill_assignments(drill_id);

-- Enable RLS
ALTER TABLE public.drill_assignments ENABLE ROW LEVEL SECURITY;

-- Coaches can insert assignments for their linked players
CREATE POLICY "Coaches can assign drills to linked players"
ON public.drill_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = coach_id
  AND public.is_linked_coach(auth.uid(), player_id)
);

-- Coaches can view assignments they created
CREATE POLICY "Coaches can view their assignments"
ON public.drill_assignments
FOR SELECT
TO authenticated
USING (auth.uid() = coach_id);

-- Players can view assignments assigned to them
CREATE POLICY "Players can view their assigned drills"
ON public.drill_assignments
FOR SELECT
TO authenticated
USING (auth.uid() = player_id);

-- Players can update their own assignments (mark completed)
CREATE POLICY "Players can complete their assignments"
ON public.drill_assignments
FOR UPDATE
TO authenticated
USING (auth.uid() = player_id)
WITH CHECK (auth.uid() = player_id);

-- Owners can view all assignments
CREATE POLICY "Owners can view all assignments"
ON public.drill_assignments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));
