# Publish checklist — consolidated (Oct 27, 2026)

Full current suite: **593 files / 4,861 tests passed**. Sixteen bounded groups; one timed-out group was split into four and all four exited successfully. The two subsequently added test files passed separately. Preview build: **passed**, latest observed entry October 27, 20:43:54 UTC.
Nothing published; no cron or iOS changes. No new hosted athlete/test records were created. Existing owner TEST canary retained; its daily claim was reset for the requested manual run.

| # | Item | Status |
|---|------|--------|
| 1 | Analysis regression deep dive | Done; findings retained in analysis-regression.md |
| 2 | Vision-based full coaching report | Done; prior original/compressed hitting and pitching proofs retained |
| 3 | Lenient gates; no athlete numeric grades | Done; no new analysis changes |
| 4 | First-try report/Players Club save | Done for available owner clips; prior reopen/reload proofs retained |
| 5 | Phone clip proofs and full-report canary | Fresh manual canary HTTP 200 passed, not paused; response AND saved readback require full coaching. Remaining clips are owner human checks |
| 6 | Start gate (full readiness list) | Built + tested; affected-player phone proof open |
| 7 | Prescription sanity validator + 8-week sims | Open: existing six-cohort eight-week builder regressions pass, but they do not prove the requested new validator or weekly completeness |
| 8 | Power Primer own focus step with real numbers | Open: existing numerical primer remains; separate focus sequencing not built |
| 9 | Conditioning card rest/time/steps | Partial: removed athlete base-count explanation/count display; internal four-base rest retained and tests pass. Time/steps end-to-end coverage open |
| 10 | Beginner defense volume | Open: invalid infinite experience now cannot grant elite tier; requested volume scaling not implemented |
| 11 | Unprescribed work counts; skipped check-ins block "full complete" | Partial: canonical practices added to General records; day-complete presentation requires morning/night and applicable pre-lift checks, four regressions pass. Full Discipline/learning-loop audit and phone proof open |
| 12 | 12-week movement re-screen prompts | Partial: canonical movement_done_at drives 84-calendar-day prompt in saved movement summary; complete bilateral re-entry saves/readbacks same assessment, pain retained. Real due/save/reload phone proof open |
| 13 | "Offseason is beginning" everywhere + restructure | Partial: added to Update Hammer, schedule strip and Tell Hammers; quick season success now waits for save. Existing phase-change restructure traced; all three real save/restructure proofs open |
| 14 | Identity card days vs logs | Partial: audited canonical evaluator; values are consecutive streaks, not totals. Labels now say standard-meeting/active streak (days), and nn_miss_count_7d says required items missed (7 days). Owner phone rendering PASS; positive nonzero log-to-snapshot arithmetic proof remains open |
| 15 | "Do in this order" only prescribed items | Built: projects mounted prescribed card categories in their displayed sequence; real populated phone proof open |
| 16 | Separate bunting cards on schedule | Not started |
| 17 | Recovery items audit | Partial: removed hydration/wake-time, injury-note and soreness-note exercise rows rather than inventing check-offs. Timed mobility/breathing retain original targets with activity-specific how-to/stop guidance. Fixed abbreviated min parsing; phone shows 15:00 mobility/10:00 breathing timers and time fields, no work entered. Wider recovery-catalog audit remains open |
| 18 | Develop This Week audit | Partial: old panel was rolling 14-day video picks, not a weekly plan. Renamed honestly to Recent development picks; source errors visible/retryable; deleted and opposite-sport sessions excluded with selected-sport query keys. Two regressions PASS. Requested saved-weekly-plan integration remains open |
| 19 | Routine + fix-it drills all skills | Partial: owner catalog tags for all eight skill areas, routine/fix-it/collective prep and separate weighted/overspeed/standard bat-speed kinds. Tags never claim efficacy or lock-in. Owner phone TEST edit→save→reload preserves routine/overspeed and canonical library video ID; exact prior fields restored. Routine selection/evidence lifecycle and hitter/pitcher/defender prescriptions remain open |
| 20 | The General newer-version prompt | Done (auto-reload once, dismissible); phone proof open |
| 21 | Training Intelligence in owner dashboard; Cossack <14; sled alternate; warnings | Prior placement/Cossack/sled fixes retained. Latest 42 warnings reviewed: 35 frequency, seven gaps; two frequency notes unsupported by current history. Seven-day/future-plan counting defect fixed/tested/deployed. 33 supported high-frequency plans still need safety-context review; see lift-frequency-review.md |
| 22 | My defensive plays moved to History | Phone PASS: visible link opens populated /defense/plays at 390×844, no overflow |
| 23 | Coach dashboard fixes | Partial: My Players moved immediately below heading; sent-item wrapping and organization tab layout improved; Both selection phone PASS without saving an organization. Actual coach roster proof blocked: current session redirects to staff application. Player received-message path exists; positive send/readback proof open |
| 24 | Owner library merge + videos | Partial: Skill drill builder now selects/searches/paginates the existing video library, saves its canonical ID plus compatible playback URL; upload/link remain. Owner phone edit→save→reload PASS and TEST restoration equal. Exercise-builder and full library consolidation remain open |
| 25 | Assessment goal/stat/screen changes | Done (Contact Rate, 4 new goals, 4 retired; HBP→RBI/LOB/bunt hits/attempts; knee-height step-over; eyes-closed balance in screen); phone proof open |

## Hosted changes and phone evidence

- Continuation: owner-authorized additive migration 0140 applied for descriptive drill metadata and canonical library video reference. Existing grants/RLS unchanged; no backend function redeployed and restored P0 untouched.
- Owner phone 390×844: real parked TEST drill tag/video save→reload PASS; all prior fields restored/readback equal except automatic audit timestamp. Identity labels and actual recovery targets/instructions render without overflow/page errors. No workout values/check-ins created.

- Named analysis services deployed: analyze-video, analysis-canary, analysis-canary-configure, update-library-session. Fresh manual full-report canary passed HTTP 200.
- ti-watchdog redeployed for warning arithmetic only; no scan invoked and no schedule changed.
- Phone: History → My defensive plays → populated play log PASS; General normal reload returned without a blocking dialog PASS. Simulated stale-chunk auto-reload/dismissal is still not phone-proven.
- Owner overview and organization registration loaded with no overflow or page errors. Both selected without submitting or creating data.
- Start-gate and assessment changed-flow proofs remain open; owner screenshots do not certify a gated athlete flow.

**Ready to publish: no** — requested validator/completeness, separate primer, beginner scaling, identity audit, separate bunting/upcoming cards, recovery audit, Develop This Week, routine/fix-it evidence lifecycle and full library merge remain incomplete. Conditioning/unity/re-screen/offseason/coach paths and start/assessment/stale-chunk behavior still need positive affected-role phone proof. Supported lift-frequency warnings still require full safety-context review. Missing owner clips are not blockers.
