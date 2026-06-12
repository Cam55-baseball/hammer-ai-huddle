# Onboarding Overhaul — Stability, Depth, Role-Awareness

Onboarding crashes at the injury question, lets users through without finishing, and asks shallow/wrong questions. This plan fixes all of it in one coordinated sweep.

## A. Stop the bleed (crash + dead-end)

The "injury.toLowerCase is not a function" error fires downstream of `persistContextAnswer` for `injury_history` because some consumers still treat the value as a string while the director writes `[{ note, reported_at }]`. The `HammerOnboardingChat.submit()` swallows the error in a silent `try/finally`, so the user sees no toast and the gap never advances.

Fixes:

- `HammerOnboardingChat.tsx` — surface errors via `toast.error(...)`, reset draft only on success, never block forward progress when a non-critical downstream emit fails.
- `useHammerOnboardingDirector.resolve()` — wrap `persistContextAnswer` and the query invalidation in their own try/catches so a downstream re-render explosion can't trap the answer write.
- Audit every `injury_history` consumer (`physio_health_profiles`, edge functions, recommendation builders) and normalize to the canonical `Array<{ note, reported_at }>` shape via a single `normalizeInjuryHistory()` helper in `src/lib/hammer/context/normalizers.ts`. All read sites go through it.
- Add an end-of-onboarding "finished" state so users get explicit confirmation instead of silently being "let through".

## B. Question-set rebuild (`knowledgeGaps.ts`)

Replace and extend the current 10 gaps:

1. **Primary sport** — REMOVE the question entirely. Primary sport is already implied by the subscription / sport theme. Replace with an optional **"Any other sports you play?"** free-text gap (informational; never authors organism truth).
2. **Competition level** — NEW enum gap, replacing the implicit "amateur/pro" assumption:
  - Youth rec · Travel · Middle school · High school (Fr/So/Jr/Sr) · JUCO · NAIA · NCAA D3 · NCAA D2 · NCAA D1 · Independent pro · Affiliated MiLB · MLB/NPB/KBO · Adult amateur · Out-of-sport.
  - Drives pro-status surfaces correctly (Minor Leagues = pro, college specified, amateur obvious).
3. **Education stage** — REPLACE the current "What grade are you in?" free-text with a cascading select:
  - Elementary (K–5) · Middle (6–8) · HS (9, 10, 11, 12) · College (Fr/So/Jr/Sr/5th/Grad) · Post-college · Professional · Out-of-school.
4. **Lifting history** — REPLACE the single `lifting_age_years` number with a structured gap:
  - `total_years` (number)
  - `consistent_last_12mo` (yes/no)
  - `interruption_months` (number, optional)
  - `interruption_reason` (free text, optional, e.g. "broken leg")
  - Stored as `lifting_history` JSON on `athlete_context`.
5. **Position** — NEW gaps: primary position (P/C/1B/2B/3B/SS/LF/CF/RF/DH/UTIL), secondary positions (multi-select chips).
6. **Hand profile** — NEW gaps: `throws_hand` (L/R/S), `bats_hand` (L/R/S).
7. **Anthropometrics** — NEW optional gaps for limb-sized programming: `height_in`, `weight_lbs`, `wingspan_in`, `leg_length_in`. Optional; missingness preserved. Unlocks deeper customization in strength/throwing/hitting prescriptions (existing block consumers wire in later).
8. **Injury** — REBUILD `injury_history` gap:
  - "Are you 100% healthy right now?" → Yes / No / Recovering.
  - If No/Recovering: region multi-select (shoulder, elbow, UCL, wrist, back, hip, knee, hamstring, ankle, oblique, other), severity (niggle / managing / restricted / sidelined), recovery status, free-text note.
  - Always accepts "none" / empty and advances cleanly.

Existing gaps kept: `goal_summary`, `season_phase`, `weekly_availability_days`, `weekly_availability_hours`, `training_focus`, `development_priorities`.

## C. Role-specific onboarding paths

Onboarding currently runs one athlete-shaped script for everyone. Read `user_roles` and branch the gap set:

- **Athlete** — full set above.
- **Coach** — org name, team/program, age groups coached, primary disciplines, athlete count, training philosophy (free-text), seasons run.
- **Scout** — org, scouting regions, sports, level focus (HS / college / pro), evaluation focus (mechanics / makeup / production), athlete pool size.
- **Parent** — already covered elsewhere; out of scope here.

Each role has its own ordered gap list in `knowledgeGaps.ts` keyed by `audience: "athlete" | "coach" | "scout"`. `useHammerOnboardingDirector` picks the list based on the user's primary role.

## D. UI improvements (`HammerOnboardingChat.tsx`)

- New input kinds: `multiselect`, `segmented`, `cascade`, `composite` (for lifting-history / injury / anthropometrics composites).
- Inline validation errors below the question.
- "Skip for now" remains; never imputes a value.
- Progress chip honest about role-specific total.
- On the final gap: completion card with a "You're set — open today's plan" CTA.

## E. Schema

New migration adds optional columns to `athlete_context`:

- `other_sports text[]`
- `competition_level text`
- `education_stage text`
- `lifting_history jsonb`
- `position_primary text`, `position_secondary text[]`
- `throws_hand text`, `bats_hand text`
- `anthropometrics jsonb`
- Coach/scout contexts: new `coach_context` and `scout_context` tables (audience-scoped, RLS owner-only, with the standard GRANTs).

All new fields default to null; missingness preserved.

## F. Out of scope (call out only)

- Wiring anthropometrics into every prescriber (strength load, throwing distance, etc.) — separate sprint once data is flowing.
- Recruiter/exposure flows — RR-9/RR-10 sealed-but-deferred per post-mastery roadmap.

## Files

```text
src/components/hammer/HammerOnboardingChat.tsx   # error surfacing, new input kinds, completion card
src/hooks/useHammerOnboardingDirector.ts          # role-aware list, hardened resolve
src/lib/hammer/onboarding/knowledgeGaps.ts        # rebuilt question set + audience branching
src/lib/hammer/context/acquisition.ts             # accept new keys/columns
src/lib/hammer/context/envelope.ts                # extend SPINE_VARIABLE_KEYS
src/lib/hammer/context/normalizers.ts             # NEW — single injury_history normalizer
src/lib/hammer/context/decisionFilters.ts         # consume normalizer + new fields
supabase/migrations/<new>.sql                     # athlete_context columns + coach/scout tables
```

Once you approve, I'll implement in this order: (A) crash + dead-end, (B) schema migration, (C) question set + role branching, (D) UI input kinds + completion card.