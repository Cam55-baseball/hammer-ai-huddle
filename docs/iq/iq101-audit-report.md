# Game IQ 101 — Triple-Pass Accuracy Audit Report

**Method:** Six parallel read-only audits across 114 published situations. Each slug graded on 7 axes: Rulebook (MLB/NCAA/NFHS/NFCA), Sport gating, Starting positions, Movement paths, Coaching text, Context shifts, Scenarios.

## Executive summary

| Bucket | Total | OK | EDIT | WRONG |
|---|---|---|---|---|
| A — Bunt / Squeeze | 27 | 0 | 21 | 6 |
| B — Pickoff / Balk / PFP / Mound / Pitch-call | 22 | 2 | 17 | 3 |
| C — Cutoff / Relay / Outfield reads | 9 | 0 | 2 | 7 |
| D — 1st-and-3rd / Steals / Rundowns | 13 | 0 | 5 | 8 |
| E — Offense / Baserunning / Hitting | 16 | 0 | 13 | 3 |
| F — Softball-only + Catcher + Wild Pitch + Misc | 27 | 4 | 19 | 4 |
| **TOTAL** | **114** | **6** | **77** | **31** |

## System-wide structural defects (must fix before per-slug work)

1. **Stub paths everywhere.** ~80+ slugs have every actor's `primary_path = [{x:50,y:50}]` — the diamond renders all dots stacked on the mound. The `triple_check_count=3` flag was set by bulk backfill, not real choreography.
2. **Scenarios essentially absent.** Roughly 90 of 114 slugs have 0 `iq_scenarios` rows — the quiz layer has nothing to serve.
3. **`iq_actor_context_shifts` is empty system-wide** (0 rows across the entire DB). The contextShifts engine in `contextShifts.ts` is fully wired but dead.
4. **Offense actors invisible in UI.** `GameIqSituation.tsx` line 168 iterates only `DEFENSIVE_ROLES`. BAT/BR/R1/R2/R3 never render a teach card — every offense slug is functionally broken in teach mode.
5. **Baserunner context axes structurally impossible.** The `iq_actor_context_shifts.context_axis` CHECK constraint lacks `lead_type`, `secondary_timing`, `jump_read`, `pickoff_look`, `contact_read`.
6. **Sport gating not enforced.** `bulkImport.ts` validator allows lead/pickoff slugs to be `sport=both` despite softball look-back rule prohibiting leads.
7. **Missing runner actors.** 30+ slugs about runners (pickoffs, wild pitches, squeezes, look-back, wheel plays) have no R1/R2/R3 actor on the diamond — the subject of the play is invisible.
8. **Placeholder text bloat.** ~12 slugs have every actor set to "Standard coaching" / "Out of position" / "Anticipate pre-pitch" / "Standard" — pure unedited template paste.

## Cross-bucket TOP rule/factual errors (must correct before any further publish)

| # | Slug | Error | Correction |
|---|---|---|---|
| 1 | `intentional-walk-baseball` | Encodes pre-2017 4-pitch walk; C "execute / Stand" | MLB 5.05(b)(1) auto-IBB from dugout — no pitches thrown |
| 2 | `courtesy-runner-pitcher-catcher` | "with 2 outs" restriction | NCAA 8.10 — any inning |
| 3 | `appeal-leaving-base-early` | "before pitch reached plate" | NCAA 12.21 — "before pitch leaves pitcher's hand" |
| 4 | `rise-ball-2-strike-approach` | Zone bottom = "bottom of sternum" | NCAA Rule 1 — top of the knees |
| 5 | `illegal-pitch-softball-r0` | Sources cite MLB.com on softball-only rule | NCAA Softball Rule 10.5 + NFCA |
| 6 | `bunt-tag-play-r3` | C "Block plate" coaching | Violates MLB 6.01(i)(1) — receive then tag, no blocking without possession |
| 7 | `bunt-defense-tying-run-9th` | 3B=bag contradicts "corners crash hard" summary | 3B=ball charge; SS rotates to 3B |
| 8 | `safety-squeeze-r3-2-outs` | Play doesn't exist (no safety read at 2 outs) | Reframe as 2-out suicide squeeze or remove |
| 9 | `off-bunt-for-hit` (Scenario 2) | RHH push bunt "to 3B-SS hole" | Goes up the P-1B corridor |
| 10 | `first-third-walk-off-bunt` | All 9 actors stub-text + stub-paths | Full rewrite required before publish |
| 11 | `off-lead-from-2b`, `off-lhp-pickoff-tells`, `off-primary-secondary-1b` | sport not gated to baseball-only | Set `sport='baseball'`; add validator |
| 12 | `bunt-pop-up-corner` | Missing critical IFF-does-NOT-apply-to-bunts rule | Add MLB 5.09(a)(12) elite_cue |
| 13 | `bunt-3-2-count-r1` & `bunt-defense-cover-r1-steal` & `bunt-foul-pop-c` | Missing 2-strike foul-bunt = K rule | Add MLB 5.09(a)(3) note |
| 14 | `bunt-3b-line-r1` | P=backup trail | P must cover 1B on 3B-line bunt |
| 15 | Rundown family (all 3 slugs) | Trappers tagged `bag`, C tagged `read` on `rundown-r3-between-3-home` | Trappers=execute, backers=backup, C is the home-plate trapper |
| 16 | 1st-and-3rd family (4 slugs) | C=`read` (C has the ball + decision) | C=`ball` |
| 17 | `catcher-throw-3b-r2-steal` | SS=bag covering 3B | SS=backup; 3B covers; note rarity vs RHH |
| 18 | `pickoff-2b-daylight`, `pickoff-2b-timing`, `pickoff-3b-lhp` | 100% unedited stub data, P=read | Full reauthor with signals, runners, paths |

