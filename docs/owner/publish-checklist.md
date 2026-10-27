# Hammers — final publish checklist

## October 27 urgent run — current status

### October 27 run (6), final batch — current verdict

**Ready to publish: NO.** The urgent list is not fully implemented or fully proven. Exact blockers: four remaining original sport/module clip paths and entitled embedded upload; gated coach movement readback/integration and populated athlete observations; effective existing-item Vault tracking plus coach per-side tracking; mixed/unequal preparation circuits; real Finished → save → rest → reload; and program/sport baserunning generation proof. No additional live functions, migrations, publish, cron, schedules or iOS changes this run.

- Added narrow **self-only** saved movement observations on Today and the analysis page. Missing sides remain Not measured; scores retain their kind; no diagnosis, causal explanation or dose changes. No direct coach health read was added; its scoped server read remains open.
- Existing Vault editor initializes tracking from the catalog rather than always reps; saved drafts/versions still win. Audit found existing non-bunt version tracking is not applied by the generator: the catalog update branch only handles new/bunt rows. This remains a real implementation gap, not a completed tracking fix.
- Partial numeric logs now read **Work recorded** without changing existing canonical completion outcomes. A known-target timer stopped early without a manually entered time shows **Cut short**; typed time is retained rather than overwritten by a later timer stop. Rest counters and saved dose rules are unchanged.
- Equal-set rep circuits require each component entered/confirmed before Next; default preparation rest is 30 seconds unless a rest is declared. The run-5 header concern is **resolved without changing training**: the actual saved day's dose is `1x`, so Set 1 of 1 is correct; the usual catalog `2x` was not today's prescription.
- Phone checks: 390×844 throwing focus and fully loaded hitting analysis inspected; zero page errors or horizontal overflow. Available session is **Test Dummyplayer**, not owner or independent coach proof. Owner Vault visit redirects to dashboard; no owner-edit UI proof is claimed. Saved movement summary correctly absent with no populated observations; populated UI remains unverified. No workout values, assessment values, hosted TEST additions or cleanup targets were created.
- **FULL SUITE PASS: 580 files / 4,804 unique tests.** Eight bounded groups passed 577 files/4,790 tests; three newly added files passed 14 tests. Final changed-file rerun: eight files/45 tests PASS, not counted twice. No failing groups. Automatic preview build **OK at 04:43:26 UTC**, checked after final code edits; no manual duplicate build. Evidence: `/tmp/browser/urgent-run6/suite/summary.json`, group logs, final-changed log and inspected phone screenshots. Prior completed paid clip/canary proofs were not repeated.

#### 21-item status
“Built” means implementation exists, not that every requested role/sport path is certified.

| # | Owner item | Status and exact remaining gap |
|---|---|---|
| 1 | Original clips, both sports, normal + embedded | **Partial proof:** original baseball hitting/pitching normal upload/save/display/replay passed previously. Baseball throwing, softball hitting/pitching/throwing and entitled embedded paths need original clips/access. |
| 2 | Private media, insert access, enum, switch, conversion, embed audit | **Built/audited:** signing/self insert, conversion and allowed analysis modules checked; embedded subscription union/saved-refresh repaired. No universal outage reproduced; other paths remain unproven. |
| 3 | Every upload ends with honest saved/displayed report | **Partial:** saved terminal/refusal reports and report-write retry built/live from earlier runs. Persistent storage failure honestly returns saved:false; pre-upload failure cannot claim a saved clip report. No terminal-provider model switching. |
| 4 | Sport/position-specific analysis | **Built, partial proof:** canonical catcher/infield/outfield/pitcher throwing context; separate softball pitching path. Unsupported standalone fielding/catching/bunting analysis contract not added; full role/video matrix open. |
| 5 | Fixture E2E + daily owner canary + SQL | **Built/proven previously:** real fixture save/display/readback and manual canary pass; owner alert path. Cron SQL delivered, intentionally unapplied; cross-sport fixture matrix open. |
| 6 | Rich embedded analysis results | **Built, proof open:** existing rich report cards and saved feedback mounted; subscribed-player embedded result UI not exercised. |
| 7 | Optional assessment Back/Skip/Next, final Save & exit | **Built/partial proof:** all nested flushes await canonical saves; failure stays. Prior real body Next pass; complete populated six-step role reload open. |
| 8 | Subscription-required tests, categories/order | **Built/tested:** active matching-sport module union, categorized preferred order; actual entitled-player full list proof open. |
| 9 | In-depth sport/subscription season stats | **Built/tested:** pitching/hitting/defense/running group fields; populated cross-sport module UI save/reload open. |
| 10 | Fielding/throwing goal corrections | **Built/tested:** Clean hands, Improve footwork, Routine plays, Arm health, Improve throw carry; retired throwing transfer/long-toss choices, legacy saves readable. |
| 11 | Bilateral professional movement + plan/coach/analysis | **Partial:** 15 observations/how-to/scores/history/arc, existing coach writer, self-only Today/analysis summary. Coach scoped reader, causal-safe explanation integration and populated role save/readback remain open; no dose effects claimed. |
| 12 | Editable tracking + body-part labels | **Partial:** Vault selection/init and coach custom-unit controls, explicit limb labels/tests. Existing non-bunt Vault tracking propagation and full coach per-side semantics remain unimplemented/unproven. |
| 13 | Remove fourth timer control | **Built/tested/phone inspected previously:** three state-aware timer controls; active hundredths retained. |
| 14 | Remove empty warm-up Drills shell after Start | **Built/tested/phone inspected previously:** hidden during focus, canonical work retained. |
| 15 | Remove nonfunctional top Start after beginning | **Built/tested/phone inspected:** top control removed once focus begins. |
| 16 | Typed value enables Next; Finished auto-rest; cut-short rule | **Partial:** individual typed entries ready immediately; circuit readiness requires every component; saves precede managed rest; timer-only cut-short presentation. Full real athlete save/rest/reload and all specialized logger paths open. |
| 17 | Efficient rest, warm-up about 30 s | **Built/tested within safety:** warm-up/rep circuit fallback 30 s, declared rest and sprint/four-base recovery preserved. No global shortening or schedule change. |
| 18 | Royal/Tex only on their prescribed items | **Built/tested previously:** unrelated exercise links removed; prescribed tool identity retained. |
| 19 | Throw primer included in workout/focus | **Partial:** saved preparation mounted first, separate component reps phone-visible and equal-set readiness tested. Mixed duration/unequal-set circuits still need explicit component rows. |
| 20 | All sport skill practice-log buttons | **Built/tested, role proof open:** fielding/hitting/pitching/throwing/baserunning and bunting paths; matching canonical session readback retained. Complete affected-role both-sport save/return not certified. |
| 21 | Legal baserunning per program/sport | **Audit incomplete:** builder has legal baseball/softball read/footwork/scenario work; pitcher-only has no baserunning weekly-goal boost, 5Tool/Golden 2Way do. Conditioning recognizes declared sport/base routes only. No universal absence reproduced or dose added; actual program generation matrix and inaccessible leg-protected IQ destination remain open. |

#### Updated player/coach/owner guide
- **Players:** Back, Skip and Next save your entered assessment answers; failed saves keep you there. Final step is Save & exit. Leave unmeasured movement values blank. Saved observations appear separately on Today/analysis and do not explain a cause or change your workout.
- **Players:** enter each prescribed circuit movement separately. Next/Finished need the current row's entered work, then save before rest; use each declared recovery interval. A partial number says Work recorded; Cut short refers only to an early stopped known-target timer with no manually entered time. Do not repeat performed work to create a log.
- **Coaches:** on-the-spot movement recording keeps existing connection and parent checks. Your custom items retain existing measure controls; do not assume per-side expansion or saved movement readback is released.
- **Owner:** Vault tracking initialization preserves current catalog kind, but existing non-bunt tracking changes are **not yet certified effective in generated plans**. Do not treat a saved version as proof of changed logging. Canary cron SQL remains yours to apply; no schedule installed in this batch.

