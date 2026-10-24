# Publish checklist — updated 2026-10-23

## Oct 23 Hammers Today cleanup — current gate

**Ready to publish: NO.** The cleanup is partially implemented, not fully proven. Earlier release verdicts below are historical and do not certify these changes.

### Owner-present phone run — October 24
- Approved college/coach/persona sign-ins worked. Identity merge is now phone-proven: `../../.lovable/proofs/oct24-cleanup/pitcher-identity-merged.png` shows the real throwing-build day inside return to full training.
- All current college plan exercise labels and six focus entry screens were captured; entry screens are not proof of Next/save/rest/advance for every type. Full matrix remains open.
- Pitcher and two-way studies captured. The selected new-player account is protected by its under-13 parent-signature gate; no guardian signature was invented. Five populated personas/role examples remain incomplete.
- Tex Vision opened inside hitting and its real timer reached the result screen. Saved metrics report completionValid false, one cycle and zero interactions, so this is not a successful usage proof. Pick-off remains open.
- Fresh application suite: 514 files / 4,033 tests PASS, `.lovable/proofs/oct24-cleanup/full-suite.json`; latest preview build OK. All-B logging rules retained; actual five-exercise phone proof still open.
- Exact coach template/copy/log/send and Tex result/session/checklist were snapshotted and removed; prior TEST zero-session vision counts restored. Existing persona assessment/start changes need prior-state restoration; cleanup is not complete. No publish/deploy/migration/cron/iOS.
- Current status: seven Done / seven Partly. Full item table and exact blockers are at the top of roadmap.md. Historical approval-blocked notes below no longer describe current sign-in availability.

### Owner-present run — October 23, 22:43–23:07 UTC
- **All B decisions applied in preview:** Walking Lunge → reps per leg; Rear-Foot-Raised Resist-Turning Press → press reps; Banded Lateral Squat Walk → steps each way; Elephant Walk → steps; Farmer Carry on Toes → yards. Both log paths use the shared exact measurement rule; yards remain feet in saved canonical records. Existing timed prescriptions are not converted to invented counts/distances.
- **Coach continuous saving implemented:** entered coach sets save after a short pause; Next flushes the current entries before the declared rest starts. Writes stay ordered; failed autosaves retain entries and retry on Next. No completion boxes are manufactured.
- **Fresh application suite PASS:** 514 files / 4,033 tests, including the unchanged 200-season safety sweep. `/tmp/today-cleanup-owner-decisions/full-suite/result.json` and adjacent logs; interrupted aggregate batch results completed with the isolated safety test. Preview build OK 22:46:16 UTC. No server suite rerun or server changes.
- **Phone verification still blocked:** normal college TEST sign-in request was refused by the tool with approval unavailable in this context, despite the owner's presence. No approval card appeared. No TEST-player/coach phone success, populated fixtures or five-exercise phone proof claimed. Items 2, 5, 8–12 and 14 remain Partly; earlier Done proofs retained.
- **Cleanup:** no new TEST database records created this run; prior exact cleanup evidence remains. No publish/deploy/migration/cron/iOS changes.

| Owner request | Current result |
|---|---|
| Before you start / identity relocation | Implemented; 390×844 phone checks show Before you start openable with the plan closed. Load and deduplicated closed changes drawer moved; identity hosts rewards, phase/ramp information and Coach Hammer. Full identity placement proof still incomplete. |
| Guided focus | Cursor now retains exercise ID through registration changes; guided rest has no misleading stop/restart controls; unsuccessful saves cannot unlock manual rest advancement. Stopwatch fills the current guided set. Specialized pitching requires edited rows and flushes its current payload before progression. Warm-up, conditioning, lift, recovery and hitting focus screens checked at 390×844. Practice/video full saved progression, baserunning/pitching/fielding and coach-sent coverage remain OPEN. PAP safety controls retained. |
| Embedded tools | PASS on real TEST softball catcher: Hitting → Use Delaycam → return to identical Dry swings set → explicit check-off → canonical self/sport/hitting/exercise/date row → reload shows Delaycam used. Weekly source reads that row; several exercise check-offs on one calendar day count as one use day (rule test). Practice window preserves readiness/setup and opens real standard/video modes, returning to the same set. Practice saved-count bridge checks origin/frame and canonical self/sport/module/token before entering actual counts; actual saved video/no-video phone progression remains unproven. Royal/Tex/Pick-off completion proofs remain OPEN. |
| Timing study | Defender, baserunner, hitter and both sports' pitcher examples implemented; saved sport/discipline goals and completed-game caught-steal reads wired. Five-role specificity proof and recorded-analysis study are still open. |
| Units / precision | Prior real 1.47 save/reload retained. Tex Vision elapsed capture and shared timer preserve hundredths (1.47 target/count-up tests), Royal/practice playback clocks use hundredths with minute rollover. Legacy dose parser no longer mistakes rest for a work target; preserves duration rounds and catcher pop-time target. Read-only source audit reviewed 396 entries across Elite/Speed Lab/Warmup/EASS/Defense, not every catalog. OPEN: several other video marker labels, coach-sent timers and missing duration targets. Frog rock (8 rocks), bridge walkout (2×6 steps), ankle circles (5/direction/side) declare counts, not seconds; no seconds or rep-to-time equivalence invented. |
| Five player types | Fresh 390×844 checks of the five named personas retained: demo16ss/demo2way had no populated plan, demoramp remains assessment/start-gated, demoausl has a legal gate; these are NOT successful plan proofs. Additional existing demosbc/demomlb have real hitting/throwing/lift/warm-up/recovery cards; demosbc tools/practice return proven. Neither replaces the missing five-player requirement. |
| Tests / preview | Run 2 full app suite after all source edits: eight bounded batches, 511 files / 4,010 tests PASS. Six existing server files / 33 tests PASS (`--no-check`, environment/network permissions). Preview build OK 19:34:45 UTC. Real phone practice/video and Royal completion tests: no page errors. No full browser E2E/sensor/physical-device claim. |
| Cleanup | Earlier exact 1.47 log/completion cleanup retained. New Delaycam usage 7cc827f2-11de-4dba-ad75-0b0c87889d35 snapshotted in existing protected store under today_cleanup_20261023_1917:delaycam_sessions then removed by exact ID/user; readback zero and one snapshot. No new practice sessions or generator prescription rows since 19:03; session-only access did not reseed TEST profiles. |

### Owner's guide — implemented behavior, not a completion claim