---

## Bucket A — Bunt / Squeeze (27 situations)

**Verdict counts:** 6 WRONG · 21 EDIT · 0 OK

### Per-slug
| slug | verdict | issues | proposed_fix |
|---|---|---|---|
| bunt-1b-line-r1 | EDIT | 3B holds bag, empty path; 0 scenarios | 3B path (24,70)→(30,82); add 3 scenarios |
| bunt-3-2-count-r1 | EDIT | Missing 2-strike-foul-bunt = K rule; 2B contradictory (note=cover 2B, common_mistake=cover 1B); stub paths; 0 scenarios | Fix 2B=bag at (50,40); add rule note; replace paths; scenarios |
| bunt-3b-line-r1 | EDIT | P=backup trail (WRONG — P must cover 1B on 3B-line bunt); 0 scenarios | P=bag, path (50,70)→(70,80)→(76,70); rewrite coaching |
| bunt-defense-corner-charge-overcharge | EDIT | All paths stub; terse coaching | Real charge/retreat paths; elite cues on bat-barrel read |
| bunt-defense-cover-r1-steal | EDIT | P "hold ball if foul" incomplete (2-strike foul = K); generic coaching; 0 scenarios | Revise P rule note; paths; scenarios |
| bunt-defense-pitcher-cover-1b | EDIT | P assignment=bag but path (50,50); 1B charge path missing | Real paths; 2B covers 1B if 1B charges |
| bunt-defense-r12-no-outs | EDIT | SS=ball contradicts wheel logic (3B/P charge, SS rotates to 3B); stub paths | SS=bag rotate to 3B; 3B charge path; pre-pitch wheel signal |
| bunt-defense-tying-run-9th | WRONG | 3B=bag contradicts summary "corners crash hard"; teaches wrong positioning in highest-leverage spot | 3B→ball charge; SS→bag covers 3B |
| bunt-foul-pop-c | EDIT | Missing caught-foul-bunt rule + 2-strike-dropped-pop K rule; stub paths | Add rule notes; C step-forward path |
| bunt-pop-up-corner | EDIT | Missing critical rule: IFF does NOT apply to bunts (MLB 5.09(a)(12)) | Add elite_cue noting IFF exclusion |
| bunt-rolling-foul-line | EDIT | Missing fair/foul timing window (must cross bag before touch in foul) | Add MLB 5.05(a)(1) note |
| bunt-tag-play-r3 | WRONG | C "Block plate" violates MLB 6.01(i)(1) — cannot block without possession | C "receive then tag in front of plate; no blocking without possession" |
| bunt-vs-shift | EDIT | Shift configuration is premise but no context shift rows exist | Add `swing_side=lhh` context shifts for SS/3B start positions |
| drag-bunt-lhh-r0 | EDIT | All paths stub; no LHH context shift | Real paths; LHH widens 1B-2B gap |
| drag-bunt-rhh-r0 | EDIT | All paths stub; good coaching cues otherwise | P path (50,70)→(58,78); 1B path (76,70)→(66,78); 2B covers 1B |
| fake-bunt-slash-r1 | EDIT | "Slash" is softball term; baseball=butcher boy; stub paths | Rename for baseball; retreat paths for 1B/3B |
| first-third-walk-off-bunt | WRONG | ALL 9 actors fully stubbed ("Standard coaching" + (50,50)); functionally empty | Full rewrite from scratch — distinct walk-off play with R1+R3 |
| off-bunt-for-hit | WRONG | Scenario 2 is FACTUALLY WRONG — claims RHH push bunt goes to "3B-SS hole" (actually goes up P-1B corridor) | Fix Scenario 2 explanation to correct bat-ball direction |
| pop-up-bunt-r1 | EDIT | Real paths for C/P/1B/3B ✓; 2B and SS paths empty (need double-off coverage); 0 scenarios | 2B sprint to 1B; SS cover 2B; scenarios |
| push-bunt-1b-r2 | EDIT | P "eyes to 3B first" only correct if dead-stop; stubs | Elite_cue: if ball has pace take sure out at 1B |
| runner-1st-sac-bunt | EDIT | Excellent real paths ✓; only 1 scenario (needs 2 more) | Add 2 scenarios (bare-hand decision, P-field decision) |
| safety-squeeze-r1-r3 | EDIT | 2B coaching ambiguous ("cover based on R1"); stubs | 2B sprint to cover 1B (1B charging); paths |
| safety-squeeze-r3-2-outs | WRONG | Play does not exist — safety squeeze has no meaning at 2 outs (R3 runs on any contact = inning ends) | Reframe as 2-out suicide squeeze OR replace |
| safety-squeeze-r3-no-outs | EDIT | Elite coaching text undermined by all-stub paths; 0 scenarios | Replace paths; keep coaching |
| squeeze-r3-defense | EDIT | Real paths ✓; elite P pitchout coaching ✓; NO R3 actor row exists (premise missing); 0 scenarios | Add R3 actor execute, path (24,78)→(50,96) |
| squeeze-vs-rhp-r3 | EDIT | "High pitch if pickup" imprecise; should be "up AND away" pitchout; stubs | Refine pitchout coaching |
| suicide-squeeze-r3-1-out | EDIT | Excellent coaching ✓; missing missed-bunt note for R3; stubs | Add missed-bunt note; paths |

