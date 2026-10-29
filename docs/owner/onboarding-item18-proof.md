# Item 18 — initial inputs and Start, October 29

**OPEN.** Initial capture/readback and Start passed for a brand-new TEST player at 390×844. The first full program did not pass: the unchanged speed certifier rejected two acceleration entries. The safe-session fallback is not full-plan acceptance. No safety rule was relaxed to obtain a pass.

## Input map

| Answer | Initial capture | Canonical saved location | Actual reader / remaining limit |
|---|---|---|---|
| Sport, primary/secondary positions, bats/throws, level | Signup; assessment profile/planning review | `athlete_context` | `contextProjection.ts`, `decisionFilters.ts`, `dailyPlan.ts`, server `resolveAthleteContext`; generator primary/secondary position reads now include canonical context. |
| Birthday | Signup birthday screen; assessment planning review | `profiles.date_of_birth` | Generator `ageFromDob`, minor/access rules; not copied from MPI birthdate. |
| Height, weight, entered body measurements | Assessment Body section | `athlete_context.anthropometrics` | `dailyPlan.ts` → `buildAnthroProfile`; measured growth history remains separate, never manufactured. |
| Days available | Assessment planning review | `athlete_context.weekly_availability_days` | Envelope → `decisionFilters.projectEnvelope`, daily builder availability. |
| Season phase and six phase boundary dates | Assessment planning review | `athlete_mpi_settings`; context `season_phase` | Generator `seasonWithTimeline` → `resolveWkPhase`; existing client season reader. Explicit unknown-date acknowledgement is stored on the assessment and checked by Start, never used as invented dates. |
| Ranked goals | Assessment Your goals | `athlete_context.category_goals`, including `categoryOrder` | Envelope → goal direction/pick ordering and reasons; server readiness requires saved picks and order. |
| Lifting experience | Assessment planning review | `athlete_context.lifting_age_years` | Generator canonical training-age read now includes this value; envelope/client lifting filters. Zero is an explicit valid answer. |
| Equipment inventory/memory start | Assessment Equipment | Persistent `athlete_equipment_context` | Existing scope resolver → athlete context/equipment-effective projection → builder equipment judge. No missing-equipment answer is invented; later dated/permanent missing answers still use existing equipment memory. |
| Sleep baseline | Assessment planning review | `athlete_context.sleep_target_hrs` | Stored and server-required. **No direct dose consumer found in the inspected daily builder/generator; dated sleep check-ins remain the actual rolling readiness evidence.** |
| Complete nutrition targets | Assessment planning review | `vault_nutrition_goals` | Existing Vault nutrition readers (`useVault`). Server readiness checks calories/protein/carbohydrates/fat/water individually. Optional fiber/sugar/sodium/supplements retained. **Not demonstrated as a direct physical-plan selection input.** |
| Health/physio setup | Existing three-page Health & physio intake | `physio_health_profiles` | Existing `usePhysioProfile` and physio readers; readiness checks completed setup. **Full bridge from every intake field to plan safety was not certified; generator still reads canonical active injury records/context constraints.** |
| Subscription-specific last-season stats | Assessment step 2 | `initial_assessments.last_season_stats` | `seasonStatGroups` renders saved-sport active-subscription fields. **No direct daily-builder consumer found; not turned into verified measurements or dose inputs.** Unknowns remain blank; explicit skipped steps remain skipped. |
| Goal horizon, available hours, session minutes, years playing | Assessment planning review | `athlete_context` | Goal horizon reaches decision projection; other keys are projected/captured, but direct daily selection use was not established. These are optional, not falsely advertised as controlling dose. |

Dynamic check-ins, injury progression, verified maxes/tests, height history, calendar games/practices, recent workload, and learning evidence are not initial answers. Missing history stays unknown; no fabricated measurements or defaults were added to satisfy onboarding.

## Fresh affected-player proof

- Dedicated owner-only `create-test-athlete` persona created a new, unstarted TEST identity; no old account was reset. Only its empty TEST entitlement was initialized to active baseball 5Tool access. Identity retained for follow-up; no cleanup performed.
- At 390×844, birthday/profile capture and legal choices were completed through the UI; assessment Body, Equipment, Your goals, Training/nutrition/health and subscription-specific stats were saved through actual forms.
- Readback confirmed: birthday 2005-03-01; CF + SS; right bats/throws; height 70 in and weight 175 lb; 6 available days; sleep 8 hours; lifting 2 years; ranked Hitting/Fielding/Speed/Power/Throwing; all six 2027 season boundary dates; explicit off-season status.
- Nutrition readback: 2400 kcal, 120 g protein, 300 g carbohydrate, 80 g fat, 100 oz water; optional fiber 30 g, sugar 40 g, sodium 2300 mg, Vitamin D retained. These are labeled TEST inputs, not advice or real athlete outcomes.
- Persistent inventory readback matched the selected 12 gear entries; health setup returned `setup_completed=true`.
- TEST player-reported season statistics read back exactly. Step 1/2 were done; movement, S2, video and Vault tests were explicitly skipped. No test result or observation was fabricated by navigation.
- Initial self RPC returned 14 linked omissions; after save/reload it returned HTTP 200, `[]`. Start became available and persisted `hammers_today_started_at` at 05:43:56 UTC.
- First plan generation persisted a safe fallback. Exact diagnostics: `speed_duplicate_category`: acceleration appears twice, max one; then `global_invariant_failure:validator_fatals_present`. Reload showed “Safe session today”, not a full session. Re-invoking the same date returned `already_built`; no forced rebuild, day deletion or safety bypass was used.

## Implementation and verification

- Item-specific migration `0152_initial_plan_complete_readiness.sql` applied: canonical self/service-scoped `initial_plan_missing` and server Start validation. UI reads the RPC's exact labels/links; full non-privileged generator calls recheck completeness and started timestamp. Existing saved-plan verification remains read/trim-only; existing owner/admin privilege handling is retained and is not an affected-player bypass proof.
- Item-specific `wk-generate-daily` and owner-only TEST creation helper deployments applied. Frontend changes remain preview-only. No publishing, cron or iOS changes.
- Regression tests: **4 files / 64 passed / 0 failed**. Automatic preview **OK, 05:46:51 UTC**. The full suite was not rerun for this item-only task.
- Browser evidence: `/tmp/browser/item18/` captures signup, Body/health/goals/stats, saved-answer reload, Start, first fallback and reload. Actual database readback above is canonical, not a synthetic rendered fixture.

**Remaining:** full first-plan acceptance; exhaustive unmapped-field/physio safety integration verification; direct consumption requirements for saved baseline/stats where currently absent. Item 18 is not publish-ready.