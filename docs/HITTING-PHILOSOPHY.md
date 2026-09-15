# Hammers Hitting Philosophy — Consolidated From Repo Sources

**Status:** retrieval-and-consolidation document. Created 2026-09-15.
**Rule of construction:** every doctrine statement below is quoted from a file in
this repository, with the file path given. Where the requested item does not
exist anywhere in the repo (code, docs, migrations, seed data, edge functions,
database rows, or git history), it is marked **NOT FOUND IN REPO** and nothing
has been inferred, reconstructed, or drafted in its place. Where two sources
disagree, both are shown and labeled.

Metric keys are cross-referenced to `.lovable/canonical-measurement-architecture.md`
where that document specs them.

---

## 1. The phase model — P1, P2, P3, P4

Canonical source: `src/lib/hittingPhases.ts` (browser runtime), mirrored byte-for-byte
at `supabase/functions/_shared/hittingPhases.ts`. The file header calls itself
"Hitting 1-2-3-4 Doctrine — single source of truth".

Order, from `src/lib/hittingPhases.ts`:

> "Order through the swing. Camera/coach order and athlete-felt order are the
> same: P1 → P2 → P3 → P4. P3 is the voluntary power step."

`HITTING_FELT_ORDER = ['P1','P2','P3','P4']`.

### P1 — Hip Load (non-negotiable, score cap 80)

> "Slow, controlled, balanced back-hip load BEFORE the hand load, timed to pitcher
> release. A bigger leg-load pre-hand-load establishes midline, preserves
> separation, and expands launch angle + power."
> — `src/lib/hittingPhases.ts`

What starts it (`src/lib/hittingCausalChains.ts`, P1 trigger):

> "Pitcher starts to deliver — your back hip should already be loading by the time
> their hands break apart."
> Coach note: "Front-side timing window: back-hip load completes before pitcher
> hand separation; leg-load size pre-hand-load sets launch angle + power ceiling."

What P1 is graded on (`src/lib/reportCard/disciplines/bh.ts`, tile `hip_load`):

> "P1 is about STABILITY. You pass by NOT drifting forward (body, head, or front
> foot) while the pitcher reaches knee lift. A bigger, balanced back-hip load on
> top of stability earns elite. Bigger load = more stored swing power."

Failure symptoms (`hittingPhases.ts`): `hand_load_before_hip_load`,
`no_balanced_hip_load`, `head_drift_to_pitcher`, `no_separation`, `jammed_elbow`,
`weight_falls_forward`.

Alternate naming: `src/lib/reportCard/v1/hittingV1Schema.ts` calls P1
"Hip Load (Pelvic Coil)" — "How you coil the back hip to load the swing before
anything else moves."

**Requested framing not found:** P1 described as "maximum voluntary rear hip load"
or as setting a "hip-socket internal rotation standard" — **NOT FOUND IN REPO.**
Searched live tree and all reachable git history for "hip socket", "hip_socket",
"maximum voluntary", and internal-rotation phrasing in a hitting context: zero hits.

### P2 — Hand Load (score cap 85, not non-negotiable)

> "Scap-pack / hand / knob load coils on the loaded back hip and locks the midline.
> Sets up Oh's top triangle (elbow forward, hands back) so the back-knee bottom
> triangle can form in P4."
> — `src/lib/hittingPhases.ts`

Report-card standard (`src/lib/reportCard/disciplines/bh.ts`, tile `hand_load`,
acceptable 65 / elite 88):

> "Bat / scap / knob load behind the head AFTER P1 is stable. A clean P2 creates the
> centerline that lets your head stay still through P3 and sets up an X-factor stretch."

Timing rule (tile `p2_timing`, metric `p2_timing_pass`):

> "Your hand load must be FINISHED by the time the pitcher reaches peak knee lift.
> Finishing EARLY is acceptable and common — it is not a timing miss. The only
> failure mode here is finishing LATE... If you finish early and then drift forward
> while you wait, that drift is a stability problem caught by P1 Hip Load Stability,
> not a P2 timing problem — don't double-count it against your timing."

Failure symptoms: `long_stride`, `over_stride`, `head_drift_to_pitcher`,
`weight_forward`, `front_shoulder_pulls_out`, `chest_not_square_to_plate`.