- Open Before you start independently of the Today plan; load and plan changes are inside it.
- Open identity for phase/return-to-training and Coach Hammer; rewards remain visible when identity is closed.
- Open a training card and press Start for guided rows. Timer items wait for Start timer; entries autosave. Next saves before rest, and Save & exit preserves entered work. Skip never counts unperformed work as complete.
- Use Delaycam from an eligible exercise and return to that exercise, then check off actual use. This survives account readback/reload and contributes one weekly use day, never an analysis result or extra dose.
- Open Practice session log from the current activity, select the actual session type, answer readiness/setup, and choose standard logging or Video + Log. Closing returns to that exercise; only a successful matching canonical session can supply entered counts. Full save-to-Next phone proof remains OPEN.
- Enter jump distance in feet and inches; timed fields retain hundredths. The precise duration column is live under the owner's migration authorization; website changes remain preview-only until separately published.

No publishing, schedule changes or iOS changes. Necessary `create-test-athlete` session-only redeploy and additive duration migration applied within the named cleanup authorization.

19:03 continuation changed preview code only; no additional deployment or migration. Plan-change history moved out of the plan header into the existing closed changes drawer, deduplicated with reduction messages. Evidence stays private under /tmp/browser/today-cleanup/continue; suite logs under /tmp/today-cleanup-suite. **Still not publish-ready:** complete card/program/coach-sent progression, saved practice with actual video/no-video, all tool completion, five populated player/study proofs, and the remaining catalog/target audit are unfinished. Missing hold targets require a declared duration that does not silently convert the existing rep dose.

### Run 2 — 19:28 continuation

- **Practice save/return PASS, standard and video:** phone 390×844 as demosbc. Actual rep confirmed, canonical session saved, same Dry swings set retained and its Swings field became the canonical count 1. Video test used the owner's existing uploaded clip locally (6.9 seconds, width 444), markers 1.47–2.51 persisted. No video uploaded or analysis invoked. The original MOV did not decode in sandbox Chromium; a temporary WebM of the same clip rendered real frames. This is playback/logging proof, not proof the clip matches the prescribed dry-swing exercise. Full multi-set Next/rest progression and other practice types remain OPEN.
- **Save delay fixed:** matching embedded practice receives a canonical recorded ID before independent report calculation finishes; parent still verifies owner/sport/module/token. Two tests prove pending calculation does not strand the exercise and failed insertion cannot notify. No report completion is inferred.
- **Royal completion/reload PASS:** timer started/stopped, required subject entered, Submit Study saved 1647.2 ms, returned to exact exercise, displayed completion after reload. Timer metadata carries exact exercise/date/token. Tex Vision and Pick-off now carry occurrence metadata in their existing saved drill/session records; parent reads back actual saved work. Their real-phone completion proofs remain OPEN. Softball cannot be sent to the locked Tex Vision route.
- **Precision/focus:** remaining practice review/marker/annotation displays use hundredths, all timed template step declarations use 0.01, stale removed cursor reconciles to mounted work rather than claiming the card finished. Seven timed-template and one stale-cursor rule tests added. Coach-sent focus remains OPEN; investigation identified its separate accepted-template/performance-data logger, not yet adapted.
- **Exact TEST cleanup:** four practice IDs 39bd1395-6ad0-4661-9789-e2206477e1e4, 61d86a9c-1106-443a-b2d5-c7e80de08bdd, a0c010bf-03a9-413b-ba3f-784de6b823bb, 7ddeefb0-2996-489c-bde5-8606b789244a; task eee5e678-a76f-43bb-b78e-9be3edd97259; new daily-load row c910f795-a44b-42be-a830-12f8bbbee12c; Royal session 4b6140ca-ad95-4238-a49c-3a00bee3d921 snapshotted under today_cleanup_run2_20261023:* and removed by exact ID/user. Safeguards unchanged, original owner media retained. No new plans generated. Evidence /tmp/browser/today-cleanup/run2; full suite /tmp/today-cleanup-suite/run2. No deployment/migration/publish/cron/iOS action this run.

**Run 2 remains incomplete:** coach-sent and remaining card/practice progression, Tex/Pick-off phone completion, five populated player/study proofs, remaining catalog/time targets and full identity placement proof.

### Run 3 — 19:50–20:18 continuation

- **Coach-sent guided work built, not phone-certified:** accepted activity exercises reuse the existing performance logger, declared set count, duration and rest. Next saves before rest; failures and zero-row writes cannot report success. Skip does not check completion boxes. Sibling exercise logs and checkbox/field state survive individual exercise saves. Duration inputs retain hundredths and explicit legacy-minute rows display seconds. Three guided tests and one sibling-save test pass. No existing TEST custom exercise templates were found, so no populated coach-card phone proof is claimed; continuous coach-entry autosave remains unfinished.
- **Real multi-set phone proof PASS:** college TEST player, 390×844, existing Arm-Care Band — Full Chart prescription, two sets of 11. First save starts the unchanged 90-second rest; waiting the real interval advances to set 2. Second save starts rest; page reload retains set 2 and the remaining 80 seconds. Canonical readback has exactly rounds `{set:1,reps:11}` and `{set:2,reps:11}`. No clock shortcut, new plan or prescription changes. This proves this lift flow, not every card type.
- **Identity phone check:** softball TEST player shows standard/active-day rewards in the identity card and Coach Hammer Next Best Step immediately above Ask Hammer. This is not proof of populated return-to-training/block-progress data.
- **Audit:** remaining source review identified staging category mismatches, not an evidence-backed rep-to-time correction. No source dose or movement category changed. Catalog-wide audit and missing declared hold targets remain open.
- **Final validation:** 513 app files / 4,014 tests PASS after all source edits, eight bounded batches. Existing six server files / 33 tests PASS. Preview build OK 20:03:58 UTC. Phone checks: no page errors. Evidence `/tmp/browser/today-cleanup/run3`; suite `/tmp/today-cleanup-suite/run3/final-batch-*`.
- **Exact cleanup PASS:** TEST lift log `f006725d-238a-4472-a585-5bf4ceca3237` and completion `535a60db-f2ff-42e1-9614-02e317843a07` snapshotted in the existing protected store under `today_cleanup_run3_20261023:*`, removed only by exact ID/user with snapshot existence guards. Readback: zero rows, two snapshots. Original plan, safeguards and owner media unchanged. No deployment, migration, publish, cron or iOS action.

**Ready to publish: NO.** Still open: populated coach-card phone proof/continuous autosave, remaining all-card practice/video progression, Tex/Pick-off saved completion, five populated player/study proofs, populated identity phase/progress and full catalog/time-target coverage. Prior successful proofs remain valid; absent evidence is not completion.

## Controlling verdict criteria — owner update October 22, 00:59 UTC

