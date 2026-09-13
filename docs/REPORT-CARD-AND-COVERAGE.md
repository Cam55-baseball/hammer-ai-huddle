# Hammers Modality — Report Card, Grading, Competitor Coverage & Combine

Knowledge-transfer reference. Written to be read cold, by someone with no prior context.
Date of this pass: 2026-09-13. Everything below was read out of the live codebase and the
live database, not from memory.

**Correction up front:** the brief asks this document to cross-reference
`docs/MEASUREMENT-INVENTORY.md` as the tile source of truth. **That file does not exist in
this repo.** The equivalent tile-by-tile inventories that do exist, and that this document
defers to rather than duplicating, are:

- `docs/report-card-audit.md` — every tile, its metric key, its source (measured vs. model
  estimate vs. constant), and whether it renders today.
- `docs/asb/report-card-system-reference.md` — verbatim copies of the contract and
  discipline source files.
- `src/lib/reportCard/release1.ts` — the machine-readable visibility list. This is the
  actual enforcement point; the docs describe it.

If a measurement inventory is later created at the path above, the three files listed here
are what it should be built from.

---

## 1. THE REPORT CARD — concept and UI

### What it is

On a video analysis screen the athlete sees a **tab toggle between "Analysis" and "Report
Card"**. Analysis is the narrative coaching output. Report Card is the scored, tile-based
view of the same clip.

### Tile anatomy

Each tile carries:

- metric name
- the measured value with its unit (`0.98s`, `22°`, `82%`)
- a status badge — **ELITE / ACCEPTABLE (PASS) / MISSED (FAIL)**
- threshold text, e.g. `ACCEPTABLE ≥65 · ELITE ≥80` (`thresholdChip` in
  `src/lib/reportCard/types.ts`)
- an explainer: what the metric means, how to fix it, and an encouragement line
  (`TileExplainer` — `whatWhy`, `howToImprove`, `encouragement`)

Four render modes exist (`TileMode`):

| Mode | Use |
|---|---|
| `raw_passed` | raw measurement + a "PASSED X/10" chip |
| `pass_fail` | binary geometric absolutes (stride direction, sequencing, head at release) |
| `raw_pass_fail` | raw measurement with a PASS/FAIL badge |
| `score_meter` | 0–100 score drawn as a **ring**, with separate acceptable and elite arcs |

Visual intent: meter-driven, in the spirit of Teammstrd's dial readouts, expressed on the
20–80 scouting scale the way Pelotero presents grades, rendered in Hammers' own palette
(semantic design tokens only — no hard-coded colours).

Some tiles are marked `nonNegotiable`. A non-negotiable failure caps the card's letter
grade: one failure caps at 60 (D), two or more cap at 40 (F) — `src/lib/reportCard/grade.ts`.

### THE CRITICAL RULE

**A tile only appears if it produces a genuinely measured value.** A tile whose underlying
measurement is a language model's opinion, a constant, or an uncalibrated guess is hidden
behind a kill switch. An honest short report card beats a full fabricated one.

Enforcement lives in `src/lib/reportCard/release1.ts`, which classifies every metric key:

- `VISIBLE` — landmark-backed end to end. May render and may feed scores.
- `HIDDEN` — LLM-derived. Must not appear on any athlete surface, trend, recommendation,
  pillar contribution, or coaching output.
- `SHOWCASE_FUTURE` — pose-derivable in principle, blocked on calibration, object tracking,
  or a release anchor that does not exist yet. Suppressed now, reversible later without
  new doctrine.

### Current honest-tile count

**Two metric keys are VISIBLE today:** `tempo_sec` and `shoulder_tilt_deg`.

| Discipline | Tiles defined | Tiles that reach a screen |
|---|---|---|
| Baseball Pitching (`disciplines/bp.ts`) | 9 | **2** — Tempo and Shoulder Tilt at Release |
| Throwing (`disciplines/throwing.ts`) | BP minus Energy Angle / Tempo / Lift & Thrust | **1** — Shoulder Tilt at Release |
| Hitting, both sports (`disciplines/bh.ts`) | 18 | **0** — `RELEASE1_HITTING_SUPPRESSED = true` |
| Softball Pitching (`disciplines/sp.ts`) | 13 | **0** — all 13 keys are SHOWCASE_FUTURE |

