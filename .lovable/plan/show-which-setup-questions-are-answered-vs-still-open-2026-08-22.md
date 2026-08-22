# Show which setup questions are answered vs. still open

When an athlete re-enters setup from Settings/Profile, the numbered step menu at the top of the flow should tell the truth about their answers: steps they have actually answered get a filled highlight, steps still waiting on them stay plain. Today those numbers are highlighted purely by position (anything before the current step looks "done"), which is misleading for someone jumping back in to finish.

## What changes

1. **Answer-derived step status.** Each numbered chip is driven by real saved data, not by where the user happens to be standing:
   - Answered → filled chip with a check, label in normal foreground.
   - Not answered → plain outlined chip with its number, muted label, no highlight.
   - Current step → primary ring so it is still obvious where you are, regardless of answered state.
2. **Every step is reachable.** When entering setup from Settings (resume/review), all chips are clickable so the athlete can jump straight to any unanswered section instead of clicking forward through the flow.
3. **A one-line legend** under the step row: "Filled = answered · Outline = still needs you", plus a count ("8 of 11 answered") so the remaining work is visible at a glance.
4. **Accessible labels.** Each chip's `aria-label` states step name and status, e.g. "Step 4: Rank goals — not answered yet".

## How each step counts as answered

| Step | Answered when |
| --- | --- |
| Profile | date of birth + throwing hand saved |
| Body | at least one measurement present (height / weight / wingspan / foot length) |
| Rank goals | complete ranked category goals exist (existing `hasCategoryGoals`) |
| Fuel & recovery | fuel/recovery answers saved |
| Mental & career | level target, focus, or routine saved |
| Connections | connections step answered or explicitly skipped |
| Schedule today | athlete-emitted `athlete.schedule.day_type` event exists (`hasScheduleEvent`) |
| Health check | injury intake answered or explicitly marked "no injuries" |
| Notifications | notification preferences row exists (`hasNotificationsPref`) |

Welcome, Confirm, Review and Done are navigation-only and are never marked answered or unanswered — they render as neutral chips.

Missing data always reads as unanswered. Nothing is inferred or auto-filled on the athlete's behalf.

## Technical notes

- New hook `src/hooks/onboarding/useOnboardingAnswerStatus.ts`: single read that composes `useAthleteOnboardingState` (schedule event, notifications pref, ranked goals), the `athlete_context` row, `profiles` (dob, throwing hand, measurements), and the `draftStore` slots (`profile-answers`, `anthropometrics`, `fuel-recovery`, `mental-career`, `connections`, `injury-intake`). Read-only; no writes, no event emission.
- Returns `Record<stepIndex, "answered" | "open" | "neutral">` plus `answeredCount` / `totalAnswerable`, so the mapping lives in one place next to the `STEPS` constant in `src/pages/AthleteOnboarding.tsx`.
- `src/components/onboarding/AthleteOnboardingShell.tsx` gains an optional `stepStatus` prop. When absent, current positional behavior is unchanged (other flows using the shell are unaffected). Chip styling switches to status-driven classes, the active step keeps its ring, and `allowForwardJump` is enabled for the athlete flow.
- Legend + counter render below the existing `<ol>` step row using existing tokens; no new colors.
- The status query invalidates on the same keys the steps already write to, so finishing a step immediately fills its chip on return.
