# Tissue Cost Scheduler v1.1 — Addendum
**Owner direction, 2026-09-20 (second round). Extends `tissue-cost-scheduler-v1.md`. Same stage discipline: pure code + tests first, then shadow, then live.**

## 0. Owner confirmations
- "3 days between" = lift Monday, next lift Friday. "2 days off" = lift Day 1, next lift Day 4. Confirmed.
- **Never cookie-cutter.** Every lift day is chosen by calculation, and every choice carries a reason.
- **Nothing ever comes up empty.** The 3-day fallback guarantees a decision, and a card, even when something fails (§1).
- **No causation language anywhere** (legal). Correlations and predictions only, each with a confidence label (§4).

## 1. Circuit breaker — nothing ever comes up empty
- `decide()` runs inside a guard. Any exception, a run over 200 ms, or an invalid output returns the **fallback decision**:
  - 3 full rest days after the last lift
  - class M at most
  - reason: "Standard spacing today."
- Every fallback writes a diagnostic.
- The card is always generated (L0.1).
- Fallback rate is monitored: alert if it goes above 0.5% of the day's decisions.

## 2. Personalization — athletes like you first, then you
The scheduler learns each athlete, starting from what works for similar athletes.

**Outcome signals (measured, never claimed).** After each session, a Session Outcome Score (SOS) is computed from whatever exists:
- estimated-max trend on the main lift
- reps completed at target load
- load compliance
- jump, sprint and velocity tests
- next-day check-in
- cut-short sessions

Each signal is scored against the athlete's own rolling baseline.

**What is learned.** How that athlete's SOS moves with rest days and tank levels at session time. This produces a personal recovery multiplier per tank.

**Similar athletes (cohort prior).** The starting multipliers and their uncertainty come from matching athletes:
- same sport
- same position group
- same age band
- same sex
- same training-age band
- same phase

Later, nearest neighbours on load-and-response history are added.

**Blending (empirical-Bayes shrinkage).**
`personal = (n × athlete_estimate + k × cohort_estimate) / (n + k)`, with k = 12 sessions (tunable).
- No athlete data → pure cohort.
- No cohort data → v1 config defaults.

**Minimum-data gates.**
- Cohort estimates are used only with ≥ 30 athletes and ≥ 300 sessions.
- Personal estimates are used only after ≥ 8 logged sessions.

**Best future outcome.** Among the days the floors allow (floor … ceiling), pick the day with the highest predicted SOS over the next 14 days. The pick must respect:
- games
- block goals
- each quality track getting ≥ 1 exposure per week

A tie goes to the 3-day default. The pick is deterministic.

**Guardrails.**
- Learned multipliers are bounded 0.85–1.35.
- Change is capped at ±5% per week, so nothing jumps.
- Floors and hard rules never move.
- Every learned change is versioned and explained, e.g. "Your best sessions came after 3 days off — keeping that."

## 3. Silent Signals — see what a tough athlete won't say
**Logging (optional, one tap).**
- Done / Skipped / Cut short, plus an optional "How hard? 1–10".
- Optional per-set load and reps, pre-filled with the target weight, so logging is a confirm tap.

**Target weight.**
- Estimated max comes from the best recent logged set with 0–4 reps in reserve (Epley formula, conservative).
- Target = estimated max × the prescribed intensity, rounded to 5 lb.
- Foundation and youth athletes see a target from last session's load and reps. No percentage is shown to them.

**Signals** (per session, rolling):

| Signal | Fires when |
|---|---|
| Under-target | logged ÷ target load < 0.90 on 2 of the last 3 sessions of a pattern |
| Over-target | logged ÷ target load > 1.10 (overreach risk, weighted higher for youth) |
| Rep shortfall | completed reps < prescribed at the target load |
| Effort mismatch | "How hard" reported low while load or reps drop, or reported high at the usual load |
| Strength dip | estimated max down > 5% vs its 28-day best across 3 sessions |
| Avoidance | repeated swaps or skips of the same body region or pattern |
| Side-to-side gap | per-side results differ > 12% |
| Skip clustering | skips bunch up after games or travel |
| Cut-short rise | cut-short rate trending up |
| Check-in mismatch | check-in always perfect while performance signals fall |
| Test drop | sprint, jump or velocity drops at the same effort |

**Response — no admission required.**
- Signals feed the scheduler (thresholds and tank multipliers) and today's session: reduce, never remove, or swap the region to a safer variant.
- Copy stays neutral: "We set today to match your last few sessions." Never "hurt", "weak" or "injury".
- Reported pain still triggers the existing pain rules.
- Signals are used for programming only. They are never shown to scouts. Coach visibility is a later owner decision.