Of those, exactly **one is a deterministic measurement of the athlete's body: pitching
Tempo**, computed in our own code from pose frame anchors (`computeTempoSec` in
`src/lib/biomech/metrics/tempoSec.ts`). Shoulder Tilt at Release is still a vision-model
estimate and is visible on sufferance, not on proof.

Why each group is hidden:

- **Energy Angle, Lift & Thrust, Hip/Shoulder Separation, Head Stability** — the vision
  model returned the same number on every clip (constant, not a measurement) or returned
  `missing` on 12 of 12 clips. Audited in
  `docs/asb/ai-vision-metric-variability-audit.md`.
- **Bat speed, time to contact, on-plane %, bat path** — no bat detector and no contact
  anchor exist. A speed in mph with no object tracking and no calibration is invention.
- **All 0–100 hitting judgement tiles** — model opinion formatted as a measurement.
- **Stride length, glove drift, head at release, the 13 softball windmill checkpoints** —
  need calibration or a release anchor we do not have.

Also worth knowing when reading a screen: the big "efficiency score" on an analysis is a
model estimate with a hard-coded default of 75, and PIE V2 confidence values (60 / 80 / 92)
are constants, not computed. Both are documented in `docs/report-card-audit.md §5`.

---

## 2. GRADING SYSTEM

### The scale

- **20–80 scouting scale.**
- **50 = current professional average** — MLB for baseball, AUSL for softball.
- **80 = the elite ceiling**, anchored on the all-time record. It only moves when a real
  record is set.
- **20 = the MLB/AUSL floor. It is not the app's floor.**

Constants: `MLB_FLOOR_GRADE = 20`, `GRADE_MAX = 80`, `GRADE_MIN = 0` in
`src/lib/benchmarks/gradeScale.ts`. There are no age bands — one MLB-anchored curve per
metric per sport, for everyone.

Labels: 20 poor · 30 well below average · 40 below average · 45 fringe · 50 average ·
55 above average · 60 plus · 70 plus-plus · 80 elite. Fallback when a metric cannot be
graded is 50.

### Below the floor — the development index

An athlete under the professional floor is not clipped to 20. The scale continues downward
on a shallower tail at **one quarter** of the floor→average slope
(`SUB_FLOOR_SLOPE_FRACTION = 0.25`), with one decimal, clamped at 0 and never negative.

This is displayed distinctly — e.g. **"14.2 / 19.9"** — so it can never be read as a 20–80
scouting grade. Supporting copy (`SUB_FLOOR_DISCLOSURE`): *"Below 20 this is a development
curve, not a scouting grade — it measures progress toward the professional floor."*

**The quarter-slope multiplier is a convention, not a benchmark.** It was chosen because it
is the shallowest tail that still separates realistic 14u marks (at full slope, five of
twelve pinned flat at 0 — no separation, no roadmap). It is not derived from any published
data and must never be cited as such. Its provenance category in the provenance guard is
literally `convention`.

Where a sub-floor grade appears and no trend projection exists, the UI renders **"what
moves this number"** — the symptom-to-fix family, the target movement, and the next ladder
mark (`src/lib/benchmarks/whatMovesIt.ts`, `DevelopmentCurveNote.tsx`). We do not invent a
projection curve. When real trend data exists, the trend projection wins.

### Current and future grades

Every tool carries **both a present grade and a future/projection grade**, matching real
scouting practice. In the database this is the `_grade` / `_grade_future` column pairing
described in section 3 — it exists on the parent report, on the per-position rows, on the
per-batting-side rows, and on the per-throwing-hand rows.

### grade_source

Every grade records how it was produced:

| Source | Meaning |
|---|---|
| `cv_measured` | produced by our measurement pipeline |
| `coach_evaluated` | entered by a credentialed evaluator |
| `self_reported` | entered by the athlete about themselves |

`OFFICIAL_GRADE_SOURCES = ['coach_evaluated', 'cv_measured']`
(`src/hooks/useCoachAthleteSummaries.ts`). **Self-reported grades are private to the
athlete.** They never appear in external reports, coach dashboards, or recruiting matches —
the recruiting matcher has explicit tests asserting a `self_reported` value cannot satisfy
a standard (`src/lib/recruiting/__tests__/standardsMatching.test.ts`).

### The softball standing rule