**Top 5:** 1) 25 of 27 slugs have ZERO scenarios — entire quiz layer absent  2) `first-third-walk-off-bunt` fully stubbed — needs full rewrite  3) `bunt-defense-tying-run-9th` 3B assignment wrong  4) `safety-squeeze-r3-2-outs` is not a real play  5) `off-bunt-for-hit` Scenario 2 teaches wrong RHH push direction
## Bucket B — Pickoff / Balk / PFP / Mound-Visit / Pitch-Call (22 situations)

**Verdict counts:** 3 WRONG · 17 EDIT · 2 OK

### Cross-cutting deficits
- 0 scenarios across all 22 slugs
- 0 rows in `iq_actor_context_shifts` (system-wide)
- 19/22 slugs have 100% stub paths `[{50,50}]`
- Runner actors (R1/R2/R3) missing from 14 slugs (the *subject* of every pickoff)

### Per-slug
| slug | verdict | issues | proposed_fix |
|---|---|---|---|
| balk-runner-on-1b | EDIT | No R1; stub paths; 12 MLB balk triggers not listed; 2B "backup" wrong (should cover); 0 scenarios | Add R1 path (78,72)→(50,48); enumerate top balk triggers; 2B=bag cover |
| pickoff-1b-daylight-lhp | EDIT | No R1; P path empty; daylight signal mechanic absent | Add R1; P path (50,70)→(78,72); 1B "creep behind runner, wrist-flip on gap" |
| pickoff-1b-rhp-spin | EDIT | No R1; stubs; missing MLB 6.02(a)(3) "step toward 1B not plate" rule | Add R1; expand legality coaching |
| pickoff-2b-daylight | WRONG | Pure unedited template ("Standard coaching" everywhere); P=read; no R2 | Full reauthor: P=ball, SS=bag creep, R2 actor, daylight signal mechanic |
| pickoff-2b-timing | WRONG | Pure stub; no R2; no distinction from "daylight" version | Full reauthor: pre-arranged pitch-count throw, P=ball, both SS/2B coverage |
| pickoff-3b-lhp | WRONG | Pure stub; P=read; no R3; missing LHP legality (step toward 3B, fake = balk) | Full reauthor: P=ball, R3, document MLB 6.02(a)(4) balk |
| pickoff-from-stretch-vs-lhh | EDIT | No R1; stub paths; LHP-vs-LHH advantage not explained | Add R1; expand coaching on LHP stance deception |
| pickoff-r2-inside-move-rhp | EDIT | No R2; stubs; legality of inside step not documented; SS/2B "Same" ambiguous | Add R2; clarify legal pivot per MLB 6.02(a)(3); pre-set coverage |
| intentional-walk-baseball | EDIT | **Rule error**: encodes pre-2017 4-pitch walk; C=execute "Stand" wrong | Update to MLB 5.05(b)(1) auto-IBB from dugout, no pitches thrown; C=read |
| pfp-3-1-fastball | EDIT | Stub paths; "Finish balanced" sparse | Expand: land on ball of foot, square shoulders, glove chest-high |
| pfp-comebacker-1-0-count | EDIT | Stubs; 1B at (50,50) | P path (50,70)→(78,72); 1B at (78,72); C backup to foul ground |
| pfp-cover-1b-routine | EDIT | P path stub; 45° route mechanic missing | P path (50,70)→(65,78)→(78,72); 90°-to-bag, glove-up technique |
| comebacker-r1-double-play | OK | Generally accurate; P path could annotate as throw vector | Minor: annotate vector; add C path to foul ground |
| comebacker-deflection-2b | EDIT | Stubs; P "Recover, direct" misses vocal call ("Two!"/"One!") | P=execute; add voice-direction coaching |
| mound-visit-late-game | EDIT | Stubs; missing MLB 5 visits/game (5.10(l)) + 30s timer + NCAA softball 1/inning | Add convergence paths + rule limits |
| mound-visit-runners-12-no-outs | OK | Best-authored in scope; convergence positions specific | Minor: add P start path; NCAA SB caveat |
| first-pitch-strike-philosophy | EDIT | Stubs; 2-word coaching | Expand on 0-1 vs 1-0 split; "best fastball, low firm target" |
| pitch-call-1-2-count-power-hitter | EDIT | Stubs; no pitch type recommended; no LHH/RHH chase location | Expand: slider below or FB above; never middle |
| pitch-call-3-2-count-bases-loaded | EDIT | Stubs; no command vs nibble distinction; walk-scores urgency missing | Expand: command pitch, not nibble; walk = run |
| pitchout-r1-suspected-steal | EDIT | SS=backup wrong (should cover 2B); no R1; no softball pitchout-rule note | SS=bag cover; add R1; NFHS 9-1-1 softball note |
| two-strike-approach-pitcher | EDIT | Stubs; sequencing thin | Expand: setup-in → chase-away; vary speed 10+ mph |
| hit-by-pitch-r1 | EDIT | R2/R3 listed but slug is R1-only; R1 "advance IF forced" understated (R1 IS forced) | Remove R2/R3 OR re-label as bases-loaded variant; R1 forced unconditionally |