### October 27 run (5), 04:27 UTC
- BUILT: fully declared equal-set band/activation circuits now retain a separate rep target for each movement in the existing task log. Baseball example retains 12/12/12/10/10; windmill example retains 10 each direction/12/12/10. Compound inputs are stacked for phone width; targets are not treated as entered work until that individual field is edited or confirmed on blur.
- TESTS: 3 affected files/29 tests PASS across bounded runs (the entry-prescription file passed 15 tests separately; final parser/logger run passed 14). Component save payload and local reload preserve edited values and leave untouched components null. This is not hosted player save/readback or a fresh full-suite result.
- PHONE: signed-in 390×844 throwing focus shows the separate component targets, no horizontal overflow or page errors. Screenshot inspected. It remains the available demo-associated owner session; no training values were entered and no hosted rows were created. Found an unresolved guided header discrepancy: circuit inputs retain two declared rows but header shows Set 1 of 1, indicating another mounted registration; do not certify complete compound focus yet.
- EDITABLE TRACKING AUDIT: Vault already offers tracking selection and coach custom-item editor already has unit selection. Existing catalog item initialization can fall back to reps; coach-selected catalog tracking is intentionally locked. These require guarded follow-up, not new permissions or a blind selector expansion.
- GUIDE: each circuit movement has its own target and entry; changing one movement does not record its neighbors. Mixed time/rep or unequal-set circuits remain unexpanded pending explicit row metadata.

**Ready to publish: NO.** Remaining P0 original cross-sport/position footage and entitled embedded-player proof, movement consumers/role readback, editable tracking, mixed circuits/guided registration, cut-short/baserunning, full suite and real Finished/rest/readback remain open. Preview-only edits; no publish, redeploy, migration, cron, schedule or iOS changes.

### October 27 run (4), 04:28 UTC
- BUILT: exercise timer now has three controls: Start/Pause/Resume, Stop, and one state-aware Reset/Restart. Removed duplicate fourth play/restart control; active hundredths and pause exclusion unchanged.
- BUILT: focus rest hides the mounted work surface until canonical rest ends; rows and drafts remain registered. Warm-up Drills shell/empty-work text is hidden in focus, without deleting prescription rows or changing completion.
- FOUND/FIXED: throwing-card band preparation was already the first registered guided activity but its entry was incorrectly labeled Throws solely because of its card category. Non-throwing band/activation prep now uses reps, preserving actual throwing fields elsewhere. Mixed multi-movement band-series dose still needs a complete per-movement entry audit; no claim that one row represents the whole circuit.
- PHONE: 390×844 signed-in preview warm-up and throwing focus inspected after dismissing Demo overlay. Three timer controls, no top Start, no visible Drills placeholder, band prep first with Reps; zero page errors/overflow. Session is demo-associated, not an independently certified TEST-player flow. No work values or training logs entered; no test rows created this run.
- TESTS: final focused 3 files/26 tests PASS; preceding six sport/phase drawer cases and nesting tests PASS. Preview build OK. This continuation did not run a fresh full suite or real Finished/save/rest/reload flow.
- GUIDE: reset/restart shares one arrow control; Stop records only active elapsed time. Guided rest retains the exact saved interval. Throwing prep uses reps rather than counting band movement as throws.

**Ready to publish: NO.** Remaining P0 original-clip/entitled embedded-player proofs, movement consumers/role readback, editable tracking, complete compound entries/cut-short semantics and legal baserunning audit remain unfinished. No publish, redeploy, schedule or iOS changes this run.

### October 27 run (3), 04:19 UTC
- P0 FIX: provider refusal now returns the actual persisted Not measured report and saved flag, rather than dropping it from the response. Only analyze-video redeployed successfully; fresh empty request returns expected 400 validation, not a startup error. Refusal response parser test passes; no deliberate provider refusal or paid repeat of completed upload proofs.
- P1 BUILT: shared athlete/coach movement capture covers 15 bilateral observations across range, stability, patterns, rotation and strength; includes arm/injury history, how-to text, observational 0/1/2 scoring and measured shoulder total arc. Missing sides remain unknown; legacy pain cannot be erased by a new controlled observation. No normative-angle cutoffs, diagnosis or invented safe result.
- COACH: shared capture still saves through existing connection/parent/provenance RPC; removed the unverified claim that saved pain already adjusts a plan. Plan and analysis explanation consumers are NOT connected yet; this remains open rather than claiming those effects.
- PROOF: 390×844 owner movement screen and expanded control section inspected, zero page errors/overflow; no fabricated measurements entered. Blank optional steps used only for navigation. Exact temporary assessment snapshotted privately and removed; fixed-owner readback confirms zero rows, matching pre-test state. Populated measurement save/reload and connected-coach proof remain open.
- TESTS: 12 targeted files / 81 tests PASS, including form events, bilateral pain preservation, missing-side semantics, total-arc arithmetic, failure-report parsing and existing data unity. Automatic preview build OK. No new full-suite claim this continuation.
- GUIDE: players can leave unmeasured ranges blank, compare left/right and stop painful checks; coaches record the same observations in person using the existing parent requirement. Observation scores are not medical grades.

**Ready to publish: NO.** Original remaining sport/throw clips and entitled embedded-player proof are unavailable; movement-to-plan/analysis integration, role save/reload and remaining workout requirements are unfinished. No publish, schedule or iOS changes.

### October 27 run (2), 04:10 UTC
- BUILT: normal upload, retry and embedded camera notify assessment only through the saved-report contract; confirmed readable reports trigger canonical evidence refresh, not invented completion of other required modules. Multiple active subscriptions are unioned in assessment entry and module selection rather than failing a single-row read.
- BUILT: nested body, equipment and goal forms expose their existing save actions; assessment Back/Skip/Next and nested Back wait for these saves. Body save failures no longer advance. Unanswered equipment is not declared empty; empty goals do not invent picks.
- PHONE PROOF: real body form at 390×844 retained the owner's existing entered height, Next saved and advanced to step 2; zero page errors. Screenshots inspected. Embedded upload could not begin: owner's saved active baseball subscription supplies no analysis modules. No role bypass, entitlement change or fabricated softball footage used.
- CLEANUP: previous two duplicate proof video rows snapshotted privately, removed through self-owned exact-ID requests and read back absent. The earlier 403 was the cleanup script requesting restricted whole-row video columns, not failed upload permissions. This run's two temporary assessment rows snapshotted to `_snapshot_urgent_run2_assessment_20261027` and removed by exact owner/creation timestamp; original assessment was absent. Registered canary fixture retained.
- TESTS: 8 focused files / 48 tests PASS including real body form writer/failure behavior and save-before-Back/Skip/Next ordering. Preview build OK. Prior full-suite 572 files/4,770 tests remains the prior run's result, not a new full-suite claim.
- OPEN: original softball and position-player throwing clips needed for four remaining sport/module proofs; embedded proof requires an actually subscribed player; deep movement screen and remaining P1 workout work still unfinished.

**Ready to publish: NO.** Remaining P0 evidence and P1 implementation are incomplete. No publish, schedule or iOS changes.

