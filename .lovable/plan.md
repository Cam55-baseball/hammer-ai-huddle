
# Plan — Injury Reporting + Onboarding Closure (A + B + C + D)

Goal: every injury signal flows through one canonical emitter that immediately gates Hammer; onboarding is resumable from a real, discoverable place; new athletes can't miss injury intake.

---

## A. Today-plan injury reporter (canonical RR-6 wiring)

**New:** `src/components/hammer/ReportInjuryDialog.tsx`
- Body-region chips (shoulder, elbow/UCL, forearm, wrist, hip, knee, ankle, low back, oblique, hamstring, quad, other)
- Severity (niggle / sore / limiting / cannot-train)
- Side (L/R/bilateral/N-A), onset date, free-text note, "affects throwing / hitting / running / lifting" checklist

**New:** `src/lib/hammer/injury/reportInjury.ts` — single entrypoint that:
1. Calls `emitInjuryReported` (RR-6 canonical, already exists in `relational/emit`)
2. Appends `injury_history` on `athlete_context` via `persistContextAnswer` so the existing `decisionFilters` keyword path keeps working until the projection is consumed everywhere
3. Invalidates: `['hammer-daily-plan']`, `['hammer-state']`, `['athlete-context']`, `['injury-recovery-state']`
4. Fires `compute-hammer-state` edge function so next render reflects the report

**Wire-up in `HammerDailyPlan.tsx`:** add a "Report injury" action in the header next to "Tell Hammer", plus an inline "Something hurt?" link on each modality card that pre-fills the affected modality.

**Scheduler effect (immediate):** `decisionFilters.ts` already derives `injuryRegions` from `injury_history` — confirm `reportInjury` writes land before Hammer re-renders (await invalidate). Add `injuryRecoveryState` projection read into the same filter so the canonical event path also gates blocks, not just the keyword path. No RTP authoring (constitutional — human authorization only).

## B. TellHammerDialog injury detection (lightweight complement)

In `TellHammerDialog.tsx`, after the user types a note, run a deterministic phrase detector (regex over `hurt|pain|tweaked|strained|sprained|sore|injured|tight` + region keywords). If matched:
- Show inline "It sounds like you mentioned an injury — want to log it properly?" prompt
- One-tap opens `ReportInjuryDialog` pre-filled with the detected region + the note as context
- If user dismisses, the free-text still saves to `goal_summary` as today

No silent inference — athlete confirms before any RR-6 event fires.

## C. Onboarding resume — settings-anchored, discoverable

**Harden `useAthleteOnboardingState.ts`:** `hasFirstEvent` becomes `hasBootstrapEvent` — query `asb_events` filtered to `topic_id = 'relational.developmental.age_observed'` with `actor_role = 'athlete'`. Generic events no longer count as "onboarded".

**New canonical settings location:** add an "Account & Setup" section to the existing settings/profile surface (Profile page is the natural anchor — already linked from `UserMenu`). Add a card:
- If incomplete → "Finish onboarding" primary CTA → `/onboarding/athlete`
- If complete → "Review setup" secondary link → `/onboarding/athlete?mode=review` (read-only step navigator)
- Shows last completed step + remaining steps from `useAthleteOnboardingState`

**UserMenu addition:** add a "Setup" item between Profile and Quick Edit that routes to the same settings section, with a small dot badge when onboarding is incomplete. This is the strategically placed entry the user asked for.

**Persistent banner (dismissible per session, not permanent):** `DashboardLayout` renders a thin "Finish your setup (2 of 5 steps left)" bar only when `!hasBootstrapEvent || stepsRemaining > 0`. Dismiss persists in `sessionStorage`, not DB — so it reappears next session until completed.

## D. Minimum injury step inside onboarding

Add a new step to `AthleteOnboarding.tsx` flow: **"Current injuries or pain"** placed after identity/role and before goal capture.
- Reuses the `ReportInjuryDialog` body-region picker as inline content
- "I'm healthy" is a first-class option (emits nothing — explicit missingness preserved per Phase 151 doctrine)
- Any selected region calls the same `reportInjury` entrypoint from A
- Step is skippable but tracked: skipping emits `onboarding.step_completed` with `skipped: true` so the resume CTA knows it was acknowledged

---

## Technical notes

- **Single source of truth:** all four flows (A inline, A modality card, B promoted, D onboarding step) call exactly one function: `reportInjury()` in `src/lib/hammer/injury/reportInjury.ts`. No duplicated emit logic.
- **RR-6 constitutional compliance:** no diagnosis, no RTP authoring, no severity inference — only athlete-declared values land in the event payload. `inferred_confidence` is never set.
- **Scheduler gating:** `decisionFilters.ts` reads both the legacy `injury_history` strings AND the `injuryRecoveryState` projection, taking the union of restricted regions. This preserves backward compat while making the canonical path authoritative.
- **No DB schema changes** — `asb_events` already holds RR-6 events; `athlete_context.injury_history` already exists; no new tables.
- **Tests:** extend `tests/normalizers.injury.spec.ts` with a `reportInjury → decisionFilters` integration test asserting the next Hammer plan suppresses the affected modality. Extend `onboarding-regression.test.ts` with the new injury step (skippable + reportable paths) and the `hasBootstrapEvent` tightening.

## Files touched

```text
NEW  src/components/hammer/ReportInjuryDialog.tsx
NEW  src/lib/hammer/injury/reportInjury.ts
NEW  src/components/onboarding/steps/InjuryIntakeStep.tsx
NEW  src/components/settings/OnboardingStatusCard.tsx
EDIT src/components/hammer/HammerDailyPlan.tsx          (header action + per-modality link)
EDIT src/components/hammer/TellHammerDialog.tsx         (phrase detector + handoff)
EDIT src/pages/AthleteOnboarding.tsx                    (insert injury step)
EDIT src/pages/Profile.tsx                              (mount OnboardingStatusCard)
EDIT src/components/UserMenu.tsx                        (Setup item + incomplete badge)
EDIT src/components/DashboardLayout.tsx                 (resume banner)
EDIT src/hooks/command/useAthleteOnboardingState.ts     (hasBootstrapEvent + stepsRemaining)
EDIT src/lib/hammer/context/decisionFilters.ts          (union with injuryRecoveryState)
EDIT tests/normalizers.injury.spec.ts                   (reportInjury integration)
EDIT src/lib/runtime/relational/__tests__/onboarding-regression.test.ts
```

## Out of scope

- RTP authorization UI (constitutional — requires human-clinician surface, separate phase)
- Coach-facing injury notification surface (RR-6 §safeguarding routing — separate phase)
- Mutating any sealed RR-6 emitter schema
