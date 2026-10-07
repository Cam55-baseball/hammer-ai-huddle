# Roadmap

> **Status (2026-10-07, Round 8)**
> - Finished: Step 1 (cards), Step 2 (timers/logging/dashboards), Step 3 (speed), Step 4 (lift); Step 5a throw-count rule; 5b throwing log built (phone proof pending).
> - Next: 5b phone proof as a pitcher, then throwing/pick-off next dates from the planner.
> - Waiting on owner: (1) should hard-session ratings trigger an earlier lift deload? (2) barefoot pain-free days per stage + readiness test — nobody moves past Foundation until set. (3) Step 8 content batches need approval one by one.

- [x] Current request: clarify Rest / Push / Skip with accurate frontend-only labels and explanations; report exact before/after text (phone/desktop checked with local-only test state)
- [x] Current request: quote the complete Start card for all five requested player examples, read-only

- [ ] Current frontend-only: match softball identity styling to baseball and verify contrast
- [ ] Current read-only/frontend-only: verify Tissue & Recovery lifting count against recorded data; correct display if needed
- [ ] Current read-only: report scheduled completion and overdue lift behavior

- [x] Pitcher + recovery conditioning drills live (13 rows), stand-in line retired
- [x] Gaps filled: reliever primer, same-night flush, travel reset, windmill set (soft-tissue tools left out — thin evidence; no ice)
- [x] Sport audit of conditioning library
- [x] Game logging card (game today / pitching today, ask once about yesterday)
- [x] Pitcher schedule: tables, card, plan reads it (conditioning, lift limits, no-grip rule)
- [x] Rest-day count held (hard sprint swapped for easy flush)
- [ ] Pitcher schedule → recovery governor, arm care, throwing plan, weekly stress planner
- [ ] "Did you play yesterday?" / "Did you pitch?" inside the morning check-in itself (currently on Hammers Today)
- [ ] Live verification as a player and as a pitcher with schedule data
- [x] Stage 4 — game/practice load feeds recovery limit (scheduled practices are not confirmed logs)
- [x] Stage 5 — career goal direction + rank-goals prompt
- [x] Stage 6 — The General shows records (preview; published release unverified)
- [x] Stage 7 — baselines in the plan
- [x] Closeout: 40 catalog display renames live; outside-name/jargon findings in docs/wic/remaining-items-closeout.md
- [x] Closeout: proposed optional game-linked flush after night save; owner decision pending
- [x] Closeout: morning game-question trade-off reported; owner decision pending
- [x] Closeout: pitcher connections implemented/tested in checkout; deployment and player/pitcher E2E unverified
- [ ] Closeout: Stage 4/5 phone-width card screenshots delivered as owner; player verification still owed
- [ ] Closeout: identified failed-read cases reported; exhaustive all-app audit still unfinished

## Round 2 (owner-approved 2026-10-06) — under13_parent_program stays OFF
- [ ] A. Bat speed wording ("rotational power ... pitching velocity")
- [ ] B. Under-13 parent-controlled account behind OFF switch (signup, notice, promise, payment, consent record, parent controls, protections)
- [ ] C. Under-13 Pitch Smart exact, no weighted balls, innings 60/80, 4 months off, FB/CH only
- [ ] D. 13th birthday → normal account; no teen promise, no 18th step
- [ ] E. Pause gaps (hydration, base-stealing, hammer-chat, leaderboards, public pages)
- [ ] F. Round 1 tests (screenshots, growth on/off, 16yo heavy track)
- [ ] Stress tests 1–19 + daily-plan job scale
- [ ] Deferral note + youth-throwing doc updates
- [x] Round 2: switch, consent tables, parent flow, Pitch Smart U13, pause gaps (deployed)
- [ ] Round 2: signed-in stress tests 1–11, 15, 17 and Round 1 screenshots — waiting on owner approval to sign the preview in as test players
- [ ] Round 2: daily-plan job scale estimate (case 19)
## Round 3
- [ ] Stress cases 1–11, 15, 17 + Round 1 screenshots (signed-in test players)
- [ ] Case 19 scale dry run (1,000 / 5,000)
- [ ] Checks: pitch types U13, sub-20 scale, leaderboards/public pages
- [ ] Anonymized training store + opt-ins (v2 promise/notice, toggles, backfill 13+, proofs)
- [x] R3 security fixes for anon store migration
- [x] R3 anon store: opt-in UI (parent signup + controls), 13+ toggle, privacy text, backfill 13+, proofs
- [x] R3 pitch types U13 limited (pitch list); sub-20 scale confirmed; rankings hide paused/U13
- [~] R3 case 19: batching built + dry run; real per-player build time not yet measured
- [ ] R3 stress cases 1–11, 15, 17 + Round 1 screenshots (need signed-in test-player sessions)

## Round 5 (2026-10-06) — test without approval tool
- [x] Test accounts via admin API (hidden, cleaned after)
- [x] Cases 1–11, 15, 17 backend + screen
- [ ] Phone screenshots — all but Rest/Push/Skip in check-in (shown in earlier round)
- [ ] OPEN (owner): plan building capacity ~860/hour on current database; 5,000 in first hour needs a larger database or faster builds
- [x] Real build time: 3 first builds + 20 at once; undo
- [x] Stripe promo HMPARENTTEST (100% off, 1 use, 7 days)

