# Hammers Modality — Screenshot Batch Notes (Batches 2–5) — Handoff to Claude

Purpose: these are source-material notes, not app decisions. The material came in as
screenshots of an external AI conversation about elite strength/power/fascia training for a
professional baseball athlete. The goal is for Hammers Modality auto-programming to absorb the
*principles* — not to copy the prescriptions literally.

Reconstruction note: content below was recorded as each batch arrived. Wording is paraphrased
from the screenshots, not quoted verbatim.

Evidence labels used throughout:
- **[SOURCE CLAIM]** — asserted in the screenshots, not independently verified. Do not hard-code
  as physiological fact or medical guidance.
- **[PROGRAMMING RULE]** — a schedulable, testable rule the engine can act on.
- **[USER DECISION]** — the athlete/owner stated it as their own intent.

---

## BATCH 2 — Sled strategy, plyometric phase progression, training surfaces
(IMG_8077–IMG_8091)

### 2.1 Sled work — two distinct tools, not one

**Heavy sled push**
- Positioned as the primary **in-season power-maintenance** tool.
- Rationale given: it is concentric-dominant with essentially **no eccentric loading**
  **[SOURCE CLAIM]**, therefore it produces little to no delayed-onset soreness and does not
  compromise next-day game performance.
- Because of that, it is the one heavy-feeling stimulus considered safe to run during a
  six-games-per-week competitive schedule.
- Prescription shown: **2–3 sets × 15–20 yards**, heavy load, full recovery between sets.
- Intent: maintain horizontal force production and hip/ankle extension strength without
  accumulating eccentric damage.

**Light sled drag (backward and forward)**
- Two separate uses:
  1. **In-season recovery flush** — low load, easy pace, used post-game to move blood through
     the legs. Explicitly *not* a training stimulus.
  2. **Late-offseason resisted acceleration** — light-to-moderate load used to sharpen sprint
     acceleration mechanics once the athlete is already in the velocity/expression phase.
- Backward drag specifically flagged for knee/quad/tendon tolerance work **[SOURCE CLAIM]**.

**Hammers implication:** sled is not one movement. It needs at least three distinct catalog
entries with different dose, different phase legality, and different recovery cost:
`sled_push_heavy` (power), `sled_drag_light_recovery` (recovery), `sled_resisted_accel` (speed).

### 2.2 Plyometric progression by phase — the central idea of this batch

Plyos are not a single bucket. They progress along an **intensity/ground-contact axis** tied to
the offseason phase. Three tiers were described:

**Tier 1 — Extensive plyos (early offseason, KOT/structural phase)**
- Character: rhythmic, low-impact, high-repetition, submaximal.
- Examples: low ankle pogos, low lateral skater hops, low box step-down jumps.
- Purpose: build tendon/connective-tissue tolerance and rhythm, not peak output.
- Surface: sand or soft grass.

**Tier 2 — Absorption / deceleration plyos (double-eccentric phase)**
- Character: landing-focused, emphasis on *stopping* force, not producing it.
- Examples: **depth drops from 12–24 inches with a 2-second hold in the landing position**,
  single-leg box drops.
- Explicitly **no rebound** — the athlete lands and holds. This is the "no-jump" phase.
- Purpose: eccentric strength, landing control, deceleration capacity.
- Surface: turf or grass.

**Tier 3 — Intensive / reactive plyos (banded-velocity phase only)**
- Character: maximal, short-contact, elastic.
- Examples: true depth jumps (drop and immediately rebound), continuous banded rocket jumps,
  max-effort bounding, Marinovich-style reactive work.
- Claimed ground-contact target: **under 0.2 seconds** **[SOURCE CLAIM]**.
- **Golden rule stated:** true depth jumps are reserved for the banded/velocity phase *only*.
  They are never run in the KOT phase, and never during the absorption phase.
- Surface: concrete or a thick rubber mat, for maximum energy return.

**Hammers implication:** plyometric selection must be **gated by phase**, not chosen freely. A
depth jump appearing in an early-offseason KOT week is a programming fault, not a variation.