### October 27 continuation, 04:00 UTC
- LIVE: analyze-video, analysis-canary and analysis-canary-configure deployed. Terminal provider errors/refusals stop without model switching; transient attempts wait; upload/camera display the server's saved Not measured report instead of hiding it. Cache replay confirms saved:true.
- REAL UI: owner original hitting and pitching MOV clips converted/uploaded/analyzed/saved/displayed/replayed at 390×844. Saved feedback matched replay. Screenshots inspected; transient toasts partly obscure result cards, so report visibility is also asserted from the rendered page.
- CANARY: one explicitly designated owner-owned TEST fixture, actual extracted frames, exact clip/user + five-minute single-flight lease, once per UTC day, pause on terminal provider/configuration failures. Initial authentication failure produced an owner alert; repaired in-code authentication deployment then fresh canary PASS with completed saved report readback. Never stores a user session. Retain only its registered fixture for the requested future daily check.
- SCHEDULE: `docs/owner/analysis-canary-cron.sql` delivered for owner application; **not executed**, existing schedules untouched. It proposes once daily at 00:10 UTC. No claim of an installed scheduled check.
- FULL SUITE: **572 files / 4,770 tests PASS**, eight bounded groups (final interrupted group rerun only). Automatic preview build OK at 03:55:52 UTC.
- OPEN: softball hitting/pitching/throwing and baseball throwing original-clip proof, embedded assessment upload + affected-player proof, complete P1 movement/editable tracking/timer/primer/baserunning requirements. Do not relabel baseball footage as softball to manufacture proof.
- CLEANUP OPEN: two exact duplicate proof uploads remain (baseball pitching and first hitting attempt); owner-session direct row read returned 403, so no deletion or cleanup success is claimed. Registered canary TEST fixture intentionally retained; original clips untouched.

**Ready to publish: NO.** P0 cross-sport/embedded proofs and substantial P1 requirements remain unfinished; publishing, cron execution and iOS untouched.

| Priority | Result | Remaining proof or implementation |
|---|---|---|
| P0 upload | Original iPhone MOV ran through real owner UI at 390×844: converted, uploaded, analyzed, saved and displayed. Blanket outage not reproduced. Private bucket signing and self insert policy confirmed. | Other five sport/module combinations and embedded upload are not proven. |
| P0 persistence | analyze-video redeployed; final report write retries once after 750 ms without another AI call, returns actual computed coaching with saved:false if exhausted. Partial tracking failures now retain diagnostics when FPS is measured. Canary real inference/readback passed; owner-only daily cron SQL delivered, not applied. | Persistent storage failure cannot honestly guarantee a saved report; terminal provider failures never switch models/retry. |
| P0 context/results | Shared server context reads saved position; catcher/infield/outfield/pitcher field throws distinguished. Softball no longer receives duplicate baseball pitching tile calculation. Real improvements now shown as What to work on cards. | Separate fielding/catching/bunting analysis contracts not added; cannot feed unsupported module enums. |
| P1 assessment | Next replaces Mark complete, saves drafts and moves forward; final control Save & exit. Back and Skip preserve season/movement drafts. Expanded subscription/sport-specific season fields and ordered subscribed performance list. | Nested body/equipment/goal drafts, full bilateral movement screen and plan/coach/analysis consumers, save/reload phone proof remain open. |
| P1 focus | Nonfunctional top Start hidden after beginning; Finished saves before automatic prescribed rest; unknown rest persists across reload. Add set hidden while guided. Fielding/bunting practice buttons added. Royal/Tex links removed from unrelated exercise tools. Body-part labels separate arms/legs/sides/directions. Warm-up fallback rest 30s; declared safety rest unchanged. | Editable tracking metadata, extra activity timer control, warm-up placeholder, throwing primer integration, full cut-short semantics, baserunning coverage and affected-player phone proof remain open. |
| Verification | Full suite: 569 files / 4,759 tests passed across eight bounded groups after correcting obsolete per-side expectation; final affected run 27 files / 151 tests PASS. Automatic preview build OK. Final original fixture upload PASS after tracking edits. | Tracking failure-path UI proof and complete cross-sport/role flows remain open. |

### By-role guide — urgent changes
- Players: use Back, Skip or Next to save entered body, equipment and goal answers before leaving their assessment form; a save failure keeps the form open. Last step offers Save & exit. Existing test submissions remain canonical; navigation never invents test results.
- Players: Finished records entered exercise work then starts declared rest automatically; an unspecified rest stays pending across reload. Practice-session links now include fielding and bunting.
- Coaches: saved legacy goal choices remain readable; new pickers offer Clean hands, Improve footwork, Routine plays, Arm health and Improve throw carry.
- Owner: original upload fixture test is `e2e/analysis-upload.py`; provide an original clip through ANALYSIS_FIXTURE and mint your own session. ANALYSIS_MODULE/ANALYSIS_SPORT choose the real clip's activity/sport; REGISTER_ANALYSIS_CANARY=1 explicitly registers a TEST fixture. Real provider calls incur usage. Daily canary is deployed and manually passed; apply `docs/owner/analysis-canary-cron.sql` yourself to schedule it.

**Ready to publish: NO.** Exact reason: urgent list remains partially implemented and the required cross-sport/embedded/affected-player save/reload proofs are incomplete. No publish, cron or iOS changes. Only analyze-video redeployed. Original owner clips are retained; no TEST athlete training records were fabricated.

Evidence: `/tmp/browser/urgent-suite/`, `/tmp/browser/urgent-check/`, `/tmp/browser/analysis-fixture/result.json`. The final upload test confirms saved/displayed through the real response and DOM; inspected final screenshot shows the original clip and Estimated / What to work on report, with the recommendation modal dismissed. Independent saved-row readback confirms completed status and readable feedback.

Updated October 26, 2026, academy continuation.

## October 26 07:33 final batch (4) — authoritative status

| Owner item | Implementation status | Proof status |
|---|---|---|
| 1. Level-specific contact, pitch whiffs/location, early-count principle | Built: editable exact K/PA, whiff and zone-contact standards; missing components remain unknown | Unit/simulation suite PASS; populated affected-player entry/readback not certified |
| 2. HR-only power and HR/K chase | Built: complete AB windows, HR/AB and chase; no XBH substitution | Unit/window-rollover suite PASS |
| 3. Speed, position arm/health, human defense | Built: existing grades only, matching saved sport/position and source labels; legacy unknown sport remains ungraded | Unit/provenance/health suite PASS; populated coach/athlete proof open |
| 4. Batters faced and pitching settings | Built: BF logging, completed pitch-by-pitch BF and windows | Tests PASS; elite pitching intentionally unknown until owner supplies cutoffs |
| 5. Bunting defaults and safeguards | Built: active 12 owner-worded drills, editable evidence defaults, side/count/rest/volume safeguards | Existing policy/eight-week simulations PASS; affected-player matched-video playback open |
| 6. Weakest judged required pillar | Built in General, shared coach/chat projection, browser ready-skill order and existing weekly opportunity; saved focus/source readback | Builder/save/safety tests PASS; server skill-selection and unattended focus NOT implemented; populated player/coach/chat proof open |
| 7. Full suite, preview, checklist and guide | Completed this batch | **558 test files / 4,673 tests PASS**, 16 bounded groups, zero failed groups; fresh preview build OK; 390×844 General/Today inspected, zero page errors or horizontal overflow |

- Additional final fix: rejected snapshot network requests now return failure instead of producing an unhandled rejection or claiming a save; later successful retries remain possible. Two affected files / 13 tests PASS separately, also included in the full suite.
- Final server audit: the existing ranked movement picker is used only by lift wrappers; arm care uses its first-legal picker and speed/conditioning their own canonical engines. Overlaying identity on the shared goal rank would affect lifting and goal doses. No new selector, fabricated mapping, athlete impersonation or job-authority bypass was introduced. The JWT-only new-day server explanation is sourced guidance, **not** server skill selection. That remaining implementation is not marked finished.
- Fresh phone evidence shows sourced identity values/unknowns in The General; Today is still Initial assessment · 1 of 6 done for the available session. This is not populated Today focus → save → reload or coach proof. Previously finished proofs were not individually rerun beyond the explicitly requested full regression suite.
- No hosted TEST inputs, persona changes or training writes were made; no new cleanup targets. No migration, function redeploy, publish, cron or iOS changes this batch. Final frontend changes remain preview-only. Pitching cutoffs remain intentionally unset, not invented.

