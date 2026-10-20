# Plan-context trace audit (read-only) — AL2, Oct 20

**Answer to the owner's question: PARTLY, not yet unified.** Hammers Today uses video-analysis faults (one drill swap), recent game chase/whiff and error clusters (card order and cue lines only), readiness, pain, goals, limb proportions and phase/schedule. It does **not** use practice logs, entered tests/PBs or coach notes to choose today's work. Smart Week is a separate generator that ignores games, season, injury, subscription, goals and limb proportions. This audit changed no behavior. Simulations per input are still owed (see Gaps → next steps).

Legend: A card choice/order · B drill choice · C dose · D focus/why lines · E Smart Week · F Before-you-start.
DP = `src/lib/hammer/prescription/dailyPlan.ts` · WK = `supabase/functions/wk-generate-daily/index.ts` · HIE = `supabase/functions/hie-analyze/index.ts`

| Input | Today A/B/C/D | E Smart Week | F Before-you-start | Evidence |
|---|---|---|---|---|
| Video analyses — flagged issues | B, C, D via fault-ledger overlay (replaces one hitting/throwing drill, uses that drill's catalog dose); server faults bias legal movement ranking only. No card selection. | No | Only analysis **recency** drives the (OFF) recording reminder | `useFaultLedger.ts:40-63`, `applyFaultPlanInfluence.ts:77-129`, WK:1820-1850, 2115-2142 |
| Video analyses — scores | Not used (correct under the no-estimates rule) | No | No | WK:1830-1850 |
| Game logs / stats | A order + D cues for 7-day chase/whiff and defensive error clusters; not B or C. `kRate` computed then dropped. Pitcher outings feed throwing. | No (uses practice micro reps instead) | Indirect via plan intent | `useGpSignal.ts:65-184`, DP:1783-1844, `HammerDailyPlan.tsx:643-661` |
| Practice logs | **Nothing** in Today | Yes (micro reps → weaknesses) | No | `HammerDailyPlan.tsx:724-740`, HIE:1383-1390 |
| Vault tests / PBs | **Nothing** in Today; strength awards fetched but unused | Tool grades only | No | WK:1864-1872, HIE:1452-1460 |
| Check-ins / readiness | A/B/C/D (recover-first, CNS cap) — two different sources (local vs server) | Yes, third source (quiz) | Daily intent, breath primer | `athleteContext.ts:235-264`, DP:303-317, WK:754-776, 1245-1261 |
| Pain / injury | B/C/D + gating (local regions; server contraindications) | Pain only via readiness | No | DP:375, 702-723, WK:1999-2041 |
| Coach notes / From Coach | **Nothing** (free text unused; coach-scheduled practice affects schedule only) | No | "Coach advice" is a library tip, not the coach | `useGamePlan.ts:1640-1655`, `TodaysWisdomCard.tsx:13-26` |
| Goals | A order + D locally; B + D server bias; never dose/gate | No | Indirect | DP:1494-1541, WK:2081-2201 |
| Limb proportions | B + D (swaps, cues, legal-pick bonus); no dose | No | No | DP:744-747, 985-997, WK:2097-2201 |
| Phase / schedule | A/B/C/D across warm-up, strength, skills, microcycle | **No** | Yes (seasonal tip, intent, weekly strip) | DP:435-880, WK:780-907 |

## Simulations done
- AL3 games row CONFIRMED by `src/lib/hammer/prescription/dailyPlan.contextAudit.sim.test.ts` (3 PASS): 35% whiff over 10 at-bats moves hitting first and adds a cue; drills and minutes unchanged; 3 at-bats changes nothing; lifting identical.
- AL4 readiness row CONFIRMED (low `{score}` readiness → speed "Recover instead"); **gap 8 CONFIRMED**: the same readiness stored as a bare number is ignored by the daily plan while other filters treat it as low. Pain row CONFIRMED (knee → baserunning "IQ only (leg-protected)").

## Subscription × sport
- Local planner receives no subscription argument; differences come from access gates (Base Stealer: 5Tool yes, Golden 2Way except start/primer/flush days, Complete Pitcher no — `HammerDailyPlan.tsx:685-695`).
- Server bat-speed work and velocity caps are subscription-aware (WK:2871-2889, 4955-4970).
- Baseball/softball change the drill libraries for warm-up, throwing and defense (DP:375-401, 982, 1081-1088). Smart Week receives no sport.

## Gaps (blunt)
1. Practice logs never reach Today (missing link c).
2. Games touch order/cues only, never drill choice; `kRate` dropped; no "early read" sample label (link b).
3. Analysis → drills is one swap, not issue-tagged drills across all skill days; no editable issue tags in the Exercise Vault; no rotate-out proof (link a).
4. No cross-reference of analysis + games + tests, no "mixed signals" (link d).
5. No consistent "Because" line per affected card; no learning-loop tracking of whether it helped (link e).
6. Smart Week ignores games, season, injury, subscription, goals, limbs and sport.
7. Server fatigue answer fetched but unused (WK:761-774); strength-award floor fetched but never enforced (WK:1864-1872).
8. **FIXED AL5** — Readiness shape: DP checks `.score < 0.4` while `decisionFilters.ts:138-146` accepts number or `{score}` — needs verification.
9. Coach notes unused.

## Next steps (in order)
Per-input simulations confirming each row; then links a–e under existing dose/rest/phase/equipment rules, lifting unchanged; six 8-week cohorts; phone Because proofs.

## Full-go execution audit (owner addition 2, AL7 — read-only simulation)
Method: built today's local plan for baseball and softball × off/pre/in season × shortstop/pitcher on a fixed Wednesday with tee, bat and machine (`buildHammerDailyPlan`). Server-generated work in wk-generate-daily not yet included.
| Session | What is there | Full-go execution missing |
|---|---|---|
| Hitting (both sports) | Dry swings → tee → **one machine round** (25 pre / 15 in) → film 5 | No flips/front toss, no BP, no live at-bats with counts/intent; no "every swing with intent" cue; execution swings not logged as a separate part |
| Pitching — baseball | Arm care → toss/long toss → **flat-ground command set** (30 pre / 20 in) | **No bullpen with pitch count or pitch design, no live at-bats** in the local plan |
| Pitching — softball | Windmill prep → toss → circle/K-drills → **bullpen build 30** (pre) | No live at-bats; pitch design not named; in-season bullpen to confirm |
| Throwing — position players | Arm care → toss → routine ground-ball throws + double-play reps | Mostly present at moderate %; no game-speed throws from position after fungo |
| Fielding (AM1) | Off-season: DP pivots, backhands, slow rollers, deep-hole throws, relays, pop-up calls (softball: slap-bunt reads). In-season: 2–5 primer reps only | **No live fungo / game-speed ground balls off a bat**, no live reads; in-season is primers only |
| Baserunning | Lead/secondary footwork, pickoff reads, first-to-third scenarios | **No live jumps, reads off a live pitcher or timed steals** |
| Off-season hitting (AM1) | Dry swings → tee 30 → film | **No machine, flips, BP or live at all** without a machine; off-season hitting is drill-only |
| Server plan (AM1) | wk-generate-daily reads bullpen outings and an `is_bullpen_day` flag but authors no bullpen, BP or live at-bat work | Execution must be added in the local skill blocks or an explicit server step |
**Audit complete (AM1):** full-go execution is missing or partial in every skill session. Next: add a prep → issue drills → full-go → log structure within phase/schedule/throw/arm-ledger rules.


## AM2 simulation — video analyses (Oct 20)
PASS (3 tests, dailyPlan.contextAudit.sim.test.ts): a planted hitting fault replaces exactly one hitting drill (count and minutes unchanged); a fault cleared by clean clips rotates out; lifting identical. Gap: the overlay only touches hitting/throwing cards — pitching, fielding and baserunning cards never change from an analysis.

## AM3 simulation — goals (Oct 20)
PASS (3 tests): minutes and lifting identical regardless of goals. Finding: swapping goal order (hitting,defense → defense,hitting) leaves card order unchanged — goal ranking does not steer the day's order.