Baseball benchmarks must match current MLB averages; softball must match current AUSL
averages. **Never grade a softball athlete against baseball-converted numbers.** Where no
real softball benchmark exists, the app records the raw mark and gives no grade, with copy
explaining that AUSL publishes no tracking averages today and that the grade will appear
when real figures exist. This is refusing to guess, not missing data.

### scale_reference — the authoritative anchor list (live contents)

All 14 rows are baseball. **There is not one softball row**, which is the rule above working
as intended.

| Metric | Floor (20) | Avg (50) | Record (80) | Direction | Effective | Note |
|---|---|---|---|---|---|---|
| `catcher_pop_time` | 2.15 | 2.02 | 1.90 | lower better | 2026-08-25 | public benchmark research |
| `exchange_time_sec` | 0.85 | 0.70 | 0.50 | lower better | 2026-08-29 | Realmuto 1.80s pop included 0.54s transfer; elite tracks 0.54–0.56 |
| `fastball_velocity` | 84 | 94.7 | 104.2 | higher better | 2026-08-25 | public benchmark research |
| `hit_tool_avg` | 0.215 | 0.260 | 0.315 | higher better | 2026-08-25 | public benchmark research |
| `home_to_first_lhh` | 4.50 | 4.20 | 3.90 | lower better | 2026-08-25 | public benchmark research |
| `home_to_first_rhh` | 4.60 | 4.30 | 4.00 | lower better | 2026-08-25 | public benchmark research |
| `lead_distance_primary` | 8 | 11 | 14 | higher better | 2026-08-29 | Statcast ~11 ft on successful steals |
| `lead_distance_secondary` | 15 | 20 | 24 | higher better | 2026-08-29 | Statcast ~20 ft |
| `power_home_runs` | 4 | 20 | 40 | higher better | 2026-08-25 | public benchmark research |
| `speed_60yd_dash` | 7.5 | 6.95 | 6.4 | lower better | 2026-08-25 | public benchmark research |
| `ten_yard_split` | 2.0 | 1.7 | 1.5 | lower better | 2026-08-29 | **DERIVED**, not independently sourced — estimated from 30-yard combine ratios |
| `throw_velo_mph_catcher` | 65 | 75 | 85 | higher better | 2026-08-29 | catcher throw velo, distinct from pop time |
| `throw_velo_mph_infield` | 75 | 88 | 95 | higher better | 2026-08-29 | MLB IF 85–95 elite; D1 middle-IF 85–95 |
| `throw_velo_mph_outfield` | 78 | 90 | 98 | higher better | 2026-08-29 | elite HS/college corner OF verified 87+ |

A second anchor set, `GRADE_BENCHMARKS` in `src/lib/gradeEngine.ts`, covers metrics
`scale_reference` does not. Where the two overlapped they used to disagree;
`src/lib/benchmarks/canonical.ts` resolves each duplicate to one canonical owner
(pop time → `GRADE_BENCHMARKS`; exchange time and throw velocity → `scale_reference`)
**without changing any value**. A provenance guard in `scripts/` fails the build on
undated, unsourced, or stale anchors; it currently reports 39 entries checked, 7
sourced+dated, 17 sourced-undated, 15 estimates, 0 stale. It is intentionally red until
the 17 are dated.

---

## 3. WHAT GETS GRADED — scouting report categories

Real column list, read from the live database.

### `vault_scout_grades` (the parent report)

Identity and context: `id`, `user_id`, `evaluator_id`, `graded_at`, `grade_type`,
`grade_source`, `evaluation_context`, `event_description`, `position_evaluated`, `notes`,
`long_term_goals_text`, `next_prompt_date`, `overall_grade`, `development_index`.

Position-player tools (each with a `_future` twin):
`hitting_grade`, `power_grade`, `plate_discipline_grade`, `speed_grade`, `defense_grade`,
`throwing_grade`, `eye_test_grade`, `hustle_grade`, `game_iq_grade`,
`mental_makeup_grade`, `self_efficacy_grade`, `leadership_grade`.

Pitcher tools (each with a `_future` twin):
`fastball_grade`, `offspeed_grade`, `breaking_ball_grade`, `rise_ball_grade` (softball
windmill), `control_grade`, `pitchability_grade`, `delivery_grade`,
`delivery_arm_action_grade`, `deception_grade`, `body_type_frame_grade`,
`poise_competitiveness_grade`, `defense_as_pitcher_grade`, `hold_runners_grade`
(baseball only — there is no lead-off hold in softball).