**Requested framing not found:** the "bow and arrow" barrel-style load behind the
head — **NOT FOUND IN REPO.** Zero hits for "bow and arrow" in the live tree and in
all reachable git history. What exists is "hand load behind the head" and
"scap-pack / knob load".

### P3 — Stride / Power Step (score cap 75, not non-negotiable)

Current (v3) doctrine, `src/lib/hittingPhases.ts`:

> "VOLUNTARY power step. After the P1 hip load and the P2 hand load, the hitter
> strides at the pitcher's release point while the pitcher is working toward
> release — the goal is front foot fully down (sideways, chest square to the plate,
> core tensioned) BEFORE the ball is released, so the hitter is loaded and ready to
> strike. Coach it, cue it, time it. Landing late, drifting, or over-striding are
> graded stride faults with stride fixes."

Governing rule file `.lovable/p3-power-step-rule.md`:

> "**P3 is VOLUNTARY.** The stride / power step is a consciously coached,
> consciously cued, deliberately trained move. It comes after P1 (back-hip load)
> and P2 (hand load)."

Target, same file:
- "Front foot **fully down** (whole foot, not just the heel) **at or before ball release**"
- "Landed **sideways**, chest and shoulders square to the plate"
- "Core tensioned, weight still back, no head or COM drift"
- "Planted, loaded, and **ready to strike** before the ball is traveling"

Approved cues, same file: "Stride to the pitcher's release point." · "Power step —
get the front foot down before he lets it go." · "Beat the ball with your foot." ·
"Land sideways, chest to the plate, weight still back." · "Start on his move, down
at release."

Graded stride faults and fixes, same file: foot down late → timing reps counting to
release, start P1/P2 earlier; no stride under velocity → restore the power step;
over-stride → stride-length ceiling reps; drift → step-and-freeze audits; landing
open → sideways landing audits, outside-third front toss; stiff/locked front leg →
soft-knee landing patterning.

"Heel plant" definition (`src/lib/reportCard/disciplines/bh.ts`, tile `heel_plant`):

> "'Heel plant' is the moment the FULL foot is down — not just the heel — landed
> sideways with chest and shoulders square to the plate, core max-tensioned."

Failure symptoms: `not_sideways_at_landing`, `shoulders_not_square`,
`stuck_on_back_side`, `cant_reach_outside_pitch`, `foot_down_late`,
`late_swing_high_velocity`, `late_foul_jammed`, `off_balance_at_contact`,
`elbow_jammed_behind_hands`.

Style variants permitted: `short_step`, `no_stride`, `high_pickup`, `toe_tap_only`,
`slap_running_start`.

**CONTRADICTION — retired vs live P3 doctrine.** See §7.1.

### P4 — Hitter's Move (non-negotiable, hard score cap 50)

> "Knob = fulcrum. Only ONE thing goes forward first — back elbow (or front of the
> bicep) — with hands staying back. That turns the barrel behind the ball (square to
> fair), keeps the swing on plane, and lets you catch velocity at low effort. Fired
> off a front foot that is already down from the P3 power step."
> — `src/lib/hittingPhases.ts`

What releases it (`src/lib/hittingCausalChains.ts`, P4 trigger):

> "Front foot is down. You decide to swing. Only ONE thing goes forward first —
> your back elbow (or the front of your bicep)."
> Coach note: "Rule of one: elbow / anterior bicep advances first, hands remain
> posterior — never both simultaneously."

Strict order (`src/lib/reportCard/disciplines/bh.ts`, tile `hitters_move`):

> "The Hitter's Move is a strict order: knob stays back as the fulcrum → hips clear
> a path of least resistance → back elbow leads linearly forward → hands stay in
> line with the ball to 'catch' it → barrel catapults through last. Contact lines up
> with the hands; extension is a post-contact byproduct."

Sequencing (tile `sequencing`, non-negotiable):

> "Sequencing is the ORDER the kinetic chain fires in: back hip → torso/shoulders →
> back elbow → hands → barrel. Each segment loads the next; nothing fires until the
> segment behind it has done its job."

