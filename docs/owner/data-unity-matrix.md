# Data-unity matrix — final batch verification (Oct 24)

**Release verdict: FAIL / not certified.** Static source checks are not the requested
entry-write/readback proof. The earlier three individual fixes retain their live
evidence; the full fourteen-kind, eight-surface matrix has not passed end to end.

One row per entry kind. "Writes" is the table the entry is saved to. Each surface
column is marked: **direct** (the surface queries the table), **derived** (it reads
a saved summary/state built from the table), **by design** (intentionally not shown
there), or **GAP** (expected but not connected — listed honestly, not hidden).

Automated contract tests live in `src/test/unity/dataUnity.test.ts`: one test per
row checks source references to the declared writer and reader. These are static
contracts, not entry-write/readback tests. A passing contract does not establish
live data landing in every surface; unverified cells remain unverified.

## Surfaces key

October 25 final continuation: all 532 files / 4,228 tests passed again in four
bounded groups. Combined workload/equipment Okay/Cancel proof passed again at
390×844, fixture-only. Read-only hosted aggregates found zero October 25 hitting
rows and zero saved snapshots for system/suspended/paused accounts; no source
was fabricated. Row 3 positive choice → focus → all-surface readback remains
UNVERIFIED. Public preview startup passed; fresh production build logs were
unavailable. No hosted writes, migrations, redeploys, publish, cron or iOS changes.

October 25 14:46 correction: measured workload-cap, lifting dose-range and
missing-equipment warnings share the exact recipient/date/rule acknowledgement
and atomic override trail (migration 0119). Coach actions dated today and player
activation read the same envelope; unknown future-day workload is not invented.
Combined 390×844 Okay/Cancel proof is fixture-only. No October 25 saved hitting
source was found for kept system TEST players, so positive hitting replacement,
focus logging and all-surface readback remain UNVERIFIED. Critical medical,
age/season, access and data-integrity checks remain fail-closed. Older blocker
wording below is historical, not a claim that equipment/caps still hard-block.

October 25 05:32 final batch: full suite 532 files / 4,219 tests PASS;
16 phone warning decisions PASS (fixture only). Live coach management reader
returns 200; live override audit trigger enabled. No hosted override was saved:
audit display, canonical Because readback and learning consumption remain
UNVERIFIED. Stored behavioral input is not evidence of a learning effect.

October 25 05:27 continuation: no warning-action bypass found in existing
prescription hooks. Multiple date rules accumulate; exact calendar-date validation
and repeated-acknowledgement refusal tested. Override event storage remains distinct
from learning interpretation: no new dose-changing learning behavior is claimed.
Sent workouts resolves the confirmer as the recipient or the viewing sender.

- **General** = The General tabs (Today / Performance / Growth), `src/pages/ProgressDashboard.tsx`
- **History** = `src/pages/History.tsx` via `src/hooks/useHistoryRecords.ts`
- **Vault** = `src/hooks/useVault.ts` / `useVaultVideos.ts`
- **Coach** = Coach View: summary (`coach_athlete_glance`), Hammers' plan (`coach_athlete_plan` → `athlete_plan_snapshots`), Development (`coach_athlete_development`), Discipline (`coach_athlete_discipline`)
- **Org** = org dashboard and comparisons (`org_board_checkin_attendance`, `org_test_ranking`, `org_compare_athletes`)
- **Scout** = Scout Profile (`scout_athlete_profile`), within sharing consent
- **Learning** = learning loop (`compute-hammer-state`, `evaluate-behavioral-state`, `extract-patterns` → `anonymized_pattern_library`)
- **Nightly** = nightly jobs (`nightly-mpi-process`, `wk-daily-plan-job`, `nightly-foundation-health`)

## Matrix