**Top 5:** 1) Fix intentional-walk-baseball to 2017 auto-IBB rule  2) Full reauthor of 3 stub pickoff slugs (2B-daylight, 2B-timing, 3B-LHP)  3) Add runner actors to 14 slugs  4) Replace `[50,50]` stubs with real coordinates in 19 slugs  5) Seed first context-shift rows (pitchout, pickoff, pitch-call slugs)
## Bucket C — Cutoff / Relay / Outfield reads (9 situations)

**Verdict counts:** 7 WRONG · 2 EDIT · 0 OK

| slug | verdict | issues | proposed_fix |
|---|---|---|---|
| cutoff-double-lf-r1-scoring | WRONG | All actors path=stub (50,50); coaching="Standard coaching"; SS=bag (should be ball/relay); LF=backup (should be ball); P=read (should be backup home); 2B=bag (should be backup/trail); no R1; 0 scenarios | SS: ball→(28,38); LF: ball→(12,18); P: backup→(50,90); 2B: backup→(35,44); add R1; write scenario |
| cutoff-double-rf-r1-scoring | WRONG | Same stub pattern; 2B=bag (should be ball); RF=backup (should be ball); P=read (should be backup); SS=bag (should be trail) | 2B: ball→(72,38); RF: ball; P: backup home; SS: backup→(55,44) |
| cutoff-single-cf-r1-to-3rd | WRONG | Stubs; CF=backup (should be ball); SS=bag (should be ball, cutoff on CF→3B line); P=read (should be backup 3B); no R1, no scenario | CF: ball; SS: ball→(33,52); P: backup 3B; 1B: bag; add R1 |
| cutoff-single-lf-r2-scoring | WRONG | Stubs; LF=backup (should be ball); SS=bag (should be ball, cutoff LF→home); P=read (should be backup home); no R2, no scenario | LF: ball; SS: ball→(30,72); P: backup home; 3B: read |
| cutoff-triple-rcf | WRONG | Stubs; no tandem relay represented; neither 2B nor SS=ball; neither RF nor CF=ball; 3B=bag (OK); no scenario | 2B: ball→(70,22); SS: ball→(58,34); RF or CF: ball; P: backup 3B/home; LF: backup |
| no-one-on-ball-in-gap | EDIT | P backup path ends at (18,85) — foul territory; SS=ball with no runners ambiguous; 0 context shifts; only scenario in set | Fix P path to (24,72) or (50,88); clarify SS role; add weather shifts |
| runner-2nd-single-rf | WRONG | Stubs; RF=backup (should be ball); 2B=bag (should be ball, cutoff RF→home); P=read (should be backup home); no R2, no scenario | RF: ball; 2B: ball→(65,62); P: backup home; SS: bag; 3B: read; add R2 |
| 1-3-3-1-putout-relay | WRONG | Slug misnomer (scoring "3-3" invalid); 1B=ball (should be bag receiving throw); stubs; vague coaching; no scenario | Rename to `comebacker-p-to-1b` (scored 1-3); 1B: bag at (76,70); P: ball→1B→re-cover; RF: backup 1B |
| backpick-c-to-1b | EDIT | R1 actor absent (critical); stubs; vague LF/CF coaching; 3B/2B bag OK; 0 scenarios | Add R1 at (76,78) execute; C path (50,96)→(76,70); 1B sneak to (78,68); P side-step; RF backup (84,62) |