**Ready to publish: NO.** Exact blockers: server skill-selection/unattended identity focus is unimplemented; populated affected-player/coach identity → new focus → saved reload and positive chat/matched-video playback remain unverified without the required TEST-user session authorization; the separate Monday coach send → warning → Okay → Use instead → focus log → reload/all-surface proof remains open. Full tests and a passing preview do not substitute for those proofs. No attainability prediction is claimed from relative speed/power progress.

Evidence: `/tmp/browser/identity-final/suite/summary.json` and 16 group reports, `save-tests.log`, `phone.log`, inspected `screenshots/general.png` and `screenshots/today.png`. Automatic preview build OK at 07:36:34 UTC after final code/guide edits; later dated sections below are retained history. The by-role guide is maintained in section C of this checklist.

## October 26 07:28 continuation (3) — current verdict

- Fixed a concrete first-save race in the actual Today caller: the saved-day lookup and identity read ran independently, so an early baseline snapshot could prevent later judged focus. First unsaved snapshots now wait for successful settled identity evidence; failed reads do not certify a new focus. Existing sport days need no fresh identity and source failures are shown honestly.
- New focus snapshots retain structured canonical source IDs. Reload restores saved skill order and Because/steps/duration only for matching sport/date, valid sourced guidance and unchanged current legal drill-dose signatures. Suppressed blocks and newer reduced doses win; lifting is never restored or altered by mastery. Historical snapshots without structured focus remain unchanged.
- Failed snapshot calls now return false; the Today save effect does not treat failure as a confirmed save. All writes still use the existing self-owned `wk_save_block_day` path/day lock; no new storage or server authorization path.
- **14 affected tests / three files PASS**, including delayed first-save, both-sport exact snapshot readback, failed saves, suppressed/reduced-dose precedence, eight weekly saved-source identities and hook-order regression. Prior completed suites retained, not rerun. Preview build OK at 07:32:44 UTC.
- Inspected 390×844 dashboard screenshot: current available player session is assessment-gated, zero snapshot attempts and zero page errors. Browser executes readiness helper with pending/failed/resolved/saved cases correctly. This is **not** a populated Today save/reload or coach-role end-to-end proof; no gate was bypassed and no hosted TEST data/personas changed.

**Ready to publish: NO.** First-save/reload defects are locally built and unit-proven, but populated affected-player/coach Today → focus → saved reload remains unverified without the required TEST-session authorization. Canonical server selection/unattended identity authorization, positive identity chat, matched-video playback and Monday coach Use-instead proof remain open. Pitching elite cutoffs intentionally remain unset. No migration, backend redeploy, publish, cron or iOS changes this run; frontend is preview-only.

Evidence: `/tmp/browser/identity-0728/` (final-tests.log, phone.log and inspected phone screenshot). Earlier dated sections are retained history.

## October 26 07:16 continuation (2) — current verdict

- Closed unsafe sport attribution: new human evaluations save their selected sport; throwing/catching entry requires an explicit sport. Canonical identity reads and the shared projection admit only matching record-level sport. Legacy rows stay stored with null sport, never backfilled from current account settings. Catcher pop, evaluator/position validity, health and ledger gates remain unchanged.
- Authorized additive migration **0130 applied/read back**: three nullable constrained sport columns, no defaults/backfill or changed table permissions; canonical evidence function retains its training and health access gates. Shared server judge regenerated; wk-generate-daily, hammer-chat, hammer-recall and plan-swap redeployed successfully.
- **35 affected assertions / five files PASS**: opposite/missing/invalid sport exclusion from grades and steering lineage, matching baseball/softball human grades, catcher pop, exact rep sport/value/unit saves, failed saves, human report submission and saved-day focus rejection. Retained prior full suite (553 files / 4,638 tests), not rerun. Preview build OK at 07:21:59 UTC.
- 390×844 authenticated reader/identity screenshot inspected; evidence RPC succeeds, zero page errors. Available session is not an active coach/scout: measurement-entry screen correctly refuses evaluator access. This is **not** a populated affected-player/coach/save proof. No TEST training writes or persona changes; no cleanup targets.
- Canonical server selection integration remains unfinished: maintained server sources expose the pure block builder but do not invoke it. Existing generator mastery annotation is not movement selection. Service-job JWT cannot impersonate athletes; no schedule/job/auth gate weakened to claim completion.

**Ready to publish: NO.** Remaining: canonical server focus integration and unattended identity authorization path; populated affected-player/coach → unsaved focus → saved reload, positive identity chat, matched-video playback and Monday coach Use-instead proof. Specific TEST session authorization remains unavailable. Pitching elite cutoffs intentionally remain unset pending owner values. No publish, cron or iOS changes.

Evidence: `/tmp/browser/identity-0716/` (targeted test logs, phone access/identity screenshots and canonical reader readback). Earlier dated sections retain their historical results.

## October 26 07:04 continuation — current verdict

- Connected judged identity ranks to the **existing** weekly goal opportunity before microcycle resolution. No second boost: baseline, subscriptions, phase, gear, rest and availability still win. Actual-builder tests verify priority changes and unchanged lifting/rest-day pattern; two-sport eight-week tests verify the allowed existing opportunity.
- New athlete-JWT daily builds retain sourced identity focus in their saved explanation; exercise details display it as the day's focus, not extra exercise work. Saved-day/adjustment paths are untouched. Service-job calls deliberately do not impersonate athletes: **job identity hydration and server movement-selection steering remain incomplete**; current server change retains guidance only and never changes lifting or goal doses.
- Corrected current-day arm-ledger rest evaluation: a 50-pitch current outing prevents elite, a one-pitch no-rest outing does not, expired outings do not. Dated prior-day pain cannot count as today's assessment; absent assessment remains unknown. No new health source or sport attribution was invented.
- New/affected checks: six files / **76 tests PASS** (actual builder, weekly goal eight-week simulation, saved-day immutability, current arm flags, input integrity and rendered blocks); earlier separate six-file **138-test PASS** included retained bunting/context simulations. Prior full-suite **553 files / 4,638 tests** remains the previous run's proof, not a fresh full-suite claim.
- Inspected a new 390×844 arm evidence screenshot (`/tmp/browser/identity-0704/arm-evidence.png`): actual owner evidence remains Need more data, zero page errors. Deployed generator refused the attempted invalid input with 409, no positive generation claimed. Authorized wk-generate-daily/hammer-chat/hammer-recall/plan-swap deployments completed; no migration, publish, cron or iOS changes, no TEST training additions or cleanup targets.

**Ready to publish: NO.** Remaining implementation: service-job/canonical server selection focus and proven sport attribution for account-only human/throw/catch evidence. Remaining affected-role proof: populated player/coach identity → unsaved focus → saved reload, positive chat and matched-video playback, plus the separately required Monday coach Use-instead flow. Specific TEST-user session approval remains unavailable; owner-empty screens and safe refusals do not replace those proofs. Pitching thresholds stay intentionally unset until supplied. Speed/power relative progress is not an attainability prediction.

Earlier sections below are dated history, not the current verdict.

## October 26 06:36 owner standards — current verdict

