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

**Requested framing not found in code:** P1 described as "maximum voluntary rear hip
load" or as setting a "hip-socket internal rotation standard" — **NOT FOUND IN REPO.**
Searched live tree and all reachable git history for "hip socket", "hip_socket",
"maximum voluntary", and internal-rotation phrasing in a hitting context: zero hits.
Now supplied by the owner and recorded here:

> "P1 is the max voluntary rear hip load that is setting the hip socket inner
> rotation standard"
> — **[owner-supplied 2026-09-15]**

Clarifying: P1 is a deliberate, maximal rear-hip load, and the amount of hip-socket
internal rotation it reaches is the reference standard the rest of the swing is held
to. No code currently measures it; see §3 and §9.

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

**Requested framing not found in code:** the "bow and arrow" barrel-style load behind
the head — **NOT FOUND IN REPO.** Zero hits for "bow and arrow" in the live tree and
in all reachable git history. What exists is "hand load behind the head" and
"scap-pack / knob load". Now supplied by the owner and recorded here:

> "the bow and arrow barrel style load behind the head in P2"
> — **[owner-supplied 2026-09-15]**

Clarifying: the P2 load is drawn like a bow — the barrel loads behind the head
against the already-loaded rear hip, storing the tension P4 releases.

**Voluntary hand load vs involuntary counter-move optics — [owner-supplied 2026-09-15]:**

> "The hand load is voluntary but the optics of a hand counter move happening during
> P3 is involuntary."

Clarifying: the P2 hand load is a deliberate, coached action — cue it. What looks
like a *further* hand counter-movement during the stride is not a second action and
is never cued: the body travels forward while the hands hold their already-loaded
position, and the relative separation is an optical consequence of that.

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

**Stride timing trigger — "stride to stride" — [owner-supplied 2026-09-15]:**

> "Stride is to take place prior to pitcher release. I cue hitters to stride after
> the pitchers stride and before the ball release (We use multiple terms but the term
> stride to stride is often used but all describing the pitchers stride being our
> trigger to get going to be ready to stride the ball by the time the ball is released
> so the hitter can have that second split second pause to judge the ball with
> confidence)."

Clarifying, three separate points:
1. **Trigger** — the hitter's stride is triggered by the **pitcher's stride**, not by
   the pitcher's release.
2. **Target** — front foot fully down **before ball release**. Unchanged; this matches
   existing doctrine and the `p3_release_offset_ms` target of 0 ms or earlier.
3. **Purpose** — landing early buys a split-second pause to judge the ball with
   confidence. This is the *reason* for the target, not a threshold, and is not to be
   turned into a number.

"Stride to stride" is the owner's approved coaching term for this trigger.

**Back hip through P3 — [owner-supplied 2026-09-15]** (see also §3):

> "During P3 the back socket holds it or increases the internal rotation until P4
> releases the hip forward by the elbow going forward while the hands stay back which
> causes the rear knee to rotate forward (Two triangles as described in our
> philosophy)."

> "The hip internal may increase during P3 in an elite swing due to the nature of the
> bow and arrow barrel style load behind the head in P2."

> "The back hip must be closed at the end of P3."

Clarifying: the stride itself is voluntary, but the back hip socket does not give
anything back during it — it holds or deepens, and must still read closed at
foot-down. Closed-at-end-of-P3 is a pass/fail checkpoint; no metric measures it today.

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

**Owner confirmation [owner-supplied 2026-09-15]:** P4 begins at landing plus the back
elbow travelling forward while the hands stay back, which causes the rear knee to
rotate forward. This confirms the existing "rule of one" text above as correct and
current; nothing in the code needed to change.

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

**Owner doctrine [owner-supplied 2026-09-15]:**

> "Back hip socket is closing, and the front hip socket can open, not the pelvis. The
> back hip socket must not open."

> "During P3 the back socket holds it or increases the internal rotation until P4
> releases the hip forward by the elbow going forward while the hands stay back which
> causes the rear knee to rotate forward (Two triangles as described in our
> philosophy)."

> "The hip internal may increase during P3 in an elite swing due to the nature of the
> bow and arrow barrel style load behind the head in P2."

> "The back hip must be closed at the end of P3."

Clarifying: rotation is a *socket* event, not a pelvis event. The front socket is
allowed to open; the back socket is not, and the pelvis is not the thing being asked
to turn. The back socket closes through P1–P2, holds or deepens through P3, must read
closed at foot-down, and is released only by the P4 elbow-forward / hands-back move.