Structural flags:
`includes_position_tools`, `includes_pitching_tools` (a two-way report sets both),
`is_switch_hitter`, `saw_both_batting_sides`, `is_ambidextrous_thrower`,
`is_ambidextrous_pitcher`.

Player gate: `player_confirmed`, `player_confirmed_at`, `player_rejected`,
`player_rejected_at`. A report is author-only until the athlete confirms it; rejection is
recorded, not silently discarded.

Unlinked-prospect capture (a scout graded someone not yet on the platform):
`prospect_name`, `prospect_team`, `prospect_grad_year`, `prospect_position`,
`prospect_contact`, `linked_at`, `linked_by`.

### Child tables

- **`vault_scout_grade_positions`** — one row per position seen in that one look:
  `position`, `defense_grade(_future)`, `throwing_grade(_future)`, `throwing_hand`.
  This is what makes multi-position looks per report possible.
- **`vault_scout_grade_bat_sides`** — switch-hitter side splits: `bat_side`,
  `hitting_grade(_future)`, `power_grade(_future)`, `plate_discipline_grade(_future)`.
- **`vault_scout_grade_pitching_sides`** — ambidextrous pitcher splits: `throwing_hand`
  plus the full pitcher tool set per hand (fastball, offspeed, breaking ball, rise ball,
  control, pitchability, delivery/arm action, deception, defense as pitcher, hold runners),
  each with its `_future` twin.

Child-row visibility mirrors the parent exactly and is enforced in RLS, so an unconfirmed
report's children stay author-only (`src/hooks/useReportDetails.ts`).

Evaluator credentials live alongside the report — `get_athlete_evaluators()` returns
evaluator name, role, title, organization, report count, and latest graded date;
`has_active_evaluator_role()` gates who may author a report at all.

---

## 4. SUBSCRIPTION TIERS

Three tiers, defined in `src/constants/tiers.ts`:

| Key | Name | Price | Grants |
|---|---|---|---|
| `pitcher` | Complete Pitcher | $200 | pitching (plus pitcher-side tunneling/tipping) |
| `5tool` | 5Tool Player | $300 | hitting + throwing — everything except pitching |
| `golden2way` | The Golden 2Way | $400 | the union of both, plus The Unicorn workout system |

**Tiers are sport-scoped.** The entitlement stored on the profile is a module string such
as `baseball_5tool` or `softball_golden2way`, held in `profiles.subscribed_modules`.
Stripe price IDs are keyed per tier per sport in `TIER_PRICES`.

### How gating is actually enforced

1. `useSubscription()` loads `subscribed_modules` for the signed-in user.
2. Every access check goes through `src/utils/tierAccess.ts` rather than raw string
   matching:
   - `hasFeatureAccess(modules, 'hitting' | 'pitching' | 'throwing')` — substring-aware so
     legacy module keys (`baseball_hitting`) and tier keys (`baseball_5tool`) both resolve.
   - `getActiveTier(modules, sport)` — returns the highest tier for that sport, with a
     legacy fallback that infers a tier from old per-discipline keys.
   - `hasTierForSport`, `hasAnySubscription`, `hasUnicornAccess`.
3. Data depth is tier-scoped too: `src/data/dataDensityLevels.ts` maps
   free → 1, pitcher → 2, 5tool → 3, golden2way → 4, controlling which logging fields the
   athlete is even asked for.
4. The Combine has its own gate — see section 6.
5. On top of all of this sits the **purchase gate** (`src/lib/purchase/purchaseGate.ts`,
   surfaced through `src/hooks/usePurchaseAvailability.ts`): on web,
   purchase is allowed; in the native iOS wrap, purchase is only surfaced in link-out mode
   on a known US storefront, and otherwise the tier surfaces render a neutral unavailable
   state with no prices and no subscribe language. Already-subscribed access is unaffected
   everywhere.

---

## 5. THE NINE COMPETITOR APPS — coverage map

Honest status. "Partially covered" means the surface exists but the measurement behind it
has not passed the accuracy protocol in section 7.