Score caps (`src/lib/hittingPhases.ts`): `P4_HARD_CAP = 50`, `P4_SOFT_CAP = 70`,
`P4_ELITE_BONUS = 5`, `TWO_PLUS_PHASE_VIOLATION_CAP = 65`.
Hard symptoms: `casting`, `early_barrel_flip`, `rollover`,
`shoulders_open_before_elbow_extends`, `hands_lead_elbow`.

---

## 2. The triangles

The literal phrase "two triangles" appears **nowhere** in the repo or in reachable
git history (`git log -S "two triangles"` = 0 commits). The doctrine exists as
**top triangle → bottom triangle**, attributed to Sadaharu Oh.

`src/components/hitting/HittingDoctrineBlock.tsx` (rotating philosophy reminder,
shown to athletes and coaches):

> **"Top triangle → bottom triangle (Sadaharu Oh)"**
> "If the elbow moves forward with the hands staying back it creates a triangle.
> That top triangle makes the back knee turn forward — forming the bottom triangle
> in the back leg."

`src/lib/hittingPhases.ts` (P2 summary): "Sets up Oh's top triangle (elbow forward,
hands back) so the back-knee bottom triangle can form in P4."

`src/lib/hittingCausalChains.ts` (P2 cause / mechanism):

> "Your hands never get back, or they drift forward with your body — so the top
> triangle never forms."
> "...without the top triangle (back elbow forward with hands staying back) the
> bottom triangle in the back leg never forms."

Adjacent reminders from the same `HittingDoctrineBlock.tsx` list:

> **"Only two things go forward at once"** — "Either your elbow (or the front of your
> bicep) brings the barrel — with the hands staying back — or your hands bring the
> barrel. Elbow leading with hands back is the perfection version."

> **"Square to fair"** — "Taking your elbow (or the front of your bicep) to the ball
> with the hands back turns your barrel BEHIND the ball, which gets your bat square
> to fair — the shape the pros are actually describing."

> **"On plane = low-effort velocity"** — "Being on plane gives you a longer contact
> window. Hitters must catch velocity at low effort — hands back, elbow (or front of
> the bicep) forward. 'Just late' is usually off-plane, not slow."

> **"Back hip load = midline + power"** — "Back hip load with hand load / scap pack
> coils the hip, creates the midline, and leaves the room to separate. A bigger leg
> load BEFORE the hand load unlocks more launch angle and more power."

---

## 3. Hip and pelvis doctrine

**Hip-socket vs pelvis distinction: NOT FOUND IN REPO.** No file, comment,
migration, seed row, or reachable commit distinguishes hip *socket* rotation from
*pelvis* rotation.

**"Back hip socket must not open while the front hip socket may open":
NOT FOUND IN REPO.** No asymmetric front/back hip rule exists in any form.

What the repo does contain on hips:

- P1 is graded on **stability**, not on internal rotation —
  `src/lib/reportCard/disciplines/bh.ts`: "P1 is about STABILITY. You pass by NOT
  drifting forward..."
- Pelvic coil naming — `src/lib/reportCard/v1/hittingV1Schema.ts`: "Hip Load
  (Pelvic Coil) — How you coil the back hip to load the swing before anything else
  moves."
- Separation mechanism — `src/lib/hittingCausalChains.ts` P1 coach note: "Sequencing
  fault: upper-body initiation precedes pelvic counter-rotation; no posterior chain
  pre-tension; midline never establishes." And: "Without hip-shoulder dissociation
  the obliques store no elastic energy, midline collapses, and weight transfers
  anteriorly."
- Firing order — `src/lib/reportCard/disciplines/bh.ts`: "back hip → torso/shoulders
  → back elbow → hands → barrel."
- P4 hip clearance — tile `time_to_contact`: "No upper-body movement until the hips
  have cleared a path of least resistance forward. THEN the back elbow goes forward
  linearly, taking the barrel to contact — the knob stays back acting as a fulcrum
  the whole time."

Measurement cross-reference:
- `pelvis_rotation_efficiency_deg` — `src/lib/biomech/metrics/pelvisRotationEfficiency.ts`;
  kill switch `MEDIAPIPE_PELVIS_ROTATION_ENABLED = false`, `PELVIS_ROTATION_MIN_DEG = 30`.
  Hidden in Release 1.
