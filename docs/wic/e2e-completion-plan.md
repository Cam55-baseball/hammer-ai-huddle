# Hammers Modality — E2E Completion Plan
**Owner-directed, 2026-09-25.** One plan, executed in order, each package finished and proved before the next. At the end, give the completion signal in §5 — and only after re-verifying every gate with fresh output.

## 0. Standing guardrails (every package)
1. Never destructive. No DROP, no TRUNCATE, no DELETE without a WHERE clause, unless the owner's message for that task names that exact thing. Snapshot affected rows to `<table>_snapshot_YYYYMMDD` first and report it. Parking is the default.
2. Never change a feature switch unless this plan or the owner says to.
3. Stop and report on any conflict with a law, a doc or an approved rule. Never guess.
4. One package at a time: finish, test, commit, then start the next.
5. Fallback always exists: with a switch off, behaviour is identical to today.
6. No claim without output. Every "done" carries the query, test result or screenshot that proves it.

## 1. What was deleted on 2026-09-25 (the record)
Migration `20260925001205` dropped 8 tables, rebuilt empty at 00:51 UTC, now locked and parked:
udl_daily_plans (12 rows lost: old test daily drill plans from the retired daily-loop system), udl_audit_log (13 rows lost: the audit trail for those plans), game_plan_week_overrides (0), sprint_analyses (0), video_pose_analysis (0), udl_alerts (0), udl_constraint_overrides (0), udl_drill_completions (0).
Also removed then restored: three "Game IQ 101 (Coming soon)" menu items, the landing "coming soon" block and three marketing cards, and two feature switches.

WP0 — Recovery attempt, first, reported in your first reply:
1. Re-check every reachable source: snapshot tables, branches, migration inserts, git history, and any Lovable Cloud backup or point-in-time restore reachable from the project or the Cloud tab.
2. If a restore point before 2026-09-25 00:46 UTC exists, restore ONLY udl_daily_plans and udl_audit_log rows via a temporary schema. Touch nothing else.
3. If unreachable from inside the project, say so plainly and give the owner exact steps to request it from Lovable support: table names, row counts, UTC window.
4. Record the outcome in docs/wic/parked-features.md.