**Top 5 fixes:** 1) Correct assignment values across 6 relay plays  2) Replace all (50,50) stub paths with real choreography  3) Rename 1-3-3-1 + fix 1B role  4) Add missing R1/R2 runner actors  5) Fix `no-one-on-ball-in-gap` P backup path
## Bucket D — 1st-and-3rd / Steals / Rundowns (13 situations)

**Verdict counts:** 8 WRONG · 5 EDIT · 0 OK

### Global defects
- G1: `primary_path=[{50,50}]` stub on every actor in 13/13 slugs
- G2: Zero rows in `iq_actor_context_shifts` for any slug
- G3: 12/13 slugs have ZERO scenarios (only `off-steal-2b` has 3)
- G4: 9/13 slugs have placeholder text everywhere ("Standard coaching", "Out of position", "Anticipate pre-pitch")

### Per-slug
| slug | verdict | issues | proposed_fix |
|---|---|---|---|
| first-and-third-double-steal | WRONG | G1–G4; C=read wrong (should be ball) | C→ball; write real actor notes; 2 scenarios; swing_side context shifts |
| first-third-r1-steals-r3-breaks-late | WRONG | G1–G4; C=read wrong; no differentiation from sibling slugs | C→ball; differentiate ("R3 reads throw, breaks late; SS tag fast"); paths |
| first-third-r1-steals-r3-holds | WRONG | G1–G4; C=read wrong | C→ball; note "R3 not breaking — release throw to 2B; call 'Two!'" |
| first-third-r1-walks-r3-steal-home | WRONG | G1–G4; C=read wrong; no walk context | C→ball/execute; add walk-trot context; outs/count gating |
| first-third-r3-breaks | EDIT | Only slug with real actor text; G1–G3 apply; C call "four!" wrong (should be Two!/Cut!) | Fix C call → "Two!"; rewrite P note; 2 scenarios |
| first-third-softball-defense | EDIT | G1–G3; no circle-rule reference; C=execute (should be ball) | C→ball; add P note re: no-leads/pitch-release timing |
| off-steal-2b | EDIT | G1–G2; 3 scenarios but R1-only; no swing_side gate for SS-vs-RHH/2B-vs-LHH | Add swing_side shifts (SS=bag vs RHH, 2B=bag vs LHH); softball pop benchmark |
| catcher-pop-time-r1-steal | EDIT | G1–G3; SS+2B both bag without swing_side gate (both show as covering 2B) | Add swing_side context shifts; coverage note |
| catcher-throw-3b-r2-steal | WRONG | G1–G3; SS=bag WRONG (3B covers, not SS); malformed comm_call; missing rare-vs-RHH note | SS→backup; SS call "Got it!"; add summary re: viable vs LHH primarily |
| rundown-r1-between-1-2 | WRONG | G1–G4; 1B+2B both bag (should be execute trappers); SS/P should be backup | 1B→execute, 2B→execute, SS/P→backup; one-throw principle in notes |
| rundown-r2-between-2-3 | WRONG | G1–G4; SS+3B both bag (should be execute) | SS→execute (lead chase to 3B), 3B→execute, 2B/P→backup |
| rundown-r3-between-3-home | WRONG | G1–G4; C=read WRONG (C is the home plate trapper) | 3B→execute, C→execute, P→backup |
| infield-fly-r1-r2 | EDIT | G1–G3; 2B=ball + note "Backup catch" contradictory | 2B→backup; rule-based scenario; outs gate |