### 2.3 Training surfaces — a real programming variable

A surface ladder was presented, ordered by impact and energy return:

| Surface | Impact on body | Energy return | Typical use |
|---|---|---|---|
| Sand | Lowest | Lowest | Early offseason, extensive volume, tendon tolerance |
| Grass / dirt | Medium | Medium | Absorption phase, sport-specific accel and change of direction |
| Turf | Medium | Medium-high | Landing work, general |
| Concrete / rubber mat | Highest | Highest | Peak reactive work, depth jumps only |

Additional rule: as the offseason approaches the season, **baseball-specific acceleration and
change-of-direction work should migrate to grass/dirt** — because that is the competition
surface — while peak reactive plyos may still use concrete or a thick mat.

**Hammers implication:** surface belongs in the exercise metadata and in the phase model. The
same plyo on sand versus concrete is a different dose and a different recovery cost.

---

## BATCH 3 — Depth-drop phase detail, surfaces table, offseason lift spacing
(IMG_8092–IMG_8096)

### 3.1 The depth-drop / "no-jump" phase, elaborated
- Reinforces Tier 2 above: during the double-eccentric block, the athlete **absorbs only**.
- The 2-second hold is the defining feature — it forces true eccentric/isometric control instead
  of letting the stretch-shortening cycle do the work.
- Box heights 12–24 inches; height is progressed conservatively, and single-leg variants are
  introduced only after bilateral control is clean.

### 3.2 True depth jumps, elaborated
- Distinguished sharply from depth *drops*: the depth **jump** rebounds immediately.
- Framed as the highest-neural-demand plyometric in the system.
- Only legal in the banded/velocity phase **[PROGRAMMING RULE]**.
- Low volume, full recovery, quality-gated: if contact time lengthens or landings degrade, the
  set ends.

### 3.3 Offseason lift spacing — first statement
- Initial framing: heavier and faster lift types need more recovery between sessions than
  general work.
- Introduced the idea that spacing is dictated by the *type* of lift, not by a fixed weekly
  template.

### 3.4 The "golden rule"
- Stated as: match the plyometric intensity to the phase, and never let a higher-tier plyo
  appear before the phase that earns it. Progression is structure → absorption → expression.

---

## BATCH 4 — Final spacing law, in-season Lift A / Lift B rotation, muscle–fascia model
(IMG_8097–IMG_8106)

### 4.1 Offseason lift spacing — **final, revised rule** [USER DECISION]

This supersedes the earlier looser framing in Batch 3.

- Combining **KOT work with heavy 3×3** raises the total recovery requirement of the session.
- **Heavy 3×3 requires 3 days between lifting sessions.** Example given: Monday, Friday,
  Tuesday — a rolling 3-day cadence, not a fixed weekly grid.
- **Double-eccentric work also requires 3 days.**
- **Banded / velocity lifts also require 3 days.**
- Conclusion as presented in the summary screenshot: **use 3 days between all offseason lifting
  sessions**, with one exception — if a session is *pure unloaded KOT mobility* with no heavy
  3×3 attached, 2 days is acceptable.

**Hammers implication:** a spacing law keyed on lift type:
`heavy | banded | eccentric | velocity → 3 days minimum`; `unloaded mobility only → 2 days`.

### 4.2 In-season context [USER DECISION]
- The athlete plays **MLB, six days per week**.
- Pre-game: **light extensive plyos daily**.
- Lifting happens **post-game**, never pre-game.
- Road-trip reality: sled and turf access is not guaranteed, so substitutions must exist.

### 4.3 In-season post-game rotation — the A/B system

A **20–25 minute** post-game session, alternating every 3 days:

**Lift A — "Power Anchor"**
1. Overcoming isometrics (push against immovable resistance, maximal intent, short duration)
2. Standard **3×3 at roughly 80–85% 1RM**
3. **Heavy sled push, 2–3 × 15–20 yards**

