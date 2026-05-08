# Cause→Effect + Roadmap Layer for 1-2-3-4 Hitting Doctrine

Additive only. Nothing removed. Builds on the existing P1/P2/P3/P4 phases, caps, slap exception, symptom map, and drill catalog.

## Doctrine extension (locked)

Every phase failure is now taught as a **5-link causal chain** plus a **4-step roadmap** in **two voice registers**.

**Causal chain shape:**

```text
TRIGGER  →  CAUSE        →  MECHANISM            →  ON-FIELD RESULT       →  FIX (one-liner)
(when)      (what fails)    (why body/bat fails)    (what shows up live)     (the corrective intent)
```

**Roadmap shape (4-step ladder):**

```text
1. FEEL    — body cue, no bat
2. ISO     — drill with no ball (or tee), isolating the fix
3. CONSTRAINT — tee/front-toss with a constraint that forces the fix
4. TRANSFER  — front-toss → machine → live BP, fix held under speed
```

**Voice (two registers, always paired):**

- `athlete` — plain-English, kid-friendly, one sentence per link.
- `coach_note` — technical mechanism, biomechanical precision, one sentence.

## Canonical phase chains (seeded library)

Stored in shared module so video analysis, Hammer chat, recaps, and drill cards all read the same source.

**P1 — Hip Load failure**

- Trigger: pitcher starts delivery (Hitters legs loaded by the time pitchers hands break apart)
- Cause: hands load before / instead of back hip
- Mechanism: no separation, weight stays centered or drifts forward, no rubber-band stretch in obliques
- Result: weak contact, jammed elbow, no power even on barreled balls, late, swing and miss, chase balls
- Fix: load the back hip slowly first; hands are the last thing to move
- Rule reminder: bigger early hip load = more swing power (no-stride or high-pickup)

**P2 — Hand Load failure**

- Trigger: hip load complete, hand load starting
- Cause: hands never get back / drift with the body
- Mechanism: no bat-head depth, front shoulder leaks, chest opens early
- Result: long stride, head drifts to pitcher, pull-off, weak fly to opposite field
- Fix: Load hands before stepping forward (When you step, the front foot moves forward. & the hands will  move slightly back involuntarily)

**P3 — Stride / Landing failure**

- Trigger: Hip then hand load done, stride starts
- Cause: lands open (toes/chest pointed at pitcher) instead of sideways
- Mechanism: hips can't store torque, core can't tension, back side collapses or stays stuck
- Result: late on velocity, can't reach outside pitch, off-balance at contact, jammed
- Fix: land sideways with both feet down, chest still toward the plate, back hip controls the step forward, core max-tensioned

**P4 — Hitter's Move failure (most important)**

- Trigger: front foot down, decision to swing made
- Cause: hands fire before back elbow drives forward
- Mechanism: knob loses its position/fulcrum; barrel casts/flips early; shoulders open before elbow extends, dragging the bat around the body instead of through the ball
- Result: rollover, weak pop-up oppo, swing-and-miss on offspeed away, pulled foul grounder
- Fix: back elbow leads forward first; hands stay back; the elbow turning your body **is** what gets the barrel to the ball

Each chain ships in `athlete` + `coach_note` voice and links to its 4-step roadmap drill ids (already in the catalog: `hip_load_iso`, `load_sequence_pause`, `sideways_landing_check`, `elbow_first_fulcrum`, `catch_the_ball`, `no_stride_power`, plus existing `tee_work`, `front_toss`, `machine_bp`, `flip_drill`).

## Files to change

### 1. New: `supabase/functions/_shared/hittingCausalChains.ts` + `src/lib/hittingCausalChains.ts` (mirror)

Single source of truth. Exports:

- `PHASE_CAUSAL_CHAINS: Record<HittingPhaseId, CausalChain>` — the 5-link chain in both voices.
- `PHASE_ROADMAPS: Record<HittingPhaseId, RoadmapStep[]>` — 4 steps each, every step has `{ label, intent, drillId, athleteCue, coachNote }`.
- `buildChainForSymptoms(symptoms[], ctx)` — picks the dominant phase via existing `attributePhaseFromSymptoms`, returns `{ chain, roadmap, phaseId }`.
- `formatChainText(chain, voice)` — produces the inline string for AI prompts and recaps.
- Slap-hitter exception: P2/P3 chains return a "style-permitted, focus on P1+P4" variant.