- `hip_internal_rotation` exists only as a **mobility test** in the performance-test
  registry (`docs/handoff/report-card-and-grading.md`), not as swing doctrine.

---

## 4. Head doctrine

**"Head lowering versus head drifting toward the pitcher" as a stated doctrinal
distinction: NOT FOUND IN REPO.** **"Head position relative to center of mass":
NOT FOUND IN REPO** as hitting doctrine (COM appears only in stride-drift coach
notes, e.g. "COM travelling with the stride limb instead of staying posterior").

What exists:

- Lateral drift toward the pitcher is the named fault. `src/lib/reportCard/disciplines/bh.ts`
  (tile `eyes_tracking`): "Lateral head movement toward the pitcher is a major
  contact disruptor. Eyes work; head stays. A loaded scap AFTER P1 is what locks the
  head still — the scap pulls the chin and eye line into a fixed post so the eyes can
  work without the head chasing them."
- Symptom key `head_drift_to_pitcher` is attached to **both P1 and P2**
  (`src/lib/hittingPhases.ts`).
- AI grading uses a 4%-of-body-height deduction cue, not a doctrine threshold —
  `docs/asb/report-card-system-reference.md`: "head moves >4% of body height
  laterally → ~50"; and for P1: "if head moves 4% of body height toward pitcher
  during P2 → ~55."

Numeric thresholds that do exist:

| Threshold | Value | Origin | File |
|---|---|---|---|
| `head_vertical_movement_post_landing_pct` fail line | 4% of athlete height in frame | **Derived / unvalidated estimate** — the file says so in words (below) | `src/lib/biomech/metrics/headVerticalMovementPostLanding.ts` |
| Head at release ≤15° off the belly-button / target line | 15° | **Pitching**, not hitting; see §7.3 on provenance | `docs/asb/report-card-system-reference.md`, `src/data/baseball/pieV2Signals.ts` |

`headVerticalMovementPostLanding.ts`, verbatim:

> "Head travel from landing to contact, as a percent of athlete height in frame,
> above which the tile fails. UNVALIDATED starting estimate — tune against real
> graded clips before any flip; this is not a settled constant."

and:

> "NOT LIVE. Hitting output is suppressed by `RELEASE1_HITTING_SUPPRESSED` and this
> metric stays in `RELEASE1_HIDDEN_METRICS`."

Definition, same file: `travel_px = |head_y(contact) − head_y(landing)|`,
`travel_pct = travel_px / athlete_height_px(landing)`, height in frame measured
nose → lower ankle at landing. Kill switch `MEDIAPIPE_HEAD_POST_LANDING_ENABLED = false`.

---

## 5. Stride doctrine and the 15-degree line

The 15° rule is **live current doctrine**, not scrapped. It is hidden from athletes
in Release 1 pending calibration, which is a visibility gate, not a retirement.

Metric key: **`stride_dir_deg_off_square`**.
Cross-reference: `.lovable/canonical-measurement-architecture.md` specs this key
along with the rest of the BH tiles (detectors, landmarks, anchors, missingness
reasons, confidence formula).

Standard (`src/lib/reportCard/disciplines/bh.ts`, tile `stride_direction`):

> standard: "Within 15° of square to pitcher (either way)"
> "Stride direction relative to a square line at the pitcher. Stepping out (bucket)
> or stepping in (across body) both leak power. Within 15° either way keeps the
> chain efficient."
> How to improve: "Tape a stride line. Slow tempo tee work focused only on stride
> direction."
> Encouragement: "Square stride, square chance. Trust the line."

Compute, same file: `Math.abs(m.value) <= 15 ? "pass" : "fail"`.

Sign convention (`src/lib/reportCard/contracts/bh.contract.ts`, and mirrored in
`supabase/functions/_shared/reportCardContracts.ts`):

> "Degrees stride deviates from a square line to the pitcher. Positive = stepping
> out (bucket). Negative = stepping in (across body). |value|<=15° passes."

**Note on the reference line.** The repo defines the line as "a square line to the
pitcher." The framing "the stance sets a line's direction, and the front foot should
land within 15 degrees behind or in front of that line" — i.e. a *stance-derived*
line rather than a square line — is **NOT FOUND IN REPO**. Both formulations use 15°;
only the reference line differs, and only the square-line version is written down.