| Requirement | Result |
|---|---|
| Editable standards | PASS: baseball and softball defaults saved/read back; owner-only existing settings writes/audit retained |
| Contact | Built: K/PA in AB windows; strict level thresholds, linked complete-pitch whiff/zone rates and early-whiff counts; missing parts stay unknown |
| Power | Built: HR/AB ≥ .100; HR-only; HR/K ≥ 1 chase, zero K never an infinite ratio |
| Speed | Built: existing registered speed test/Speed Lab and handed home-to-first grade adapters; sprint/steal/Royal timings remain record-only |
| Arm | Built: position velocity or catcher pop plus human arm accuracy, dated pain and canonical ledger rest; missing health sharing/check-in cannot certify elite |
| Defense | Built: position-matching coach/scout human fielding grade; scored-chance windows supporting, never substitute for human grade |
| Pitching | Built: explicit BF game total, numbered final batter outcomes and complete-history confirmation; BF windows; elite K/BF, BB/BF, HR/BF settings remain intentionally unset |
| Bunting identity | Built: owner AVG/.050 lefty/.025 lacking-power/65-speed defaults; lefty power goal remains starting guidance; legal volume/rest/side limits retained |
| Steering | Built: judged-only existing ready-slot priority and transient goal-rank overlay, General/coach panel and caller-scoped chat context; no dose/day/saved-plan mutation |
| Verification | 553 files / 4,638 tests PASS in 16 bounded groups; changed groups 0/5/6/7 refreshed; preview OK 06:55:17 UTC |

Inspected loaded 390×844 owner settings/General screenshots and reload. Actual source RPC succeeded; unconnected read denied 42501 with no data. Authenticated deployed chat rejects empty messages (400); **this is not positive chat guidance proof**. Exact owner softball settings save/readback succeeded. Three authorized additive changes (0127–0129) and affected hammer-recall/hammer-chat/plan-swap deployments completed; frontend remains preview-only. Zero hosted TEST athlete/prescription/game/log records created, so no TEST cleanup targets. Kept personas unchanged; no publish, cron or iOS changes.

**Ready to publish: NO.** Canonical server daily generation does not yet hydrate the new identity focus; the transient goal overlay currently reaches the browser unsaved skill ordering, not weekly target weighting. Those are unfinished implementation connections, not merely proof gaps. Affected player/coach populated identity → future unsaved plan → canonical saved reload, positive chat response and matched-video playback remain unverified: specific TEST-user session approval is unavailable. The separately required Monday coach Use-instead proof still has no proven same-category source/flow. Source-complete health flag coverage and account-only multi-sport human/throw/catch provenance need affected-role verification; no invented elite status or test records replace these proofs. Speed-versus-power steering compares progress toward owner standards, **not a forecast of attainability**. Pitching cutoffs are intentionally unset until the owner supplies them; that alone does not prevent showing BF progress.

Evidence: `/tmp/browser/identity-standards/` (loaded screenshots, source denial/readback, bounded suite and final-summary.json). Owner-empty evidence is explicitly not an affected-player positive proof. Earlier dated sections below remain history, not the current status.

## October 26 run (3) — final batch verdict: NOT COMPLETE

- Added one evidence-bounded guidance projection shared by mastery presentation: below-standard contact requires complete-window source IDs, speed OR power can satisfy the stated requirement, and missing arm/defense/attainability evidence never becomes an overall weakest-pillar claim. This is observational guidance only; **not** the requested completed plan/goal/chat integration.
- Corrected Royal timing readback to its actual saved timer1/timer2/master objects: elapsed milliseconds convert to seconds, video-sync/manual provenance stays visible, unknown scalar fields are not graded or treated as events. All retained raw speed evidence can be expanded on the mastery panel; grades and qualifying sample counts remain separate.
- Complete current suite **551 files / 4,603 tests PASS**, all 16 bounded groups, zero failed tests. Preview build **OK at 05:58:42 UTC** after the final source edits. Inspected 390×844 development-focus screenshot; real owner evidence correctly says Need more data, reload retains guidance, no page errors. This is not a player-positive proof. No TEST rows added; no cleanup targets; no publish, backend redeploy, cron or iOS changes in this run. Frontend/source changes remain pending publication; prior authorized backend activation remains live.

| Area | Final batch status |
|---|---|
| Twelve exact bunt drills | Active; prior activation proof retained |
| Approved drag/count teaching | Shared cards/game/chat; prior proof retained |
| Knowledge/video suggestions | Shared approved teaching/tags; actual matched-video player playback unverified |
| AB/HR identity | Complete-window arithmetic and rollover tests pass |
| Fielding identity/settings | Scored chance windows implemented; elite defense standard absent |
| Pitching identity | Incomplete: no completed-BF recording source; never substituted pitch count |
| Speed identity | Partial: registered tests grade; other timings recorded only; all-source sport/method certification incomplete |
| Arm/weakest-pillar steering | Incomplete: no combined accuracy/health/position judge or complete plan/goal/chat integration |
| Bunting identity rules | Policy/tests and live client input built; unset HR/speed cutoffs and affected-player proof remain |
| Suite/preview/checklist/guide | Full suite and preview pass; updated; positive player/coach/Monday proofs remain open |

**Ready to publish: NO.** The build is not finished: BF recording, full speed/arm/defense judging and weakest-pillar plan/goal/chat integration remain unimplemented. Owner HR/contact/speed-minimum thresholds remain unset, and authenticated affected-player/coach/bunting/video/chat readbacks plus Monday Use-instead proof are unverified. No invented thresholds, BF, elite status, attainability or successful proof substituted for these gaps.

## October 26 run (2) — fielding and area windows

- Added independent owner-adjustable pitching BF and defensive fielding-chance windows. Blank triplets inherit the existing 100/500/500 opportunity cadence. Partial, nonpositive, fractional or incomplete-transition triplets are rejected; overlapping HR cutoffs are rejected before saving. Additive settings/evidence changes applied and read back; no schedules, saved plans or athlete rows changed.
- Defense now reads canonical completed, sport-matching game plays through the existing training-authorized source reader. Only explicitly scored errors, assists or putouts with provenance advance chances; assist plus putout counts once. Unknown scoring/provenance or conflicting duplicates block certification, never become successful plays. Latest completed chance windows replace older evidence, display dates/sample/errors and remain measured, not automatically elite.
- Balls-in-play evidence now uses the complete AB window, excluding HR and strikeouts, with the configured owner contact threshold; missing threshold remains Need more data. HR power retains HR-only evidence.
- Pitching inspection found **no canonical completed-batters-faced record**: pitch count, pitch perspective and pitch-result grouping cannot substitute. The shared answer and display explicitly preserve Need more data; independent BF windows are ready but no BF outcomes were fabricated. This requires a proper BF recording source before pitching identity can be completed.
- **119 tests / 6 files PASS** for new settings/fielding/contact and affected bunting dependencies. Includes 100/500/2,000/2,500 chance boundaries, identity changes, deduplication, null/provenance refusals, independent cadences and exact threshold contact arithmetic. Prior full suite retained, not rerun. Preview build **OK 05:52:19 UTC**.
- Inspected 390×844 Coaching Console and The General screenshots; real owner source readback returns the new defense array and explicit unavailable BF, reload preserves the panel, no page errors. Read-only browser flow, **zero TEST training writes**, no cleanup targets. This is not affected-player positive proof; no test credentials were available, and owner results do not certify player or coach-role flows.
- Still OPEN: source-complete speed grading, position-specific arm judge, defense elite standard, weakest-pillar integration into safe plan/goal/chat selection, owner HR/contact/speed-minimum cutoffs, actual athlete/coach/bunting/video/chat proofs and separately blocked Monday coach Use-instead proof. **Ready to publish: NO — these integrations and positive proofs are unfinished.** No publish, cron or iOS changes; backend evidence/settings live, frontend changes preview-only until authorized publishing.

## October 26 05:16 academy continuation — partial

