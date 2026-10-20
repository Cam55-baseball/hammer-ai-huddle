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
8. Readiness shape: DP checks `.score < 0.4` while `decisionFilters.ts:138-146` accepts number or `{score}` — needs verification.
9. Coach notes unused.

## Next steps (in order)
Per-input simulations confirming each row; then links a–e under existing dose/rest/phase/equipment rules, lifting unchanged; six 8-week cohorts; phone Because proofs.