**Ready to publish: YES — October 22, 15:50 UTC.** Cleanup COMPLETE under the owner's history-retention decision (below). US-only website link proven at phone size. Full suite passes and preview build OK. This verdict does not publish anything; publishing, cron and iOS remain the owner's call.

### Owner history-retention decision — October 22, 15:28 UTC
The owner chose to KEEP the eight immutable TEST ASB events in the append-only ledger. The delete guard stays enabled and was not bypassed. All eight belong to the parked system TEST profile demoswap2 (`c00809eb-…`, `is_system_account = true`, paused). Exclusion readback: ledger reads are self-only or connected-coach-only (RLS), and demoswap2 has zero connection requests and zero org assignments, so no coach view or list shows them; the anonymous training store refuses system accounts (`anon_training_eligible` checks `is_system_account`); athlete search excludes system accounts; the recommendation learning funnel counts only `foundation.recommendation.*`/`foundation.drill.*` topics, none of which these are; no nightly learning, ranking or stats job reads the ledger. **TEST cleanup: COMPLETE.**

### Apple — always-visible website link (owner, October 22)
`US_ONLY_APP_STORE_RELEASE = true`: the app is listed on the US App Store only, so the iPhone app shows "Subscribe on our website" even when the phone reports no storefront; a reported non-US storefront still hides everything. The link opens the website in the default browser (Safari); purchases happen only on the website through Stripe. Phone-size proof (390×844, native app setting, no storefront reported): sign-in screen → hammersmodality.org/pricing; dashboard locked plan tiles (TEST pitcher), Pricing and Staff Plans → hammersmodality.org/app-handoff (same-account sign-in). Reviewer taps are in docs/apple/review-notes.md.

| Gate | Current status |
|---|---|
| Swap proof 1: no foam roller | PASS (earlier run; saved, reloaded, reason, log, memory) |
| Swap proof 2: machine to partner | PASS (demoswap; 40 swings kept; saved, reloaded, reason, log, Today memory) |
| Swap proof 3: no barbell, Always | PASS (demoswap; Landmine Press to Single-Arm DB Bench 1x8; later builds had no barbell lifts) |
| Swap proof 4: no open field sprint | PASS Oct 22 on phone as demoswap2: Sport-Stance Reactive Start to Short-space accelerations, 1 rep kept, 15 yd, 2-min rest, "Because" shown after reload; swap_log d1bde62e-7c37-425a-95b6-f8755527af48; open_field remembered for today. Today's running load was already full (7 of 3), so the mix kept a plain short sprint instead of adding hill or band work. The card now shows the swapped exercise's own how-to text. |
| Swap ALL | DONE Oct 22 05:58 UTC; change and reason in switch history |
| Up-front equipment step | Removed from the setup steps and profile review while Swap is on; saved answers stay as starting memory |
| Normal-player check | PASS: TEST College Outfielder (taken off the old Swap test list) sees Swap on a Today exercise; setup shows no Equipment step |
| TEST drill in a plan | Not picked on two real training days (Oct 28, Oct 31); not picked in demoswap2's Oct 22 plan; stopped as instructed |
| TEST-only items hidden | App lists and Swap filtered; direct database reads by signed-in users still possible (needs owner-approved database change) |
| Coach view records | Routed to the approved server check; role/denial matrix passed |
| Alternative quality | Same pattern first, same-or-easier, never more than one level; 194 larger-jump pairs in Vault review |
| Phone smoke, pass 1 | 14:18:26–14:20:20 UTC, 390×844: TEST college, democoach, demoorg; saved real analysis opened in Players Club, linked coach profile opened with confirmed game; no page errors or 5xx. Canceled organization correctly shows its subscription gate, not a populated dashboard. Prior legal/autosave/checkout proofs retained. |
| Phone smoke, pass 2 | 14:33:54–14:35:45 UTC: same roles and record views; 15 min 28 sec between first player observations; no page errors or 5xx/503/schema-cache. An extra clean pass at 14:31 was too early and is not the qualifying pass. |
| Real game | TEST game logged by democoach on the coach screen and confirmed by the player on /games (entry b172dea2-39a7-4e0b-a6ed-1e0482d86338) |
| Real report | PASS: one real hitting analysis on approved owner clip, video 92123f9e-eb32-495b-a25e-9bbace5baaf2; completed 14:09, saved report/feedback/drill read from Players Club on both passes. Camera tracking was insufficient; no measurement success claimed. TEST upload/report deleted afterward; original owner video retained. |
| New-player Coach Hammer | PASS: fresh democheckin, 390×844; Coach Hammer → Do Check-In opens Quick Check-In with readiness slider and Next/Skip; no prior check-in needed. |
| Last-hour backend logs | PASS, rechecked 14:41 UTC: working function_edge_logs last-hour query returned 153 calls, all 200; returned timestamps 14:31:26–14:38:06. Coverage is only rows actually returned, not an assertion about unobserved calls. Database net._http_response: seven calls after 14:15 through 14:40, including 14:15 and 14:30 jobs, all 200, no timeout/error. Older 5-second timeouts predate the fix; previous cron_call readback confirms 120000 ms. |
| TEST cleanup | Operational rows removed after protected timestamped snapshots (199 rows total): 123 prescriptions, two saved plan snapshots, six Swap receipts/memories, two gear contexts, TEST catalog drill and Vault records, ten CNS rows, fourteen diagnostics and twelve final-check records. Three temporary TEST profiles parked; standing accounts preserved. TEST analysis/upload deleted, original owner clip preserved. Eight immutable TEST ASB events remain snapshotted; no trigger disabled. No new audit TEST events were committed. |

### Owner-confirmed sprint rule

At or above the running-load cap, Swap offers only a plain shorter sprint with the same reps and saved rest, never added hill/band work or load; cap-equality and speed-row tests: 16 PASS, named plan-swap redeploy completed.

### Final cleanup limitation

14:41 UTC readback confirms zero named TEST prescriptions, Swap receipts, gear memory, TEST drill/Vault records and TEST analysis; the original owner video remains, three temporary profiles remain parked, all 199 snapshot rows remain, Swap mode is ALL, and the immutable delete guard is enabled. No further destructive cleanup was attempted. The remaining eight TEST events are the exact blocker for complete cleanup; the prior TEST-only access gap is a latent limitation, not a claim that deleted catalog content is still exposed. Earlier preview build OK is retained; no app code changed in this continuation and fresh preview build telemetry was unavailable.

