CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, full_name, avatar_url, position, experience_level
FROM public.profiles
WHERE is_system_account = false AND suspended_at IS NULL AND account_paused_at IS NULL;

GRANT SELECT ON public.profiles_public TO authenticated;

COMMENT ON VIEW public.profiles_public IS 'Safe public profile columns. Parked/system accounts are excluded here (global TEST cleanup law, owner 2026-10-25) so every reader of this view hides them.';