| # | Entry kind | Writes to | General | History | Vault | Coach | Org | Scout | Learning | Nightly |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Plan cards & focus-mode logs | `wk_session_logs` | direct (StandardsBoard, Performance) | by design (practices/games/reports only) | by design | direct (Discipline joins wk_prescriptions→wk_session_logs); plan via derived `athlete_plan_snapshots` | derived (status counts) | by design | direct (wk-generate-daily, trendDeload) | derived (wk-daily-plan-job reads prescriptions) |
| 2 | Swaps | `swap_log` + `athlete_equipment_memory` (server RPCs `wk_swap_*_atomic`) | via saved plan | by design | by design | derived (coach_athlete_plan reads saved plan) | by design | by design | direct (plan-swap, wk-generate-daily read equipment memory) | by design |
| 3 | Coach prescriptions and actual performed work | `coach_prescriptions` → checked `wk_prescriptions` → normal `wk_session_logs`; NOT `custom_activity_logs` | PASS retained canonical API log read/reload; choice→focus UNVERIFIED | PASS same retained log read/reload; choice→focus UNVERIFIED | PASS same retained log read/reload; choice→focus UNVERIFIED | Sent workouts + coach-plan actuals: behavioral mocked write/read/remount PASS, recipient/date isolation PASS; hosted acceptance/snapshot UNVERIFIED | Current-sender view mounted; demoorg purchase-gated, assigned-role proof UNVERIFIED | Unverified consent-scoped projection | Some canonical readers connected; full readback UNVERIFIED | Canonical job effects UNVERIFIED; no legacy-log write |
| 3b | Coach prescription days on the player calendar | read-only projection of `coach_prescriptions` (buildCalendarEvents source `coach_prescription`) | by design | by design | by design | by design | by design | by design | by design | by design |
| 4 | Practice logs | `performance_sessions` (+ optional `athlete_daily_log`, `governance_flags`) | by design | direct (usePracticeHistory) | by design | derived (load/coach views) | by design | by design | direct (compute-hammer-state) | direct (nightly-mpi-process) |
| 5 | Game logs (player scorekeeping) | `gp_games`, `gp_at_bats`, `gp_pitches`, `gp_defense_plays`, `gp_baserun_events` | direct (Game IQ tab, not Today/Performance/Growth) | direct (useGameHistory, gp_reports) | by design | direct (coach_athlete_games, CoachTeamReport) | by design | by design | by design | direct (nightly-mpi-process finalized games) |
| 6 | Game logs (coach-entered) | `coach_logged_entries` (+ `arm_ledger_entries`, + `gp_games` mirror with `entry_source='coach'`, `ignored_for_training=true`) | by design | direct (useGameHistory reads the gp_games mirror) | by design | direct (CoachLogForPlayer panel + coach_athlete_games) | by design | by design | by design | by design |
| 7 | Video analyses | `videos` | by design | derived (aggregate count only; History is the non-video home) | **partial** — `useVaultVideos` reads `session_videos`, not `videos` (Players Club is the video vault) | direct (coach_athlete_development reads videos + analysis_fault_findings) | by design | direct (scout_athlete_profile, within consent) | by design | by design (nightly-foundation-health reads `library_videos`, not athlete videos) |
| 8 | Tests (Vault) | `vault_performance_tests` | derived (Performance links to Vault tests) | by design | direct (useVault) | direct (coach_athlete_tests, glance) | direct (org_test_ranking, board attendance) | direct (scout_athlete_profile) | by design | by design |
| 9 | Tests (combine) | `combine_sessions`, `combine_results` | by design | by design | by design | direct (coach_athlete_tests UNIONs combine results) | direct (org_test_ranking includes combine events) | direct (scout_athlete_profile metrics includes combine results) | by design | by design |
| 10 | Check-ins (daily status) | `athlete_daily_log` | direct (DualStreakDisplay, Growth) | by design | by design | direct (coach_athlete_readiness counts both check-in systems; contents behind health sharing) | direct (org_facility_board checkins_7d counts both) | by design | direct (evaluate-behavioral-state, detect-behavior-patterns, hie-analyze) | direct (nightly-mpi-process) |
| 11 | Check-ins (daily standard) | `daily_standard_checks` | by design | by design | direct (MorningCheckInSuccess, DailyStandardCheck identity widget) | by design | by design | by design | by design | by design |
| 12 | Assessment / movement screen | `initial_assessments`, `movement_screen` | by design | by design | by design | direct (CoachOnSpotAssessment) | by design | by design | by design | by design |
| 13 | Goals | `athlete_body_goals` | by design | by design | by design | by design | by design | by design | direct (wk-generate-daily, generate-training-block, calculate-regulation) | by design |
| 14 | Equipment memory | `athlete_equipment_memory` | by design | by design | by design | derived (via saved plan) | by design | by design | direct (plan-swap, wk-generate-daily) | by design |

## Known gaps (honest, not hidden)

### October 25 coach guideline acknowledgements