The eight retained event IDs are 50089d47-1515-4bdb-a24c-5b4799fbd51b, bf3d7f03-7a7c-4430-bb19-daa21d589319, 8af132f5-e070-4270-8006-c85cfc318603, daa693db-5fa4-4474-ab12-ac2dfc43aeff, bb778567-2570-498a-b992-dac3b2119550, e2fb9612-7cb7-48e7-9577-1e332cbcacc9, 739ca004-8ab3-4cb3-ae02-0303c0c4a31e and c618e731-f632-4b48-b581-41fd6c79f46b. Canonical history is append-only; cleanup requires an owner-approved history-retention decision, not disabling that safeguard. Backups use existing protected _snapshot_live_test_runs_20261014 tags finish_20261022_1436 and finish_20261022_1438. Preview build OK 14:35:48 UTC. Named create-test-athlete redeploy adds only the blank check-in TEST persona. No release action taken.

### Stability verified — exact acceptance

1. Finish Swap proof work first. Wait until no tests or database changes are running.
2. Run the existing real-UI phone smoke as TEST college player, democoach and demoorg. Include a real report, a coach-side player profile and a real game; empty lists or invented records do not count. Retain sign-in, Today plan, autosave/readback, legal open/close, Connections, role dashboards, Staff Plans check and Stripe checkout without payment.
3. Repeat the same three-role smoke fifteen minutes apart; record both timestamps, actual record pages and observed results.
4. Both passes must have no 503 or schema-cache errors. Check backend logs covering the last hour and require no new 5xx errors. Record the log window and any coverage limitation; missing logs are not a clean result.
5. When the Swap proofs pass, `swap_v2 = all` is confirmed and this stability check passes, report **Ready to publish: YES** with the status table and make this checklist final. Do not rerun other already-passed items. This does not authorize publishing.

### Owner-managed schedules — reported, not independently verified here

Camryn Williams reports personally applying a two-minute wait to every scheduled job calling a backend function and removing `training-block-daily-check` (retired programs). No schedules were changed by this continuation. These reported changes supersede the old five-second caller-wait inventory; they do not establish that backend execution failures are resolved.

## Current publish gate — Oct 21

**Final continuation — Oct 21, Camryn Williams.**

**Ready to publish: NO.** Exact blockers: the real coach detail page still fails both canonical audit-event writes (403 / 42501); the safe server append fix requires named authorization for a hosted change. The paired Swap phone proof lacks an ordinary, non-allowlisted authorized TEST player with a started plan, and the owner has not finished the initial assessment. Active purchase/session and native handoff paths still lack genuine verification state. No failure is hidden and no consent or event-read permission was widened.

| Ordered gate | Status | Evidence / remaining requirement |
|---|---|---|
| 1. Swap restriction + paired phone proof | Implemented / proof BLOCKED | Live switch OFF; owner/admin and 14 TEST exceptions. Both started demo players are exceptions. The two other started system accounts are the protected Apple-review child and Hammers Modality, neither repurposed. Owner assessment remains 1/6; no invented plan or switch change. |
| 2. Three-role phone regression smoke | PASS | Fresh sequential college/democoach/demoorg dashboard, connections, Staff Plans check, coach/org dashboards and 27 legal open/close checks: zero console errors. Prior autosave readback/restoration and Stripe checkout-without-payment retained. |
| 3. Every-page audit | Partial / FAIL | Real coach athlete detail reproduces two denied event inserts. Fresh real owner recall/thread and replay open cleanly; replay honestly says Uncertifiable. Real owner prescription opens No active session, not a populated-session proof. Recall and no-session purchase page checked for all three roles without errors. Successful purchase/native handoff and owner initialization not fabricated. |
| 4. Full suite + preview | PASS | After payment-page correction: 488 files / 3,868 app tests in five sequential bounded batches. Six server files / 33 tests PASS with required env permission; outside-folder injury file / 10 PASS. Preview build OK 23:47:22 UTC. |
| 5. Switch inventory | Verified | Fresh live readback: all 28 database switches and all three app settings match the inventory below. Report Card/Game IQ owner/admin-only; spaces/rankings/Swap OFF; prompts/lifting/staff gate ON; legal ALL. No mode change. |
| 6. Owner's live-check guide | Done | Existing post-publish expectations retained, including all four positive Swap cases before broader enablement. |

This continuation fixed the unsupported `/success` payment-success claim: only a recorded purchase shows success/access; missing or failed confirmation stays explicit. Three purchase-evidence tests pass, and owner/player/coach phone screenshots confirm the corrected state. No payment was made.

`docs/owner/coach-audit-events.pending.sql` stages a narrowly scoped server append RPC plus the missing registrations for `coach.review.opened` and `relational.exposure.gate_blocked`; hosted readback confirms both topics and the old rr9 engine version are absent. It preserves self-only generic inserts and all athlete-data read policies, derives caller/payload server-side and checks current coach linkage/blocking or recruiting denial. **Not applied, not wired, not role-tested; named owner authorization required.**

Private evidence: `/tmp/browser/gate-finish`; final test logs: `/tmp/publish-gate-finish/after-fix`. No new TEST data, subscription, relationship, measurement or plan was created; no cleanup mutation needed. The canceled demoorg plan stays canceled and earlier exact cleanup remains complete. No publish, deployment, migration, cron or iOS change.

### Switch inventory — live readback Oct 21

All 28 `wk_feature_switches` rows, with no undisclosed mode changes:

