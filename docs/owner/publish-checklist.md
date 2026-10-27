# Publish checklist — consolidated (Oct 27, 2026)

Latest run: **597 unique files / 4,883 tests passed**, with no missing test files. Twenty bounded groups; slow groups split and full-week rendering plus 200-season safety invariants run individually to clean exit 0. Changed primer/video files refreshed last. Preview **passed**, observed October 27, 21:40:12 UTC. Prior finished proofs preserved.
Nothing published; no cron or iOS changes. No new hosted athlete/test records were created. One existing parked TEST drill's tag/video fields were privately snapshotted, edited through the real owner UI, restored and read back equal (automatic audit timestamp retained). Prior canary proof preserved, not repeated.

| # | Item | Status |
|---|------|--------|
| 1 | Analysis regression deep dive | Done; findings retained in analysis-regression.md |
| 2 | Vision-based full coaching report | Done; prior original/compressed hitting and pitching proofs retained |
| 3 | Lenient gates; no athlete numeric grades | Done; no new analysis changes |
| 4 | First-try report/Players Club save | Done for available owner clips; prior reopen/reload proofs retained |
| 5 | Phone clip proofs and full-report canary | Fresh manual canary HTTP 200 passed, not paused; response AND saved readback require full coaching. Remaining clips are owner human checks |
| 6 | Start gate (full readiness list) | Built + tested; affected-player phone proof open |
| 7 | Prescription sanity validator + 8-week sims | Open: existing six-cohort eight-week builder regressions pass, but they do not prove the requested new validator or weekly completeness |
| 8 | Power Primer own focus step with real numbers | Built: continuation explicitly bound to canonical lift ID/row; lift save→builder lift-to-action rest→numerical primer→separate sprint recovery→next unchanged lift row. Tests cover integrated component, 120s/60s rest, quality stop, locked continuation, no extra save and cursor reload. Rating/arm saves awaited; saved ratings read back on reload. Real affected-athlete phone proof open: owner's current Today has no primer |
| 9 | Conditioning card rest/time/steps | Partial: removed athlete base-count explanation/count display; internal four-base rest retained and tests pass. Time/steps end-to-end coverage open |
| 10 | Beginner defense volume | Open: invalid infinite experience now cannot grant elite tier; requested volume scaling not implemented |
| 11 | Unprescribed work counts; skipped check-ins block "full complete" | Partial: canonical practices in General and check-in completion guard retained. Canonical game sessions now included in Discipline query and logging projection; tests prove no workout denominators/completion granted. Behavioral evaluator still misses canonical sessions; full learning-loop integration and affected-role phone proof open |
| 12 | 12-week movement re-screen prompts | Partial: canonical movement_done_at drives 84-calendar-day prompt in saved movement summary; complete bilateral re-entry saves/readbacks same assessment, pain retained. Real due/save/reload phone proof open |
| 13 | "Offseason is beginning" everywhere + restructure | Partial: added to Update Hammer, schedule strip and Tell Hammers; quick season success now waits for save. Existing phase-change restructure traced; all three real save/restructure proofs open |
| 14 | Identity card days vs logs | Partial: audited canonical evaluator; values are consecutive streaks, not totals. Labels now say standard-meeting/active streak (days), and nn_miss_count_7d says required items missed (7 days). Owner phone rendering PASS; positive nonzero log-to-snapshot arithmetic proof remains open |
| 15 | "Do in this order" only prescribed items | Built: projects mounted prescribed card categories in their displayed sequence; real populated phone proof open |
| 16 | Separate bunting cards on schedule | Not started |
| 17 | Recovery items audit | Partial: removed hydration/wake-time, injury-note and soreness-note exercise rows rather than inventing check-offs. Timed mobility/breathing retain original targets with activity-specific how-to/stop guidance. Fixed abbreviated min parsing; phone shows 15:00 mobility/10:00 breathing timers and time fields, no work entered. Wider recovery-catalog audit remains open |
| 18 | Develop This Week audit | Partial: old panel was rolling 14-day video picks, not a weekly plan. Renamed honestly to Recent development picks; source errors visible/retryable; deleted and opposite-sport sessions excluded with selected-sport query keys. Two regressions PASS. Requested saved-weekly-plan integration remains open |
| 19 | Routine + fix-it drills all skills | Partial: prior owner tagging proof retained. Owner-derived plan slots now carry exact source ID, routine/skill/bat-speed tags and existing video references; both-sport tests preserve count/dose and no efficacy claims. Selection remains existing day rotation; no evidence lock-in inferred. Routine selection/evidence lifecycle and hitter/pitcher/defender prescriptions remain open |
| 20 | The General newer-version prompt | Done (auto-reload once, dismissible); phone proof open |
| 21 | Training Intelligence in owner dashboard; Cossack <14; sled alternate; warnings | Prior placement/Cossack/sled fixes retained. Latest 42 warnings reviewed: 35 frequency, seven gaps; two frequency notes unsupported by current history. Seven-day/future-plan counting defect fixed/tested/deployed. 33 supported high-frequency plans still need safety-context review; see lift-frequency-review.md |
| 22 | My defensive plays moved to History | Phone PASS: visible link opens populated /defense/plays at 390×844, no overflow |
| 23 | Coach dashboard fixes | Partial: My Players moved immediately below heading; sent-item wrapping and organization tab layout improved; Both selection phone PASS without saving an organization. Actual coach roster proof blocked: current session redirects to staff application. Player received-message path exists; positive send/readback proof open |
| 24 | Owner library merge + videos | Partial: prior Skill builder save/reload proof retained. Exercise builder now searches/selects/pages the same video library into its existing Vault video field, retaining upload/link. Real owner 390×844 selection→URL→video preview PASS/no overflow; draft-save payload regression preserves URL and sets/reps. No draft/live write made in phone check. Full consolidation and saved Exercise readback remain open |
| 25 | Assessment goal/stat/screen changes | Done (Contact Rate, 4 new goals, 4 retired; HBP→RBI/LOB/bunt hits/attempts; knee-height step-over; eyes-closed balance in screen); phone proof open |