- Twelve exact owner bunt drills activated through authenticated Vault save-draft/make-live and read back active, effective October 26. Existing saved plans untouched. The original gamer_bat requirement was missing from common owner gear; fixed its shared mapping without removing the bat requirement.
- Approved Bunting Mastery now supplies shared wording, drag-bunt early-count/two-strike guidance, card how-to, video vocabulary and both chat paths. Game form and saved pitch display flag an entered two-strike bunt without changing its result. No new unapproved teaching was added.
- Shared opportunity windows implement 100 AB through 500, then 500 AB forever; latest complete window and exact HR/hit/AB evidence drive live bunting input. Null completed window supersedes the old two-game heuristic. Owner settings have blank HR/contact/speed-minimum cutoffs rather than fabricated values, with server owner-only writes and audit.
- The General and coach summary mount the same identity projection; server evidence reads recheck narrow training access and sport, return no private analysis/health, and include tests, sport-tagged sprints, game home-to-first/runs/leads and Royal timer data. Unknown or ungraded methods remain record-only. Account-only baserunning splits lack sport provenance and are not borrowed; full all-source speed certification is still OPEN.
- OPEN: actual pitching BF/defense-chance identity, full arm/contact judges and weakest-pillar goal integration, source-complete speed/steal timing certification, owner HR/contact/minimum cutoffs, athlete positive bunting/game/coach/chat readbacks and Monday Use-instead proof. No claim of complete A/B/C.
- Applied additive settings and scoped evidence changes; exercise-vault, hammer-recall, hammer-chat and regenerated plan-swap redeployed under named authorization. No publish, cron or iOS changes. No TEST training data added; owner content/settings are real authorized changes, not cleanup targets.
- Full suite: **549 files / 4,580 tests PASS**, ten bounded groups plus the newly added source-projection file; refreshed settings/source tests **4 PASS** after an observed save-confirmation/readback race was corrected. Latest preview build **OK at 05:44:45 UTC**. Inspected 390×844 loaded drag-drill, saved owner settings and The General screenshots. Owner settings save/readback preserves 100/500/500 and unknown cutoffs; own evidence returns Need more data; unrelated TEST-player evidence is denied; no browser page errors. Approved MLB/AUSL owner principle saved once, then read back without duplication.
- Affected-player end-to-end proof remains **UNVERIFIED**: explicit TEST-user session approval was unavailable in this run. Owner empty-history screenshots are not a player-positive or coach-role proof. No TEST prescription/log additions were made, so no training cleanup was needed. Evidence: `/tmp/browser/mastery/readback.json`, screenshots and `/tmp/mastery-suite/summary.json`.

**Ready to publish: NO — the remaining identity/source integration and affected-player proofs above are unfinished; Monday coach proof remains separately open.**

## October 25 evening owner request — partial, not release-ready

### Run (2), closed at 23:53 UTC Sunday

- Finished proofs were retained. Bunting now composes through the existing Today builder, replaces swings one-for-one inside a legal hitting skill slot and never replaces owner/prep/game-speed work. Existing saved days are not retrofitted; saved side-specific bunt JSON is restored on reload. Whole off-season catalog eligibility requires all four permitted quarters.
- Actual entered Today task attempts/successes now join canonical practice/game evidence, explicitly scoped to sport; unknown successes and prescribed attempts do not become outcomes. No new ledger or training write path was introduced. Power-goal and honest per-game hit/AB samples reach the builder. **Explicit speedy/lacks-power/left-power fact capture is still missing**; no thresholds or traits were invented. Push work remains excluded without a sourced LHP fact.
- **60 actual-builder eight-week scenarios** cover both sports, both tiers, R/L/switch and baseline/under-.300/power-goal/speedy/lacks-power fixture cohorts: two weekly sessions normally, three for the named affirmative traits, minimum 5/7 attempts, maximum 20, both switch sides, rest protection and unchanged hitting-volume budget. These do not prove every game/phase schedule supports the target frequency. The final focused tests passed **81 assertions**, with **70 builder assertions** refreshed after the switch-side check.
- Inspected 390×844 actual-builder fixture screenshots: distinct readable focus, attempts/successes entry, Save & exit leaves the card open, Start resumes, reload restores **7 attempts / 3 successful bunts**. This is local fixture persistence, not authenticated athlete/server save proof. Evidence is in `.lovable/proofs/oct25-evening/bunting-generated.*`; screenshots were captured under `/tmp/browser/bunting-run2/`.
- Thirteen additive side/type/fundamentals video taxonomy rows were applied under Camryn Williams' named authorization and read back through the authenticated owner app. Exact tagged-video matching for entered unsuccessful work is implemented/tested. Existing videos were not assigned new tags. Matching-video player playback remains unverified. SQL record: `docs/owner/applied-bunting-video-tags-oct25.sql`.
- **Live vs pending:** `exercise-vault` and the regenerated shared-builder `plan-swap` were redeployed successfully. Twelve owner Vault definitions remain **Off**; live `wk_movement_catalog` has **zero bunt rows**. The player program therefore remains inactive, not complete. Vault activation/edit/undo/catalog lifecycle and next-plan availability still need full implementation/proof; no switch was silently changed.
- Complete suite **546 files / 4,550 tests PASS** in ten bounded groups. A timer test's ambiguous Stop selector matched work and rest controls; the selector was scoped to the work clock, and its entire 60-file/741-test group reran successfully. Latest preview: build OK.
- No hosted TEST training rows were added and no personas changed. Prior global cleanup certification is retained, **not rescanned**. No publish, cron or iOS changes. Monday coach proof was not attempted: actual UTC is still October 25 and canonical Monday plans are required.

**Run (2) verdict: Ready to publish NO — pending activation/fact capture and real athlete/purchase/rest/video/game/practice/coach readbacks.**

### Continuation at 23:30 UTC, Sunday

- Retained finished purchase/layout proofs; no repeated implementation. No publish, cron or iOS changes.
- Shared rest identity now recognizes `recovery`, `recovery_day` and `off_day` in the generator's final certifiers and Today readback. The authorized generator redeploy succeeded; affected-player trimmed readback remains unverified.
- Actual rendered-entry audit passed all **989 live catalog declarations** and **2,474 generated physical drill appearances**: warmup 910, strength 224, hitting 168, throwing 452, recovery 280, speed 140, defense 216, baserunning 84. Additional rendered checks cover recovery/mobility/conditioning/speed/coach/Swap/assessment/test entry paths. Counted anti-rotation presses now remain counted rather than becoming timed because of their name. This does not prove every future owner-authored item or catalog dose is valid.
- Focus Save & exit starts the saved set's canonical rest before returning to the open card; reopening preserves rest and avoids duplicate saves. A failed in-flight save cannot exit as though it succeeded. Standalone rest now supports pause/resume/restart/stop-reset; guided rest exposes none of these editable controls. Actual work timers retain active elapsed hundredths. Automated tests and inspected 390×844 fixture screenshots passed; actual athlete save/reload remains unverified.
- Twelve exact side/type bunt definitions now open in the authenticated owner Vault, initially off. The right-handed squeeze editor was inspected at 390×844 without saving. Canonical practice blocks and game pitches support explicit side/type/success; unknown success remains unknown. Nullable game columns were applied and read back; `exercise-vault` and `session-insights` redeployed under the named authorization. Game/practice hosted write/readback remains unverified.
- Client hitting video taxonomy includes all side/type labels and fundamentals. Server taxonomy/owner video assignment and struggling-player matching remain unfinished. The bunting program is **still not wired to Today**: current entitlement, legal hitting weekdays, per-game batting samples and explicit speed/power facts must reach the existing hitting block without invented work or traits. Existing eight-week policy simulations are not live integration proof.
- Full suite completed in ten bounded groups, all exits zero: **542 files / 4,470 tests**, plus the newly added RestTimer file's **2 passing tests** (543 files / 4,472 tests total). The all-source render audit was split into bounded sport/position cases after a timeout; its final independent run passed. Preview's latest entry is build OK.
- No hosted TEST training records were added. Three kept personas unchanged; prior global cleanup certification retained, not rescanned. Monday coach proof remains time-gated: the clock is still October 25, not October 26; no waiting work will run after this turn.

**Continuation verdict: Ready to publish NO — Today bunting integration/video matching and real purchase/rest/coach/log readbacks remain open.**