| # | App | What it measures | Hammers replacement | Status | Still needs |
|---|---|---|---|---|---|
| 1 | **Teammstrd (Mustard)** | Phone-video pitching/hitting mechanics, dial-style scored report | The Hammer Report Card (`src/lib/reportCard/*`) | **Partially covered** | Only 2 visible pitching tiles; the other 7 BP tiles and all 18 BH tiles need pose-derived implementations before they can un-hide |
| 2 | **Pelotero** | 20–80 grades and development plan | Grade scale (`gradeScale.ts`) + `scale_reference` anchors + "what moves it" | **Covered** for baseball | Softball anchors — none exist; 17 baseball anchors still undated |
| 3 | **SmartScout Baseball** | Digital scouting reports, evaluator grades | `vault_scout_grades` + child tables + evaluator credentials + player confirmation gate | **Covered** | Broader recruiter-facing distribution surfaces |
| 4 | **PitchLab** | Pitch velocity, movement, spin from video | `supabase/functions/pitch-velocity-measure` + `cv_velocity_measurements` | **Partially covered** | Owner/admin locked; detection fails at 30fps (section 7). No movement or spin measurement at all |
| 5 | **Ember Sports** | Arm care, throwing load management | Arm care library, `athlete_load_tracking`, recovery acknowledgements, fatigue decisions | **Covered** | Nothing blocking |
| 6 | **HeyBLU** | Rules, situational baseball IQ | Game IQ module (`iq_situations`, `iq_scenarios`, `iq_user_progress`, concept mastery) | **Partially covered** | Game IQ 101 sits behind a coming-soon screen pending content |
| 7 | **B4 App** | Pre-game routine, mental preparation | Mind Fuel (lessons, streaks, challenges), mental health journal, mindfulness sessions | **Covered** | Nothing blocking |
| 8 | **Smart Pitch & Baseball Tracker** | Pitch-by-pitch game charting | Game Plan stack — `gp_games`, `gp_at_bats`, `gp_pitches`, `gp_defense_plays`, `gp_baserun_events`, pregame plans, dossiers | **Covered** | Game logging is staff-only today; athlete-facing unlock is a permissions decision, not a build |
| 9 | **FieldCoach.ai** | Defensive/fielding evaluation and drills | Defensive results logger, "My Defensive Plays", 111-tag fielding taxonomy feeding `wk_fault_signals`, defensive prep videos | **Partially covered** | Very thin video library behind the fielding tags — coverage rotation works but there is almost nothing to rotate through |

Cross-cutting gap for all nine: the **video library has 16 videos**. Ranking, fault-scoped
unseen-first rotation, confidence floors and honest empty states are all built and tested;
the content is what is missing.

---

## 6. COMBINE MODULE

Status: the rules layer is built and unit-tested (`src/lib/combine/*`, DB tables
`combine_sessions` / `combine_results`); it is not yet wired to a live athlete surface.

### Cadence

**One attempt per athlete, per sport, per calendar month**, on UTC month boundaries.
Enforced in two places:

- Database: the `combine_enforce_monthly_eligibility` trigger on `combine_sessions`, which
  raises `combine_already_taken_this_month` rather than failing silently.
- Client: `evaluateCombineEligibility()` in `src/lib/combine/eligibility.ts`, so the app can
  explain the block before attempting the insert. An unreadable prior attempt is treated as
  blocking — missing information is never read as eligibility.

`combine_sessions` records `tier_at_time`, so a later tier change cannot retroactively
rewrite what an athlete was entitled to measure.

### Tier gating

`src/lib/combine/tierGating.ts`:

- Pitching-velocity events (`bullpen_velocity`) → **pitcher** and **golden2way** only.
- Every other event → **5tool** and **golden2way** only.
- **golden2way** therefore gets everything.
- An unrecognised tier or event is never granted access — unknown input is missing
  information, not an implicit yes.

Sport event sets are chosen separately in `src/lib/combine/sportEvents.ts`, and neither
layer may loosen the other.

### Baseball events

- 30-yard dash, with 5-yard splits and a 10-yard split
- left/right leg gait breakdown across the run
- reaction-time-to-stimulus start
- broad jump, with ground contact time and flight time
- vertical jump — 3 consecutive
- single-leg jump protocol — 5 per leg, left vs. right compared
- Y-Balance reach
- active ROM: shoulder, elbow, hip
- squat / lunge / push-up form scoring
- 5-10-5 shuttle
- reactive agility with a randomised cue
- on-screen reaction / recognition test

### Softball events