New entry kind **3c — coach guideline override**: the server appends actor, UTC
timestamp, action, exact warning code/text, recipient, date and prescription in
`coach_prescriptions.safety_result.overrides`. A database trigger appends each
new acknowledgement to existing `audit_log` and `behavioral_events` in the same
transaction. Cancel returns before any write. Sent workouts exposes the stored
trail; activated rows carry it in `why_payload.coach_overrides` and their Because
line, so the saved block and permitted coach-plan read retain it.

Learning input reaches `behavioral_events`; actual learning interpretation is
UNVERIFIED, not claimed as an insight or training change. General/History/Vault
keep their canonical workout-log readers, not a second override log. No health
clearance is supplied by an acknowledgement: critical active pain/injury and
arm-limit/ramp protections remain fail-closed in the activation envelope.
The earlier hosted arm-rest send acknowledgement with reason and parent notice
is retained evidence, not proof of medically safe activation. Measured workload,
dose-range, missing-equipment and schedule findings warn; unknown/invalid data,
age/season, consent/access and same-category validation remain blocking.
Evidence: 16 390×844 fixture decision screens plus the combined warning rerun;
prior hosted Cancel → Okay and audit/behavioral input writes are retained.
Positive replacement/focus/all-surface readback remains OPEN. Monday no-warning
proof is an extra post-publish check, not a separate readiness blocker.

### Owner final-batch continuation — October 24, 23:37 run 4

- Row 3 coach-plan actual results now use the existing server-gated sender
  results reader. A behavioral normal logger save → remounted coach-plan results
  test reads 1.47 and excludes another date/player; 390×844 fixture screenshots
  show reload persistence. This is not hosted choice/focus/team evidence.
- Hitting/mobility/recovery call their existing WIC session certifiers; unknown
  saved catalog work/missing governed dose is blocked. Recipient TEST visibility
  and snapshot movement/category/nonduplicate coverage are asserted concretely.
- Full suite **528 files / 4,146 tests PASS**, final changed files refreshed;
  Deno/preview PASS. Only coach-rx-safety redeployed; no migration or hosted TEST
  training writes; personas untouched. Live TEST management reads 200 and phone
  pages were checked read-only; sessions were refreshed, not password sign-ins.
- Full arm/skill-dose lineage/own-item certification, existing block replacement,
  positive player/coach/org/team flows and row-3 downstream behavioral cells
  remain OPEN. Org is purchase-gated. Other rows remain unchanged; matrix is
  not certified. Evidence `.lovable/proofs/coach-run4/`.

### Owner continuation — October 24, 23:22 run

- Row 3 Sent workouts now attributes canonical logs only by exact authorized
  recipient/row/activated date/movement. Use today is not confused with the
  original scheduled day. Seven behavioral projection tests reject wrong-date,
  wrong-user, wrong-row and wrong-movement records; a canonical mocked save →
  remounted CoachPrescriptionStatus test reads back 1.47 and excludes 9.99 from
  another date. These are behavioral component tests, not hosted team acceptance.
- All shared actual readers display per-round times/distances, not just aggregate
  time/maximum distance; 390×844 fixture screenshot confirms readable results.
- Existing WIC domain judge now prevents category spill-over; Vault pending gear
  review blocks activation. Catalog/owner-review freshness is checked under the
  existing day lock (authorized 0112); handler redeployed, TEST management reads
  200 after session refresh. No hosted training writes or persona edits.
- Actual planSnapshotPayload lacks per-drill prescriptionId. Structural acceptance
  alone cannot prove exposure coverage: skill gate remains fail-closed, and
  complete arm/block/own-item and positive role/team row-3 cells stay UNVERIFIED.
- Full suite **528 files / 4,137 tests PASS**, final changed files refreshed;
  focused **107/107**, Deno/preview PASS. Evidence `.lovable/proofs/coach-run3/`;
  other matrix rows remain unchanged.

### Owner continuation — October 24, 23:03 run

- Corrected total-reps canonical field/exposure accounting, catalog total/distance
  defaults and non-rounded fractional counts. New regression tests are behavioral
  pure/component tests, not live training outputs.
- All ready saved blocks must be represented by existing current prescription
  IDs before the envelope can certify the full day; missing coverage fails closed
  even for Add alongside. This closes silent omission, not skill replacement.
- Existing saved phase/deload/growth is retained and checked against live phase
  resolution; accepted coach rows inherit phase_state. Complete fresh deload/arm/
  skill-block integration and positive role-flow row-3 cells remain UNVERIFIED.