- Unlock Now explicitly opens plan choice; pending enrollment no longer intercepts pricing/checkout. The regular Demo remains unchanged; the enrollment walkthrough still serves training onboarding (see archived-features.md).
- Training-standard days/workout counts moved immediately below the phase heading. Day changes, row reductions and substitutions are collected in Before you start; duplicate exercise/lift explanations removed. Lighter-day acknowledgement now writes from that drawer.
- Rest defect confirmed from real October 25 saved rows: `allowed_class=none`, day type `recovery`, but Arm-Care Band Full Chart, Resist-Turning Press and Med Ball Rotational Shot-Put remained. The trunk primer ran outside the rest guard, generic mobility selection admitted loaded work, the final check removed loaded lifting only, and the local block builder could reopen defense. New final-save/final-block soft-recovery identity checks, canonical recovery_day spelling and rest-only warmup selection address these sources. **wk-generate-daily redeployed under the named authorization; existing affected player plans were not invoked or modified in this run, so live trimmed readback remains unverified.** Coach warning-accepted rows remain outside generator trimming.
- Eight-week block simulations: baseball/softball P/C/SS/CF/2B/1B/DH; final-save test removes disguised warmup/throw/bunt work. Existing warmup eight-week tests updated for recovery-day exception and pass.
- Work timers support Start/Pause/Resume/Stop/Reset/Restart; pause/reset/restart do not write a result, Stop/completion fills actual active hundredths. Inline and legacy timed entries share the timer. Guided rest remains a separate canonical clock; broader timer coverage remains open.
- Render-level warmup audit covers 121 declared warmup items and their dose variants plus eight generated warmup contexts. Rep-based warmups no longer default to seconds. **The requested all-source catalog/skill/coach/Swap/assessment/test render audit is not complete; the existing 964-row catalog fixture resolver test is not a live render audit.**
- At 390×844, isolated fixture screens verified countdown pause/resume/stop and exit leaving the regular card open with device-saved work. This is **not** authenticated player logging proof. Screenshots: `.lovable/proofs/oct25-evening/`. Signed-out pricing correctly reaches auth; new signed-up Unlock → checkout proof remains open.
- Bunting's exact side/type vocabulary, entitlement/frequency/dose bounds, side-specific outcome arithmetic and 72 cohort simulations exist as **unwired pure policy only**. Vault content, canonical game/practice outcome persistence, video taxonomy, player program integration and live proofs remain open. The prototype uses repeated low-average game observations with visible counts, not a claim that two games establish a reliable average; sample/scaling integration must be reviewed before use.
- Bounded source suite: 537 files / 4,351 tests passed after affected batches 5 and 9 reran. Two later-added render/bunting files add 78 passing tests (539 files / 4,429 total), with final logger/focus tests rerun. Preview log: build OK. No hosted TEST records added, no migration, publish, cron or iOS changes; prior global cleanup certification retained, not rescanned.
- Monday live coach flow remains time-gated until UTC October 26 and canonical Monday plans exist. Unknown age/legal/access, stale phase and runnable-measure refusals remain approved hard blocks.

**Ready to publish: NO — bunting integration, exhaustive render/timer/focus coverage and authenticated purchase/coach/rest readback proofs remain unfinished.**

**Global TEST cleanup: certified YES — retained prior certification; not rescanned this run.**
**Ready to publish: NO.** The requested live hitting send → Use instead → focus log → reload → all-surface readback remains unverified. The unpaused college TEST player opens normally but has Warm-up, Lift/Mobility and Recovery, not a hitting card. Its Available Days editor controls the separate six-week workout, not selectable hitting weekdays in Hammers Today. The existing off-season Today template excludes Sunday hitting. No source card was fabricated and no generator or schedule rule was changed to manufacture a pass.

## Current evidence

- Full app suite: 534 files / 4,329 tests PASS in four bounded groups (1,279 / 1,128 / 1,066 / 856 tests). An obsolete source-text hard-block assertion failed initially and was replaced with a behavioral nonfabrication test; its entire 134-file group reran PASS. Missing-check-in/load-limit Okay/Cancel cases cover adult/minor and coach/player actions. Actual loader tests verify warnings permit acknowledgement without inventing a workload ledger total.
- Canonical season judge still rejects in-season eccentric-overload work for Hammers-generated plans. Coach prescription envelope converts the existing season finding to a recorded warning; tested.
- Missing check-in, missing training experience and missing/invalid exercise workload or daily workload-limit values now warn. Readiness and limits remain unknown, never fabricated. An unknown ledger total remains unchanged on commit.
- Missing-facts override persistence update retained; coach-rx-safety redeployed with extended experience/workload warnings. The standard prescription/audit/behavioral-input trail accepts the new warning class.
- Phone-sized app inspection: college TEST dashboard and training settings opened at 390×844. Paused Swap TEST accounts remain gated; identity, legal state and pause state were not changed. No requested API-password login or positive replacement/log/readback proof was completed.
- No hosted TEST schedules, snapshots, prescriptions or workout logs were added this run. Nothing needed restoration or deletion. One result file: `.lovable/proofs/coach-final-oct25.json`.
- Build status is recorded in the result file after the final checks. Stored learning input is not proof of an actual learning effect.

## A. Human-only checks before publishing

These five owner checks are not blockers for the readiness verdict:

1. Tex completion on a real phone.
2. Real parent signature flow.
3. Five B exercises on a real plan.
4. iPhone Safari links.
5. Original iPhone HEVC clip upload.

## B. After publishing

1. Extra Monday October 26 no-warning send → Use instead → focus → readback check on a real training day. This follow-up does not replace the still-open required positive proof above.
2. First nightly batch: confirm zero new rows for parked accounts.
3. Monitor coach-rx-safety and plan-swap failures for the first week.

## C. By-role guide

### Player

Your first new plan waits for its identity evidence before saving a focus. A saved focus keeps its recorded sources and matching skill order when you reload; newer safety reductions still win. If identity evidence cannot be checked, the page does not claim a new focus was saved. A failed connection is not counted as a successful save; a later successful request can save normally.

Judged identity now chooses the existing weekly priority opportunity, only when your phase, equipment, available days and access permit it. It cannot add a second boost or change a saved day. New self-built plans can retain their sourced day-focus explanation in exercise details; that explanation does not add reps or authorize an unavailable exercise. Current-day arm throws that require rest prevent an elite-arm label.

Your academy now separates K / plate appearances, misses / swings and in-zone contact / in-zone swings. Missing pitch totals or locations say Need more data while K can still be judged. Record every pitch and confirm the complete pitch total for each finished plate appearance. Power counts only HR in the last complete AB window, with the HR/K chase. Speed uses existing speed-test/home-to-first grades; other timings stay recorded-only. Arm requires position measurement, human accuracy and no active dated pain/ledger flag; defense uses a human fielding grade. Pitching game logs accept batters faced and numbered final batter results; confirm a complete outing only when every batter is logged. Unknown pitching cutoffs stay Need more data. Judged focus can prioritize existing future safe work, never rewrite today's saved plan.

When bunting is logged in practice or a game, enter the actual batting side, exact bunt type and Yes/No only if success was observed; Not entered stays unknown. The twelve bunt drills are active for future legal unsaved hitting work; saved days do not change. Drag bunts target the 3B line early in the count, never with two strikes; game logging flags two-strike attempts. Your mastery panel shows the last complete batting window, home runs, balls in play, scored defensive chances and source-labelled speed evidence; missing thresholds/evidence say Need more data. Pitch counts are never shown as batters faced. Exiting focus after a successful set preserves its required rest; Start resumes that rest rather than saving the set again.

Recorded speed evidence expands separately from qualified grades. Royal timer values are seconds converted from saved milliseconds and remain recorded-only, with manual/video-sync labels. Development focus never calls contact the overall weakest pillar when other required pillars are unknown.

