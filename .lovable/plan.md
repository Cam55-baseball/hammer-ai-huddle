# RFL-053 — Athlete Home Authority Remediation

## Verdict on canonical home

**CANONICAL ATHLETE HOME = `/command`** (`src/pages/AthleteCommand.tsx`).

Evidence:
- Mounts the full Hammer authority stack: `HammerOnboardingChat`, `UhrcAthleteSection`, `CommandCenterSection`, `HammerDailyPlan`, `HammerChat`, `RecentEventsPreview` (`src/pages/AthleteCommand.tsx:46-72`).
- Already wired as the Hammer prescription target — every `dailyPlan` block routes to `/command` (`src/lib/hammer/prescription/dailyPlan.ts:213,340,479`).
- Already enforces onboarding gate via `useAthleteOnboardingState` → `/onboarding/athlete` (`AthleteCommand.tsx:40-44`).
- Decision density: 74 lines of pure authority surfaces, no marketing chrome.
- `/dashboard` (`src/pages/Dashboard.tsx`, 613 lines) is module-discovery + tier marketing + hero imagery; it has no Hammer authority, no daily plan, no onboarding chat. Keep it as the **module library / catalog**, not the athlete home.

## Code changes (minimum viable)

1. **`src/pages/Auth.tsx` (lines 162-191)** — In the post-login routing branch, replace the athlete `navigate("/dashboard", …)` fallback with `navigate("/command", …)`. Scout branch (`/scout-dashboard`) and onboarding-gap branch (`/onboarding/athlete`) are unchanged. `redirectTarget` short-circuit preserved.

2. **`src/pages/ProfileSetup.tsx:295`** — After profile setup completion, replace `navigate("/dashboard", …)` with `navigate("/command", …)` so onboarding-completion lands on the canonical home (the `goToActivate ? "/activate"` branch is preserved).

3. **`src/pages/ResetPassword.tsx:47`** — Post-reset redirect: `/dashboard` → `/command`.

No changes to:
- Per-module back-buttons that `navigate('/dashboard')` (SpeedLab, Nutrition, PickoffTrainer, VideoLibrary, etc.) — `/dashboard` legitimately remains the **module catalog** these features return to.
- Owner / scout / coach routes (`/scout-dashboard`, `/coach-dashboard`, `/owner-dashboard`).
- `AthleteCommand.tsx` itself — already correct.
- `App.tsx` route table — `/dashboard` remains mounted as module library.

## Re-verification (Section D/E)

Journeys to re-walk via `browser--view_preview` and code reads:
- Brand-new athlete → `/auth` → `/select-user-role` → … → `/command` (gated).
- Returning athlete with events → `/auth` → `/command` directly.
- Returning athlete without first event → `/auth` → `/onboarding/athlete` → `/command`.
- Scout → `/scout-dashboard` (unchanged).
- Recommendation/daily-plan CTA → `/command` (already wired).

Regression sweep: confirm RFL-032 ledger gate (`Auth.tsx:120-191`), RFL-033 edge function (unchanged), RFL-034 minor supremacy in `dailyPlan.ts` (unchanged), P0-3 differentiation script (unchanged — does not assert routes).

## Documentation deliverables

- **Create `docs/asb/rfl-053-athlete-home-remediation-ratification.md`** — sections A (authority overlap matrix), B (canonical determination + evidence), C (change set diff), D (journey re-verification table), E (regression check table), F (RFL closure), G (experience verdict: GO WITH LIMITATIONS — P1 items RFL-044/045/052/055/056 carried forward).
- **Update `docs/asb/reality-feedback-ledger.md`** — close RFL-053 with evidence pointers.
- **Update `.lovable/plan.md`** — flip verdict NO-GO → GO WITH LIMITATIONS; record RFL-053 closure.

## Out of scope

No new features, intelligence, doctrine, schema, components, copy rewrites, or `/dashboard` redesign. `/dashboard` keeps its current module-library role; only its status as **post-login destination** is removed.