**Lift B — "Velocity Reload"**
1. **Banded 3×3 at roughly 40–50% bar weight plus band tension** — moved with maximal speed
2. Light backward sled drag
3. Low-intensity, low-volume KOT / ATG work

**Weekly shape presented:**
Day 1 pre-game plyos → game → post-game **Lift A**; Days 2–3 games with pre-game plyos and no
lift; Day 4 game → post-game **Lift B**; repeat.

**Stated rationale:**
- KOT in Lift B functions as a **post-game recovery flush**, not as a strength stimulus.
- Banded lifting functions as a **high-velocity reload** — it restores bar speed and rate of
  force development without the eccentric cost of heavy tonnage.
- Heavy sled pushes carry the heavy-strength signal without soreness **[SOURCE CLAIM]**.

**Open questions the source raised that Hammers should answer:** which compound lifts are used
for the 3×3, and whether the road facility has sled/turf access.

### 4.4 Muscle and fascia as partners (start of the fascia thread)
- **Muscle** produces active, metabolic, ATP-consuming force.
- **Fascia** recycles passive elastic energy, absorbs shock, coordinates multi-joint movement,
  and thereby reduces the workload the muscle must cover **[SOURCE CLAIM]**.
- Framing: they are a partnership; training only the contractile side leaves elastic capacity
  undeveloped.

---

## BATCH 5 — Fascia mechanisms, full offseason outline, in-season note page
(IMG_8107–IMG_8113, IMG_8115, IMG_8118, plus the pasted text file)

### 5.1 Fascia mechanism claims — record, qualify, do not hard-code

All of the following are **[SOURCE CLAIM]**. One screenshot carried its own disclaimer.

- **Pre-loading and elastic recoil:** loading fascia before movement stores elastic energy that
  is returned during the concentric phase.
- **Myofascial force transmission:** force travels through connective tissue between muscles,
  not only along a single muscle's line of pull. Claimed downstream effect: **lower ATP demand
  and reduced fatigue**.
- **Leverage claim:** a well-developed fascial network can let smaller muscles contribute to
  major explosive force output.
- **Isometric → stretch → recoil:** isometric contraction pre-tensions the fascial sheath, which
  then stretches and recoils.
- **Hydraulic expansion:** contracting muscle expands against the fascial sheath, creating
  stiffness and a hydraulic pressure effect.
- **Tensegrity / kinetic siphoning:** force is siphoned along continuous lines — thoracolumbar
  fascia and the lateral lines were named specifically.
- **Muscle-first vs fascia-first comparison:** muscle-first training was framed as producing
  hypertrophy; fascia-first training as producing athleticism.
- A follow-up question asked which movements stimulate **fibroblasts** and produce spring-like
  tissue.

**Required handling for Hammers:** these are hypotheses that motivate *movement selection*, not
facts to print to an athlete. Safe, defensible versions to keep:
connective-tissue force transmission; tissue remodeling in response to load; loading-rate
effects; rate of force development; pre-tension before explosive effort; distinct eccentric,
isometric and plyometric adaptations; recovery cost; balanced stiffness versus mobility;
coordinated whole-chain transfer.
**Do not** hard-code: a 30% fascia amplification figure, immediate myofibroblast tightening,
hyaluronan solidification, "super-hydration," "slow high-rep produces only sarcoplasmic
hypertrophy," "tight fascia automatically means explosive," or "more collagen cross-linking is
always better."

### 5.2 Offseason outline '26–'27 (athlete's own notes page, IMG_8115) [USER DECISION]

Sequential blocks:

1. **6 weeks — KOT / structural phase**
   - Lifting: 3×3
   - Plyos: extensive (low pogos, skaters, low step-downs)
   - Plus heavy sport work
   - Surface focus: **sand**

2. **4 weeks — double-eccentric phase**
   - Lifting: 3×5
   - Plyos: extensive plus **max-depth absorption** landings
   - Plus heavy sport work
   - Surface focus: **dirt / grass**

3. **2 weeks — heavy sport block** (sport volume dominant)