## Round 6 (owner-approved 2026-10-06) — no publish, no cron/switch changes
- [ ] A. Profile + speed up wk-generate-daily; identical-output proof; before/after times
- [ ] B. Local-midnight readiness; pre-build proposal; cron proposal; multi-TZ proof
- [ ] C. Plan never changes on reload (20 reloads, preview + live)
- [ ] D. Screenshots 360/390: pitcher Bat speed, warm-up season label off/in season
- [ ] Clean up all test data

## Round 8 — Master Integration Plan (owner-approved 2026-10-07; never publish, no cron changes)
- [x] Step 1 Card design — accepted; streak correction done (flame lit 5 / glow 25 / color every 100; workout milestones 10/50/100/200/350/500/700/1000 with confetti + vibration; no-plan days never break streak)
- [ ] Step 2 Timers (set rest, sprint rest 1 min/10 yd), sprint stopwatch/partner/steps, % → weight, practice logging, in-card dashboards
  - [x] 2a sprint rest countdown (1 min/10 yd) + lift rest countdown per exercise from owner bands (80%+ 180 s; 65–79% 120–150; <65% 90–120; holds 60–90; skill/throw 45–60; HT rest wins; ranges start low with +30 s)
  - [x] 2b sprint stopwatch (partner/self), steps → stride, best-today; kept on device until 2d logging saves it
  - [x] 2c lift weights only from verified logs (src/lib/lift/verifiedMax.ts): % only + "Log your sets to unlock your numbers" until ≥2 qualifying sets or a tested max; auto-complete no longer stores % as weight; one-tap prefill only from verified max
  - [x] 2d "Log a practice" (team/lesson/own work, minutes, how hard), "Log a tested max" on % lifts, stopwatch reps saved to account — all record-only (wk_session_logs metrics.kind)
  - [x] 2e "Your numbers" dashboards: speed (best/latest per distance), lift (verified max + gain), practice (minutes 7/28 days)
  - [x] 2f Step 2 player proof (test player, 360/390): sprint stopwatch + 2:00 rest timer, speed and practice dashboards show logged numbers, plan fingerprint identical before/after, 0 page errors, test player removed
  - [ ] 2g lift weight-unlock on-screen proof — needs a test plan with percentage lifts (in-season beginner plan had none); fold into Step 4 lift tests
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
- [x] 5b throwing log on the pitching card (baseball): counts by kind saved as throw_count logs, arm total = mound pitches + pitch-equivalents vs Pitch Smart daily max, stop line at max; pick-off rows only for pitchers/2-Way. Type-check clean; phone proof pending.
- [ ] NEXT ITEM: 5b phone proof as a signed-in pitcher at 360/390, then throwing/pick-off next dates from the planner (planner redeploy; prove live builder). Previously: 5b throwing log on the throwing card (counts by kind → pitch-equivalents vs the existing age daily/weekly limit, shown on screen), then throwing/pick-off next dates from the planner (needs plan-builder redeploy — owner authorized in Round 8). (Base Stealer attempts counting as hard running moved to Step 6, where Base Stealer days are built — it changes the planner's rest rules.)
- [x] Step 3 Speed card (Speed Lab engine inside HT phase, 6 context rules, barefoot 4-part gate)
- [x] Step 4 (include: switch Lift rest to the owner's saved bands — 80%+ 180 s; 65–79% 120–150 s; <65% 90–120 s; holds 60–90 s; skill 45–60 s; +30 s button; HT rest wins)
- [ ] Step 4 Lift card (scheme unchanged; weights, rest, why-line, plateau swap, deload proof)
- [ ] Step 5 Throwing (throw weights 1.0/0.75/0.85, max long toss, 13+ weighted balls, pick-off baseball P only, windmill program → Step 8)
- [ ] Step 6 Conditioning + bat speed (explosive pitchers, softball season, Base Stealer 5Tool/G2W only, 2-Way hitter bat speed only, Complete Pitcher velo caps, age-default competition level + onboarding prompt)
- [ ] Step 7 Key Rules panel, weekly load bar, Report a Problem (DB + email queue + admin list)
- [ ] Step 8 Content batches (OFF until owner approves each)
- [ ] Step 9 Archive (docs + backup tables, redirects, 8-language text; no deletion)
- [ ] Stress tests every step; clean up test data

## Waiting on owner
- Adaptive (fatigue-triggered) lift deload: an extra lighter week based on how hard sessions felt would change lift volume, and lift schemes may never change. The fixed every-4th-week deload already runs. Owner: should hard-session ratings trigger an earlier deload? (yes/no)
- Barefoot gate numbers: how many pain-free days per stage (Foundation→Introduction, →Integration, →Advanced), and what the barefoot readiness test is (e.g. which hops/holds, pass mark). Until set, nobody moves past Foundation.
