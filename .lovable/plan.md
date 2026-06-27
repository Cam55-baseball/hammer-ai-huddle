# Per-Category Ranked Goals: Onboarding → Hammer Prescription

Today `AthleteOnboarding` only captures a day-type and notification prefs — there is no goal-capture step at all, and `dailyPlan.ts` makes zero references to `goal_summary` / `training_focus` / `development_priorities`. This plan adds an elite, ranked, per-category goal model and wires it through Hammer end-to-end.

## 1. Canonical category-goal model

Five categories aligned to the existing Hammer modalities and Report Card:

```text
speed     — first-step quickness, top-end speed, baserunning explosiveness
power     — strength, rotational power, lift gains, body comp
throwing  — velocity, arm health, command/accuracy
hitting   — bat speed, contact, exit velo, on-plane time
fielding  — footwork, range, glove work, transfer/release
```

Each athlete picks **1 specific goal per category** plus a **rank order (1–5)** of which categories matter most. Schema:

```ts
type CategoryKey = "speed"|"power"|"throwing"|"hitting"|"fielding";
type CategoryGoal = {
  category: CategoryKey;
  rank: number;              // 1 = most important
  intent: string;            // canonical id from preset list
  intentLabel: string;       // display
  notes?: string;            // optional free text, ≤200 chars
};
```

Stored as:
- `asb_events` topic `relational.athlete.category_goals.set` (replay-safe, lineage-complete) — the source of truth.
- Mirror onto `athlete_context.category_goals jsonb` for fast read by the envelope RPC (additive column, no destructive migration).

## 2. Onboarding UX (new step in `AthleteOnboarding.tsx`)

Insert a **"Your goals"** step between Profile and Schedule. The step renders 5 stacked category cards in a drag-to-reorder list (keyboard `↑/↓` accessible). Each card:

1. Category title + short helper.
2. Single-select preset chips of `intent` options (sport-aware via `useAthleteGoalsAggregated`'s position mapping).
3. Optional one-line note input.
4. Rank chip on the left reflecting position; reorder updates rank.

Validation: every category must have a chosen `intent`. Submit emits one `relational.athlete.category_goals.set` event with the full ranked array, then advances.

Add resume-safety: `useAthleteOnboardingState` gains `hasCategoryGoals` (counts the topic) and includes it in `hasCompletedOnboarding`. `OnboardingResumeBanner` + `OnboardingStatusCard` already key off this hook, so they pick it up automatically.

## 3. Edit surface

- `Profile.tsx` → existing `OnboardingStatusCard` gains a "Goals" row linking to `/onboarding/athlete?step=goals` (deep-link support via query param in the page).
- New compact `CategoryGoalsCard` on `AthleteCommand.tsx` showing the ranked list with an "Edit" button → same deep link. Edits re-emit the same canonical event (latest wins by `latestByTopicPrefix`).

## 4. Envelope + context wiring

- Extend `SPINE_VARIABLE_KEYS` in `src/lib/hammer/context/envelope.ts` with `category_goals`.
- Update the `get_athlete_context_envelope` RPC (migration) to project `athlete_context.category_goals` with `source='athlete'`, `confidence='self_report'`.
- `athleteContext.ts` exposes a typed `ctx.get<CategoryGoal[]>("category_goals")` plus a memoized helper `getCategoryRanking(ctx)`.

## 5. Hammer prescription use (the personalization payoff)

In `src/lib/hammer/prescription/dailyPlan.ts`:

- Read ranked goals via the new helper.
- **Block ordering**: when multiple modalities are `ready`, sort by athlete's category rank (speed/power/throwing/hitting/fielding → speed/strength/throwing/hitting+baserunning/defense). Warm-up, fueling, recovery keep fixed positions.
- **Intent-aware drill selection**:
  - `selectStrengthSwaps` reads `power.intent` → bias toward rotational/explosive vs hypertrophy vs general.
  - `selectThrowingAdaptations` reads `throwing.intent` → velocity ladder vs command grid vs arm-care.
  - `selectSpeedFocus` already exists — pass `speed.intent` to bias first-step vs top-end vs baserunning explosiveness.
  - Hitting block picks tee/soft-toss/live-mix variants from `hitting.intent`.
  - Defense + baserunning drills pick footwork vs range vs transfer / leadoff vs steal vs read-react.
- **`roadmapReason`** strings include the top-ranked category in each block ("Aligned with your #1 goal: bat speed").
- **`missingContextKeys`** adds `"category_goals"` when absent, so the inline gap drawer points back to onboarding.

All changes preserve the existing pure-function contract (no I/O), missingness, and replay safety.

## 6. RR-6 / safeguarding interplay

- Injury-suppression rules already in `decisionFilters` continue to outrank goal-driven ordering. Goals can re-rank only among `ready` blocks; suppressed blocks stay suppressed.
- Minor-athlete safeguarding precedence unchanged.

## 7. Migration / data

```sql
-- additive
ALTER TABLE public.athlete_context
  ADD COLUMN IF NOT EXISTS category_goals jsonb;

-- RPC update: include category_goals in envelope output with
-- source='athlete', confidence='self_report', owner='athlete'.
```

No grants change (existing `athlete_context` policies cover it).

## 8. Tests

- Vitest: `categoryGoals.normalizer.spec.ts` — validates ranks unique 1–5, every category present.
- `dailyPlan.categoryGoals.spec.ts` — given a context with `category_goals`, asserts block ordering and that strength/throwing/speed/hitting selectors received the right intent.
- Extend `tests/e2e/onboarding/run.mjs` to walk the new step and assert the `relational.athlete.category_goals.set` event lands.
- Extend `onboarding-regression.test.ts` for the resume gate including `hasCategoryGoals`.

## 9. Files touched (high-level)

- `src/pages/AthleteOnboarding.tsx` — insert step + deep-link
- `src/components/onboarding/steps/CategoryGoalsStep.tsx` (new)
- `src/lib/hammer/goals/categoryGoals.ts` (new — types, presets, normalizer, emitter)
- `src/lib/hammer/context/envelope.ts` — add spine key
- `src/lib/hammer/context/athleteContext.ts` — expose helper
- `src/lib/hammer/prescription/dailyPlan.ts` — ordering + intent bias
- `src/lib/hammer/prescription/strengthSelector.ts`, `throwingSelector.ts` — intent-aware paths
- `src/hooks/command/useAthleteOnboardingState.ts` — add `hasCategoryGoals`
- `src/components/settings/OnboardingStatusCard.tsx`, `UserMenu.tsx` — show "Goals" status
- `src/pages/AthleteCommand.tsx` — `CategoryGoalsCard`
- Supabase migration (additive column + RPC update)
- Tests as above

## Out of scope

- Coach/parent editing of athlete goals (athlete-owned per RR-8 self-disclosure).
- Recruiter visibility of goals (RR-9/RR-10 — separate gating sprint).
- Backfilling existing users — they'll see the resume banner and complete the new step on next visit.