**Top 5:** 1) Purge placeholder block in 9 slugs  2) Add scenarios to 12 slugs  3) Fix C=read across 4 first-third variants → ball  4) Fix catcher-throw-3b-r2-steal SS coverage  5) Fix all 3 rundown trapper assignments
## Bucket E — Offense / Baserunning / Hitting (16 situations)

**Verdict counts:** 3 WRONG · 13 EDIT · 0 OK

### Structural / global defects
- S-1 CRITICAL: `GameIqSituation.tsx` only iterates `DEFENSIVE_ROLES` → BAT/BR/R1/R2/R3 actors never render a teach card; every offense slug is functionally broken in teach mode
- S-2 HIGH: `contextShifts.ts SHIFTS` has zero entries for R1/R2/R3/BR/BAT → context panel produces no visual shift or note for any baserunner
- S-3 HIGH: `iq_actor_context_shifts.context_axis` CHECK constraint has no `lead_type`, `secondary_timing`, `jump_read`, `pickoff_look`, `contact_read` — can't author baserunner-specific axes
- S-4 MEDIUM: `position_focus` single-string field can't represent compound R1+R3+BAT scenarios
- S-5 MEDIUM: `bulkImport.ts` doesn't enforce `sport='baseball'` on lead/pickoff slugs (illegal for softball — look-back rule)
- S-6 INFO: All 16 slug content lives in DB only — not in migration files

### Per-slug
| slug | verdict | issues | proposed_fix |
|---|---|---|---|
| off-avoid-tag-home | EDIT | S-1; only 1 scenario | Render BAT/BR; 2 scenarios (slide-by vs bobble-sweep) |
| off-first-and-third-offense | EDIT | S-1, S-4; sport gating risk | Render R1/R3/BAT; clarify if delayed-steal → baseball-only |
| off-first-to-third | EDIT | S-1; missing plus_runner shift | Render BR; "inside the bag turn"+"read coach at 1/3"; plus_runner shift |
| off-hit-and-run-hitter | EDIT | S-1; no swing_side shift; must say "swing at anything" | Render BAT; add swing_side shifts |
| off-hitters-count | EDIT | S-1; 2 states need 2 scenarios | Render BAT; hitter-count vs pitcher-count scenarios |
| off-lead-from-2b | WRONG | S-1, S-3; **must be baseball only** | sport='baseball'; add lead_type axis |
| off-leadoff-ab | EDIT | S-1; no scenarios | Render BAT; 1st-pitch FB vs off-speed scenario |
| off-lhp-pickoff-tells | WRONG | S-1, S-3; **baseball only**; verify 45° rule | sport='baseball'; pickoff_look axis; cite 45° rule |
| off-line-drive-freeze | EDIT | S-1 | Render runners; "1-step return; don't run on contact" scenario |
| off-primary-secondary-1b | WRONG | S-1, S-3; **baseball only**; verify 3.5-stride + 2-shuffle | sport='baseball'; lead_type axis |
| off-r3-less-than-two | EDIT | S-1; needs 3 read scenarios | Grounder/LD/fly to OF — 3 scenarios |
| off-rundown-survival | EDIT | S-1 | Render BR/R1; "lengthen rundown to advance trailers" |
| off-score-from-2b | EDIT | S-1; no gap-vs-single context | Add gap context; LF-single vs RF-single scenarios |
| off-tag-up-3b | EDIT | S-1; **rule precision risk** — must say "ball secured" not "first touch" for amateur | Verify wording → "secure catch, both feet planted, THEN break" |
| off-two-strike-approach | EDIT | S-1; no 2-strike pitch-type axis | Render BAT; spoil-tough-pitch scenario |
| hit-by-pitch-r1 | EDIT | S-1; verify forced/non-forced logic | Render R1/BAT; distractor "R1 forced to 3rd" |