## 2. Work packages, in order
WP1 — Subscriptions. Complete Player and Complete Hitter live inside 2Way and 5Tool Player. Entitlements, gating, plan building, upgrade and pricing screens, all copy. Existing subscribers keep everything. Report any Stripe mismatch without changing Stripe. Proof: a test per subscription type listing what it unlocks.
WP2 — Throwing and catching rep entry. Every position throw type enterable in the throwing card: catch play, position throws, quick release and short hops, crow-hop and long toss, catcher throw-downs. The pitching card is additive, warm-up and catch play alongside pitch counts. One arm ledger, one daily and weekly budget, stricter rule wins for two-way. One tap, pre-filled, optional. Proof: a position player, a pitcher, a catcher and a two-way athlete each log from their own card into the same ledger, budget and card updating.
WP3 — Recruiting consent. Separate consent for profile, metrics, video, contact. Ages 13–17 need guardian consent captured with who and when. Revocable in one tap, visibility ends immediately, every change logged, plain status line. Proof: an access test showing a scout cannot reach a minor's data without an active consent record.
WP4 — Turn on what is built but dark, in this order, each verified before the next:
 1. Wire upper-body plyo and hand-and-wrist rules into the plan builder, then set ub_plyo_hand_wrist live.
 2. Build Silent Signals as its own rule (eleven signals, neutral copy, effect on today's session), proved on synthetic cases.
 3. Make youth throwing rules live: weekly, season and annual caps, innings cap, fatigue flag, pitcher-catcher budget, growth-adjusted pitching age.
 4. Enforce the arm ledger on athletes' cards, not only Staff View.
 5. Turn on tell_hammers, then adaptive_phases (Ramp Law, arm budgets, "When's your next game?"), then phase_feedback.
 Proof: for each, a before-and-after card for a real athlete plus the switch audit row.
WP5 — Zero criticals, calculator back on. Fix whatever still writes a nightly critical. Then three consecutive clean nightly cycles, then rest_day_calculator to everyone through the preflight gate, and it stays there. Proof: three passed tcs_shadow_checks rows, zero criticals across those days, switch audit row.
WP6 — Polish for presentation. Finish or remove the remaining coming-soon items: Combine page, Softball page, pitch-tipping line, Start Here preview line, report-card stub, Games import toast. Sweep every screen at 390px: no overflow, no placeholder, no empty section, no internal labels, no block numbers. Every doc's "Live status" line must match reality. Proof: sweep list plus phone-width screenshots of changed screens.

## 3. Efficiency rules
Fast tests (2,000 seasons) in the sandbox on every change, no cloud compute. One 5,000-season run on the final code before the completion signal; escalate to 20,000 only if a violation appears. No new scheduled jobs without naming what reads their output. Batch database work into single migrations where safe.

## 4. Final gates (all must be green)
1. Zero critical notes across three consecutive nightly cycles — counts by day plus three passed shadow checks.
2. rest_day_calculator = all and holding — switch row plus audit.
3. tell_hammers, adaptive_phases, phase_feedback, ub_plyo_hand_wrist, onboarding_off_days = all.
4. WP1, WP2, WP3 shipped with their named tests.
5. Silent Signals, youth throwing rules and arm-ledger enforcement live — synthetic output plus a real athlete's card.
6. Full test suite green.
7. 5,000-season run clean on final code — seed, days checked, violations = 0.
8. Card matrix 1,296 of 1,296, zero empty, zero fatals.
9. Generation speed at baseline, zero card build errors.
10. Every screen clean at 390px, no placeholder or coming-soon text anywhere.
11. Docs' "Live status" lines all accurate.
12. Nothing deleted; every parked item locked, labelled and listed.

## 5. Completion signal (required)
When every gate in §4 is green, re-verify each with FRESH output in that same reply — never quoting an earlier run — print the gate table with its evidence, and end the message with exactly:

E2E COMPLETE — ALL 12 GATES GREEN — <YYYY-MM-DD HH:MM UTC>

If any gate is not green, do not print that line. End instead with:

NOT COMPLETE — BLOCKERS: <gate numbers and one line each>

Never print the completion line from memory, from a previous run, or on partial evidence.

## 6. Owner waiver — gate 1 (2026-09-25)

Decision-maker: the owner (Hammers Modality LLC). Date: 2026-09-25.

The "zero criticals across three consecutive nightly cycles" requirement in
gate 1 is **waived** for this release. It is replaced by a same-day readiness
check, all parts of which must be true:

a. Zero critical watchdog notes since the last fix landed.
b. The most recent nightly self-check passed with 0 mismatches.
c. A forced generation today for the owner, the 14-year-old test pitcher and
   every demo athlete, all building clean, with zero new criticals.
d. The automatic step-down is live and proven: the nightly auto-off job is
   scheduled and armed for `rest_day_calculator`, with a past automatic
   switch-down row showing it fired correctly.

The three-nights rule still applies to any future release of a
generation-path change; this waiver covers the 2026-09-25 launch only.

### Left as is, revisit after launch
Two growth checks inside the card builder still use "age 15 or under" rather
than the real height-check growth rule. They are more conservative than the
growth rule, never less safe, so they stay for launch.

### 2026-09-25 19:45 UTC — Demo in-season card-build incident
Root cause: in-season phase name "regular_season" resolved the off-season full_body_strength template, and within 48 h of a game the schedule law removes loaded lifts, leaving compound_lower empty; the checker marked that fatal. Equipment, softball scope, age, eccentric-overload removal and class cap were not involved (the 4 in-season accounts without a game in 48 h built clean with the same zero equipment rows). Fixed at source; general lighter-template swap added; 648-cell no-fatal test added. Gate 1a is counted from this fix.