- **OFF:** `facility_spaces`; `swap_v2` (14 named TEST allowlist exceptions and active owner/admin).
- **ALL / runtime ON, buildable=false:** `plan_prompts_v2`. Its reminder consumers use the shared mode resolver; this column is an owner-edit lock, not a runtime OFF gate.
- **ALL / buildable=true:** `adaptive_phases`, `content_barefoot_items`, `content_base_stealer`, `content_explosive_pitcher`, `content_heat_factory`, `content_lift_notes`, `content_softball_conditioning`, `content_speed_lab`, `hammers_today_start_gate`, `in_season_post_game`, `legal_v2`, `load_spike_protection`, `offseason_arc`, `onboarding_off_days`, `one_tap_logging`, `pap_real_throws`, `personalization`, `phase_feedback`, `power_primer`, `programs_retired`, `rest_day_calculator`, `staff_view`, `tell_hammers`, `ub_plyo_hand_wrist`, `under13_parent_program`, `windmill_program`.
- **All three stored app settings:** `lifting_v2_enabled=true`; `staff_plan_gate={enabled:true}`; `rankings_visible={enabled:false}`. `training_intel_v1` absent → OFF.
- **Code release controls:** `REPORT_CARD_SWITCH=off`, `GAME_IQ_AVAILABLE_TO_ATHLETES=false`: active owner/admin internal-only, labeled “Internal — not released”. `US_ONLY_APP_STORE_RELEASE=true` (owner, Oct 22): US-only listing; website link shown unless a non-US storefront is reported. `TIPPING_DETECTION_ENABLED=false`, `ROOT_EVIDENCE_ENABLED=false`, `ON_DEVICE_BALL_DETECTOR_ENABLED=false`.
- **All camera metric switches OFF:** `MEDIAPIPE_SHOULDER_TILT_ENABLED`, `MEDIAPIPE_HIP_DRIFT_ENABLED`, `MEDIAPIPE_PELVIS_ROTATION_ENABLED`, `MEDIAPIPE_LEAD_ELBOW_ENABLED`, `MEDIAPIPE_BACK_KNEE_FLEX_ENABLED`, `MEDIAPIPE_HEAD_POST_LANDING_ENABLED`, `MEDIAPIPE_HEAD_MOVEMENT_ENABLED`, `MEDIAPIPE_HANDS_STAY_UP_ENABLED`, `MEDIAPIPE_ENERGY_ANGLE_ENABLED`.
- **Parked UI, all false:** `sidebarGameIq101`, `landingComingSoonBox`, `landingTeaserCards`, `progressGameIqTile`. Delaycam splitter: `staff_validation`; tempo and shoulder tilt: `staff_validation`; stride, ball/bat speed, contact time and hitting mechanics: `not_released`. Owner Fast Mode is a local display preference, default false, not a release/permission switch.

### After publishing: live checks

Use authorized TEST accounts only. Keep Swap OFF for ordinary players; release it only after all four positive cases pass. No fabricated clips, measures or plan rows.

- **Machine → partner flips (today):** on a naturally built machine drill, missing machine offers legal partner flips; save once, reload: replacement and reason remain, same dose, one swap log; no permanent missing-machine memory.
- **No barbell (always):** legal same-intent alternative saves with unchanged dose; reload retains it; missing-barbell memory exists and the next real plan avoids barbell work.
- **No open field / no foam roller:** each naturally prescribed row offers only qualifying choices; save/reload retains choice, reason and correct today/always memory. “No safe swap found” is an honest refusal, not a successful positive proof; never force an invalid choice.
- **Base counters:** baseball uses 90-ft bases; softball uses 60-ft bases. Each real route counts its declared bases per rep; four accumulated bases triggers the long reset.
- **Full-go:** real pitcher, fielder and baserunner plans show the full-go execution stage with the original prescribed amount; logging survives reload.
- **Mixed signals:** genuine recent analyzed clip and comparable game entries disagree about the same sport/skill; Today shows the notice, never invented faults or thresholds.
- **Testing day:** schedule through the Organization dashboard; player opens the notice and details, sees date, tests and entered time/location, or the honest “Not entered” message. A fresh $0 test org plan may be needed; cancel at the end.
- **Coach summary:** democoach opens both authorized TEST hitter and pitcher; “Hammers' plan for this player” and six-week summary show actual saved days, preserving parent/health permissions.
- **Nightly pair:** player follows real saved advice, then enters a comparable genuine re-test 14–28 days later; the next normal 04:30 UTC run records its outcome and the player reads it. Do not backdate or manually trigger cron.
- **Real iPhone upload:** use one original HEVC clip; analysis completes without manual conversion. Camera measurements stay unreleased.

### Cleanup and change disclosure

- This continuation changed only preview scout profile loading and its three tests: unshared visits use the existing server-owned scope check; caches are viewer-scoped, genuine check failures remain visible. Legacy `athlete_equipment_context` is the existing inventory; new `athlete_equipment_memory` is read only behind Swap authorization and written only by the gated endpoint.
- Fresh TEST autosave input restored from 6 to its original 3 reps. No new account, relationship, subscription, plan row or test measurement created in this continuation. Existing canceled demoorg plan remains canceled. Browser evidence stays private under `/tmp/browser/publish-next`; final bounded logs `/tmp/publish-gate-final`.
- Demo Organization's $0 subscription remains canceled from the prior run. Snapshotted temporary testing day, temporary org membership and only the 19:20 duplicate coach request removed; exact-ID readback confirms zero. Older coach relationship preserved. TEST autosave input restored to its original 3 reps.
- Hosted migrations 0094–0097 applied for the named Swap gate, folder permission-loop fix, self-only canonical plan evidence, and self-only age/advice-label reads. Scores remain private. These are live backend changes; frontend fixes remain in preview until an explicit publish.
- Hosted health readback: database and connection pool up, memory 58%, disk 41%, 22/60 connections; historical disk-I/O budget alert at 21:03 UTC, not proof of current exhaustion. This explains a possible pressure signal, not the repeated failures' confirmed root cause. Final preview build OK at 22:42:11 UTC.
- Earlier dated sections below are historical and do not override this release-gate status.

