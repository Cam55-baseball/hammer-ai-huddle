
-- Fix 2: Add module column to performance_sessions
ALTER TABLE public.performance_sessions
ADD COLUMN IF NOT EXISTS module text;

-- Fix 7: Organization invite system
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS invite_code text UNIQUE,
ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;

ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS invited_email text,
ADD COLUMN IF NOT EXISTS invitation_status text DEFAULT 'active';

-- RLS: Players can join via invite code (insert themselves)
CREATE POLICY "Players can join via invite"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix 13: Seed roadmap milestones
INSERT INTO public.roadmap_milestones (sport, module, milestone_name, milestone_order, requirements) VALUES
('baseball', 'general', 'Log your first session', 1, '{"min_sessions": 1}'),
('baseball', 'general', 'Build a 3-day streak', 2, '{"min_streak": 3}'),
('baseball', 'general', 'Complete 10 sessions', 3, '{"min_sessions": 10}'),
('baseball', 'general', 'Reach 40 MPI score', 4, '{"min_mpi": 40}'),
('baseball', 'general', 'Get coach validation on 5 sessions', 5, '{"min_coach_validated": 5}'),
('baseball', 'general', 'Achieve Rising trend', 6, '{"trend": "rising"}'),
('baseball', 'general', 'Complete 60 sessions (ranking eligible)', 7, '{"min_sessions": 60}'),
('softball', 'general', 'Log your first session', 1, '{"min_sessions": 1}'),
('softball', 'general', 'Build a 3-day streak', 2, '{"min_streak": 3}'),
('softball', 'general', 'Complete 10 sessions', 3, '{"min_sessions": 10}'),
('softball', 'general', 'Reach 40 MPI score', 4, '{"min_mpi": 40}'),
('softball', 'general', 'Get coach validation on 5 sessions', 5, '{"min_coach_validated": 5}'),
('softball', 'general', 'Achieve Rising trend', 6, '{"trend": "rising"}'),
('softball', 'general', 'Complete 60 sessions (ranking eligible)', 7, '{"min_sessions": 60}');