## Hosted changes and phone evidence

- Run2: no hosted data writes, migrations or redeploys. Exercise library phone choice inspected and editor closed without saving. No test data to clean. Owner Today inspected only to locate a real primer (none); no workout values entered. Four parallel investigations supplied the implementation boundaries; restored P0 and finished proofs untouched.

- Continuation: owner-authorized additive migration 0140 applied for descriptive drill metadata and canonical library video reference. Existing grants/RLS unchanged; no backend function redeployed and restored P0 untouched.
- Owner phone 390×844: real parked TEST drill tag/video save→reload PASS; all prior fields restored/readback equal except automatic audit timestamp. Identity labels and actual recovery targets/instructions render without overflow/page errors. No workout values/check-ins created.

- Named analysis services deployed: analyze-video, analysis-canary, analysis-canary-configure, update-library-session. Fresh manual full-report canary passed HTTP 200.
- ti-watchdog redeployed for warning arithmetic only; no scan invoked and no schedule changed.
- Phone: History → My defensive plays → populated play log PASS; General normal reload returned without a blocking dialog PASS. Simulated stale-chunk auto-reload/dismissal is still not phone-proven.
- Owner overview and organization registration loaded with no overflow or page errors. Both selected without submitting or creating data.
- Start-gate and assessment changed-flow proofs remain open; owner screenshots do not certify a gated athlete flow.

**Ready to publish: no** — requested validator/completeness, beginner scaling, positive identity arithmetic proof, separate bunting/upcoming cards, wider recovery audit, saved weekly-development integration, routine/fix-it selection/evidence lifecycle and full library merge remain incomplete. Primer is now built/tested but its real athlete phone proof remains open: the current owner plan contains no primer. Conditioning/unity/re-screen/offseason/coach paths and start/assessment/stale-chunk behavior still need positive affected-role phone proof; Exercise video save/reload remains unproven through the UI. Supported lift-frequency warnings still require full safety-context review. Missing owner clips are not blockers.
