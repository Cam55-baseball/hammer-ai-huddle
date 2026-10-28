# Consolidated publish checklist

**Batch closeout · October 28, 2026 · after the owner's "both, combined" answer**

**Ready to publish: NO.** (Re-checked Oct 28 17:23 UTC: full suite 632 files / 5,079 tests PASS; preview build clean.) One owner-requested item is not built: owner drills tagged "conditioning" are not used by the plan yet. Conditioning is built by the server with checked work/rest doses, and the drill builder has no fields for those, so the drill can't go in without making up a dose. Waiting on owner: "Add fields" (work/rest/rounds in the drill builder) or "Leave it" (existing exercise list; flips verdict to YES). Everything else in this batch is built and tested.

## Automated verification (this run)

- **Full suite: PASS** — 632 files / 5,079 tests, one run, no failures.
- **Preview build: PASS** (latest entry "build OK").
- **Real-plan 8-week simulations: PASS** — `sixDayWeek.sim.test.ts`, 27 tests: baseball + softball × Pitcher / 5Tool / Golden 2Way × off / pre / in / post season. Each one checks: 6 training days every week, Sunday with no physical work, hitting ≥3 / defense ≥4 / baserunning ≥1, identical weeks for beginners and advanced players (no ramp), pitcher throwing ≤5. Also covered: bunting 2 a week for 5Tool / Golden 2Way and never for Pitcher, low readiness switching each session to the low-taxing version that still counts, and an injury still lowering days below the minimum.
- **Deployed (authorized):** `wk-generate-daily`, `evaluate-behavioral-state`, `plan-swap`. Server plan-builder copy regenerated and parity-checked.
- **Database (authorized):** a new done-log for the Mind item; bunt type and side fields on owner drills.
- **390×844 screenshots (owner account, preview):** Today's Mind card with its Done button; the drill builder showing the bunting tag with the Bunt type / Bunt side fields. **Not captured:** a low-taxing defense day on a real account. The owner's readiness wasn't low, and I didn't fake a check-in. Tests cover it.
- No publish, cron or iOS changes.

## Owner Oct 28 decisions — status

| Item | Status |
|---|---|
| A1 6 training days + 1 rest day | **Built in the real plan** (client + server). Sunday is the rest day: soft recovery plus the Mind item only |
| A2 Weekly minimums | **Met**: everyone gets the top schedule (hitting/defense/baserunning 6, pitcher throwing ≤5); bunting 2 for 5Tool/Golden 2Way. Youth age bands (u10–u14) still cap at 5/4/3, which is above every minimum. Injury can still lower days |
| A3 No ramp; readiness inside sessions | **Built**: beginners no longer get fewer days; low readiness (<40%) gives the low-taxing version of every skill session, which still counts |
| A4 Mind item | **Built**: Done button saves a log that counts in Discipline (rest days included, never in performance). On a prescribed day, Tex Vision opens the player's real Tex Vision session |
| A5 Owner tags used by the plan | Hitting, bat speed, throwing, pitching, low-taxing defense (before); **now also baserunning, bunting (exact type + side) and Mind**. **Conditioning: not used** (see reason above) |
| A6 8-week simulations | **Real-plan simulations pass** (above) |
| B1 Upload or YouTube/Vimeo link | Built |
| B2 Credit/takedown notice | Built; waiting on lawyer review |
| Recurring findings, practice checks → drills, Safari saved report | Built and proven earlier |
| 17.7 MB clip backup | Not a blocker (owner): the iPhone pulls its own pictures from the clip |

## Human-only checks (owner verification — not blockers for "yes")

- Real iPhone: upload a large clip → report → Save → Players Club → reopen → reload; tap Play on a saved report.
- Real player: Today shows 6 training days and a Sunday rest; tap Done on the Mind card and see Discipline count it; a low-readiness day shows the low-taxing version; owner-tagged baserunning, bunting and Mind drills appear.
- Real coach: recurring findings in the player summary.
- Lawyer: embedded-video notice wording.