**Status in code: NOT IMPLEMENTED.** The distinction above is recorded doctrine only;
no file, comment, migration, seed row, or reachable commit distinguishes hip *socket*
rotation from *pelvis* rotation, and no asymmetric front/back hip rule exists in code.

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

**Owner doctrine [owner-supplied 2026-09-15]:**

> "if your head goes toward the pitcher or lowers toward the plate: If lowering in
> place or with minimal forward movement then P1 was done correctly. If head travels
> toward the pitcher excessively then P1 was not done and held through P2 resulting in
> a bad position to hit."

Clarifying: head *lowering* is not a fault — it is evidence of a correct P1. Head
*travelling toward the pitcher* is the fault, and it is diagnostic of P1, not of the
head itself.

**Reference point [owner-supplied 2026-09-15]:** the centre of the body means the
athlete's **centre of mass at P2**.

> "The head creeping beyond the center of the body during P3 is excessive forward.
> 6 inches of movement or more is excessive"

**PROVISIONAL — requires validation.** The 6-inch figure is explicitly provisional per
the owner and must be validated against clips with known outcomes before it is treated
as a settled threshold or wired into any metric.

**Previously recorded as missing (now supplied above):** "head lowering versus head
drifting toward the pitcher" as a stated doctrinal distinction, and "head position
relative to centre of mass", were **NOT FOUND IN REPO** as of the original
consolidation (COM appeared only in stride-drift coach notes, e.g. "COM travelling
with the stride limb instead of staying posterior"). They remain absent from code.

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

**RESOLVED — the reference line [owner ruling 2026-09-15].** The reference line for
`stride_dir_deg_off_square` is **a square line to the pitcher**, not a stance-derived
line. Both formulations use 15°; only the reference line differed. The square-line
version — what the repo already implements — is confirmed correct. The stance-derived
framing ("the stance sets a line's direction, and the front foot should land within 15
degrees behind or in front of that line") **is not doctrine** and should not be used.
No code change was required.

**Stride timing trigger — "stride to stride" — [owner-supplied 2026-09-15]** (also
recorded in §1 P3):

> "Stride is to take place prior to pitcher release. I cue hitters to stride after
> the pitchers stride and before the ball release (We use multiple terms but the term
> stride to stride is often used but all describing the pitchers stride being our
> trigger to get going to be ready to stride the ball by the time the ball is released
> so the hitter can have that second split second pause to judge the ball with
> confidence)."

Clarifying: the stride is bounded by two *pitcher* events — initiate after the
pitcher's stride, be fully down before release. `p3_timing` today measures only the
second bound (`front_foot_full_plant` against `pitcher_release_frame`); no anchor for
the pitcher's stride exists, so the initiation bound is currently unmeasured. The
"split second pause to judge the ball" is the stated purpose of landing early and is
deliberately not expressed as a threshold.

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

### 6.3 Owner-supplied fault → outcome mappings

**Head forward [owner-supplied 2026-09-15]:**

> "When the head goes forward hitters are usually late on fastballs or swinging and
> missing chase pitches and fouling off pitches they thought they would hit super well
> or crush."

**Back hip opens early [owner-supplied 2026-09-15]:**

> "If back hip appears closed upon finishing P3 then P2 was done correctly before P3.
> If back hip opens prior to P4 starting (Landing and back elbow traveling forward)
> then P2 was done poorly resulting in a bad position to hit causing users to be bad at
> hitting the high or away pitch, along with hitting hard pullside groundballs and soft
> pop ups opposite field, usually not good fastball hitters but can usually crush off
> speed if they time it up perfectly"

Clarifying: back-hip state at the end of P3 is read as a grade on P2, not on P3. The
fastball-weak / offspeed-strong split is the signature of this fault.

### 6.4 Requested mappings not found in the repo (superseded by §6.3)

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
| Stride reference line | Square line to the pitcher (not stance-derived) | **[owner ruling 2026-09-15]** — confirms existing code | This doc §5; `bh.contract.ts` |
| Head forward past centre of body during P3 | ≥6 inches = excessive; centre of body = COM at P2 | **[owner-supplied 2026-09-15] — PROVISIONAL, requires validation** against clips with known outcomes | This doc §4; not in code |
| Back hip socket at end of P3 | Must read closed | **[owner-supplied 2026-09-15]** | This doc §1 P3, §3; not in code |
| Back hip socket through P3 | Holds or increases internal rotation; may increase in an elite swing | **[owner-supplied 2026-09-15]** | This doc §1 P3, §3; not in code |
| Front vs back hip socket | Front socket may open; back socket must not; pelvis is not the rotating element | **[owner-supplied 2026-09-15]** | This doc §3; not in code |
| P1 standard | Max voluntary rear hip load sets the hip-socket internal-rotation standard | **[owner-supplied 2026-09-15]** | This doc §1 P1; not in code |
| P4 trigger | Landing + back elbow forward with hands back → rear knee rotates forward | **[owner-confirmed 2026-09-15]** — matches existing "rule of one" | `src/lib/hittingCausalChains.ts`; this doc §1 P4 |
| Stride trigger ("stride to stride") | Initiate after the pitcher's stride; down before release | **[owner-supplied 2026-09-15]** — initiation bound not measured; no pitcher-stride anchor exists | This doc §1 P3, §5; `.lovable/p3-power-step-rule.md` |
| Hand counter-move during P3 | Involuntary optics, never cued; the P2 hand load itself is voluntary | **[owner-supplied 2026-09-15]** | This doc §1 P2; `hittingCausalChains.ts` |

Prior to 2026-09-15 nothing in this table was owner-supplied *in writing within the
repo*. That is no longer true: the rows marked **[owner-supplied 2026-09-15]** /
**[owner ruling 2026-09-15]** carry an owner attribution and a date. Everything above
them remains in-repo doctrine or derived constants with no owner attribution. The
benchmark provenance guard (`scripts/check-benchmark-provenance.ts`) covers grading
benchmarks, not these doctrine thresholds.

## 10. Owner doctrine — tiles 1, 2, 4 re-specified `[owner-supplied 2026-09-27]`

### Tile 1 — hip_load `[owner-supplied 2026-09-27]`
> "P1 Hip load is an internal rotation of the hip socket. As long as the player is balanced on the back leg meaning that is the weight distribution then there is no too much. The hip load stability begins to rear its head during P2 & P3 if the user is having movement laterally which will show if the user drifts forward during P3 or is still drifting forward during P4 like we spoke about."

- No maximum. The lateral-drift threshold framing is removed from the code.
- P1 measures back-leg weight distribution. Instability is measured downstream (tiles 17, 19, 20), linked back through root pattern `back_leg_did_not_hold_load`, not duplicated here.
- Status: tile refuses (`respec_pending`) until the method below is approved.

**Proposed method (single side-on camera) — awaiting approval:**
| Signal | Honest side-on? | Why |
|---|---|---|
| Whole-body COM x relative to back ankle / between the ankles | Yes (primary) | Forward-axis position is in the camera plane; the segment-weighted COM already exists (tile 19). Report as fraction of stance width: 0 = over back ankle, 1 = over front ankle. |
| Pelvis midpoint position between the feet | Yes (second vote) | Also in-plane; independent-ish of arm/head mass. Agrees with COM → value; disagrees → missing. |
| Back hip over back ankle (hip-to-ankle line) | Partly | Forward lean is visible; but a hitter can be balanced with a hip slightly inside the ankle — supporting evidence only. |
| Back knee over back ankle | Partly | Visible, but knee position reflects flexion style as much as weight — evidence only, never decides. |
| Actual force/pressure split | No | Needs force plates / insoles; pose cannot see load. The tile will say "position-based estimate", never "weight". |
Pass rule proposal: at D-LOAD-APEX, COM and pelvis both on the back-leg side of the stance midpoint beyond their still-clip floors. Floors to be measured on the still clip before any threshold.

### Tile 2 — hand_load `[owner-supplied 2026-09-27]`
> "The hand load is described as loading the barrel behind your head in a bow and arrow action... Fascial law says hand load depth will vary user to user... The bat will move slowly and just has to be loading behind the head like in our formula."

- No bat tracking: grip is rigid, hands behind head = barrel behind head.
- Pass/fail: hands midpoint behind the head centroid on the forward axis at the load apex (floor = hand 1.35% + head 0.75%).
- Depth: reported, ungraded — no universal number exists and none is invented.
- Grip gate kept.

### Tile 4 — head discipline `[owner-supplied 2026-09-27]`
> "Head discipline is a result of single rear leg control. It's a measurement of balance distribution. The head moving forward in excess after P1 is a signal that P1 was done poorly rather than head discipline being its own function. Everything works in unity."

- Threshold: `com_at_p2` (same function tile 19 uses). Beyond the athlete's own centre of mass toward the pitcher = weight has left the back leg — a physical definition, not a chosen percentage.
- A fail is reported as a P1 back-leg control fault with the head movement as evidence (`root_pattern_key = back_leg_did_not_hold_load`, `attributed_to = P1`). Magnitude reported ungraded.

### Unity `[owner-supplied 2026-09-27]`
> "Everything works in unity."
hip_load, head discipline, head path (19), back hip socket (20) and post-landing hip drift (17) share root pattern `back_leg_did_not_hold_load`.

### §10a — hip_load method APPROVED [owner-approved 2026-09-28]
Position-based estimate — a camera cannot see load; never called "weight". Primary: centre of mass between the ankles (fraction of stance width). Second vote: pelvis midpoint. Evidence only: back hip / back knee over back ankle. Pass at D-LOAD-APEX when both sit on the back-leg side of the midpoint beyond their still floors (0.065 each). No maximum. Disagreement or within-floor → missing.

### §10b — 914cf54c grip finding (2026-09-28)
Frames 54–67 (stance lock): left wrist x 0.74–0.81, right wrist x 0.28–0.33 (normalised), 48–52% of stature apart; both elbows sit anatomically between shoulder and wrist; separation falls smoothly 57% (f50) → 34% (f72) → 15% (f76) → 11% (f78) and stays 4–11% until the apex (f170). A lost wrist would jump; this converges steadily, so it is **window placement**: the lower body settled before the hands gripped up. MediaPipe visibility read 0.97–0.99 throughout and is not evidence either way. Fix: hand-load depth now uses the first ≥0.25 s gripped run (77–82) as its baseline; the grip gate is checked at the apex.

## 11. Owner doctrine — nine tile specifications `[owner-supplied 2026-09-28]`

Most of these REPLACE a threshold with a rule. The reasoning is recorded so the app understands hitting, not just numbers. Code: `src/lib/biomech/metrics/hittingCardTiles.ts` (`CARD_COACHING` carries the reasoning to athletes).

### 11.1 Heel plant — binary, the heel must touch `[owner-supplied 2026-09-28]`
> "Heel has to be touching the ground for the swing. It gives the hitter a better chance to create proper direction with the back bicep. The P3 power itself isn't contingent on touching the ground to get the full rubber band stretch for power but the accuracy from being stable on the floor and the side bend angle that touching the floor from the P2 position creates a better and easier path for the back bicep to attack the ball without hitting the side of the body. Touching the floor also creates a higher possibility for stable eyes."

Spec: heel in contact at full plant; pass/fail; tolerance = still-clip floor only (1.5 % stature heel-above-toe).

Correction `[owner-supplied 2026-09-29]`: Front heel plant concerns the **front heel** (right foot for a left-handed hitter), checked as it settles after toe-first strike. The earlier 2026-09-29 assertion that back-heel lift is normal and ungraded is **reversed** by the owner. The back heel has its own separate tile and joins the back-leg-holding-weight root pattern; never confuse it with front-heel plant.

### 11.1a Back heel stays down until P4 — NEW tile `[owner-supplied 2026-09-29]`
> "The back heel rising should be penalized along with the back-leg-holding-weight formula. The back heel should not begin to move at all until P4."

Window: stance through the frame before `p4_start_frame`. Any back-heel rise beyond the still-clip noise floor fails; no extra tolerance. This is evidence for `back_leg_did_not_hold_load`, together with hip load, head path, back hip socket, head discipline, back knee and post-landing drift, never a separate finding. The front heel and back heel are selected from batting side, not fixed anatomical left/right. The old 7.8% reading on 914cf54c belonged to the back heel, not the front-heel plant tile. The owner confirms that the back heel rose at front-heel landing in P3; the new tile must fail on that clip. Back-heel movement before P4 means the back side let go early; back-knee bend and hip-socket rotation are companion evidence.

### 11.2 Back elbow — square to fair; a path, not an angle `[owner-supplied 2026-09-28]`
> "The back elbow (or bicep) releases the swing from the P3 Power stretch position (X-Factor). The bicep (or elbow) gives the swing a rotation factor even though it is working in a linear fashion. The hands must stay back in the position in accordance to the shoulder but the elbow is gaining ground forward. You ideally want the elbow to get the bat square to the front of the plate which is square to fair territory & the pitcher. I'm not sure of an exact mathematical angle but I do know we want balls in fair territory but optimal is square to fair."

Spec: graded = elbow gains ground forward while hands stay back, both relative to the back shoulder. Elbow path direction reported ungraded (no angle exists; side-on cannot see the lateral component). No slot-angle band.

### 11.3 Shoulder plane — not pass/fail, higher is better `[owner-supplied 2026-09-28]`
> "You want to be 100% from when P4 starts which proves that you did not get fooled. This is no pass/fail test. This is the higher the better. You can have bad shoulder plane and still hit a ball well."

Spec: score 0–100 from P4 start; never a verdict.

### 11.4 Back knee — end of P2 → P3 landing, zero straightening `[owner-supplied 2026-09-28]`
> "From the ending of P2 to landing of P3 is when back leg knee straightening matters. It should not straighten. This is part of the back leg holding the weight formula."

Spec: straightening beyond the floor (4.9°) = fault; linked to `back_leg_did_not_hold_load`.

### 11.5 Post-landing hip drift — zero tolerance, and check for rotation `[owner-supplied 2026-09-28]`
> "Post landing hip drift at all post landing is causing an issue. The hips should be rotational post landing"

Spec: any forward drift beyond the floor = fault; hip rotation reported alongside (a "no drift, no rotation" result is flagged, not called clean).

### 11.6 Hands above the back elbow at heel landing `[owner-supplied 2026-09-28]`
> "Hands coming down associates with a loss of power and a turning of the front shoulder at P3 Landing. The hands can drop during P2 as long as they climb back up during P3 to be higher than the back elbow at the end of P3 which is the heel landing. You want the hands to be above the back elbow at P3 HEEL landing to start P4 & P4 will make the hands drop to get behind the ball on plane."

Spec: only heel landing is graded — hands above back elbow = pass. P2 dip allowed; P4 drop correct. A fail is evidence for `trunk_rotates_before_front_foot_plant`.

### 11.7 Head after landing — direction, not magnitude `[owner-supplied 2026-09-28]`
> "The head can sink after landing but the head coming up before the ball is off of the bat is too much."

Spec: signed; fault = head rising above landing height beyond the floor. Sinking never penalised. Window ends at D-SWING-PEAK as a pose-only PROXY for ball departure (a DelayCam event) — stated in the tile.

### 11.8 Lead elbow — the athlete's own P2 is the reference `[owner-supplied 2026-09-28]`
> "The lead elbow bending anymore than it was at the end of P2 is too much. Ideally you want the arm to be at the users full extensions. Some users arms do not have full extension so the can only extend so far and not to the full length of usually arms due to elbow issues. So the P2 hand load is the most accurate representation of how much elbow bend is allowed."

Spec: lead-elbow angle at end of P2 = that athlete's ceiling; more bend after = fault. A universal number would fail athletes for anatomy, not mechanics.

Other tiles where the athlete's own loaded position is (or should be) the reference: back knee (end-of-P2 angle), shoulder plane (P4-start tilt), head after landing (landing height), head discipline (own com_at_p2), hand_load depth (own stance). Candidate not yet converted: finish balance (own stance width).

### 11.9 Pelvis — square to fair at the end of P4 `[owner-supplied 2026-09-28]`
> "You want your pelvis to get square to fair or front of home plate at the end of P4 after the ball is hit and gone for a finish position before running. We are striding P3 to the pitcher and not the ball so we should be able to get square to fair by the end of P4"

Spec: pelvis vs the plate line at end of P4. Side-on honesty: square = hips face the pitcher = hip line along the camera axis, where the rigid length solve is well-conditioned (θ≈90°), so side-on CAN read it — but unsigned (over-rotation reads like under-rotation) and ungraded (no "close enough" angle; no noise floor near square yet).

### 11.10 Resolved, removed from the outstanding list `[owner-supplied 2026-09-28]`
hand_load depth (ungraded by the fascial-variation ruling), head_discipline (com_at_p2 line from tile 19), hip_load (approved back-leg position method, no maximum).

## Ground-truth confirmation — back heel stays down until P4 [recorded 2026-09-29]
- Clip 914cf54c (left-handed hitter). Owner stated the back heel came up as the front heel was landing (P3).
- First run of the new back-heel tile: FAIL. Front-heel plant on the same clip: PASS.
- The earlier 7.8% "heel above toe" reading was the back foot, filed under the wrong tile — not a miscalculation.
- Status: owner-confirmed, n=1. A signal, not validation.


---

## P3 — the stride is active, not passive [owner-supplied 2026-09-30]

> "our stride and step are not momentum or gravity based. We create that reach/stride/stretch/direction with the back hip toward the pitcher to get us all the way to the ground from our P2 position. As we operate on micro pauses, P1-P2-Pause-P3-Pause-P4."

Carried into the athlete-facing text of every P3 tile (`coachCopy.ts`, `P3_ACTIVE_STRIDE_LINE`).

### What it makes measurable (`metrics/strideRhythm.ts`, record-only)
- **Active stride vs falling** — end of stance → front-foot plant. Back-hip forward travel toward the pitcher vs pelvis drop. Pattern from still floors only (back hip 1.3 %, pelvis drop 2.8 % of shoulder-to-ankle height, still 15d75bc9): active / falling / mixed / no travel. Sits in **P3: Load by Stride** as a record-only tile (2 points once the athlete has 8 in-context clips). Falling is mapped to the back-leg root pattern (`active_stride_falling`) as evidence, **not emitted** until the owner rules (`ROOT_EVIDENCE_ENABLED = false`).
- **Micro-pauses** — body speed between end of P2 (load apex) and plant, and between plant and swing start. Records the deepest slowing (min ÷ peak) and time spent near it. Own reading ("Rhythm"), unscored: it spans P2–P4, and putting it inside the double-weighted P4 meter would let an unvalidated timing reading move the most important score.
- **Frame rate:** speed uses a two-frame difference plus a three-frame median, so a pause must fill ≥ 5 frames between the anchors to be resolved: ≥ 0.17 s at 30 fps, ≥ 0.21 s at 24 fps. Shorter pauses are smeared out and refuse (`insufficient_temporal_resolution`). 60 fps halves that. The owner has given no pause duration, so none is assumed.

## P3 — the full picture `[owner-supplied 2026-09-30]`

"When speaking about the P3 the stride often ends up looking like the front foot moving forward and the hands moving back while the body from a side profile begins to create an angle of side bend with the chest moving toward the plate in a suit casing type of manor & sinking on the back leg as that front foot moves looks to move forward to the ground. This look is due to P1 & P2 load creating a balance point to keep the body back as the glute attempts to stride forward but should not actually gain ground but become more coiled as 'forward move' P3 stride happens. This ties into info I have given before. It is not a gravity move but a controlled voluntary movement."

Built from it (all record-only, zero points, no owner numbers; `runStrideCoil` in `strideRhythm.ts`). Window: the front foot's rearmost point between stance and plant (after any gather) → front-foot plant. Floors measured on still clip 15d75bc9 before use.

- **A. Foot forward, body stays back** — front-ankle forward travel ÷ pelvis forward travel. Floors: front ankle 1.5 %, pelvis 0.9 % of stature.
- **B. Hands back as the foot goes forward** — hand-centroid travel against the foot. Floor 1.4 %. Starts at the foot, not the load apex: after the hand extremum the hands can only come forward.
- **C. Side bend builds** — change in in-plane trunk tilt away from the pitcher. Floor 1.2°. The "chest toward the plate" part is depth and is not visible side-on; this is the in-plane proxy. Linked to the front-heel plant (owner: touching the floor from P2 creates the side bend that clears the back arm's path).
- **D. Sinking, not falling** — pelvis drop, plus where the pelvis sits between the feet at plant. Sink = drop beyond floor, pelvis over the back half, no forward travel beyond floor. Fall = drop with forward travel and pelvis over the front half. Floor 2.8 %.
- **E. More coiled** — already evidenced by tile 20 (back hip socket holds or increases). Coil is the mechanism; the hip holding its turn is the evidence. In the P3 coaching text.
- **F. Voluntary, never gravity** — in the P3 coaching text on every P3 tile.

Placement: all four sit in P3: Load by Stride at zero points and map to `back_leg_did_not_hold_load` (`stride_body_gained_ground`, `stride_hands_went_with_foot`, `stride_side_bend_lost`, `stride_fell_forward`). Mapped, not emitted, until the owner rules (`ROOT_EVIDENCE_ENABLED = false`).

Open for the owner: the earlier active-stride tile counts back-hip forward travel as "active". This quote says the glute drives forward but the body "should not actually gain ground". On 914cf54c the back hip and pelvis both travelled forward well beyond their floors — active stride calls that active, reading A calls it the body going with the foot. The two readings need reconciling before either is ever graded.

## Micro-pauses — routed to DelayCam `[owner ruling 2026-09-30]`

"If the micropauses cannot be measured in 24-30fps then we should push them to the delaycam project in the mechanics toggle side where it is measurable." Tested: the smallest dip the speed trace can show spans five frames (≈0.21 s at 24 fps, ≈0.17 s at 30 fps). On all three fixtures the landing and swing-start anchors could not be put in order at 24 fps, so the pause before the swing was never resolved on any real clip. Moved to the DelayCam mechanics spec; not on the upload card.

## The sequence chain — owner's order, not the conventional kinetic chain `[owner-supplied 2026-09-30]`

"Hip turning is sequencing mapping after P3. Forward movement toward the pitcher is a buffer or sequence beginning."

"The P3 glute drives but due to proper loading style of P1&P2 as explained earlier anatomy further coils the hip as the glute attempts to move forward until the back bicep/elbow moves forward which turns the back knee (Turning/creating the triangles) which begins the hip rotation which catapults shoulders (Rotationally) from their square position (that held for separation), which drives the barrel through the ball."

"Perfect that the chin & shoulder tuck. This unlocks biomechanical ease & being able to see the ball well."

What it establishes (built 2026-09-30, `metrics/hittingCardTiles.ts`):
- **Chain:** back elbow → back knee → pelvis → shoulders → barrel. The elbow initiates. The barrel link is bat tracking and belongs to DelayCam; the upload card checks the first four.
- **No hip rotation in P3.** The glute's forward drive becomes more coil because P1/P2 load stops the body travelling. Opening before P4 is early — same fault tile 20 (back-hip socket hold) measures. Active stride is unsigned and is never read as "correct".
- **Forward movement is the buffer**, not a link. No translation term enters the order check.
- **Measurement:** peak angular speed per link. Side-on the back upper arm points at the camera for most of the swing (image length under 60% of stance length), so the elbow link falls back to a labelled proxy: the elbow's forward speed relative to the back shoulder — the owner's own words for the trigger, and the arm's motion, not body travel.
- **Chin-to-shoulder tuck** is confirmed doctrine with two benefits: ease of movement and seeing the ball. The leak (head-to-front-shoulder angle, end of P2 → P4 start, still floor 3.2°) is measured side-on; the gap itself is reported only when visible.

## Sequencing — the true test `[owner-supplied 2026-09-30]`

"The knee leads hips leads shoulders leads hands is the same sequence in a different way to see it but we know the hitters move starts it. We should be able to see if it is happening. That is bottom of the barrel inference. The true test by itself is hips before shoulders and the other tests give signals for the rest of the sequencing to paint a whole picture if we cannot see it. Depending on a users fascial system the back elbow/bicep may not have to begin moving far forward at all before activating the chain & it does not have to move completely forward, it just has to begin the forward move to release our loaded power step. Elbow begins the hitters move responsible for getting the barrel to the ball in a timely manner. The elbow does not have to be fast at all, it is about the sequence of the matter. The elbow moving down and toward the pitcher is what we are looking for."

"Theoretically we want that chin over/in line with/or beyond the front shoulder toward the back until landing (P3 is over) & P4 begins."

Context: "when talking about chin position over the front shoulder to see the ball and not yank the front shoulder out and move out of sequence."

(Correction 2026-09-30: an earlier copy of this quote read "shin" — an autocorrect. The shin tile built on it was removed.) Built as the POSITION channel of `shoulder_to_shoulder_hold`: nose minus front shoulder on the forward axis, image plane, end of P2 → landing. Still floor 0.8% of stature. Record-only, never graded, linked to the front-shoulder leak.

## Separation — a tie is a finding `[owner-supplied 2026-09-30]`

"In the separation we have to know which started first because of the power chain and if there is no separation that means it's insufficient and if it's unreadable then we need to move it to delaycam. I believe I did not have sufficient separation in that video."


## Chin forward, eyes later `[owner-supplied 2026-09-30]`

"chin position over the front shoulder to see the ball and not yank the front shoulder out and move out of sequence. We want that head forward and eventually the eyes will move toward to plate while the hips rotate the shoulders the opposite way which does not need to be measured right now"

Chin-to-shoulder now has three channels: POSITION (nose vs front shoulder on the forward axis, end of P2 → landing, still floor 0.8% stature, record-only), LEAK (head-to-front-shoulder angle, floor 3.2°, auto-fail), GAP (depth; refuses side-on). The eyes turning toward the plate while the hips turn the shoulders the other way: doctrine only, not measured.

## Separation = magnitude + order (2026-09-30)
- MAGNITUDE (upload card, record-only): |pelvis turn − shoulder turn| per frame, end of P2 → swing peak. An angle, frame-rate independent. Side-on still floor 13.9° — the rigid-width solve is noisy near square-to-camera. No owner figure for "sufficient".
- ORDER (DelayCam mechanics below 60 fps): which peaked first.


## Chin on the side-to-side angle `[owner-supplied 2026-09-30]`

"I meant CHIN & not shin at all when talking about chin position over the front shoulder on the side to side angle to see the ball and not yank the front shoulder out and move out of sequence. We want that head forward and eventually the eyes will move toward to plate while the hips rotate the shoulders the opposite way which does not need to be measured right now"

Three reasons for the tuck: ease of movement, seeing the ball, staying in sequence (links chin-to-shoulder to sequencing). FUTURE WORK, not measured: eyes moving toward the plate while the hips turn the shoulders the other way.

Sequencing verdict logic (2026-09-30): gap ≤ one frame = insufficient separation (fail); ≥ two frames, hips first = pass; shoulders first = fail. Graded only at ≥60 fps; below, the would-be verdict is recorded and the tile routes to DelayCam.

## P1 is proven downstream `[owner-supplied 2026-09-30]`

> "For hitting P1 is what missed if P2 passed. If I drift forward then I couldn't have had the back hip balance. P1 has to read the rest of the swing but P3 took the hit of the P1 trouble."

What this establishes:
- A snapshot at the load point shows position only. Whether the load was real is proven by what follows: the body holds back through the stride (P1 real) or drifts forward (P1 not real, whatever the snapshot showed).
- Back-leg balance is not a separate snapshot. It is the downstream proof: did the body hold its position through P3?
- When the back-leg pattern fires, it is a P1 fault with P3 as its evidence. The coaching fix is the load, not the stride.

**Standing rule:** a phase whose quality can only be proven by what follows must read the following phases before giving its verdict. A snapshot measures position; only the consequence proves whether the position was real.

Built: P1 "Back-leg balance, proven by the stride" fails when any of foot-vs-body, sink, head discipline, back heel or back knee shows the body went forward beyond its still-clip floor. A failed proof voids the hip-load pass. Failing P3 evidence tiles (back hip socket, head path, head discipline, back heel, back knee) count in P1, not again in P3.

Proposed, not built (owner to confirm): P2 proven by P3 hands-opposite and P4 back-elbow connection; P3 proven by P4 hip drift after landing and front-shoulder leak; the chain stops at P4 — P4 and the Finish are judged on their own, so no phase waits past the swing.

## Sequencing proves P1 was real `[owner-supplied 2026-10-01]`

> "Proper sequencing of the hip first also confirms that the hitter had the right method of attempt and not faking a good P1 by not fully using your back hip for P3. It must be real."

**Standing rule:** P1 cannot pass on the absence of a fault. It needs positive evidence the load was built (body held back through a real stride) AND used (graded hips-first sequencing). No stride above the noise floor = unproven. Sequencing routed to DelayCam (below 60 fps) = proof incomplete — its would-be verdict is never used as proof in either direction.

## The P1 proof is two-sided `[owner-supplied 2026-09-30]`

> "Proper sequencing of the hip first separation and no hip slide forward after landing both also confirms that the hitter had the right method of attempt and not faking a good P1 by not fully using your back hip for P3. It must be real."

Built: Half A (body held back) fails → "load not held". Half A holds but hips-first separation or no-slide-after-landing fails → "load not used". Both confirmed → pass. Half B unreadable → unproven, never passed. No-slide alone does not carry Half B (a passive hitter never slides either).