## 4. Predictions and correlations — never causation
**Forecasts** (each with an uncertainty band and "based on your data + N similar athletes"):
- best next lift day
- next-week readiness
- progress track for estimated max, sprint, jump and velocity

**Correlation board.**
- A pre-chosen list of questions, within-athlete and cohort-level.
- False-discovery control across the list.
- Labels: "strong pattern", "possible pattern", "not enough data yet".

**Language rules (legal).**
- Allowed: "linked with", "tends to go with", "predicts".
- Never: "causes", "because of", "prevents injury", or any medical claim. Use "load risk", never "injury risk".

**Accuracy watchdog.**
- Every prediction is stored and later scored against the real outcome, with a weekly calibration report.
- Any model that does worse than the simple default is switched off automatically and falls back to rules. This is the drift guard for the learning parts.

## 5. Catchers and deep knee bend — optimized
Replaces "never for catchers."

**Why.** Catchers spend long periods in deep knee bend, so they need **more** deep-flexion capacity, not less. The only risk is stacking heavily loaded deep bending on top of game volume.

**Offseason.** Catchers get priority deep-flexion capacity work, progressed through B1–B2:
- short-range → full-range split squats
- deep squat patterning
- knee-over-toe work
- tibialis and calf work
- hip internal rotation and adductor work
- controlled tempo

Eccentric-overload rules are unchanged.

**In-season.** Deep-flexion capacity work is allowed, dosed by games caught:
- bodyweight or light load, controlled, short sets
- `kot_atg_split_squat` is allowed at low volume
- best placed after a non-catching day or before an off day
- never heavy loaded deep squats

Innings caught feed the Muscle and Connective tanks.

**Doc corrections.** In `training-intelligence-v1.md`, both "never for catchers" phrases (D1 and the §9.3 Lift B row) become "for catchers, dosed by games caught (tissue-cost-scheduler-v1.1 §5)".

## 6. Exercise coverage — every method fully stocked
**Rule.** Every role below needs **≥ 3 legal options** in each phase that uses it, across:
- three equipment tiers: full gym, minimal, none
- two age bands: 13–15 and 16+

**Roles:**
- heavy-triples main lifts (dead-stop trap bar, pin squat, block pull, box squat)
- banded-velocity lifts
- overcoming isometrics (pin press and pull, mid-thigh pull, wall drive, split-stance hold)
- double-eccentric lifts
- Tier 1, Tier 2 and Tier 3 jumps
- the three sled tools plus no-sled substitutes
- ACL Shield landing and deceleration drills
- pre-game elastic primers
- Growth Mode mobility
- catcher deep-flexion capacity progression
- softball windmill arm care
- B4 contrast pairs
- max-velocity build-ups
- fast eccentrics (drop-catch split squat, push jerk, supine chest pass)
- tissue / knee-over-toe progressions (tibialis, knee-over-toe, backward drag)

**Gear tags and age.**
- New equipment tags `hill` and `overspeed_cord` go on the hill, tow and overspeed rows, so they are only given with access.
- Overspeed and tow rows: 16+ and advanced.

**Process.**
1. Coverage audit table: role × phase × age × equipment.
2. Fill every gap with new rows named under the Appendix A naming law, with no outside branding and every field filled. Insert them **inactive**.
3. Owner/Claude review of names and tags.
4. Activate in batches of 20, with a matrix proof after each batch.

**Emphasis.** The owner's emphasis on connective tissue and whole-body elastic function (including radial expansion) is Hammers method (E3). It guides selection and dosing. Athlete copy never states mechanisms as fact.

## 7. Tests — two tiers (replaces the single 100k run in v1 §7)
- **Fast tier**, on every build and CI-blocking: ≥ 2,000 simulated seasons, all golden scenarios, all chaos inputs.
- **Full tier**, a nightly scheduled job with stored results: ≥ 100,000 simulated seasons. A failure raises an alert and blocks the next release.
- **New invariants:**
  - Personalization never breaks floors or hard rules.
  - With zero data, output is identical to v1.
  - More load still never gives an earlier lift.
  - Missing data never fires a signal.
  - Signal copy is always neutral.
  - Predictions are scored for calibration.
- **Determinism:** the nightly recompute must match 100%.

## 8. Finish line — "done" means all of this is live and green
**Stages:**
- TI-0a-2
- TI-0b
- TCS S1–S4
- personalization
- Silent Signals and one-tap logging
- forecasts and correlation board
- exercise coverage
- TI-4 offseason arc
- TI-5 in-season
- TI-6 personalization and copy

**Evidence:**
- fast and full test tiers green
- nightly determinism 100% for 14 straight days
- fallback rate < 0.5%
- zero audit fatals
- generation matrix 100% cards
- a real phone screenshot of a real lift card