## AK1–AK6 Assessment Mode and plan prompts — in progress
### AK7 final batch status — Oct 20
- Ready to publish: **NO**. Current consolidated item-by-item proof, cadence proposals, switch readback and missing implementation/proofs are at the top of `roadmap.md`; older status sections are historical, not current readiness.
- AK7 phone as real TEST player: X/guard/disabled Start, embedded hitting upload, S2 failed history read→no new test→retry, explicit skip completion→no guard→Start enabled→reload stays finished. Original progress restored/read back; no Start/result/payment/plan created. Evidence: `walkthroughs/assessment/ak7/`.
- New analysis recording adapter stays OFF behind plan_prompts_v2; only canonical clip dates, included sport modules and explicit ready-block routes can yield a reminder. Existing due tests now use local calendar dates and show read failures instead of fabricating missing baselines. Full suite 3,170 tests / 406 files PASS; 111 focused PASS; preview build OK.
- Full $0 payment/S2/analysis submission/General/onlooker/Start proof, safe coach/org shared mode, Delaycam/Royal/testing-day/pickoff adapters, real reminder/coach/learning readback and full non-lifting matrix remain unfinished. No publish, deployment, migration, cron or iOS change in AK7.
- AK6 supersedes the AK5 practice-report honesty blocker: `session-insights` LIVE now returns only canonical entered-log values, never cached AI faults, causal claims, fixes or independent dose. Source ownership/non-deletion checked first. Shared projection used by client source reads; old cache rows kept but ignored. Sibling deterministic fallback views no longer invent mechanics or elite labels from composites; low composite indexes no longer become video movement faults.
- AK6 phone PASS, real TEST player at 390×844: one tee rep saved, Grade 60 / Acceptable retained, execution grade/count/source/date visible, mechanics “Not measured”. App-refreshed authenticated live report 200 has no faults/fixes/dose. New TEST session/ledger/daily-log/dirty marker removed after snapshot; original streak/HIE restored, timestamp triggers differ. Evidence: `docs/owner/walkthroughs/assessment/ak6/`.
- AK6 full suite 3,150 tests / 404 files PASS; 80 focused PASS; preview build OK. Only named `session-insights` redeployed under Oct 19 authorization; no publish/cron/migration/iOS changes. Remaining assessment and prompt proofs still make readiness NO.
- AK5 real direct PracticeHub save PASS as TEST college player, 390×844: one tee rep saved and summary read back. TEST session, ledger, daily log, report and dirty marker removed after private snapshot; original MPI streak/HIE values restored (timestamp triggers advance). Evidence: `docs/owner/walkthroughs/assessment/ak5/`.
- AK5 canonical practice logging now feeds the coach Discipline presentation without claiming workout completion or adding prescribed denominators. Minimal paginated session reads require self/linked-coach eligibility and existing RLS; unavailable reads remain explicit. 79 focused tests PASS; preview build OK. Coach phone readback not proven: session mint approval unavailable; player staff-page access denied. No permission bypass.
- AK5 release blocker: one entered tee rep produced invented visual/cognitive faults with high confidence in the generated practice report. This is not measured evidence. Fix `session-insights` and all report consumers before release. No function deployed. Direct save does not prove calendar reminder disappearance or learning outcomes.
- AK4 six program/sport phone proofs PASS at 390×844 from real saved active TEST entitlements: 5Tool hitting+throwing, Complete Pitcher pitching, Golden 2Way hitting+pitching+throwing in baseball and softball. Original subscription modules and assessment progress restored/read back; timestamps advance through existing triggers. Evidence: `docs/owner/walkthroughs/assessment/ak4/`. Not a payment proof.
- AK4 corrected recurring first-occurrence completion: only its exact non-deleted dated session suppresses it, never the recurring row's completed status. 71 focused tests PASS in five files, including twelve eight-week practice matrices; preview build OK.
- AK4 read-only audit found missing practice-to-Discipline integration: current Discipline RPC counts workout prescriptions/logs only. Coach/org embedded reuse also remains unfinished because canonical forms are self-scoped and cross-athlete writes need existing server permission/parent/sharing checks. No practice session saved; neither flow is marked proven.
- AK3 phone PASS as TEST college player: Back 6→5→4, active baseball 5Tool hitting + throwing buttons, final embedded TEST sprint save auto-finishes and reload stays finished. Source records no longer auto-complete unvisited S2/Vault steps. New test removed by exact ID/user; original assessment restored/read back. Evidence: `docs/owner/walkthroughs/assessment/ak3/`.
- AK3: calendar-only practice prompt implemented with exact dated canonical session identity and linked-event deduplication, no new dose/cadence. Full suite **3,132/3,132** PASS (402 files), focused 73 PASS, preview build OK. Real practice reminder-to-save phone proof and learning readback remain pending.
- AK2 phone PASS: five explicit skips followed by an embedded TEST sprint save finishes Assessment Mode automatically, removes the guard, enables Start and stays finished after reload. TEST entry removed and original progress restored with readback. 59 focused tests pass; 12 sport/tier eight-week practice/reminder-completion matrices. Evidence: `docs/owner/walkthroughs/assessment/ak2/`.
- Recurring practice completion now projects exact schedule ID/local date/module from the canonical practice log. Implementation/rule tests pass; actual scheduled save-to-reminder phone proof remains pending. No extra dose, cadence or completion store.
- Assessment Mode foundation is in preview: one screen per step, embedded S2/analysis/Vault entry, saved skips/navigation, X and Continue guard. TEST college phone proof shows both hitting and throwing buttons and completion enables Start. Evidence: `docs/owner/walkthroughs/assessment/ak1/`.
- Continuation phone proof: body/equipment/goals open within profile check; real S2 start reaches test instructions; embedded TEST 1.65-second sprint saves, reads back with source/date/Grade 40/Acceptable and advances step 6. TEST entry removed after snapshot; progress restored. 44 focused tests pass, including six sport/tier 56-day practice matrices. Evidence: `docs/owner/walkthroughs/assessment/ak1-continuation/`. This does not prove all eight S2 subtests or the full prompt matrix.
- Backend assessment navigation fields were added without removing data. `plan_prompts_v2` is OFF, buildable=false, awaiting owner cadence confirmation. Existing calendar game prompt stays on; subscribed scheduled-practice reminder is added to the one plan, with real PracticeHub completion, not tap-as-completion.
- Not ready: all-program/all-sport/$0 payment proof, fully completed S2 and embedded analysis, coach/org shared mode, General/onlooker results, Start-to-saved-plan proof, remaining prompt adapters and full eight-week simulation. These are not covered by earlier final-stretch proofs.
- Game IQ and Report Card remain owner/admin-only, labeled Internal — not released. No publish, function redeploy, cron or iOS change in AK1.

Plain-English list of what must be true before publishing. Current answer: **Ready to publish: NO.**

## Latest AI3 status — Oct 19 04:05 UTC
- Scoped final-stretch inputs cleaned up after a timestamped private backup: 29 TEST games, 52 pitches, 42 at-bats, two coach entries and the retained sprint. Their remaining counts are zero. Phone check as the TEST college player shows empty Games and Game Reports.
- TEST Child is now marked as a system TEST account and excluded from rankings. Account and legal consents stay; TEST coaching principle stays OFF, Version 2, with the safeguard untouched.
- Still pending: first nightly result after 04:30 UTC, final retained-TEST exclusion sweep, confirmed live TEST subscription identities and cancellation at the very end, and final switch verification. Earlier billing notes conflict, so no plan was canceled in AI3.
- HEVC conversion is proven; camera measurement impact is not. The owner iPhone live-check note below remains required.
- Older dated sections below are historical evidence, not a claim that every current publishing check passed.

## Current Oct 17 fixes status (supersedes older checks below)
- Full suite: 2,937/2,937 PASS; preview build OK.
- Owner menu, Subscribers current-plan grouping, drill activity coverage, read-only settings, Stripe links and analysis-cost screen checked at phone size.
- Still required: 12 suitable real analysis clips (two per sport/type); coach agreement votes through the real UI; new-player Completed → Start → saved Today flow; parent sharing/scout visibility saves; completed health profile redo; populated History/practice/report/Train-next checks.
- First-start server guard is staged, not applied; owner must authorize that named migration. No publish, cron or iOS change made.
- Earlier “6/6 analyses” evidence is historical, not proof for the current Oct 17 request.