**Top 5 fixes:** 1) Fix S-1 in GameIqSituation.tsx (one-line change unlocks all offense teach cards)  2) Set 3 lead/pickoff slugs to sport='baseball' + add bulkImport guard  3) Populate baserunner entries in SHIFTS  4) Add lead_type / pickoff_look context axes  5) Verify tag-up-3b break cue says "ball secured"
## Bucket F — Softball-only + Catcher + Wild Pitch + Misc (27 situations)

**Verdict counts:** 4 WRONG · 19 EDIT · 4 OK

### DB reality
- 21 published `sport='softball'` slugs + 6 cross-listed `sport='both'` target slugs
- 0 rows in `iq_actor_context_shifts` for any softball slug
- `getContextValues('softball')` correctly returns softballOnly options (slap/rise/drop)

### Per-slug
| slug | verdict | issues | proposed_fix |
|---|---|---|---|
| appeal-leaving-base-early | WRONG | "before pitch reached plate" — NCAA 12.21 trigger is ball leaving pitcher's hand; 2B+SS both bag (duplicate); 0 scenarios | Fix summary → "before pitch is released"; dedupe SS=cover, 2B=trail; scenarios |
| change-up-strategy-softball | EDIT | 0 scenarios; C "Frame middle" vague; missing offense lens | Add offense lens; "Low-away target"; 3 scenarios |
| courtesy-runner-pitcher-catcher | WRONG | "with 2 outs" — NCAA 8.10 allows CR any inning; P actor idle (should be read) | Remove "2 outs"; P=read with note about CR request |
| drop-ball-strategy | EDIT | 0 scenarios; topspin/peel-drop grip not stated | Add P note re: topspin/peel grip; 3 scenarios |
| drop-third-strike-softball-r0 | OK | Rule + scenarios accurate; sources NFCA+WBSC | — |
| first-third-softball-defense | EDIT | R1 and R3 actors absent; look-back/circle rule teaching lost; 0 scenarios | Add R1=read "circle = decide now"; R3=read "freeze on P decision"; add baserunning lens |
| flat-ground-spin-rise-grip | EDIT | 0 scenarios; missing wrist-snap direction (12 o'clock up) | Add P note "snap wrist up at release"; 3 scenarios |
| illegal-pitch-reaction-batter | EDIT | P "Adjust grip" wrong — illegal pitch = footwork (leap/crow-hop/drag); R1-3 "Advance" should specify ONE base per NCAA 10.5 | Fix P cue to "check drag/leap foot"; runners "advance one base (penalty)" |
| illegal-pitch-softball-r0 | WRONG | Sources cite MLB.com + ABCA Pitching on softball-only rule; missing offense lens; 0 scenarios | Replace sources → NCAA Softball Rule 10.5 + NFCA Umpire Manual |
| intentional-walk-softball | EDIT | P "step off" wrong — NCAA auto-IBB requires only coach/P signal; 0 scenarios | Fix P note → "signal umpire from rubber/circle" |
| look-back-rule-r1 | EDIT | R1 elite_cue reads defensive; 0 scenarios; missing OF actors | Fix R1 cue → "commit immediately, no hesitation = out"; add LF/RF |
| re-entry-rule-pinch-hit | OK | NCAA re-entry accurate; 3 scenarios correct | — |
| rise-ball-2-strike-approach | WRONG | Scenario says zone bottom = "bottom of sternum" — NCAA Rule 1 zone bottom = top of knees | Fix → "back shoulder to top of knees" |
| rise-ball-strategy-pitcher | EDIT | 0 scenarios; missing 12→6 backspin axis note; OF "Shallow" common_mistake inverted | Add 4-seam backspin note; OF common_mistake → "play shallow" (true mistake) |
| short-game-dp-flex-rule | OK | DP/FLEX accurate; 3 scenarios | — |
| slap-bunt-fake-swing | OK | Scenarios present; sources good; minor R1 wording acceptable | — |
| slap-hard-lhh-r0 | EDIT | SS "Range left" WRONG — LHH 4-hole slap goes to right side, SS ranges right; 0 scenarios | Fix SS → "range right, cover 2B hole" |
| slap-power-lhh-r0 | EDIT | 0 scenarios; 2B "trail relay" needs cutoff specifics | 2B note "cutoff LCF gap relay"; scenarios |
| slap-r1-rotate | EDIT | 0 scenarios; R1 actor missing; P "recover" vague | Add R1 execute "leave on release"; P "be third infielder on weak slap" |
| slap-r2-rotate | EDIT | 0 scenarios; 2B "backup" assignment suspect; R2 actor missing | Verify 2B assignment; add R2 read; scenarios |
| slap-soft-lhh-r0 | EDIT | "pitching" lens incorrect; 0 scenarios; charging assignments vague | Swap pitching→offense lens; 1B/3B charging notes |
| catcher-block-r2 | EDIT | 0 scenarios; sources cite ABCA Pitching (wrong); R2 actor missing | Source → ABCA Catcher Manual; R2 read "advance to 3B on dirt block" |
| catcher-frame-borderline-low | EDIT | 0 scenarios; P elite_cue "Spin down" unrelated to framing | Fix P → "sell with posture, stay low in finish" |
| fake-bunt-slash-r1 (cross-listed) | EDIT | R1 actor absent — R1 stealing is core of play; 0 scenarios | Add R1 execute "fake bunt = green light steal"; scenarios |
| slow-roller-3b | EDIT | C "walk-up cover home" wrong for R0; 0 scenarios | C → backup standard; scenarios |
| wheel-play-r1-r2 | EDIT | R1 and R2 actors absent; 0 scenarios | Add R2 execute "score on contact, 3B vacated"; R1 execute "advance" |
| wild-pitch-r3 | EDIT | R3 actor absent — entire point of play; 0 scenarios | Add R3 execute "break on dirt, read C body not ball" |

**Top 5:** 1) Fix CR "2 outs" rule  2) Fix appeal "reached plate" → "leaves hand"  3) Fix rise-ball zone "sternum" → "top of knees"  4) Replace MLB sources with NCAA on softball-rule slug  5) Add missing R1/R2/R3 actors to wild-pitch-r3, wheel-play, first-third-SB, fake-bunt-slash

