> **Live status (Step 28 audit, 2026-09-25):** Built and LIVE only when rest_day_calculator is on (currently Off, awaiting three clean nights). Hard rules in tissueCost/apply.ts are always live.

# Tissue Cost Scheduler v1 (TCS)
### The on-the-fly rest-day calculator for Hammer's Today

**Status:** APPROVED DIRECTION — owner decisions D1–D3, 2026-09-20. Built in stages S1–S4. S1–S2 have zero production effect. S3 runs in shadow (logs decisions, changes no cards). S4 goes live behind `training_intel_v1` only after the owner reviews the shadow report.
**Supersedes:** `training-intelligence-v1.md` §6.2 fixed rest days (H = 3 / M = 2 / L = 2). Keeps §6.1 session classes, §6.3 same-day order and §6.4 high-low placement.
**Amends plan-v4 L0.3** as stated in §0 (owner decision D1).

---

## 0. Owner decisions (2026-09-20)

- **D1 — Timing.** In-season, every athlete lifts **post-game, never pre-game**. In every phase, every athlete lifts **after skill work** on the same day (owner's tissue law: skill first, lift after). Days between lifts are **calculated from tissue cost**; **3 full rest days is the safe default.**
  L0.3 amended: "never on a game day" → "never before the game on a game day; post-game only when the scheduler clears it". "Max 2 lifts per week" → replaced by the scheduler's floors (§4). Unchanged: no eccentric overload in-season (TI-0a-1 guard), RIR ≥ 3 in-season, no novelty in-season, starting-pitcher protections, tournament days and doubleheaders = no lift. Post-game sessions: ≤ 25 min, ≤ 4 movements + arm care, content scaled by eligibility (heavy-eligible vs Foundation).
- **D2 — Rest days calculated on the fly** from all available information, weighted by tissue cost. This file is that calculator.
- **D3 — Depth drops** (land and hold) in B2 Absorb; **depth jumps** (rebound) in B4 Speed & Power; drops stay the B4 fallback for athletes who haven't earned jumps.

Interpretation to confirm with the owner: "3 days between" = three full rest days (Mon → Fri), as in the offseason law. In-season the owner's A/B note is lift every 3rd day (Day 1 → Day 4 = two full rest days), so the in-season reference case is 2 rest days and the in-season floor is 2.

---

## 1. What it decides — every athlete, every day

1. Is a lift allowed today, and at which class: **H**, **M**, **L**, or none (→ Recovery & Tissue card)?
2. When: after skill work; in-season, after the game.
3. The **next day a heavy (H) lift is allowed**.
4. One or two plain-English reasons.

---

## 2. Inputs (read-only; every missing input has a safe default)

| Input | Source | If missing |
|---|---|---|
| Lift sessions: class, method, sets, reps, RIR/RPE, contacts, yards | `wk_prescriptions`, `wk_session_logs` | prescribed counts as done unless marked skipped |
| Games: count per day, doubleheader, tournament, position, innings/pitches when logged | `gp_games`, `calendar_events`, `athlete_daily_log.game_logged` | a scheduled game = one standard game at the athlete's primary position |
| Practices: kind, intensity, minutes | `scheduled_practice_sessions` | none that day |
| Throwing | `throwing_reps`, logged game pitches | position default on game days |
| Sprints and jumps outside the lift | `speed_sessions`, `wk_session_logs` | none |
| Check-in: sleep, soreness (+ where), pain (+ where), day status, injury mode | `vault_focus_quizzes`, `athlete_daily_log` | neutral — no bonus, no penalty |
| Athlete: age, Growth Mode, training-age band (classifier's 6 bands), sport, position, phase and block | existing | existing defaults |
| Upcoming: games next 72 h, pitcher start dates | calendar / game_proximity_v2 | none |
| Nothing at all (no plan, no calendar) | — | 3 full rest days, class M max |

Live data check, 2026-09-20 (last 60 days): 0 logged lift sets, 0 practices, 0 throws, 2 check-ins, 8 games, 673 prescriptions. The scheduler must be fully correct on **plan + calendar alone**, and get sharper as logging grows (§8).

---

## 3. The model — four tissue tanks

Every activity pours cost into one or more tanks. Every tank drains each day.

| Tank | Filled most by | Default half-life |
|---|---|---|
| **Nerve** | heavy triples, banded speed, overcoming isometrics, max sprints, Tier-3 jumps, max-intent throws | 1.0 day |
| **Muscle** | eccentric and double-eccentric work, lifting volume, game and practice running, catching | 1.5 days |
| **Connective tissue** (tendon and fascia) | jump contacts by tier, sprint yards, sled, landings, cutting, games | 2.5 days |
| **Arm** | throws and pitches (Pitch Smart stays the hard cap) | 1.5 days |

Daily update: `level(d) = level(d−1) × 0.5^(1 / half_life_adjusted) + cost(d)`.

### 3.1 Starting cost table (per unit, all tunable, E3 — Hammers method, never shown to athletes as science)

| Activity (unit) | Nerve | Muscle | Connective | Arm |
|---|---|---|---|---|
| H lift session — heavy triples / banded / isometric main | 40 | 30 | 20 | 5 |
| H lift session — double eccentric (offseason only) | 30 | 50 | 25 | 5 |
| M lift session | 20 | 20 | 10 | 3 |
| L tissue session | 5 | 5 | 10 | 0 |
| Tier-1 jumps (per 10 contacts) | 1 | 1 | 3 | 0 |
| Tier-2 jumps (per 10 contacts) | 2 | 3 | 5 | 0 |
| Tier-3 jumps (per 10 contacts) | 6 | 3 | 8 | 0 |
| Max-effort sprint (per 100 yd) | 8 | 4 | 6 | 0 |
| Game — position player | 15 | 20 | 20 | 10 |
| Game — catcher | 15 | 30 | 25 | 15 |
| Game — starting pitcher | 20 | 15 | 15 | 40 |
| Practice (per 60 min, moderate) | 8 | 10 | 10 | 8 |

Lift session cost scales with prescribed hard sets ÷ reference hard sets, bounded 0.7–1.3. All numbers live in one versioned config (`tcs_config_v1`); every decision stores the config version and hash.

### 3.2 Modifiers (bounded; combined effect capped at ×1.5 slower and ×0.9 faster)

| Signal | Effect |
|---|---|
| Poor sleep or high soreness (check-in) | Muscle and Connective half-life × 1.2 for that day |
| Pain flag on a region | loaded work for that region blocked (existing pain rules); affected tank cost × 1.5 |
| Growth Mode | Connective half-life × 1.25 |
| Training age beginner / developing | costs × 1.15 |
| Training age elite / professional | costs × 0.9 |
| Movement not done in the last 28 days (novelty) | Muscle cost × 1.3 |
| Age 13–15 | no extra multiplier (Growth Mode + Foundation track already cover it) |
| Sex | no multiplier |

### 3.3 Calibration by construction — the 3-day law is exact

Thresholds are **derived**, not guessed. For each class there is a reference case with neutral modifiers (17-year-old, advanced, position player, neutral check-ins):

| Reference case | Owner-law outcome | Threshold defined as |
|---|---|---|
| REF-OFF: offseason, 60-min moderate practice Mon–Thu, H lift Mon after practice | next H allowed Fri (3 full rest days) | each tank's level at Fri session time × 1.15 |
| REF-IN: daily games, position player, Lift A post-game Day 1 | next lift Day 4 post-game (2 full rest days) | each tank's level at Day 4 post-game × 1.15 |
| REF-M / REF-L: same week with an M or L session | next lift 2 full rest days later | level at that session time × 1.15 |

The 15% headroom (tunable) keeps normal variation from moving the day. Only a meaningfully heavier week pushes the next lift later, and a lighter week can never go earlier than the floors.

---

## 4. Hard rules — never computed away

**Floors**
- Offseason and pre-season: after an H session, **≥ 3 full rest days** before the next H or M. After an M or L session, **≥ 2**.
- In-season: **≥ 2 full rest days** between any loaded lifts.

**Hard rules**
- No lift before the game on a game day; post-game only.
- Starting pitchers: no lift on start day; the day before a start is primer only.
- Tournament days and doubleheaders: no lift.
- Pitch Smart rest days: no Hammers pitching or high-intent throwing.
- No eccentric overload in-season or post-season (TI-0a-1 guard).
- Pain rules unchanged.

**Ceiling — reduce, never remove.** If tanks would delay a loaded lift past 5 full rest days (offseason) or 4 (in-season), offer the next lower class instead of nothing, and send a "load pattern" signal to the Reload Detector.

"Days between" = calendar days strictly between two session dates, in the athlete's local time. Skipped sessions never stack.

---

## 5. Decision function (pure — no clock or database reads inside)

`decide(profile, history[−28..0], calendar[0..+3], checkIns, config, today, timezone)`
→ `{ allowedClass, timing, nextHeavyDate, tankLevels, reasons[1–2], floorsApplied, version, configHash, inputsHash }`

1. Build the daily cost series for the past 28 days (lifts, games, practices, throws, sprints, jumps); apply modifiers.
2. Run each tank forward to today's session time. The lift comes after skill work and after the game, so add today's known sport cost first.
3. For H, then M, then L: the class is allowed if every floor and hard rule passes, every tank it loads is at or below that class's threshold, and (in-season) the projected level at the next game start stays under the game-ready line.
4. Choose the highest allowed class, never above what the phase template calls for that day.
5. `nextHeavyDate`: simulate forward on the known calendar with no extra lifts until H is allowed (horizon 10 days).
6. Reasons: map the 1–2 largest contributors to the binding limit onto plain templates, e.g. "You played 3 games in 4 days — one more day before heavy work." or "Short sleep two nights running — we pushed heavy day to Saturday."

The generator (stage S4) never builds a session above `allowedClass`.

---

## 6. Build stages

| Stage | What | Production effect |
|---|---|---|
| **S1** | Engine and config as pure code in `_shared/wic/schedule/tissueCost/`, not wired anywhere | none |
| **S2** | Full reliability suite (§7) | none |
| **S3** | Shadow mode: at generation and nightly, compute every athlete's decision and write it to `wk_schedule_decisions` (inputs snapshot, version, tanks, class, next heavy date, reasons, floors). Nightly determinism check. Weekly shadow report vs current rules. | logs only; no card changes |
| **S4** | Live behind `training_intel_v1` after the owner reviews the shadow report. Card shows the "Next heavy day" chip and reasons. | yes |

---

## 7. Reliability program — so it doesn't break or drift

**Invariants** — checked on every simulated day:
- **I1** Floors and hard rules are never violated.
- **I2** Deterministic: same inputs + same version → identical output.
- **I3** More load never gives an earlier lift or a higher class.
- **I4** A worse check-in never gives an earlier lift.
- **I5** Always returns a valid decision. Never throws, never null or NaN; missing data → documented defaults.
- **I6** Reference cases hit owner law exactly (REF-OFF → 3 rest days; REF-IN → 2; REF-M and REF-L → 2).
- **I7** Hard rules win over every calculation.
- **I8** Calendar-safe across time zones, daylight-saving changes, month and year ends, leap day, and travel.
- **I9** Bounded: next heavy date within 10 days; class never above the phase template.

**Tests**
- **Property-based:** ≥ 100,000 random athlete-seasons of 365 days. Random schedules (0–7 games a week, doubleheaders, tournaments, gaps, travel), random check-ins, random missing data. Assert I1–I9 every day.
- **Golden scenarios** (fixed expected outputs):
  - REF-OFF, REF-IN, REF-M, REF-L
  - Offseason heavy week with extra practice (→ 4 rest days)
  - MLB 6-game week
  - High-school spring, 3–4 games a week
  - Travel-ball tournament weekend
  - Doubleheader
  - Starting pitcher on a 5-day rotation
  - Reliever pitching back-to-back
  - Catcher
  - 13-year-old in Growth Mode
  - Athlete who never logs
  - Return after 21 days off
  - Missing check-ins
  - Cross-time-zone travel
- **Chaos inputs:** duplicated, late, future-dated, negative or garbage rows → safe default plus a diagnostic, never a crash.

**Drift protection**
- Config version and hash are stamped on every decision.
- Any config change requires a version bump and a full golden re-run.
- Nightly: recompute yesterday's decisions from stored inputs; they must match 100%.
- Weekly: distribution report of rest days by age, phase and position; alert on a shift above 10%.
- CI gate: the build fails on any invariant or golden failure.

---

## 8. Insight layer — "no guessing" (spec now, build after S4; needs logged data)

- Every decision is stored with its inputs and reasons, so any day can be replayed and explained ("why did I lift Friday?").
- **Weekly card — "What drove your week":** load by tank, sleep and soreness trend, lifts done vs planned, and the reasons behind each change.
- **Progress view:** outcomes (sprint times, jump tests, bat speed, throwing velocity, strength estimates) shown beside the inputs that led to them.
- **Patterns:** a fixed, pre-chosen list of questions per athlete:
  - sleep → next-day readiness
  - weekly jump contacts → jump test
  - lift spacing → soreness
  - throw count → arm soreness

  A pattern is shown only after ≥ 6 weeks and ≥ 20 paired days, labelled "strong pattern", "possible pattern" or "not enough data yet". False-discovery control applies across the question list.
- **Honesty rule:** for an athlete's own data the app says "linked with", never "caused". Cause statements are used only for research-backed rules and are labelled as research (E1/E2).

**Data capture that makes it smarter** (all optional, so the no-new-required-input law stands):
- One tap after each lift: Done / Skipped / Cut short, plus "How hard? 1–10".
- One tap after each game: played? position? innings or pitch count for pitchers.
- The check-in stays optional; a missing check-in counts as neutral.
