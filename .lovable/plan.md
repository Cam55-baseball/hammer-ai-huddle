## Goal
Make Hammer operationally trustworthy: buttons work, onboarding completes without silent pass-through, throwing prescriptions are specific, verified stats feed app context, and season/game schedule reality changes daily recommendations.

## What I found
- **Hammer “Answer Hammer” buttons are incomplete**: missing-context cards can point to keys like `position` while onboarding uses `position_primary`; inline answers only support basic text/select/number, so richer gaps like segmented, multiselect, injury, lifting history, anthropometrics cannot be answered there.
- **Onboarding can stall or feel faulty**: athlete skip does not advance, and successful saves rely on a refetched context envelope before the next question changes. If refresh lags or fails, users can get stuck or appear to pass through incorrectly.
- **Season language is split**: onboarding stores `off/pre/in/post`, while existing season settings use `off_season/preseason/in_season/post_season`. Hammer Daily Plan reads one source, edge functions and schedule tools read another.
- **Schedule awareness exists but is shallow**: `useScheduleWindow` sees games/practices for the next 7 days, but Hammer does not yet classify game-day, tomorrow, doubleheader/stretches, playoffs, unknown schedule, or pro/college/amateur schedule styles as first-class context.
- **Throwing is better than before but still not elite enough**: the plan still uses broad “band series / catch play / arm care” wording instead of position-, phase-, game-day-, and workload-specific throwing menus.
- **Verified stats are isolated**: submission/admin/public display exist, but verified stat data is not projected into Hammer context, season/team status, or daily recommendations with clear confidence.

## Implementation plan

### 1. Repair Hammer to-do / button behavior
- Fix all Hammer Daily Plan missing-context keys to match the canonical onboarding registry:
  - `position` → `position_primary`
  - keep `equipment_effective`, injury, anthropometrics, season, and availability keys aligned with `HAMMER_KNOWLEDGE_GAPS`.
- Change “Answer Hammer” CTAs for awaiting-input blocks so they expand the inline gap panel and scroll to it instead of acting like a dead route button.
- Upgrade inline gap answering to render the same input types as onboarding:
  - segmented
  - multiselect
  - lifting history
  - anthropometrics
  - injury
  - select / text / number
- After any inline answer save, invalidate Hammer context and immediately show a “saved, plan updating” state so the user sees progress without needing a manual refresh.
- Add defensive UI for suppressed blocks: no fake “Skip” navigation; show why it is suppressed and what would re-enable it.

### 2. Make onboarding completion robust
- Add a local resolved-session set for athlete onboarding after successful persistence, so the next question advances immediately while the canonical envelope refreshes in the background.
- Make athlete `Skip` actually advance for skippable questions while preserving missingness; for non-skippable core identity/safety questions, show why Hammer needs it.
- Add a clear progress footer: `Question X of Y`, `Saved`, `Saving`, `Could not save`, and `Try again`.
- Never silently complete if persistence fails; keep the user on the same question with the exact save error.
- Normalize and sync season values during onboarding:
  - UI can say Off / Pre / In / Post
  - storage uses one canonical mapping compatible with both Hammer and existing season settings.

### 3. Create one elite season/game context spine
- Add a shared schedule-context projection that combines:
  - manual season phase
  - season date windows
  - games/practices in the next 7 days
  - today/tomorrow game detection
  - games in last 7 days
  - consecutive-game stretch / no-off-day count
  - unknown schedule state
  - competition level: youth, HS, college, independent pro, affiliated pro
- Surface this in Hammer Daily Plan header as a compact context line, e.g.:
  - “Game today — freshness mode”
  - “Game 6 of 16-day stretch — recovery ceiling active”
  - “In-season, schedule unknown — ask Hammer / add game”
- Add direct actions from that context line:
  - Mark in-season
  - Add game today
  - Add next game
  - Open season dates
  - Tell Hammer I was picked up / changed team
- Feed this projection into `buildHammerDailyPlan` so strength, throwing, speed, hitting, recovery, and fuel all clamp based on game-day and schedule density.

### 4. Upgrade throwing prescriptions from vague to coach-grade
- Replace generic throwing drill names with detailed blocks:
  - cuff/scap activation sequence
  - wrist/forearm prep
  - catch-play ramp with distances/intensity bands
  - position-specific throws
  - mound/position intent rules where applicable
  - cooldown tissue/arm-care work
- Branch throwing by:
  - pitcher / catcher / infielder / outfielder / utility / DH
  - in-season vs off-season vs preseason vs post-season
  - game today / game tomorrow / dense stretch / no schedule known
  - injury regions and reported pain
  - anthropometrics where available
- Add clearer `stopIf` rules: elbow grab, shoulder pinch, velo drop, command loss, forearm tightness, sharp pain.
- Make “arm care” a real checklist, not a vague label.

### 5. Wire verified stats into the entire app context
- Add a read-only verified-stats projection for Hammer context:
  - verified profiles
  - league/source
  - team name
  - confidence weight
  - verified date
  - profile type
- Add a compact “Verified context” line where useful: profile/team/league status that Hammer can reference without pretending it knows more than verified.
- When an athlete submits or has approved verified stats, use it as corroborating context for:
  - competition level
  - team affiliation
  - pro/independent status hints
  - public profile credibility
  - MPI/nightly calculations where already designed
- Preserve confidence boundaries: verified stats corroborate context; they do not override athlete-reported injury, schedule, or intent.

### 6. Add dialogue availability for life/team/schedule changes
- Add a small Hammer context prompt card on the dashboard/command surface:
  - “Tell Hammer what changed”
  - examples: “I got picked up by an independent team,” “I’m in playoffs,” “We play 16 straight,” “Schedule is unknown until day-of.”
- Persist structured updates where possible:
  - season phase
  - competition level
  - team/status note
  - schedule uncertainty
  - known upcoming games
- Route free-form context through safe self-report fields so Hammer can ask follow-up questions instead of making assumptions.

## Validation
- Reproduce the broken Answer Hammer path and verify each missing gap can be answered inline.
- Complete onboarding from question 1 through final confirmation without reload.
- Test skip behavior and failed-save behavior.
- Mark in-season and verify Hammer plan, season selector, and edge-function context agree.
- Add a game today and verify Hammer switches to freshness/game-day mode.
- Submit/approve a verified stat profile and verify it appears in profile plus Hammer context without overclaiming.
- Inspect throwing block for pitcher/catcher/position player and game-day/off-season variants.

## Technical notes
- Likely frontend edits: `HammerDailyPlan.tsx`, `HammerOnboardingChat.tsx`, `useHammerOnboardingDirector.ts`, `dailyPlan.ts`, season/schedule components, verified stats hooks/components.
- Likely shared logic additions: schedule-context projector, season value normalizer, verified-stats context projector.
- Only add a migration if a missing persistence field is required for schedule uncertainty/team-status notes; otherwise reuse existing `athlete_context`, `athlete_mpi_settings`, `games`, and `verified_stat_profiles` tables.