## Proven (PASS)

- Full test suite: 2,894/2,894.
- Player plans: 8-week simulations, 720 player combinations, 0 rule breaks. Plan 4 changed nothing in player plans.
- Existing data intact: 204 profiles, 191 active subscriptions, 69 consent records (read-only counts).
- Daily plan job: builds every day 2026-10-07 → 2026-10-12.
- Missed-workout marking: a past-dated workout flips to "Missed" (proven with a throwaway test workout, cleaned up).
- Renewal reminders: on for everyone, non-staff refused, staff practice run sends nothing when nothing is due.
- Fair use: in Terms version 2, coach/org buyers accept it at checkout, existing players are not asked again.
- Coach logging (Option 1 one player at a time, Option 2 lineup): wrong-player saves blocked, under-13 needs a parent present, backend-proven.
- Guest mode: nothing saved, under-13 needs parent permission, backend-proven.
- Cost tracking: main analyses + 5 smaller AI uses log model, tokens, cost.
- 30-per-hour fair-use limit: pauses and retries, never charges.
- Sponsorship (live Stripe): sponsor, pause, resume, cancel, and player-refusal all PASS.
- Staff plans: Organization plan turns on/off from real Stripe events within ~10 seconds.
- Phone-size pages open correctly signed in as test player, under-13 player, coach, org, parent.

## Still open (must pass before "Ready to publish: yes")


1. **Owner's 3 test checkouts** (Complete Pitcher, Hammers Coach, Organization + extra seat, each with its one-time 100% code from the private email). Once the Organization one is done I can prove on Stripe's real page: sponsoring a player, and adding seats later through Manage plan.
2. **Under-13 full signup** — the owner runs it himself with his card and the 4th code (private email "[PRIVATE] Hammers under-13 test code"). Afterwards: cancel that test subscription and flag the account + consent record as TEST.

## Resolved since 2026-10-13

- **Stripe checkout code box:** not an app problem — Stripe refuses codes typed by an automated browser. The codes' settings were fine; the owner's own typing works.
- **Sponsoring a player who already pays:** PASS — no double charge; the player's own plan runs to its paid end, then org billing starts. Both test subscriptions canceled.
- **Coach-tools plan switch:** ON (`staff_plan_gate`). Coaches without a plan see "Coach tools are now part of the Hammers Coach plan" with Subscribe and "Join through your organization". Owner and admins unaffected.
- **Every purchase path reaches Stripe's real checkout page** (proven signed in as each test account, phone + desktop, screenshots in docs/owner/walkthroughs/): Organization + 1 extra seat ($1,150/mo, both items listed), Coach ($300), Complete Pitcher ($200). Fair-use and auto-renew acceptances are saved before checkout. Cause of the owner's org-plan failure found and fixed: checkout opened in a new window, which phones block silently — now same-tab, with a visible error if checkout can't start.
- **Live video analyses:** 6/6 completed (baseball + softball × hitting, pitching, throwing; 21–38 s each), each with a plain-words summary and drills (Report Card is now off for everyone — owner, Oct 18). Test videos and reports deleted (backup kept).
- **Human walkthroughs at phone size** (screenshots in docs/owner/walkthroughs/): player (college baseball), softball setup all 12 steps, pro/softball-pro/two-way/ramp-up players, teen with parent signature, under-13 player + parent, scout, coach, organization admin — all PASS. Every one of the 177 screens has a visible Back or Close (checked as owner and as player).
- **Owner-found fixes 1–9:** all done except the sponsorship/seats part of #8 (needs the owner's org checkout). Details at the top of roadmap.md.

## Owner decisions still waiting

- Rankings/MPI scores on 5s? Spaces stays OFF; Vault review queue.

## Leftover test data in Stripe

- Oct 19: democoach Coach plan and TEST Child plan cancelled through the app's own cancel function; both show cancelled, no modules.
- Nightly learning run Oct 19 04:30: succeeded (nothing to learn yet). Scheduled-jobs review: docs/owner/cron-audit.md.

- Test customer for the Demo Organization (plan canceled, charged $0). My tools can't delete customers; you can delete it in Stripe if you like.

## Switches — 2026-10-13 (owner OK by name)

- Coach and Organization plans switch: `staff_plan_gate` in the backend settings table `app_settings` (not `wk_feature_switches`, not code/env). Was missing (= off); now `{"enabled": true}`. Proven: Pricing, Staff Plans and Demo Upgrade show Coach $300 and Organization $1,000 (+$150 seat) on a phone screen.
- Under-13 signup switch: `under13_parent_program` in `wk_feature_switches`. Already `all` (on) since 2026-10-06. Proven: signup answers enabled; the under-13 screen offers the parent path and its 3-step intro. Full signup (creates a real account + permanent legal consent record + card payment) not yet run — waiting on owner.
- Still open: owner's 3 test checkouts.

---

# Owner guide — every feature, how to use it, how to check it

## Player
- **Dashboard** — the home screen. Steps: sign in. Check: Identity card, Before You Start, then Hammers Today; at the very bottom, a quiet "For your coach or facility" pair.
- **Hammers Today** — today's training plan. Steps: open Dashboard → Hammers Today. Check: every exercise has sets/reps or time, with labels; it changes when the phase changes.
- **Video analysis** — upload a clip and get the analysis. Steps: pick a module → Upload → wait. Check: findings are labeled Estimated / Not measured, and no video-based number grade shows anywhere — it reads "Grade coming with camera measurement". The Report Card is internal-only: owner and admin see it marked "Internal — not released"; everyone else never sees it.
- **Test results** — entered tests (sprint, jumps, verified maxes, radar or sensor speeds) still show their number, 20–80 grade and band, with source and date.
- **History** — every past report, test and grade. Steps: side menu → History. Check: each grade reads "Grade: 45 · Acceptable".
- **Vault** — check-ins, discipline, readiness, tests. Steps: side menu → Vault. Check: the Check-in, Discipline and Readiness tabs open.
- **Check-ins** — morning, before training and night questions. Check: coaches see answers only when the player turns health sharing on.
- **Game logging** — log your own games. Check: entries say "Source: athlete-entered"; coach entries ask "Yes, that's right / Something's wrong".
- **Initial assessment** — optional starting checklist. Every answer/test can be skipped; tap Completed, then Start to build Today. Existing started players stay unlocked. Server enforcement and new-player proof remain pending.

