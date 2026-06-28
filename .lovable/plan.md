## Fix: Save & Exit routes to dashboard

**Problem:** "Save & exit" in onboarding (and other multi-step flows using `SaveAndExitBar` / `AthleteOnboardingShell`) navigates to `"/"`, which is the marketing/landing page. For unauthenticated-feeling sessions or when auth state is briefly hydrating, that page can bounce users to `/auth`, making it appear they were "kicked back to login."

**Change:** Route Save & exit to `/dashboard` (the authenticated home) instead of `/`.

### Edits
1. `src/components/onboarding/AthleteOnboardingShell.tsx` — change `navigate("/")` in `handleExit` to `navigate("/dashboard")`.
2. `src/components/common/SaveAndExitBar.tsx` — change default `exitTo = "/"` to `exitTo = "/dashboard"`. Any caller that explicitly passes `exitTo` is preserved.

No other behavior changes. Draft persistence and toast messaging stay intact.