4. **4 weeks — pre-opening banded / velocity phase**
   - Lifting: 3×5, plus regular 3s and 2s
   - Plyos: depth drops, reactive work, Marinovich-style
   - Plus heavy sport work
   - Surface focus: **concrete**

5. **4 weeks — final pre-opening block**
   - Plyos: light
   - Lifting: overcoming isometrics
   - Plus **heavy sled runs**

Total: 20 weeks.

### 5.3 In-season note page (IMG_8118) [USER DECISION]
Every 3 days, one of:
- Overcoming isometrics + 3×3, **or**
- Banded lifting at 50%+
Plus, across the cycle: heavy sled pushes, light sled work, low-volume/low-intensity ATG/KOT,
and HFT fascia work / light plyometrics folded into the sport warm-up.

### 5.4 The pasted knowledge package (6,138 lines)
Key governing content, summarized:
- **Stated purpose:** Hammers should extract principles to drive exercise selection, loading,
  intensity, reps, volume, sets, emphasis, neural demand, fast-twitch recruitment, workload
  progression, exposure, sport/jump/sprint/throw volume, recovery, return-to-training, injury
  risk, season phase, training age, tolerance, sport demands, and concurrent workload.
- **Critical principle:** *"Hammers must program the athlete based on what the athlete has been
  exposed to recently, not merely what the athlete is theoretically capable of doing."*
- **Workload spikes:** a 10–30% single-session increase was described as associated with roughly
  60% higher injury risk; a 100% spike as more than doubling risk. Workload counts running,
  jumps, sprints, throws and sport volume together — not just lifting.
- **%1RM reference table** (explicitly described in the source as a reference, *not* universal
  law):

| %1RM | Reps per set | Total reps (range) | Primary quality |
|---|---|---|---|
| 95–100% | 1–3 | 7 (4–10) | Max strength |
| 85–95% | 3–6 | 10 (6–14) | Strength |
| 75–85% | 6–10 | 15 (10–20) | Hypertrophy / endurance |
| 65–75% | 10–20 | 18 (12–24) | Explosive power, endurance, some hypertrophy |
| 55–65% | 20–35 | 24 (18–30) | Endurance |
| 45–55% | 35–50+ | 100 (50–150) | Endurance |

- **Whole-chain programming:** consider local structure plus adjacent, proximal, distal and
  whole-chain contributors. Baseball chain named as:
  foot → ankle → knee → hip → pelvis → trunk → scapula → shoulder → elbow → wrist → hand.
- **Adaptation buckets:** maximum force, relative strength, mass, RFD, maximum velocity,
  reactive strength, elastic/SSC performance, sprinting, jumping, change of direction,
  deceleration, tendon/connective tissue, ROM/control, muscular endurance, work/aerobic/recovery
  capacity, technical skill, sport transfer.
- **Optimization target:** maximum productive stimulus per unit of recoverable fatigue.
- **Evidence integrity section:** matches 5.1 above — record claims, never present them as
  settled fact.

---

## Cross-batch synthesis for Claude

Four separate systems live in this material and must not be collapsed into one:

1. **Workload management** — exposure-based progression, spike detection across all channels.
2. **Strength/power loading** — %1RM, sets/reps, the 3×3 / 3×5 structure.
3. **High-neural methods** — depth jumps, overcoming isometrics, banded velocity work; these are
   phase-gated and spacing-gated.
4. **Fascial / whole-chain loading** — surfaces, elastic work, chain coverage; motivating theory
   is unverified, so it may influence *selection* but must not author certainty.

Hard rules extracted:
- 3 days between any heavy, banded, eccentric or velocity lift. 2 days only for pure unloaded
  mobility.
- In-season lifts are post-game only, alternating A/B on a 3-day cadence.
- Depth jumps only in the banded/velocity phase.
- Depth drops with a 2-second hold only in the double-eccentric phase.
- Plyo tier and surface both advance with the phase, never ahead of it.
- Program from recent exposure, never from theoretical capability.