### 2. `supabase/functions/analyze-video/index.ts`

- Inject the canonical chains + roadmaps into the system prompt as the required teaching format.
- Extend JSON output schema (additive — old keys preserved):
  - `causal_chains: [{ phase, trigger, cause, mechanism, result, fix, voice }]`
  - `roadmap: [{ step, label, intent, drill_id, athlete_cue, coach_note }]`
- Require model to output **two voice registers** for every chain link.
- Keep all existing fields (`phase_scores`, `phase_violations`, `dominant_failed_phase`, `style_detected`).

### 3. `supabase/functions/ai-chat/index.ts` (Hammer)

- System prompt: "When diagnosing a hitting problem, always answer in this order — TRIGGER → CAUSE → MECHANISM → RESULT → FIX, then give the 4-step ROADMAP. Default to athlete voice; append a one-line Coach's Note."
- Inject the seeded chains/roadmaps so Hammer never improvises the canon.
- Add the rule: "The elbow leading forward is what turns the body and whips the bat to the ball — never separate cause from effect."

### 4. Drill descriptions — `src/data/baseball/drillDefinitions.ts` + `src/data/softball/drillDefinitions.ts`

Each drill (existing + new) gains:

- `fixesCause: string` — what cause it removes ("hands load before hips")
- `eliminatesEffect: string` — what on-field result disappears ("rollover, weak pop-up oppo")
- `roadmapStep: 'feel' | 'iso' | 'constraint' | 'transfer'` — its slot in the ladder
No drills removed; only metadata added.

### 5. Post-session surfaces (additive)

- `supabase/functions/calculate-session/index.ts`, `supabase/functions/generate-vault-recap/`, `session-insights` paths: when a session has logged P-symptoms, attach `causalChain` + `roadmap` to the recap payload using `buildChainForSymptoms`. Existing fields untouched.
- `richSummary` on game post-AB: same attachment when AB outcome maps to a phase symptom.

### 6. Rep feedback (light touch)

- Adaptive feedback hashing already exists. Add a phase-aware variant that, when a rep tags a P-symptom, emits the **athlete-voice fix line + step-1 feel cue** only (don't dump the full chain per rep).

### 7. UI (presentation only — no business logic)

- Recap cards and video analysis cards render the chain as a vertical 5-row strip + a 4-step roadmap chip row. Athlete voice shown by default, Coach's Note collapsed under "Coach's note ↓".
- Components: new `HittingCausalChainCard.tsx` and `HittingRoadmapLadder.tsx` (used by video analysis result, session recap, vault recap).

### 8. Memory

- Update `mem://features/hitting-analysis/elite-hitting-mechanics-formula` to add the 5-link chain + 4-step roadmap + two-voice rule as canon.
- Update `mem://index.md` Core line for hitting to mention "5-link cause→effect chain + 4-step roadmap, athlete + coach voice".

## Non-changes

- No DB migration. No score recomputation. No removal of the existing kinetic-chain rules, caps, slap exception, or symptom map. No new gates on the athlete UI.

## Acceptance checks

- Video analysis JSON for a P4 violation returns the full 5-link chain in both voices and a 4-step roadmap ending in `transfer`.
- Hammer answers "why am I rolling over?" with TRIGGER→CAUSE→MECHANISM→RESULT→FIX + 4-step ladder, athlete-voice first, Coach's note appended.
- A logged tee rep with `early_barrel_flip` symptom shows the P4 fix line + feel cue only (not the whole chain).
- Vault recap surfaces the dominant phase's chain and roadmap when symptoms exist.
- Slap-progression at-bats never surface P2/P3 chains; P1+P4 chains still fire.
- Drill cards show `fixesCause` / `eliminatesEffect` / roadmap step badge.