Other stride constraints, `.lovable/p3-power-step-rule.md`: stride-length ceiling
("land inside the marker"), sideways landing, soft-knee landing, no head/weight drift.

Other stride metric keys carried in the BH contract:
`heel_plant_score_100`, `p3_release_offset_ms`, hands-outside-shoulders-at-landing.

P3 timing scoring curve (`src/lib/reportCard/disciplines/bh.ts`, tile `p3_timing`) —
**derived, in-code, no external source cited**: deadband ±33 ms around release;
33–80 ms late scales 100→90; 80–150 ms late scales 90→70; beyond 150 ms late decays
to 0; early is floored at 85.

> "Foot-down-at-release is the perfect target because it sets direction while
> preserving the longest possible look at the ball... Foot down before release is not
> punished like late timing; if the hitter gets down early and then drifts forward,
> that drift belongs to P1 Hip Load Stability or landing quality — not this timing
> score."

---

## 6. Fault → outcome mappings

### 6.1 Machine mapping

`src/lib/analysisFeedbackToTaxonomy.ts` (client) and
`supabase/functions/_shared/faultFindings.ts` (server mirror). `MOVEMENT_TO_RESULT`,
hitting section, verbatim:

```
shoulders_turning_early: ['roll_over_contact', 'weak_contact'],
hands_forward_early:     ['roll_over_contact'],
early_extension:         ['pop_up', 'weak_contact'],
head_pull_off:           ['swing_and_miss_underneath_ball', 'chasing_pitches'],
late_barrel:             ['jam_shot', 'opposite_field_flare'],
flat_path:               ['ground_ball_middle', 'top_spun_balls'],
steep_attack_angle:      ['swing_and_miss_underneath_ball'],
over_rotation:           ['roll_over_contact'],
under_rotation:          ['weak_contact'],
weight_stuck_back:       ['weak_contact'],
weight_leak_forward:     ['top_spun_balls'],
landing_unbalanced:      ['weak_contact'],
```

Fault → correction pairs include `head_pull_off: 'seeing_the_ball_well'`, with
`improve_adjustability` as an additional correction.

### 6.2 Narrative chains

From `src/lib/hittingCausalChains.ts` (athlete voice; each phase also carries a
coach note):

| Phase | Cause | Mechanism | Result on the field |
|---|---|---|---|
| **P1** | "Your hands load before — or instead of — your back hip, so nothing coils behind you." | "There's no separation, no midline, and no rubber-band stretch. Your weight stays in the middle or drifts forward." | "Weak contact even on barreled balls, late swings, swing-and-miss, chasing pitches, jammed elbow, flat launch angle." |
| **P2** | "Your hands never get back, or they drift forward with your body — so the top triangle never forms." | "No bat-head depth, no back-elbow-to-back-knee triangle, front shoulder leaks open, chest opens early." | "Long stride, head drifts to the pitcher, you pull off the ball, weak fly balls the other way." |
| **P3** | "You start the step too late, step too long, or drift your head and weight forward with the foot." | "If the foot isn't down before the ball is released, you're deciding and striding at the same time — there's no time left to strike." | "Late on velocity, jammed, off-balance at contact, can't reach the outside pitch." |
| **P4** | "Two things go forward at once — your hands fire with your elbow instead of the elbow leading alone." | "The knob loses position, the barrel casts and flips early, shoulders open before the elbow extends, and the bat drags AROUND your body instead of THROUGH the ball — never getting square to fair or on plane." | "Rollover, weak pop-up the other way, swing-and-miss on offspeed away, pulled foul grounders, 'just late' on velocity even at max effort." |

Fixes, same file:
- **P1** — "Load the back hip slowly and BIG first. A bigger leg load before the hands = more launch angle and more power. Hands are the LAST thing to move."
- **P2** — "Load your hands BEFORE you step. Feel the scap pack coil onto the loaded hip — hands slightly back as your foot moves forward."
- **P3** — "Power step: start the stride as the pitcher starts toward release and get the front foot ALL the way down before he lets it go — landed sideways, chest to the plate, weight still back, loaded and ready to strike."
- **P4** — "Back elbow (or front of your bicep) leads forward FIRST — hands stay back. That elbow turning your body brings the barrel BEHIND the ball, square to fair, on plane. Low-effort velocity comes from staying on plane, not from swinging harder."