**Genuinely different distances, not baseball scaled down:** 10-yard dash, 20-yard dash,
40-yard dash, and the Flying 20 (rolling start into a timed 20 yards). Everything else —
the jump battery, Y-Balance, ROM, movement screens, reaction and recognition tests — is
shared with baseball.

Currently in the event catalog (`src/lib/combine/events.ts`), with baseball-only =
`thirty_yard_dash`, `ten_yard_split`; softball-only = `ten_yard_dash`, `twenty_yard_dash`,
`forty_yard_dash`, `flying_twenty`. The gait breakdown, 5-yard splits, single-leg jump
protocol, ground-contact/flight-time decomposition and the reaction/recognition tests are
specified above but are **not yet separate keys in the catalog** — they are the next
additions, not existing rows.

### Honestly excluded — not phone-measurable

Documented as out of scope rather than approximated:

| Excluded | Why |
|---|---|
| Grip strength | needs a dynamometer |
| Passive ROM | needs a second person to move the limb |
| Jump power / force specifically | needs a force plate. Jump **height** and **timing** are measurable and are included |
| Body composition | needs measurement hardware |
| True visual acuity screening | needs a clinical protocol, not a phone screen |

### Provenance of the battery

The source framework is **MLB's PDP (Player Development Pipeline) assessment battery**. MLB
offers it free only at invite-only events, so the overwhelming majority of amateur players
never get access to it. Hammers is democratizing a protocol that already exists but is
gate-kept — not copying something already available to everyone.

---

## 7. MEASUREMENT REALITY — stated plainly

### Where the ball detector actually stands

- The BaseballCV `ball_tracking_v4` model **works** — it detects a stationary or slow ball
  reliably.
- **It loses the ball during flight at 30fps.** Motion blur smears the ball across enough
  pixels that the detector returns nothing. Hosted runs over current 30fps phone footage
  "frequently detect nothing at all" (`docs/asb/on-device-ball-detector.md`).
- **Phones deliver 60fps through browser capture** (`src/lib/capture/highFpsCapture.ts`
  measures the real frame rate off the camera track rather than assuming it).
- **240fps requires a native app wrap.** The browser does not expose the high-frame-rate
  camera modes the phone hardware supports.

Two detector paths exist: the hosted Roboflow function
(`supabase/functions/pitch-velocity-measure`, owner/admin only, the only path that produces
any athlete-visible number) and an on-device ONNX detector
(`src/lib/cv/ball/onDeviceBallDetector.ts`) which is **built, flag-gated OFF
(`ON_DEVICE_BALL_DETECTOR_ENABLED = false`), and trusted for nothing.**

Honesty rule baked into the detector: it distinguishes *cannot run* from *no ball present*.
`not_enabled`, `model_asset_missing`, `runtime_unavailable` and `decode_failed` return
`ok: false`. Only a successful run returns frames, and a frame with no ball carries
`chosen: null`. There is no path where a failed run degrades into an empty prediction set
that downstream math could mistake for a measurement. **Missing stays missing.**

### The five-gate accuracy protocol

No measurement ships to an athlete without passing **all five**. Each measurement earns its
way in **separately** — passing the gates for one metric grants nothing to any other.

| Gate | Proof required |
|---|---|
| 1. **Capture proof** | the real frame rate, resolution and reference distance are known and recorded for the clip — not assumed, not defaulted |
| 2. **Detection proof** | the object is detected on **≥5 consecutive frames**. Scattered single-frame hits are noise, not a track |
| 3. **Physics proof** | the tracked trajectory produces a physically plausible result under the recorded calibration — no impossible accelerations, no answers that only work if the reference distance is wrong |
| 4. **Ground truth** | agreement within **±2 mph over 20 pitches** against an independently measured reference |
| 5. **Consistency proof** | repeat runs over the same footage, and across sessions and both sports, produce the same answer. For the on-device detector this is the parity harness: `verdict: "parity"` on every frame, or the swap is blocked |

Note on gate 5: a parity run over footage where **both** detectors see nothing proves only
that they agree on absence. It is not evidence that either one can measure.

### What this means for the report card

The gate protocol is why section 1 shows two visible tiles instead of forty. Everything
hidden is hidden because it has not passed gate 1, 2 or 3 — usually because the calibration,
the object tracker, or the release anchor it depends on does not exist yet. Nothing is
hidden for aesthetic reasons, and nothing is shown without having earned it.
