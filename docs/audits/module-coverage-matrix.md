# Module Roadmap Coverage Matrix

_Audit date: 2026-08-22. Question asked of every training module:_

1. **Emit** — does the module record what the athlete actually did?
2. **Prescribe** — does a weakness there turn into prescribed work?
3. **Re-check** — does a later check say whether it moved?

Engines involved: `supabase/functions/hie-analyze/index.ts` (weakness scoring,
prescriptive drills, before/after trends), `src/lib/hammer/prescription/dailyPlan.ts`
(the plan the athlete sees), `src/lib/gp/roadmapDeltas.ts` (7-day game deltas).

| Module | Emit | Prescribe | Re-check | Gap |
|---|---|---|---|---|
| Hitting | Yes — `micro_layer_data`, `gp_at_bats` | Yes — hitting weaknesses → drill rotations | Yes — `composite_bqi` trend | Daily plan's hitting block is season/tier driven, not weakness driven |
| Pitching | Yes — `micro_layer_data`, `gp_pitches` | **Yes (fixed this pass)** — `zone_pct`, `*_command`, `miss_direction` now prescribe command work | Yes — `composite_pei` trend | Daily plan pitching workload still role/recovery driven |
| Throwing | Yes — EASS throwing block, defense throw accuracy | Partial — L/R asymmetry adds activation work | No | No throwing weakness category; no accuracy/velo trend |
| Fielding | Yes — `analyzeFieldingMicro` | Yes — 5 drill families | Yes — `composite_fqi` | Daily plan defense block independent of weakness clusters |
| Catching | **No** | No | No | No blocking/framing/pop-time emission at all |
| Base running | Yes — `analyzeBaserunningMicro`, `gp_baserun_events` | Yes — jump/read/base-path drills | Partial — no composite in trends | Needs a baserunning composite for longitudinal proof |
| Speed | Yes — `speed_sessions`, speed-lab micro | Yes (two disconnected paths) | Partial | `selectSpeedFocus` does not consume detected stride inefficiency |
| Lifts | Partial — `vault_performance_tests`, block metrics | No | No | Open loop: no strength weakness detection |
| Bat speed | Partial — target + drill tag only | Indirect (treats hitting weakness) | No | No measured bat-speed metric to re-check |
| Conditioning | Weak — output only | No | No | Prescribed off fatigue side-effects; never tracked as its own module |
| Arm care | Weak — embedded in throwing load model | Partial — workload proxy | No | No independent arm-care quality/compliance signal |
| Nutrition | Yes — `vault_nutrition_logs` | Yes — deficiency alerts in Nutrition Hub | Yes — rolling nutrient trends | Daily plan nutrition card is generic, ignores detected deficiency |
| Hydration | Yes — `hydration_logs` | Partial — static safety cue | No | Logged but never analyzed |
| Mental | Yes — focus quizzes, journal | Yes — mental routine / distraction drills | Partial | No readiness composite in trends |
| Sleep | Yes — `sleep_quality` | Partial — same-day readiness penalty | No | No longitudinal sleep tracking or remediation content |
| Game IQ | Yes — spaced-repetition reps in daily plan | Partial — role/season driven | No | Scenario accuracy is not scored back into weakness/mastery |
| Game performance | Yes — full `gp_*` set | Yes — `computeRoadmapDeltas` weakness chips | **Yes** — explicit 7-day prior-window comparison | Only chase/whiff/K/miscue covered |

## Systemic findings

1. **Two engines, one athlete.** `hie-analyze` detects weakness and prescribes;
   `dailyPlan.ts` builds the plan. For hitting, fielding, and speed they run in
   parallel without a bridge — the loop closes on the HIE surface, not inside
   Hammers Today.
2. **No emission** for catching, conditioning sessions, and arm-care quality.
   Nothing can be scored weak because nothing is recorded.
3. **Emit-but-no-detect**: lifts, bat speed, hydration, sleep.
4. **Detect-but-no-recheck**: throwing, baserunning, bat speed, Game IQ, mental.
5. Game performance is the only complete three-stage loop and is the template
   the other modules should be brought up to.

## Fixed in this pass

- Pitching weaknesses (`zone_pct`, `*_command`, `miss_direction`) now generate
  concrete command/mechanics drill rotations instead of scoring silently.

## Recommended order for the remaining work

1. Bridge `weakness_scores` into `dailyPlan.ts` so hitting/fielding/speed
   prescriptions appear in the plan the athlete actually opens.
2. Add emission for catching (blocking, framing, pop time) and conditioning
   sessions — the two true blind spots.
3. Add composites for baserunning and readiness so their loops can close.
4. Analyze hydration and sleep longitudinally instead of same-day only.
5. Score Game IQ scenario responses back into mastery (already stored per
   attempt in `iq_user_attempts`; needs a weakness/trend consumer).
