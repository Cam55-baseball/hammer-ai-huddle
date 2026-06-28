# Editable onboarding — every answer revisitable, every edit fully saved

Today the athlete onboarding wizard moves forward step-by-step. There is a "Save & exit" exit and a resume banner, but no **review screen** that lists every answer and lets the user jump back, change one answer, and re-save it durably. This plan adds that — and guarantees each edit fully persists (athlete_context column + ASB event lineage) so Hammer's daily plan reflects the corrected answer on the very next render.

## 1. Review & Edit step (new, last step of the wizard)

New `src/components/onboarding/steps/ReviewAnswersStep.tsx` rendered as the final step of `AthleteOnboardingShell`:

- One row per answer category, in the same order as the wizard:
  - Date of birth / age band
  - Sport + discipline (BB / SB, Position / Pitcher, two-way flag)
  - Schedule day-type
  - Notifications preference
  - Category goals V2 (per-discipline, per-category, primary/secondary)
  - Injury intake (if any)
- Each row shows the current value in plain language plus an **"Edit"** button.
- "Edit" deep-links back to that specific step via `?edit=<stepKey>&return=review`. After save, the wizard returns to the Review screen instead of advancing.
- A "Finish" button at the bottom marks onboarding complete (existing schedule + notif + goals gating).

The same Review screen is also reachable any time **after** completion via the existing `OnboardingStatusCard` "Review setup" button — so post-onboarding edits use exactly the same UI.

## 2. Per-step "edit mode" support

Each existing step component (`AgeStep`, `SportStep`, `ScheduleDayTypeStep`, `NotificationsStep`, `CategoryGoalsStep`, `InjuryIntakeStep`) gains two props it currently lacks:

- `mode: "wizard" | "edit"` — in `"edit"`, the step hides "Continue" and shows "Save changes" + "Cancel".
- `onSaved: () => void` — called after a successful write so the parent can route back to Review.

`AthleteOnboarding.tsx` reads `?edit=<key>` on mount and renders just that step in `mode="edit"` with `onSaved` wired to `navigate("/onboarding/athlete?step=review")`.

## 3. Full-save guarantee on every edit

Every edit path goes through one shared helper `src/lib/onboarding/saveAnswer.ts` so we can't accidentally half-save. For each answer it does, in order:

1. **Write the canonical row** (`profiles`, `athlete_context.category_goals`, `notification_preferences`, etc.) with `upsert` and `onConflict` set correctly.
2. **Emit an ASB lineage event** on the relational topic for that answer (`relational.developmental.*`, `athlete.schedule.day_type`, `relational.injury.reported`, etc.) with `lineage_parent_ids` pointing at the previous answer's event_id so the change is traceable.
3. **Clear the matching draft slot** via `clearDraftSlot()` (the in-progress draft is no longer the source of truth once a real answer is saved).
4. **Invalidate** the React Query keys for `["athlete-onboarding-state", uid]` and `["athlete-context", uid]` so Profile + Hammer Daily Plan re-render with the new value immediately.
5. On any failure, the call rejects with a typed error and the caller shows a destructive toast — the user is **never** told "saved" when the row didn't write.

The helper is used by both the wizard's "Continue" handler and the new edit-mode "Save changes" handler — no duplicated save logic.

## 4. Resume preserves edit intent

`OnboardingResumeBanner` already deep-links into the wizard. It is extended to also handle `?edit=<key>&return=review` so a user who hits "Save & exit" mid-edit lands back in the same edit screen, not at step 1.

## 5. Goals editor parity (already mostly there)

`CategoryGoalsCard` in Profile already opens the V2 wizard for editing. It is rewired to call the shared `saveAnswer` helper so its writes follow the same five-step guarantee (canonical row + lineage event + draft clear + invalidate + error surface).

## 6. Tests

Extend `src/lib/runtime/relational/__tests__/onboarding-regression.test.ts`:

- Edit DOB after completing onboarding → `profiles.date_of_birth` updates AND a new `relational.developmental.age_observed` event appears with `lineage_parent_ids` referencing the original.
- Edit category goals from Review → `athlete_context.category_goals` updates AND Hammer daily plan re-prioritises on the next render.
- Edit notifications preference → `notification_preferences` row reflects the change AND `useAthleteOnboardingState` reports `hasNotificationsPref=true`.
- Failed save (forced 500) → no toast says "saved", draft slot is **not** cleared, Review screen still shows the previous value.

## Out of scope (explicit)

- No new tables. Reuses `profiles`, `athlete_context`, `notification_preferences`, and `asb_events`.
- No change to who can edit (athlete-only — coaches/parents can't edit athlete goals here).
- No redesign of the wizard's visual shell — only adds the final Review step and an edit-mode variant of existing steps.

## Files touched

- New: `src/components/onboarding/steps/ReviewAnswersStep.tsx`
- New: `src/lib/onboarding/saveAnswer.ts`
- Edit: `src/pages/AthleteOnboarding.tsx` — reads `?edit=`, renders single step in edit mode, routes back to Review.
- Edit: `src/components/onboarding/steps/*` — add `mode` + `onSaved` props, route writes through `saveAnswer`.
- Edit: `src/components/settings/CategoryGoalsCard.tsx` — use `saveAnswer`.
- Edit: `src/components/onboarding/OnboardingResumeBanner.tsx` — preserve `?edit=` deep-link.
- Edit: `src/lib/runtime/relational/__tests__/onboarding-regression.test.ts` — four new regressions above.