## Parent
- **Teen waiver (13–17)** — a parent signs before physical training opens. Steps: the player taps "Ask my parent" → the parent opens the email link → signs. Check: "Signed. Thank you."; the player's plan opens; the same link can't be used again.
- **Under-13 account** — the parent creates and controls it. Steps: Sign up → under-13 birthday → "I'm the parent or guardian — continue" → details → sign → pay. Check: the account opens only after both the signature and the payment.
- **Parent controls** — pause, withdraw or delete the child's data.

## Coach
- **Hammers Coach plan ($300/month)** — opens all coach tools. Steps: Dashboard tile "Start Hammers Coach" → checkout. Check: the coach dashboard opens; without a plan, coach pages show the two plan tiles.
- **Coach dashboard** — the roster with each player's readiness, discipline, development, games and reports.
- **Game logging, one player at a time** — the page is locked to one player. Check: a save for any other player is refused.
- **Lineup mode** — tap the jersey number, then confirm the name. Check: the wrong number or name is refused.
- **On-the-spot assessment** — record a movement check in person. Check: the player sees "Coach-verified"; under 13 needs the parent present.
- **Guest mode** — analyze a player who has no account. Check: "Guest result — not saved"; nothing is stored.
- **Weekly summary, calendar, send workouts** — open them from the coach dashboard.

## Organization
- **Hammers Organization plan ($1,000/month, 5 seats; extra seat $150/month)**. Steps: Dashboard tile "Start Hammers Organization" → pick extra seats → checkout. Check: the seat count matches; the facility dashboard opens.
- **Add a coach** — invite by code. Check: the coach appears under staff and uses a seat.
- **Sponsor a player** — the org pays for a player's plan. Check: a player who already pays keeps his own plan to the end of his paid period, then the org's billing starts; there's no double charge.

## Scout
- **Scout view** — sees only athletes who allow it; minors only with a guardian's OK. Check: no plan advertising is shown to scouts.

## Owner
- **Switches** — Coach/Org plans (`staff_plan_gate`, in the settings table) and Under-13 (`under13_parent_program`, in the feature-switch list). Both are ON.
- **Stripe codes** — every test code is one-time, limited to one product, and expires in 7 days.
- **Before publishing:** finish the 3 test checkouts and the under-13 test checkout, and confirm each one is canceled afterwards.

## Changes 2026-10-14 → 10-16 (how to use, how to check)
- **Restored sign-up question** — Sign up → "Choose Your Role": Player, Scout/Coach, or Organization. Check: each choice opens its own sign-up.
- **Coaches without approval** — an adult (18+) is a full coach right after coach setup. Check: no "waiting for approval" step; coach tools still need the Hammers Coach plan.
- **Organizations active immediately** — Check: after sign-up the org shows "Active — you can add athletes and staff".
- **Scouts-only approvals** — Owner dashboard → Approvals shows only the Scouts queue. Check: approve/reject works as before.
- **Request buttons** — Coach Dashboard "Add a player" and Organization dashboard "Add athlete" (search and send, or share team code/QR). Check: the player sees the request in Requests and taps ✓ Accept; the coach list says "Connected"; the athlete appears on the roster.
- **Plan buttons** — Staff Plans "Check my plan" shows the plan and seats with a button to the right dashboard; "Manage my plan" opens Stripe's billing page (new tab inside the preview).
- **Side-menu dashboard entries** — "Organization dashboard" and "Coach Dashboard" right under Dashboard on every screen with the menu. Check: from Dashboard, open the menu and tap it.
- **Test purchases:** all owner test subscriptions found this week are cancelled.

---

## Owner guide update — 2026-10-19 (AH7)

- **Report Card: INTERNAL ONLY (owner + admin, labeled "Internal — not released").** One switch (`report_card`, off). Players, parents, coaches, organizations and scouts see "Grade coming with camera measurement" wherever a video-based grade would show. Entered tests (sprint, jumps, radar velocity, verified maxes) still show number, 20–80 grade, band, source and date. Human coach/scout grades unchanged. Only the owner releases it.
- **Game IQ: INTERNAL ONLY (owner + admin, labeled "Internal — not released").** Switch `GAME_IQ_AVAILABLE_TO_ATHLETES` = off (owner turned it off: defective). Covers the General's Game IQ tab, game reports, heat maps, matchup planner (scouting profiles), Game IQ 101 and all their links/cards. Players, parents, coaches, organizations and scouts see none of it — no empty tab, no "coming soon"; game logging in Game Hub itself stays. Only the owner releases it. Proof: walkthroughs/intelligence/ai5.
- **Coaching Console (owner only):** add, edit (versions are kept, never overwritten) and switch off coaching principles. Badges: Seen = worked for 3 players; Proven = 10 players with at least 60% success. With fewer than 3 players the numbers stay hidden for privacy, and TEST accounts are never counted. Principles can't be deleted (that safeguard stays on).
- **My Connections:** coaches, players, orgs and scouts connect only through a request the other person accepts. Either side can end the connection, and that takes effect instantly. A coach can log a game for a connected player; the player then taps "Yes, that's right" or flags it, and flagged games stay out of ratings.

## Switch inventory — 2026-10-20 (AK7 readback)

- **Backend feature-switch readback:** 28 rows; 26 `all` (on). `facility_spaces` is off; `plan_prompts_v2` is off/buildable=false awaiting cadence approval. `hammers_today_start_gate` is all/buildable=true. No switch changed in AK7.
- **Backend settings:** `staff_plan_gate` on; `lifting_v2_enabled` on; `rankings_visible` off (intended until you decide).
- **App code constants:** `REPORT_CARD_SWITCH` = off; `GAME_IQ_AVAILABLE_TO_ATHLETES` = false. Both are owner/admin internal-only, labeled “Internal — not released”; no release authorized. Camera-measurement and storefront constants remain unchanged; not re-audited by AK7.
- **Scheduled job:** `intelligence-learning-loop-nightly` is scheduled (04:30 UTC) but has not run yet.

## HEVC check — AI2, Oct 19 04:00 UTC

- Real phone-size preview upload completed for the owner H.264 clip and a generated HEVC equivalent as the TEST pitcher. Both converted automatically to WebM and produced qualitative findings with the grade placeholder. All 507 frames preserved; duration 16.9 seconds, 30 fps; maximum timestamp gap 0.333 ms. Conversion tests passed 2/2.
- Dense body tracking timed out on both formats in headless Chromium with mobile Safari user agent. Measurement impact remains unverified; this is not physical iPhone proof. This check's three TEST reports and storage copies were removed; the original owner clip stays untouched.
- **Owner live check after publish:** upload one original HEVC clip on your iPhone and confirm it completes analysis without manual conversion; camera measurements remain off and their accuracy is not certified by this preview check.
