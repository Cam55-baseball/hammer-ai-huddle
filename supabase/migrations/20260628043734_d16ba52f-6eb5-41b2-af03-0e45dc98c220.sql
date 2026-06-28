ALTER TABLE public.athlete_context
  ADD COLUMN IF NOT EXISTS onboarding_draft jsonb;
COMMENT ON COLUMN public.athlete_context.onboarding_draft IS
  'Resumable Save & Exit snapshot for onboarding + multi-step flows (CategoryGoals wizard, schedule importer, injury intake). Nullable; cleared on explicit completion.';