- No hosted TEST rows authored and no retained personas changed. Earlier three
  player-reader phone proofs remain retained, not re-proved or relabeled end-to-end.
- Full suite 527 files / 4,123 tests PASS; deployed coach-rx-safety only; handler
  Deno check and preview PASS. TEST management reads 200 for player/coach/org;
  coach empty-state phone screenshot verified. Read-only session-token evidence,
  not positive role send/choice/focus behavior. Evidence `.lovable/proofs/coach-run2/`.

### Owner continuation — October 24, 22:33 run

- Behavioral mocked-client tests now write through `useSaveExerciseLog`, render
  the shared actual reader after remount, reject failed deletion, and isolate users.
  These shared-component tests do not mount all actual page components.
- Real 390×844 player-page screenshots show the exact 1.47-second TEST entry
  in History, The General Performance and Vault My Drill Work after reload.
  The entry was written using authenticated Data API, NOT focus-mode acceptance;
  no service-role proof or manufactured training output is claimed. Three exact
  temporary records were removed and absence verified; personas untouched.
- Catalog authoring preserves reviewed measure/dose/gear; own-item common-gear
  mapping is tested. Own-item safety certification remains blocked/incomplete.
- Shared WIC check-in extraction, finite dose/CNS guards, actual game-day
  certification context and throw-channel recognition added. Existing generator
  day-intent order is retained. Full phase/arm/saved-block certification is OPEN.
- Applied 0111 and deployed only `coach-rx-safety`: an existing day-lock wrapper
  rejects changed saved rows/logs/snapshot/CNS/context/check-in/gear/intent before
  the original commit. This is freshness protection, not full safety completion.
  Real TEST authenticated direct RPC call denied (403); deployed management read
  returned 200. Positive choice/focus/team/organization proof remains OPEN.
- Evidence: `.lovable/proofs/coach-continue/`; focused coach checks 152/152,
  unity source contracts 14/14. Full-suite outcome recorded in the checklist.

### Owner finish run — October 24, 22:28 UTC

- Shared actual-result reader now connects History, Vault My Drill Work and The
  General to `wk_session_logs`; Sent workouts reads actual canonical entries.
  Precise 1.47 seconds is preserved. This is source/unit evidence, not live landing.
- Send editor now offers Exercise Vault items with declared gear/measure/dose,
  and own-item common-gear mapping. Unreviewed own items fail closed at activation;
  their full certification path and phone authoring proof remain incomplete.
- Existing WIC/Swap modules are integrated for gear, age, season, dose, recovery,
  final-day checks and exposure. Complete arm exposure and skill-block replacement
  remain uncertified and are explicitly blocked, never filled with guessed innings.
  Full safety, atomic fresh-fact certification and positive logging proof remain open.
- Authorized 0110 adds same-category snapshot markers/canonical row references
  under the existing day lock; this is NOT proof of `wk_swap_block_atomic` reuse.
  Skill replacement is withheld pending the complete existing block-path adapter.
- Live 390×844 democollege My Workouts received one clearly labeled TEST warm-up;
  Add alongside was blocked for missing training experience, with a safe option.
  democoach's Sent workouts view mounted; demoorg was correctly plan-gated.
  No positive choice/focus-log/reload, org/team send or row-3 write/readback pass.
- Sessions came from the existing owner-only session-only TEST flow, not password
  sign-in. No account reset/reseed or retained-persona restoration was performed.
- The one temporary pending coach prescription was snapshotted, removed by exact
  ID and verified absent. No workout logs were authored by the blocked choice.
- Full application suite: 523 unique files / 4,098 tests PASS, all eight exits 0;
  changed tests repeated 21/21 PASS; Deno check PASS; preview build OK. Evidence
  `.lovable/proofs/coach-finish/suite-result.json`; passing tests do not certify row 3.


The three previously identified gaps were fixed the same day
(migration `0105_data_unity_coach_games_combine_readiness`):

1. **Coach-entered game logs (row 6)** now mirror into `gp_games` with
   `entry_source='coach'` and `ignored_for_training=true` (the arm ledger already
   carries the throw load, so training math is unchanged). Undo and a player's
   "not me" flag soft-delete the mirrored game. The game now appears in the
   player's History game list and the Coach Games tab.
2. **Combine results (row 9)** are now read by `coach_athlete_tests`,
   `org_test_ranking` (events list + per-athlete latest value), and
   `scout_athlete_profile` (metrics scope), each UNIONed with vault tests.
