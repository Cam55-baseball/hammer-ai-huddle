ALTER TABLE public.vault_focus_quizzes
  ADD COLUMN IF NOT EXISTS soreness_locations text[],
  ADD COLUMN IF NOT EXISTS soreness_scales jsonb,
  ADD COLUMN IF NOT EXISTS stiffness_locations text[],
  ADD COLUMN IF NOT EXISTS stiffness_scales jsonb;