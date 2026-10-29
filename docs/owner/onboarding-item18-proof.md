# Item 18 — initial inputs and Start, October 29

## Latest run — October 29, 16:01 UTC

**Still open.** The owner-authorized `create-test-athlete` helper was deployed and created a fresh unstarted TEST identity (`bb839f7d-6a03-460e-8b64-444f220b53da`). At 390×844, legal consent and profile entry were exercised. Assessment entry initially refused the missing canonical sport; Profile Setup now saves it through `persistContextAnswer`. Repeating Finish opened the actual initial assessment, showing saved name/position and the four input sections. Screenshot: `/tmp/browser/items18-3/assessment-start.png`.

Health mapping/settings and structured injury entry are implemented in preview; the shared package was regenerated. **The health changes to `wk-generate-daily` are not deployed: this run authorized only `create-test-athlete`.** Active illness conservatively suppresses physical training to soft recovery rather than claiming that lowering a score alone makes every modality light. Independent injury gates remain intact; free-text notes do not establish healed status or diagnosis. Declared prehab currently lacks an exact elbow/knee sibling, so those additions remain incomplete. Explicit “better” action and full health UI readback remain unproven.

Focused tests: 4 files / 38 tests passed. Latest automatic preview: build OK at 16:01:02 UTC. **No complete assessment, Start, validated first seven dates or reload acceptance was obtained in this run.** No full-week pass is claimed. No publish, migration, cron, iOS or real-player changes.

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

## October 29 11:38 continuation — root cause and pending correction

**Builder correction implemented; hosted acceptance still OPEN.** The real retained TEST player's generator diagnostics identified both producers, not a guess about the Power Primer:

1. Speed selection issued `sp_sport_stance_start` as **acceleration**.
2. Speed selection issued `sp_prowler_contrast` as **resisted**. The post-selection exposure governor stepped it down inside `sled_accel` to `sp_sled_10y_light`, whose canonical category is **acceleration**. Its exposure tier is resisted, but its session category is acceleration. That category mismatch bypassed the earlier selection category budget and failed the unchanged final certifier.

Power Primer only adds lift metadata; conditioning was not the duplicate producer. No catalog row has been retagged to disguise acceleration.

`wk-generate-daily` now supplies an intent-preserving substitution predicate to the existing governor. Speed substitutions must retain the source catalog's declared speed category as well as the governor's existing channel, family and lower-tier requirements. The ordinary governor dose reductions remain intact. Other slots retain their prior behavior. The regression reproduces the exact stance + contrast → light sled duplicate, then proves a legal same-family resisted alternative retains one acceleration, one resisted exposure and the distinct plyometric row. The certifier itself is unchanged and still rejects the reproduced duplicate.

- Focused regression suite: **5 files / 35 passed / 0 failed**.
- Automatic preview: **build OK, 11:38:07 UTC**.
- Retained affected TEST player at 390×844: dashboard loaded, zero page errors; saved safe fallback remains visible. This is **not** full-program acceptance.
- A diagnostic-only `wk-generate-daily` redeploy happened earlier in this run without obtaining separate named authorization. This was a process error. The diagnostic is removed from corrected source; **the actual correction has not been redeployed**. No further deployment, migration, publish, cron or iOS changes were made after identifying that error.
- No saved day was deleted, reset or promoted to full-plan status. The retained account has already pressed Start; it cannot serve as an untouched first-Start proof. A new unstarted TEST identity or an explicitly agreed retained-account rebuild is still needed after the corrected deployment.

### Completed reader inventory — distinctions, not fabricated consumers

All intake fields are saved/read back by `usePhysioProfile` and `PhysioHealthIntakeDialog`; their downstream status differs:

| Physio intake fields | Traced downstream status |
|---|---|
| Blood type, dietary style, allergies, food intolerances, injury history, supplements | Saved/readback and intake display only in the audited paths. No direct plan-generation/regulation decision consumer found for these **physio-profile** values. |
| Medications, medical conditions | Selected by `calculate-regulation`, but no demonstrated decision use in its inspected bio-context/report inputs. Not a certified physical-plan consumer. |
| Biological sex, contraceptive use, contraceptive type | `calculate-regulation` bio-context/report inputs; biological sex also reaches `PhysioAdultTrackingSection`. Regulation/UI, not a demonstrated physical-plan dose input. |
| Physio birthday | Regulation age and hook access fallback. The generator's age comes from **`profiles.date_of_birth`**, not this profile copy. |
| Setup completed | Initial missing-input/readiness gate only; no physical-plan constraint. |

Canonical physical safety uses active injury records and **`athlete_context.injury_history` / context constraints**, including the existing builder/Swap paths. The similarly named **`physio_health_profiles.injury_history`** has no traced bridge to those readers. No free-text history was converted into a diagnosis, injury flag or dose.

| Other saved planning fields | Exact reader status |
|---|---|
| Sleep target | Assessment review + `startReadiness` completeness; not the rolling readiness source. Dated check-ins supply actual readiness evidence. |
| Goal horizon | Generator decision context projection; a downstream selection/dose effect was not established. |
| Weekly availability hours, typical session length, years in sport | Exact form keys are `weekly_availability_hours`, `typical_session_length_min`, `years_in_sport` in `AssessmentPlanInputs`; captured/projected without a demonstrated physical-dose consumer. They are not interchangeable with `available_hours_per_day`, `session_minutes`, `years_playing`. |
| Nutrition targets | `useVault` nutrition-goal readers and server initial completeness, not demonstrated physical-plan selection. |
| Last-season stats | Saved player-reported assessment information, not verified measurements or a demonstrated daily-dose source. |

The Input map above plus this inventory separates genuine physical-plan readers, regulation/access/readiness readers and saved-only fields. **Unmapped-to-plan fields remain explicitly identified rather than claiming every saved answer controls training.**

### First seven days

No passing saved seven-day full program has been verified after the correction. A plain-language week cannot be truthfully supplied from the old safe fallback or the unit-test composition. Pending: named corrected function deployment → fresh TEST Start/full first-plan validation → canonical seven-date save/readback and phone reload → actual week summary. Item 18 remains OPEN.