Coach workouts offer Use instead, Add alongside, Save for later and Use today where applicable. Use instead requires real saved work of the same category and never spills into another category. Replaced work is marked “Replaced by coach workout”, not missed. Read every warning and its exact date and measured numbers; Okay acknowledges, Cancel action saves nothing. Missing-fact warnings explicitly say what was not checked, without making up a score or cap. Accepted warnings appear in the card’s “Coach override: …” Because line. You can still decline the workout.

### Coach

New evaluations save the selected sport. Throwing and catching rep entry requires choosing Baseball or Softball before Log rep opens. Earlier records without a saved sport are preserved but cannot certify a sport-specific identity; changing the player's current sport never relabels them. Canonical training/health sharing still applies.

Identity priority uses the same guarded weekly opportunity as player goals; no invented extra day or dose. A dated missing arm check-in stays Need more data, and current-day ledger rest is included. Background-job focus and full affected-player saved readback are not yet certified. The server's existing ranked movement selector controls lifting, not skill work; identity does not change that ranking or lifting doses. Server skill-selection steering is not implemented and is not claimed complete.

Coaching Console has editable per-level contact ratios, HR power/lefty/lacking-power ratios, low-average and elite-grade standards, the HR/K chase and optional pitching K/BF, BB/BF and HR/BF cutoffs. All ratios use 0–1 inputs. The player/coach mastery panel names evidence, sample/window, date and owner standards. Human fielding/arm grades must match the position; self-reported grades never certify them. Health facts remain behind existing health consent. Chat reads the same caller-scoped identity judge, not an inferred grade from partial recall.

Owner Vault now exposes twelve active side-specific bunt entries with attempts/successes measure and the owner's exact instructions. Existing saved work stays unchanged. Coaching Console has sport-specific batting windows plus separate BF and fielding-chance windows, and HR/contact/speed-minimum settings. Leave all three area-window fields blank to inherit batting cadence; choose all three for an independent cadence. Leave unknown cutoffs blank. Coach summary reads the same source-labelled mastery projection through the server's training gate; missing pillars are not certified. Scored defense is measured evidence, not an automatic elite claim.

Send, schedule, edit, reschedule and resend share the warning acknowledgement flow. Pain/injury, arm limits, age, phase/season, recovery, workload, dose-range and equipment guidelines warn rather than silently changing your prescribed dose. For coach prescriptions only, in-season eccentric-overload findings also warn; Hammers’ own generator remains prohibited from prescribing them in season. Under-18 pain/injury, arm-limit and age findings require a reason of at least 10 characters and the existing linked-parent notification; adults use plain Okay. Acknowledgement is not medical clearance. Sent workouts shows the override trail and canonical performed work when logged.

### Organization

Organization-admin and team sends check each connected, assigned player separately. Each warning belongs to its recipient and exact workout date; every player retains their own choice. Parked/system accounts remain excluded from ordinary rosters, search, statistics and scheduled jobs.

### Records and remaining hard gates

Every accepted override records who, when, action, rule, player, date and prescription in the prescription, audit and behavioral learning input; activated rows retain Because text for canonical readers. Consent, connection, legal access, same-category and impossible/invalid dose or measure remain hard gates. Unknown age still refuses because legal/minor parent handling cannot be established. Unavailable player records/sport, incompatible saved-phase revisions, unavailable/unreviewed catalog identities and missing required contact/count/distance declarations still refuse; these access, consistency and runnable-measure protections were not bypassed. Missing training experience and CNS prices now warn, preserving unknown ledger totals. The broader all-unreadable-facts request remains incomplete for the listed data-consistency cases. No publishing, cron or iOS changes were made.
- Oct 26 00:10 UTC run (4): full suite 562 files / 4,866 tests PASS in bounded batches; Monday coach Use-instead proof not run (plans only just eligible); bunting activation + trait source await owner. Ready to publish: NO.

## Oct 26 16:40 UTC — identity additions status
- Full suite: 560 files / 4,695 tests PASS. Preview served /progress at 390x844 with zero page errors (16:29 check).
- Built: pitching starting standards (both sports, all levels, editable); pitching game-log storage; practice swing-and-miss log on The General (self-only, owner weights, save→reload proven as owner, proof row removed); natural-first strategy and minor nutrition guard (rules + tests only).
- Open: pitching game-log entry screens; pitching judgments in identity/coach views; strategy steering across lifting/speed/skill/vision/nutrition/sleep/6-week plan/recaps/chat; goal-progress card; practice log proof as a real player; philosophy as a versioned owner principle.
- By-role (section C addition): Player — The General shows "Practice swing-and-miss" to log type, speed, distance, mix, swings, misses; game at-bats still decide identity. Coach — sees the player's identity panel without the practice form. Owner — edits pitching starting standards in the Coaching Console.

## Oct 26 20:50 UTC — identity finish list status
- Done: one shared development strategy (plan focus, food/sleep, The General, coach views, Hammer chat, coach six-week summary, player six-week recap); goal-progress card; identity panel per pillar with window/sample/source/"Need more data"; pitching line entry and per-stat judgments (baseball and softball separate); owner philosophy saved as versioned principle v1.
- Proof: full suite 562 files / 4,705 tests passed; preview /auth 200; 390×844 owner checks (practice log save/reload, goal card, pitching section, recap strategy line) with no page errors.
- Open: TEST player and democoach sign-in proofs (approval unavailable, no TEST password secret); owner decision on whether "indie pro" uses pro standards.
- By-role: Player — The General shows identity pillars, goal card, practice log, strategy; games where they pitched have a pitching line. Coach — same identity, goal card and strategy line in the athlete view and six-week summary, no practice form. Owner — edits starting standards and the versioned philosophy in the Coaching Console.

## Oct 26 (22:00 UTC) — level map + single pitching cutoffs
- Level → standards: every saved level in both sports maps (pro incl. rookie/low_a/high_a/aa/aaa/winter_ball/foreign_league/free_agent/wpf/npf; college incl. cape_cod/summer_generic; HS/youth incl. hs_varsity/hs_jv/middle_school/little_league/travel/rec). New level choices "Pro team academy" (pro) and "Youth academy" (youth); a saved plain "academy" stays "Need more data" until re-answered.
- Removed "Owner pitching elite cutoffs are not set" and the three empty K/BB/HR cutoff fields; the pitching pillar reads the starting standards.
- Full suite: 564 files / 4,716 tests passed; preview build OK.
- Pending: the server plan bundle is regenerated in code but not redeployed (no redeploy authorized this run).
- Ready to publish: YES (player/coach role views are owner human checks).

## Oct 26 (23:45 UTC) — plan builder redeploy + cross-sport audit
- Redeployed (owner-named): wk-generate-daily, hammer-chat, hammer-recall, wk-daily-plan-job, plan-swap with the regenerated block bundle (new level map + pitching starting standards). Plan builder ran clean for the TEST pitcher (phase 200).
- Cross-sport audit: central surfaces already branch on sport (geometry 90/60 ft, mound/circle, pitch types, arm slots, grade curves with real softball anchors, video sport gate, chat knowledge, catalog sport_scope). Catalog: 0 untagged of 1,001 active items.
- Bleed fixed (1): repeat_90ft_bb no longer prescribes a base for softball (runRest.ts).
- Owner-decision table (softball uses baseball-set numbers, kept working): contact K%/whiff%/zone contact cutoffs; power HR/AB ≥ .100; bunting identity cutoffs (.300 AVG, HR/AB .050/.025).
- New cross-sport matrix test: 17 tests incl. 8-week plans per program (Complete Pitcher, 5Tool, Golden 2Way) × both sports asserting zero cross-sport words/items.
- Full suite: 4,716 app tests + 28 backend tests passed; preview build OK.
- Oct 27: softball hitting starting standards (contact by level, power HR/AB pro .067/college .125/HS-youth .100, bunting half/quarter) live in identity; baseball unchanged; wk-generate-daily, hammer-chat, hammer-recall redeployed.
