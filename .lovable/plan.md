## Goal
Turn athlete onboarding into a full, hybrid guided tour (~10–15 min) that captures every variable our modules already consume, so Today Plan, Nutrition Hub, Recovery, Calendar, Game Hub, Recruiting, and Coach/Parent linking all light up on day one. Structured domains use the stepper; qualitative domains stay in Hammer chat. Minors see every question but writes to weight-goal and recruiting surfaces are gated until a parent authorizes.

## New onboarding shape

Progress bar shows "Step N of ~12". Every step has Back / Save & Exit / Continue. Anything can be revisited from a Review step at the end and from Settings → Onboarding.

```text
1.  Welcome + role/sport confirm      (existing)
2.  Identity & handedness             (existing, incl. "Both" throwing)
3.  Anthropometrics                   NEW — height, weight, wingspan, hand size, dominant leg
4.  Body & health                     NEW — DOB/grade, biological stage band, weight-goal (cut/maintain/gain), target weight (minor→gated)
5.  Injury & medical history          EXPAND — past injuries, current pain zones, surgeries, RTP status, cleared limitations
6.  Sport context & positions         (existing) — primary/secondary positions, bats/throws, two-way
7.  Training environment & equipment  EXPAND — home/gym/field, equipment inventory, indoor/outdoor, weekly hours, session length
8.  Season & schedule                 EXPAND — current season phase, team commitments, practice days, game days, travel windows, import schedule CTA
9.  Category goals (5 ranked)         (existing) — sport-specific sub-goal trees
10. Fuel & recovery                   NEW — dietary style, allergies, meal count, hydration baseline, supplements, typical bed/wake, sleep hours target, HRV/wearable device, stress baseline
11. Mental & career                   NEW — pre-game routine, focus/confidence baseline, level target (HS/JUCO/D1/pro), showcase plans, verified stats sites, exposure prefs (minor→gated)
12. Connections & notifications       NEW — parent link (required for minors), coach link, notification channels, quiet hours
13. Review & finish                   NEW — chip list of every answer, edit any, then complete
```

Hammer chat director stays available after finish for drip questions (mental notes, injury narrative, life context) that don't fit the stepper.

## Minor branching (RR-8 / RR-10)

- DOB in step 4 sets `is_minor`. All prompts still render.
- Weight-goal + target weight, recruiting level, showcase, exposure, verified-stats: inputs enabled, but Continue writes a pending intent (not the live goal) and shows a "Awaiting parent authorization" chip until the parent link in step 12 completes RR-10 consent flow.
- Parent link uses existing `parent_invite_dispatches` + `athlete_recruiting_consent` primitives.

## Data plumbing (E2E)

Every new field maps to an existing canonical owner — no parallel truth surfaces:

| Step | Fields | Canonical table / event |
|------|--------|--------------------------|
| 3 Anthro | height, weight, wingspan, hand, dominant leg | `athlete_context.anthropometrics` (envelope) |
| 4 Body | DOB, weight-goal, target weight | `profiles.dob`, `athlete_body_goals` (new intent col for minors), `vault_wellness_goals` |
| 5 Injury | history, current pain, RTP | `physio_health_profiles`, `athlete_events` (`injury.reported`) |
| 7 Equipment | inventory, indoor/outdoor, hours | `athlete_equipment_context`, `athlete_context.equipment_effective` |
| 8 Schedule | season, practice/game days, travel | `athlete_context.season_phase`, `calendar_events` via existing importer |
| 10 Fuel | diet style, allergies, hydration, supplements | `hydration_settings`, `vault_nutrition_goals`, `nutrition_streaks` seed, `athlete_context.dietary_prefs` (new envelope key) |
| 10 Recovery | bed/wake, sleep target, wearable, stress | `wellness_preferences`, `stress_assessments` seed, `wearable_metrics` device pref |
| 11 Mental/Career | routine, level target, showcase, exposure | `mental_health_prompts` seed, `athlete_professional_status`, `athlete_recruiting_consent` (pending for minors) |
| 12 Connections | parent, coach, notif prefs | `parent_athlete_links` / `parent_invite_dispatches`, `folder_coach_permissions`, `notification_preferences`, `follower_notification_prefs` |

All writes flow through existing acquisition helpers / `emitAsbEvent` — no new topic namespace. Existing `useAthleteOnboardingState` gains `hasAnthro`, `hasFuel`, `hasRecovery`, `hasConnections`, `hasCareerIntent` derivations; `hasCompletedOnboarding` requires the required subset only.

## Required vs recommended vs optional

- **Required to enter app**: role, sport, handedness, positions, category goals, schedule day-type, notification pref. (Matches today's gate — we don't raise the barrier.)
- **Recommended (prompted, skippable per step)**: anthro, injury, equipment, season, fuel, recovery, connections.
- **Optional**: career/showcase, mental prompts, verified-stats links.

Skipping still records a `missing` envelope entry (no fabrication) and Hammer will re-ask contextually when the athlete opens the relevant module.

## Implementation steps

1. Extend `AthleteOnboardingShell` step registry with the seven new/expanded steps and a Review step; wire draft persistence per step (existing `onboarding-step` draft slot).
2. Build step components under `src/components/onboarding/steps/`: `AnthropometricsStep`, `BodyHealthStep`, `InjuryHistoryStep` (extend existing intake), `EquipmentStep`, `SeasonScheduleStep` (embed `SeasonScheduleImporterDialog`), `FuelRecoveryStep`, `MentalCareerStep`, `ConnectionsStep`, `ReviewAnswersStep` (extend existing).
3. Add acquisition writers in `src/lib/hammer/context/acquisition.ts` for new envelope keys (`dietary_prefs`, `hydration_baseline`, `sleep_target`, `wearable_device`, `stress_baseline`, `pregame_routine`, `career_target`, `showcase_intent`, `exposure_prefs`).
4. Extend `AthleteContextEnvelope` SPINE_VARIABLE_KEYS and the `get_athlete_context_envelope` RPC (migration) to expose them with `{ value, source, confidence, missing, last_updated, owner }`.
5. Add minor-write gating helper `gateMinorWrite(userId, surface)` that routes to pending-intent tables when `is_minor && !parent_authorized`.
6. Update `useAthleteOnboardingState` derivations and the Profile/Sidebar "resume onboarding" panel to reflect the expanded checklist (required subset unchanged, recommended shown as progress ring).
7. Keep `useHammerOnboardingDirector` linear nav; add the new gap ids so post-onboarding Hammer chat can re-ask any skipped item without duplicating step logic.
8. E2E smoke via existing `.github/workflows/onboarding-regression.yml` — add fixtures for each new step, a minor branch, and a completion-with-skips branch.

## Constitutional guardrails

- No fabrication: skips write `missing: true` envelope entries, never defaults.
- RR-6: injury inputs are athlete-reported, never diagnostic; RTP requires human authorization downstream (unchanged).
- RR-8: life context (sleep, stress, family) is user-controlled; every field skippable, no coercion copy.
- RR-10: minor writes to weight-goal / recruiting / exposure are pending-intent until parent authorizes.
- Additive-only: no existing step removed, no envelope key renamed, no topic namespace introduced.

## Open items before build (I'll confirm as I go, flag if you want to decide now)
- Whether weight-goal for adults writes directly to `vault_wellness_goals` or stays as a Nutrition-Hub-owned surface with onboarding only capturing intent — I'll default to writing intent + linking, not overriding an existing goal.
- Whether coach-link invite in step 12 sends immediately or queues to Review — I'll default to queued, sent on finish.