3. **Coach readiness / org attendance (row 10)** now count both check-in
   systems: `coach_athlete_readiness` attendance and shared contents include
   `athlete_daily_log` rows, and `org_facility_board` `checkins_7d` counts
   distinct days across focus quizzes and the daily log.

### Scheduling continuation — October 24, 21:30 UTC

- Scheduled sends use the existing activity home, now labeled **My Workouts**,
  with From my coaches / Saved for later / My own. No duplicate storage or page.
- The organization dashboard now mounts Sent workouts for the current sender;
  service reads recheck current connection and recruiting permission before
  returning athlete names or completion counts. This is not all-organization
  cross-sender visibility.
- `coach_rx_commit_choice` commits plan rows, replacement markers, response and
  activation date atomically under the existing day lock. Failed safety checks
  and Save for later leave the scheduled date unchanged. Add alongside also
  checks rest, throwing-rest, injury and game-day restrictions.
- Calendar move/cancel tests exercise real projection logic; Any day has no fixed
  calendar occurrence. Player reads refresh every 30 seconds and after activation.
- **Open proof/data gaps:** row 3's `custom_activity_logs` landing is not produced
  by the prescription choice handler, which writes `wk_prescriptions`; downstream
  History/Vault/General/learning cells must not be marked live PASS on the basis of
  table-name contracts. Coach plan snapshots are also not refreshed by this commit.
  Full row-by-row affected-role write/readback proof remains open.
- The current judge does not yet implement the requested full readiness/pain,
  declared equipment and per-exercise volume/phase envelope checks. Existing
  rest/game/injury/throwing restrictions are necessary, not full safety proof.
- Retained scheduling screenshots are fixture-only. The fresh live check uses
  the owner's account and reads an empty Sent workouts list; it does not prove
  team sending or athlete activation. No hosted TEST rows created this run.

## Rules this matrix must keep satisfying

### Final batch evidence — October 24, 21:48 continuation

- Fixed duplicate sending: prescription sends no longer also create a legacy
  acceptance invitation, and invalid recurrence writes neither kind of card.
- Canonical coach rows are partitioned once and rendered with the existing
  logger/focus host in category order, grouped by send. All twelve categories
  preserve their original row identity; no completion is recorded on activation.
- Max-effort templates now retain the high-intensity pre-game restriction;
  declared catalog slug, feet and dosage unit survive the row adapter.
- Applied `0109_coach_prescription_server_choices`: direct recipient/sender
  updates cannot rewrite prescriptions or claim a response; authenticated
  sends additionally require the existing connected-staff server judge.
- Redeployed only `coach-rx-safety`, source hash `63030bf330ea71d654b7cdc097b85cd28c731a961ee64beb9bb7385836530bd6`.
- Eight scheduling phone fixture assertions passed again at 390×844, saved in
  `.lovable/proofs/coach-final/`. Authenticated owner home tabs and an empty
  management read passed, zero hosted writes. This is NOT player/coach/org proof.
- Final suite: 521 unique application files / 4,091 assertions, 33 server and
  10 extra injury tests PASS; preview build OK. Passing tests do not convert
  GAP or UNVERIFIED live cells into behavioral passes.
- Full safety envelope, source-Vault selection/gear editor, skill-block
  replacement, staff result details and row-by-row live data landing remain
  incomplete. Do not replace these missing proofs with static PASS cells.

### Cell-level evidence status

For rows 1, 2, 4, 5, 7, 8, 11–14, every source-connected/derived cell above is
**UNVERIFIED live**, not PASS; every by-design cell is **N/A**, not a waived owner
requirement. Rows 6/9/10 retain only their specifically documented live RPC
checks, not a whole-row pass. Row 3 GAP cells are **FAIL**; remaining row 3 cells
are **UNVERIFIED**. Row 3b calendar projection is **PASS unit/fixture only**,
**UNVERIFIED live player**. No all-matrix pass is claimed.

- Every measurement joins baselines by declaring itself through `public.ledger_record`
  (source triggers + `ledger_record_tiles`); recording must never cost a clip.
- Cross-athlete view-audit events go only through `record_view_audit_event`.
- TEST-only catalog rows (`visible_to`) are filtered out of every non-owner list.
- Service-role functions returning athlete data to a non-self viewer pass
  `_shared/recruitingGate.ts`.