### 6.3 Requested mappings not in the repo

- **"Head forward → late on fastballs, chasing, fouling off hittable pitches"** —
  partially present, not verbatim. The repo has `head_pull_off →
  swing_and_miss_underneath_ball, chasing_pitches`, and P1 result copy lists "late
  swings... chasing pitches". "Fouling off hittable pitches" as a head-forward
  consequence: **NOT FOUND IN REPO.**
- **"Back hip opening early → poor on high and away, hard pull-side ground balls,
  soft opposite-field pop-ups, weak against fastballs, crushes offspeed when timed"**
  — **NOT FOUND IN REPO**, in whole or in substance. The nearest existing text is the
  P4 result row ("Rollover, weak pop-up the other way... pulled foul grounders,
  'just late' on velocity") and the P2 result row ("pull off the ball, weak fly balls
  the other way"). Neither contains a fastball-versus-offspeed split; no such split
  exists anywhere in the hitting doctrine.

---

## 7. Contradictions between sources

### 7.1 P3 voluntary vs involuntary

- **RETIRED** — `.lovable/p3-do-not-cue-rule.md`: "P3 (stride / heel plant) is
  involuntary. It is never coached as a conscious action. It emerges from organized
  P1 + P2 + P4." The file carries its own retirement banner: "RETIRED 2026 —
  superseded by `.lovable/p3-power-step-rule.md`."
- **ACTIVE** — `.lovable/p3-power-step-rule.md`: "P3 is VOLUNTARY... consciously
  coached, consciously cued, deliberately trained."
- **STALE, UNMARKED** — `.lovable/hitting-philosophy-v2-arakawa-integration.md` still
  narrates the involuntary model as current and cites the do-not-cue rule as active.
  It never received a retirement banner. Treat `p3-power-step-rule.md` as governing.
- Residue: `src/lib/reportCard/disciplines/bh.ts`, tile `sequencing`, still contains
  "(load → pause → swing — the stride emerges on its own, never voluntary)" inside
  its how-to-improve copy — a leftover of the retired doctrine sitting in live
  athlete-facing text.

### 7.2 Status vocabulary for `stride_dir_deg_off_square`

Three documents classify the same metric three different ways:
- `docs/asb/report-card-system-reference.md` and `src/lib/reportCard/release1.ts` — **SHOWCASE_FUTURE**: "built, blocked on calibration/tracking that doesn't exist yet."
- `.lovable/canonical-implementation-reality-audit.md` — **"Fail"** (AI-signed-degree estimate, not deterministic).
- `.lovable/canonical-production-readiness-audit.md` — **"Not eligible — T0."**

All three mean not-production-ready; the vocabularies are unreconciled.

### 7.3 Provenance note on the 15° head figure

`docs/asb/report-card-system-reference.md` records, about the pitching head-at-release
copy ("Every degree past 15 doubles head weight and shortens your extension by about
2 inches"):

> "several of these thresholds and phrases... match Mustard's own published article
> almost word for word, not just the underlying concept. Worth knowing plainly as
> this code gets touched again."

### 7.4 Back-elbow metric — old formula overturned

`.lovable/back-elbow-methodology.md`: "This is the wrong frame... The metric is
currently scoring the consequence of the move, sampled after the move has already
finished." The contact-frame "elbow past belly button" formula was replaced by the
window metric `connection_barrel_delivery_score_100`. The old formula name survives
on purpose as a guardrail in `bh.contract.ts`: "Do not use the old 'back elbow past
belly button at contact' formula."

### 7.5 Unresolved duplicate: bat path vs on-plane

`.lovable/bat-path-vs-on-plane-definitions.md` documents `bat_path` and `on_plane`
as a possible duplicate-metric conflict with three candidate resolutions, none
adopted.

### 7.6 Tile count

`src/lib/reportCard/disciplines/bh.ts` header says "17-tile contract".
`docs/asb/report-card-system-reference.md` records: "counting the actual metric keys
in the contract gives 21, not 17 — because the last tile (Shoulder-to-Shoulder Hold)
is fed by four separate metric keys... 17 tiles is right; 17 metric keys is not."

---

## 8. Additional doctrine found (not requested, recorded so it is not lost)

- **Blind-spot doctrine** — `.lovable/back-elbow-methodology.md`: "Blind spot starts
  when extension starts... The elbow gets the barrel to contact." Minimizing the time
  from extension-start to contact is described as the big idea behind the hitter's move.
- **Time-to-contact vs power** — `.lovable/time-to-contact-vs-power.md`: time-to-contact
  and bat speed are never interchangeable and must always be reported as separate
  component scores.
- **Finish & balance** — `.lovable/finish-and-balance-methodology.md`: the intent is
  "maintain connection with two hands through contact and extension until the ball is
  gone," not holding a two-hand finish pose. Flagged as an unresolved
  measurement-versus-intent mismatch.
- **Shoulder plane steadiness** — `bh.ts`: "When the shoulders begin to rotate in P4,
  the shoulder plane has to HOLD whatever plane it started on through contact."
- **Elite Move / Elite Slap recognition** — `src/lib/hittingCausalChains.ts`: narrated
  elite badges with a +5 bonus; slap context relaxes P2/P3 gates
  (`slap_running_start` is a permitted P3 variant).
- **Canonical measurement architecture** — `.lovable/canonical-measurement-architecture.md`
  (~930 lines) is the deepest per-metric spec in the repo, covering every BH tile.
- **Report-card constitution** — `docs/asb/report-card-constitution.md` ratifies the
  P1–P4 hierarchy: P1 and P4 non-negotiable, P2 and P3 "Rank 1".
- **Current visibility** — `docs/asb/report-card-system-reference.md`: the entire
  hitting report card is suppressed from athletes in Release 1 via
  `RELEASE1_HITTING_SUPPRESSED = true`; every hitting metric is HIDDEN or
  SHOWCASE_FUTURE. Only pitching metrics are live.
- **Database check** — no hitting philosophy text lives in the database.
  `hie_snapshots.hitting_doctrine` rows sampled are empty placeholders with
  `confidence: 0`; `coach_context.coaching_philosophy` has no populated rows;
  `iq_situation_actors` cue text is game-situation strategy, not swing mechanics.

---

## 9. Threshold origin table

| Threshold | Value | Origin | Source file |
|---|---|---|---|
| Stride direction pass | \|deg\| ≤ 15 off square | In-repo doctrine, no external citation | `src/lib/reportCard/disciplines/bh.ts` |
| P1 hip load | acceptable 70 / elite 90 | In-repo doctrine | `bh.ts` |
| P2 hand load | acceptable 65 / elite 88 | In-repo doctrine | `bh.ts` |
| P3 timing deadband | ±33 ms around release; curve to 0 past 150 ms late | Derived in code, no citation | `bh.ts` |
| Heel plant | acceptable 65 / elite 88 | In-repo doctrine | `bh.ts` |
| Time to contact | ≤175 ms pass, ≤150 ms elite | In-repo doctrine | `bh.ts` |
| Bat speed through contact | ≥65 pass, ≥75 elite | In-repo doctrine | `bh.ts` |
| Hitter's move | acceptable 70 / elite 92 | In-repo doctrine | `bh.ts` |
| Head vertical movement post-landing | 4% of height in frame | **Explicitly unvalidated estimate** | `headVerticalMovementPostLanding.ts` |
| Head lateral drift AI deduction | >4% of body height | AI grading cue | `docs/asb/report-card-system-reference.md` |
| Pelvis rotation minimum | 30° | In-code constant, metric disabled | `pelvisRotationEfficiency.ts` |
| Phase score caps | P1 80 · P2 85 · P3 75 · P4 50 (soft 70, elite +5); 2+ phase violation 65 | In-repo doctrine, "LOCKED 2026" | `src/lib/hittingPhases.ts` |
| Head at release (pitching) | ≤15° off target line | Wording matches a published Mustard article | `docs/asb/report-card-system-reference.md` |

Nothing in this table is owner-supplied *in writing within the repo*; no file marks
any hitting threshold with an owner attribution or a dated source. That absence is
itself a finding — the benchmark provenance guard
(`scripts/check-benchmark-provenance.ts`) covers grading benchmarks, not these
doctrine thresholds.