---

## Approval workflow

Per the (B) decision: **no writes will occur until you approve.** I recommend tackling fixes in this order:

1. **Phase 0 — Rule/fact corrections (18 items above).** Highest player-safety and credibility risk. Mostly text edits.
2. **Phase 1 — System fixes:**
   - Render offense actors in `GameIqSituation.tsx`
   - Add `lead_type` / `pickoff_look` / `secondary_timing` to `context_axis` CHECK constraint
   - Add `bulkImport.ts` validator enforcing sport gating
   - Seed baserunner entries in `contextShifts.ts SHIFTS`
3. **Phase 2 — Stub purge.** ~12 slugs with "Standard coaching" placeholder text.
4. **Phase 3 — Path choreography.** ~80 slugs needing real coordinates (use `runner-1st-sac-bunt`, `comebacker-r1-double-play`, `mound-visit-runners-12-no-outs`, `no-one-on-ball-in-gap` as internal templates).
5. **Phase 4 — Missing runner actors.** ~30 slugs.
6. **Phase 5 — Scenario authoring.** ~90 slugs at 0 scenarios (target 3 each).
7. **Phase 6 — Context-shift seeding.** Author `iq_actor_context_shifts` rows for the highest-leverage axes.

**Please tell me:**
- (a) Approve Phase 0 (rule/fact corrections, 18 items) for me to apply in one batch?
- (b) Approve per-slug or per-bucket?
- (c) Or full sweep — approve everything and I work top-to-bottom?
