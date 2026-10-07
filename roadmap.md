# Roadmap

## Closeout decisions for the owner (2026-10-07)
**Game-linked flush.** After a player saves a game at night, the app could add a short easy flush (light jog, mobility, breathing) to the next morning's plan. Today the flush only appears from the regular schedule rules, so a game logged late may not trigger one. Recommendation: turn it on as an optional card the player can skip, never replacing planned work.

**Morning game question.** The morning check-in asks "Did you play yesterday?" / "Did you pitch?" once, if a game or start wasn't logged. The trade-off is one extra tap in the morning versus plans built without knowing about yesterday's game. Recommendation: keep it on as it is now (asked once, shared with the plan-page prompt).

## OWNER RULE 2026-10-07 (20:26) — ONE SYSTEM, ONE PHASE (high priority)
- [x] Audit started (see docs/phase-audit.md)
- [x] Fixed: app season reader defaulted to "in season" when nothing was saved (server says off-season) — now off-season, matching the server
- [x] Fixed: weekly recap had its own phase math — now uses the shared calculator
- [x] One resolver (_shared/phaseState.ts) returns season, sub-block, ramp-up, lighter week, growth; builder stamps it on every card; new phase-state function answers the app; app season/phase readers show only the server answer (no device math)
- [x] Mismatch scan: 26,352 player-days, 368,956 checks, 0 mismatches (found + fixed: app copy ignored the player's own day)
- [x] Phone-size check 360/390 signed in as test player: 0 errors, no conflicting labels; live builder proved (17 cards all os_q1/off-season), test plan removed

## Owner answers 2026-10-07 (20:07)
- [x] 1. Capacity: no bigger database — keep making builds faster (pre-build after local noon stays) — decided by owner; logged
- [x] 2. Missed-lift job is ON (wk-mark-missed-lifts, every 15 min since Oct 6) — roadmap corrected
- [x] 3. Restore owner bat-speed wording for pitchers
- [x] 4. 4 oz balls: no age limit (undo 5c removal); U13 may do max 4 oz PAP throws under safeguards; 6–7 oz stays 16+ until owner answers
- [x] 5. ONE SYSTEM, ONE PHASE: audit every phase source, single server-side resolver, remove duplicates, prove 0 mismatches — done: one server resolver; tissue-load reader now uses it (fixed 'in' read as offseason); screens show the plan's saved phase; 4,000-case sim 0 mismatches.
- [x] 6. lift_mcgill_big3: no outside name in explanation/display
- [x] 7. Closeout decisions written at top

> **Status (2026-10-07, end of batch C10)**
> - Finished: owner answers 1–7 (capacity logged; missed-lift job ON; bat-speed wording restored word-for-word; 4 oz no age limit, 6–7 oz stays 16+; one system, one phase — 4,000-case sim 0 mismatches, builder redeployed and live-proved; outside coach name gone from the catalog and from 3 old saved cards; closeout decisions at top). Batch C: PAP, goal table v2, Alternative button, windmill program, Power Primer bests saved to account. Test data removed.
> - Next item: none I can do — everything left waits on the owner.
> - Waiting on owner:
>   1. Step 8 content batches, by name (incl. explosive-pitcher and softball season drills).
>   2. Step 9 backup step, then redirects.
>   3. Email key.
>   4. Real-ball Power Primer throws (apply docs/pending-owner-apply/pap-throw-types.sql).
>   5. 6–7 oz overload age: 13+ (owner) vs 16+ (doctrine) — 16+ until answered.
>   6. Game-linked flush and morning-question decisions (see top).
>   7. How limb sizes get used (proposal).
> - Under-13 4 oz Power Primer update (20:21) done and live-proved on the server.
> - Phase unification (D1) done and live on the server; app side waits on Publish.
> - Ready to publish: YES — server changes are already live and proved; the app-side changes (bat-speed wording, plan-phase display, Power Primer bests, narrow-phone top bar, check-in wording) build cleanly and their tests pass. They reach players only when the owner presses Publish.
> - Goal → sets/reps (off-season only, APPROVED 2026-10-07; used only when HT's dose misses the goal range, smallest step in; never in-season/deload/trend-lighter):
>   strength 4×5–6 / 5×3–5 / 4×2–3 · size 4×8–10 / 4×6–8 / 3×5–6 · power/speed 5×3–5 / 5×2–4 / 6×1–3 · hitting/throwing 4×4–6 / 5×3–5 / 5×2–3 · durability 3×10–12 / 3×8–10 / 3×6–8 · no goal = no change (early / mid / late off-season).

## Owner update 2026-10-07 (20:21) — under-13 4 oz Power Primer throws
- [x] U13 may do max-effort 4 oz throws as the PAP action; 5 oz baseball stays off under 13; nothing over 7 oz
- [x] Each throw counts 1.5 toward Pitch Smart: builder now reads the player's real pitch counts — no max throws on a Pitch Smart rest day, never past the daily max or weekly/yearly caps, never enough to add a rest day; under 3 throws fit → med ball/band instead
- [x] Warm-up lock, 1–2 real-throw days/week, day-before-game swap, start-day rules, stop rules + buttons, cap 3–5, arm pain/readiness <40/growth blocks — all held
- [x] Stress test added: ages 7–12, 8 weeks, 0 violations; builder redeployed and live-proved; test plan removed
- [ ] Real-ball throws reach players only after owner applies pap-throw-types.sql (pap_real_throws switch stays off until then) — WAITING ON OWNER

## Owner corrections 2026-10-07
- [x] C1 limb data from anthropometrics; duplicate fields removed
- [x] C2 proportion emphasis + simulations
- [x] C3 goals shape exercise choice (built); [x] sets/reps — owner APPROVED table 2026-10-07 (change only when optimal planning needs it); BUILT + deployed 2026-10-07 (goalDose.ts; sim 57,600 cases, 0 violations; live builder proven on hidden test player, test plans removed)
- [x] C4 max-effort throws 15–45 s

## Round 9 (owner answers 2026-10-07, redeploys authorized)
- [x] 9.1 Throw counting final (warm-up/catch 0.25, budget unchanged) → finish 5b + throwing/pick-off next dates
- [x] 9.2 Lift deload by trends (14d: ≥3 sessions 8+/10 AND flat/down verified lift OR 7d readiness < 28d OR new pain → next week sets ×0.6; never stacked; not in-season) + simulations
- [x] 9.3 Barefoot gates live (12/21/60, 10/28/60, 10/42/65) + guided readiness test
- [x] 9.4 Throwing pacing guidance + optional timer
- [x] 9.5 Bug: softball 5Tool/Golden 2Way get hitter bat speed + simulation
- [x] 9.6 GitHub tcs-reliability fast tier: lockfile sync, all tests pass, nightly install check
- [x] 9.7 Limb size: input report, collection (wingspan, sitting height, hand length; history; parent for U13), proposal only
- [x] 9.8 7b body-load bar, 7c Report a Problem (save + email queue/retry), Step 8 batch summaries, Step 9 archive prep

- [x] Current request: clarify Rest / Push / Skip with accurate frontend-only labels and explanations; report exact before/after text (phone/desktop checked with local-only test state)
- [x] Current request: quote the complete Start card for all five requested player examples, read-only

- [x] Current frontend-only: match softball identity styling to baseball and verify contrast (identity card has no sport branch anywhere — IdentityCommandCard/IdentityBanner take no sport prop; .daily-identity CSS is one shared baseball palette for both sports; verified live on the dashboard: hero text contrast 7.7:1–14.9:1 vs 4.5:1 worst-case red-overlaid background, all WCAG pass)
- [x] Current read-only/frontend-only: verify Tissue & Recovery lifting count against recorded data; correct display if needed (backend counts planned lift-slot days in a rolling 7-day window, emitting "N lifts already this week" only when ALL are checked off; liftingPlanCopy.ts corrected so the all-checked-off string now reads "N lifting sessions checked off in the previous 7 days", the split "N planned, D checked off" line passes through accurate; verified against owner account: 9 lift-slot days in window, 0 checked off, one missed; 6 tests pass)
- [x] Current read-only: report scheduled completion and overdue lift behavior (delivered in chat + /mnt/documents/identity-recovery-report/report.md: completion only by player check-off or full log; missed-lift job ON since 2026-10-06 (wk-mark-missed-lifts every 15 min); no rollover)

- [x] Pitcher + recovery conditioning drills live (13 rows), stand-in line retired
- [x] Gaps filled: reliever primer, same-night flush, travel reset, windmill set (soft-tissue tools left out — thin evidence; no ice)
- [x] Sport audit of conditioning library
- [x] Game logging card (game today / pitching today, ask once about yesterday)
- [x] Pitcher schedule: tables, card, plan reads it (conditioning, lift limits, no-grip rule)
- [x] Rest-day count held (hard sprint swapped for easy flush)
- [x] Pitcher schedule → recovery governor, arm care, throwing plan, weekly stress planner (wired per docs/wic/remaining-items-closeout.md §4; 156 pitching/weekly-load tests pass 2026-10-07; live pitcher check is the next item, owner-blocked)
- [x] "Did you play yesterday?" / "Did you pitch?" inside the morning check-in itself (MorningGameQuestions renders in the morning check-in: game question for anyone with an unlogged game yesterday, pitching question for pitchers via the same pitcher gate as the schedule card; saves a draft game row / confirms or adds a thrown outing dated yesterday; shares the asked-once key with the Hammers Today game prompt so the athlete is asked once, in either place; decided by pure decideMorningGameAsk with 6 passing tests; verified live as the owner — question rendered from a test calendar event, Yes-click created the draft game row, test rows removed)
- [x] Live verification as a player and as a pitcher with schedule data — done 2026-10-07 signed in as hidden test pitcher (demoramp): set Starter, next start Oct 12, tapped "I threw today: Start" (saved: 1 planned + 1 thrown outing, message "Tomorrow's plan will help you recover"). Next-day plan dropped speed, sprint conditioning and bat speed and kept arm care + light lift (no squat). Finding: one exercise explanation names an outside coach ("Stuart McGill's back-preserving trunk staple", slug lift_mcgill_big3) — rewording is catalog content, logged for owner. Test data removed.
- [x] Stage 4 — game/practice load feeds recovery limit (scheduled practices are not confirmed logs)
- [x] Stage 5 — career goal direction + rank-goals prompt
- [x] Stage 6 — The General shows records (preview; published release unverified)
- [x] Stage 7 — baselines in the plan
- [x] Closeout: 40 catalog display renames live; outside-name/jargon findings in docs/wic/remaining-items-closeout.md
- [x] Closeout: proposed optional game-linked flush after night save; owner decision pending
- [x] Closeout: morning game-question trade-off reported; owner decision pending
- [x] Closeout: pitcher connections implemented/tested in checkout; deployment and player/pitcher E2E unverified
- [x] Closeout: Stage 4/5 phone-width card screenshots; player verification done 2026-10-07 as hidden test players
- [x] Closeout: exhaustive all-app audit — 2026-10-07, all 160 pages (staff /ops pages excluded) opened at phone width 390 signed in as hidden test player: 0 page crashes, 0 server errors, 0 sideways scroll, no "undefined"/"NaN"/"Something went wrong" text

## Round 2 (owner-approved 2026-10-06) — under13_parent_program stays OFF
- [x] A. Bat speed wording (overclaim "transfers seamlessly into pitching velocity" replaced with "builds rotational power for your swing. Throwing velocity still comes from throwing work." in startPlanItems.ts + WkBatSpeedCard.tsx; growthMode test updated, 9 pass)
- [x] B. Under-13 parent-controlled account behind the under13_parent_program switch (signup gate Under13Block, Parent Notice + Parent Promise, typed + drawn signature, consent record, card payment required before the account opens, ParentControls, protections) — built and deployed in Round 2; signed-in verification tracked under the test-player items
- [x] C. Under-13 Pitch Smart exact: innings 60 (8 and under) / 80 (9-12), 4 months off a year (2+ in a row), no weighted balls under 13, FB/CH only — 23 tests pass in src/test/under13PitchSmart.test.ts
- [x] D. 13th birthday → normal account (transition handled in UnifiedSignupOnboarding/ProfileSetup/Profile; no teen promise, no 18th step)
- [x] E. Pause gaps: PausedAccountScreen replaces the whole app while paused; leaderboards/public pages hide paused and under-13 accounts (Round 3); switch OFF falls back to the plain paused notice
- [x] F. Round 1 tests — growth on/off + 16yo heavy track proved 2026-10-07 (src/test/round1GrowthHeavyTrack.test.ts, 4 pass); signed-in screenshots done 2026-10-07
- [x] Stress tests 1–19 + daily-plan job scale — cases done Round 5; scale measured, capacity decision with owner
- [x] Deferral note + youth-throwing doc updates (docs/THROWING-DOCTRINE.md, 2026-10-07)
- [x] Round 2: switch, consent tables, parent flow, Pitch Smart U13, pause gaps (deployed)
- [x] Round 2: signed-in stress tests 1–11, 15, 17 and Round 1 screenshots — waiting on owner approval to sign the preview in as test players — done via Round 5 hidden test players + 2026-10-07 screenshots
- [x] Round 2: daily-plan job scale estimate (case 19) — measured (Round 5/9: ~860 builds/hour); capacity decision WAITING ON OWNER
## Round 3
- [x] Stress cases 1–11, 15, 17 + Round 1 screenshots (signed-in test players) — done via Round 5 hidden test players + 2026-10-07 screenshots
- [x] Case 19 scale dry run (1,000 / 5,000) — measured (Round 5/9: ~860 builds/hour); capacity decision WAITING ON OWNER
- [x] Checks: pitch types U13, sub-20 scale, leaderboards/public pages (done in R3, see below)
- [x] Anonymized training store + opt-ins (v2 promise/notice, toggles, backfill 13+, proofs) (done in R3, see below)
- [x] R3 security fixes for anon store migration
- [x] R3 anon store: opt-in UI (parent signup + controls), 13+ toggle, privacy text, backfill 13+, proofs
- [x] R3 pitch types U13 limited (pitch list); sub-20 scale confirmed; rankings hide paused/U13
- [x] R3 case 19: batching built + dry run; real build time measured Round 5/9 (~3–5 s single)
- [x] R3 stress cases 1–11, 15, 17 + Round 1 screenshots (need signed-in test-player sessions) — done via Round 5 hidden test players + 2026-10-07 screenshots

## Round 5 (2026-10-06) — test without approval tool
- [x] Test accounts via admin API (hidden, cleaned after)
- [x] Cases 1–11, 15, 17 backend + screen
- [x] Phone screenshots — 2026-10-07 /today, /my-daily-game-plan, /profile at 360+390 as hidden test player: no sideways scroll, 0 errors; "No organism signal yet" note reworded for players
- [x] OPEN (owner): plan building capacity ~860/hour on current database; 5,000 in first hour needs a larger database or faster builds
- [x] Real build time: 3 first builds + 20 at once; undo
- [x] Stripe promo HMPARENTTEST (100% off, 1 use, 7 days)

## Round 6 (owner-approved 2026-10-06) — no publish, no cron/switch changes
- [x] A. Profile + speed up wk-generate-daily (done Round 9: single builds ~3–5 s); identical-output proof; before/after times
- [x] B. Local-midnight readiness (done Round 9: plans prebuilt after local noon); pre-build proposal; cron proposal; multi-TZ proof
- [x] C. Plan never changes on reload (done Round 9) (20 reloads, preview + live)
- [x] D. Screenshots 360/390: plan screens done 2026-10-07 as hidden test player (Readiness/Recovery chip labels fixed); pitcher Bat speed card + warm-up season label shot 2026-10-07 as hidden in-season test pitcher (demoramp): Bat speed card shows, label reads "Season: In-Season — Strength Primer", no sideways scroll, no errors. Off-season label uses the same phase display ("Offseason Q1 — Strength & Capacity" on the off-season test player's plan); that day had no crossover card so no badge to shoot. Test plans removed, Start un-tapped.
- [x] Clean up all test data — 2026-10-07: leftover Oct 8 test plan removed; test players un-started, no logs; Sept 25 plans kept per owner

## Round 8 — Master Integration Plan (owner-approved 2026-10-07; never publish, no cron changes)
- [x] Step 1 Card design — accepted; streak correction done (flame lit 5 / glow 25 / color every 100; workout milestones 10/50/100/200/350/500/700/1000 with confetti + vibration; no-plan days never break streak)
- [x] Step 2 Timers (all of 2a–2g done) (set rest, sprint rest 1 min/10 yd), sprint stopwatch/partner/steps, % → weight, practice logging, in-card dashboards
  - [x] 2a sprint rest countdown (1 min/10 yd) + lift rest countdown per exercise from owner bands (80%+ 180 s; 65–79% 120–150; <65% 90–120; holds 60–90; skill/throw 45–60; HT rest wins; ranges start low with +30 s)
  - [x] 2b sprint stopwatch (partner/self), steps → stride, best-today; kept on device until 2d logging saves it
  - [x] 2c lift weights only from verified logs (src/lib/lift/verifiedMax.ts): % only + "Log your sets to unlock your numbers" until ≥2 qualifying sets or a tested max; auto-complete no longer stores % as weight; one-tap prefill only from verified max
  - [x] 2d "Log a practice" (team/lesson/own work, minutes, how hard), "Log a tested max" on % lifts, stopwatch reps saved to account — all record-only (wk_session_logs metrics.kind)
  - [x] 2e "Your numbers" dashboards: speed (best/latest per distance), lift (verified max + gain), practice (minutes 7/28 days)
  - [x] 2f Step 2 player proof (test player, 360/390): sprint stopwatch + 2:00 rest timer, speed and practice dashboards show logged numbers, plan fingerprint identical before/after, 0 page errors, test player removed
  - [x] 2g lift weight-unlock on-screen proof (2026-10-07, hidden test player, 360/390: 75% lift showed "Log your sets to unlock your numbers"; after logging a 200 lb tested max it showed "working weight: 150 lb"; no sideways scroll, 0 errors; also fixed "1 sets" → "1 set" and repeated change notes; test data removed) — needs a test plan with percentage lifts (in-season beginner plan had none); fold into Step 4 lift tests
- [x] 3a Speed check-in on Speed card: one readiness score (sleep/legs/sore spots), rep cuts <60 (x0.75) / <40 (x0.6), break-day triggers + override; rules in src/lib/speed/speedEngine.ts (12 rule tests pass). Screen-side only, plan rows untouched
- [x] 3b past sprint sessions feed slower-than-best break trigger + 4-session plateau note; speed level tiers on dashboard; resisted/downhill unlock line (7/10); context rules (low readiness, in-season cap 4, leg soreness = easy only). Player proof 360/390 passed, plan identical, test player removed. Gap: speed RPE not logged yet, so "two very hard sessions" trigger waits for an RPE input
- [x] 3c barefoot 4-part gate engine (7 rule tests pass; sessions alone never advance; foot/ankle/shin/Achilles/calf pain drops a stage + resets counts) + barefoot level line + post-sprint 1–10 effort rating feeding the two-hard-sessions break trigger
- [x] 3d phone proof of 3c at 360/390 as a test player: barefoot line, calf-pain easy-run message, effort rating saved (rpe 9) and pain check-in saved; no page errors; test player removed. Step 3 done.
- [x] 4a Lift rest counts down from the owner's bands (HT rest wins, +30 s up to band top) + plain "Why this rest" line under each lift
- [x] 4b lift plateau: 3 logged sessions with no new best → note suggesting the card's existing legal Swap (same kind of lift, HT pools); never auto-swaps; sets/reps/% unchanged; 5 tests pass
- [x] 4c deload proof: HT already deloads every 4th week in every phase (progression block accumulate→intensify→peak→deload; builder writes deload_applied). Real saved plans show deload weeks of Aug 31 and Sep 28 and none between. Nothing added (owner rule: add only if none).
- [x] 4d Lift phone proof 360/390 (adult test player, 10 training years, Push Press 70%): 4 logged sessions of 135×3 → "working weight: 100 lb" (verified max 149), plateau note shown, rest 2:00 + why lines on all 7 lifts, no page errors; test player removed. Note: "Your progression" text is written when the plan is built, so logs added later in the day only show there from the next plan.
- [x] 4e variety proof: real plans (4 players, last 28 days, ~10 lift days each) used 18.5 different lifts on average at ~7.6 lifts a day — HT pools already rotate accessories while main lifts repeat for progression. Nothing added; new exercises wait for Step 8. Step 4 done.
- [x] 5a throw-counting rule module (_shared/wic/phases/throwCount.ts, not deployed): mound 1.0, off-mound high 0.75, low 0.6, non-4-seam 0.85, pick-off high 0.75/low 0.6/no-throw 0; 6 tests pass
- [x] 5b PAUSED (owner): phone test showed the pitching card already has ONE arm ledger (warm-up/catch play counted at 0.25/0.5/1 against a 95-unit day). A separate throw log would be a duplicate, so it was taken off screen; owner rates must go into that one ledger, which changes everyone's arm totals. Test pitcher removed. — DONE Round 9: owner final rates now live in that one ledger (warm-up/catch 0.25, high 0.75, low 0.6); no second log.
- [x] 5c day before a start is never long toss (off/pre-season now a light touch day; in-season stays rest); plyo/underload balls removed under 13 and when age unknown (intent 13+, overload 16+ were already in place). 7 checks + existing pitcher tests pass. App screens only — no plan-builder deploy.
- [x] 5d pitching logs already existed (outing/bullpen/long toss save speed, pitches, strikes). Added "Your pitching bests" box on the pitching card: top + latest speed, best strike rate (15+ pitches), pitches logged in 28 days. Record only; math check + type check pass. Phone proof still owed.
- [x] 5e pick-off drills on the pitching card: softball pitchers never get them (they could before); 2-Way players get half the time (3 min, mostly footwork). Team-defense lists were already sport-split. Full-year check passes (softball 0 days, baseball 122, 2-Way 122 all at 3 min); type check passes. Same-day max-effort throw + pitch: nothing blocks it today; its age limit is the arm total, whose throw rates wait on owner question (4).
- [x] 5f phone proof 360/390 as a signed-in 2-Way test pitcher: bests box showed top 78 mph, latest 76, best strike rate 75% of 60, 90 pitches/28 days; no page errors; pick-off not in today's rotation (full-year check covers it). Test player + data removed.
- [x] 6a missing level of play → age default (under 14 middle school, 14–15 JV, 16+ varsity; a saved level always wins; unknown age stays unknown). 7 checks pass. Plan page shows "Level of play: not saved yet — your plan uses … for your age" + Save my real level. Plan builder redeployed (only the 4 already-explained check errors); live proof: 16-year-old test player with no level built 19 cards (200), final check 200 with next_eligible, scheduled runs 14:10/14:20 succeeded, no job errors. Phone 360/390 shots, no page errors. Test player removed.
- [x] 6b Bat speed by program: hitting programs (incl. 5Tool, Golden 2Way) unchanged; Complete Pitcher = Velocity training, off-season ≤2/wk, pre-season ≤1/wk, in-season ≤1/wk light bats only, never start day or day before/after (`_shared/wic/batSpeed/programGate.ts`). Live-proved 2026-10-07.
- [x] 6c Base Stealer: card already shows only for 5Tool / Golden 2Way (never Complete Pitcher). Saved Base Stealer sessions (baseball + softball) now count as a hard running day in the planner's rest rules (wk_external_training_days, database only — no builder redeploy; 5 existing sessions now counted).
- [x] 6c follow-up: Golden 2Way sees Base Stealer only on position days (hidden on a start day, the day before and the day after).
- [x] 6d scheduling already in place in the conditioning picker: easy flush the day after a start, primer the day before, light tournament days, short/easy within 48 h of a game, repeat sprints with full rest off-season/in-season, softball base distances (43 ft repeats). No change needed.
- [ ] 6d WAITING ON OWNER (Step 8): the library has no explosive-pitcher drills (max-intent short sprints with 1 min/10 yd rest, power/plyo, repeat accelerations) and no softball season drills (base-to-base acceleration, durability, tournament-weekend work). Owner said this content goes through Step 8 approval, so it will be drafted there.
- [x] 7a Key Rules panel on the plan page (collapsed, "Key rules for your plan"): rest rules, Done/Cut short/Missed, Base Stealer, Complete Pitcher velocity bat speed, pitcher flush/primer, baseball-only pick-offs, under-13 weighted balls, heavy lifting 16+. Display only.
- [x] 7b weekly body-load bar, 7c Report a Problem done (Round 9). Old note: Old 5d/5e note: same-day max-effort throw + pitch within age limit, baseball-only pick-offs with lower 2-Way volume. Throwing/pick-off next dates wait on the 5b answer. (Old 5b note: on the throwing card (counts by kind → pitch-equivalents vs the existing age daily/weekly limit, shown on screen), then throwing/pick-off next dates from the planner (needs plan-builder redeploy — owner authorized in Round 8). (Base Stealer attempts counting as hard running moved to Step 6, where Base Stealer days are built — it changes the planner's rest rules.)
- [x] Step 3 Speed card (Speed Lab engine inside HT phase, 6 context rules, barefoot 4-part gate)
- [x] Step 4 (include: switch Lift rest to the owner's saved bands — 80%+ 180 s; 65–79% 120–150 s; <65% 90–120 s; holds 60–90 s; skill 45–60 s; +30 s button; HT rest wins)
- [x] Step 4 Lift card (scheme unchanged; weights, rest, why-line, plateau swap, deload proof)
- [x] Step 5 Throwing (throw weights 1.0/0.75/0.85, max long toss, 13+ weighted balls, pick-off baseball P only, windmill program → Step 8)
- [x] Step 6 Conditioning + bat speed (explosive pitchers, softball season, Base Stealer 5Tool/G2W only, 2-Way hitter bat speed only, Complete Pitcher velo caps, age-default competition level + onboarding prompt)
- [x] Step 7 Key Rules panel, weekly load bar, Report a Problem (DB + email queue + admin list)
- [ ] Step 8 Content batches (OFF until owner approves each) — WAITING ON OWNER: approve each batch by name (docs/owner/step8-content-batches.md)
- [ ] Step 9 Archive (docs + backup tables, redirects, 8-language text; no deletion) — prep done; WAITING ON OWNER: apply backup SQL, then OK redirects/deletion
- [x] Stress tests every step; clean up test data — done for every finished step; Step 8/9 stress tests follow their approval

## Waiting on owner
- Real-ball Power Primer throws: apply docs/pending-owner-apply/pap-throw-types.sql, then switch pap_real_throws on
- Step 8 content batches (incl. 6d explosive-pitcher + softball season drills): approve each by name.
- Limb-size proposal (docs/wic/limb-size-report.md) before any prescription uses limb sizes.
- Step 9: apply docs/pending-owner-apply/step9-program-backups.sql; then OK redirects; deletion only after final OK.
- Email key (Resend invalid): problem reports queue until fixed.
- Signed-in stress tests / phone screenshots as test players: need owner OK to sign the preview in as test players.
- Answered 2026-10-07 and built: throw rates (0.25/0.6/0.75/0.85/1.0), trend deload, barefoot gates.

## Owner addition 2026-10-07 — Finish your profile
- [x] Finish-your-profile card on plan page (lists missing onboarding fields, one tap to step, why line), reminder every 3 days, never blocks; under-13 → parent; read weight_lb + weight_lbs; never re-ask saved; prove with 3 test accounts; clean up

## Owner addition 2026-10-07 (18:41) — PAP + goal table + Alternative + windmill (backend redeploys authorized)
- [x] A. Power Primer (PAP) block in every Lift card — live (switch power_primer on), 8-week sims 0 violations, proved on a hidden test player at 360/390, cleaned up. Real-ball PAP throws wait on owner: apply docs/pending-owner-apply/pap-throw-types.sql (switch pap_real_throws stays off until then). PBs are saved per phone for now.
- [x] B. Off-season goal table v2 + safety ceiling + taper to zero at ramp-up (sims across phases)
- [x] C. Alternative button on every exercise (incl. PAP), busy-gym test at phone size — done 2026-10-07: same-or-lower risk check, busy-gym chips, dumbbell/kettlebell equivalents for every barbell/trap-bar lift (2 of 97 left without one), swap proved as test player at 390, test plans removed
- [x] D. Windmill program: optimize, stress test, switch on (live-proved on hidden softball pitcher at 360/390; fixed builder reading sport from athlete_context — profiles has no sport column, so softball players were built as baseball)
- [x] Power Primer bests save to the player's account (wk_session_logs metrics.kind pap_speed, record-only); device copy kept as fallback — 2026-10-07, save/read proved as test player
