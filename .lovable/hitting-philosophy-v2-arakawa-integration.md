# Hitting Philosophy v2 — Arakawa Integration (Additive Overlay)

**Status:** ADDITIVE OVERLAY. Pure addition. Nothing prior is deleted, replaced,
or downgraded. All previously ratified hitting work remains authoritative:

- `.lovable/back-elbow-methodology.md`
- `.lovable/bat-path-vs-on-plane-definitions.md`
- `.lovable/p3-timing-methodology.md`
- `.lovable/finish-and-balance-methodology.md`
- `.lovable/time-to-contact-vs-power.md`
- All `src/lib/hittingPhases.ts`, `src/lib/hittingCausalChains.ts`,
  `src/lib/formulaPhases.ts`, `HittingDoctrineBlock`, `HittingRoadmapLadder`,
  the report-card-era doctrine (`src/lib/reportCard/disciplines/bh.ts`,
  `src/lib/reportCard/v1/hittingV1Schema.ts`), and every existing cue
  library continue in force, now extended by this overlay.

This overlay integrates the Arakawa / Sadaharu Oh teaching (pp. 130–145, 150–151)
into our existing 1-2-3-4 doctrine without renaming phases or breaking any
downstream data, scoring caps, video tags, or replay-pinned snapshots.

---

## 1. Arakawa Pillars (additive teaching layer)

1. **Center-first hitting.** Stability and power radiate from an organized
   center ("one point" below the navel). Cues that push the hitter into the
   ball from the periphery (arms, hands, back hip projection) are forbidden.
2. **Active waiting / "Body of a Rock".** The hitter waits in an organized,
   pre-tensioned posture. The pitch is *received*, not chased. Premature
   defensive bracing weakens the hitter.
3. **Organization over force ("Ki", not muscling).** Output is the result of
   an organized ground path, not raw effort. Tension on demand, not always-on.
4. **Constraint-led reorganization.** Use intelligent constraints to force
   correct organization (e.g. flamingo / no-stride, knob-back holds,
   elbow-first tee work). Coaching by constraint > coaching by instruction.

---

## 2. The Felt-vs-Seen Rule (CORE ADDITION)

**The naked eye still sees P1 → P2 → P3 → P4 in temporal order.**
That is what the camera records, what the coach scores, what the report card
displays, what video tags emit, and what `hittingPhases.ts` continues to model.

**The hitter, internally, feels P1 → P2 → P4 → (P3 emerges).**
P3 (stride / heel plant) is never the third *conscious* action. It is what the
organism does on its own when P1 + P2 + P4 are organized correctly.

This is identical to elite mechanics already taught — we are clarifying the
*felt* sequence so cueing stops manufacturing a conscious stride.

| Phase | Numeric (seen) | Felt order | Cue policy |
|-------|----------------|------------|------------|
| P1 Hip Load | 1 | 1st felt | Conscious cue — NN |
| P2 Hand Load | 2 | 2nd felt | Conscious cue |
| P3 Stride / Heel Plant | 3 | **emerges** | **DO-NOT-CUE — involuntary** |
| P4 Hitter's Move | 4 | 3rd felt | Conscious cue — NN, elite-eligible |

---

## 3. P3 Do-Not-Cue Rule (enforceable)

P3 is no longer cued as a conscious action. The hitter does **not**:

- consciously stride toward the pitcher
- push the back hip toward the ball
- project the back hip through the ball or through the pitcher's release point
- drive the back hip to the release point
- "step to the pitcher"

P3 happens because P1 (hip load) + P2 (hand load) + P4 (back elbow leads, hands
stay back, hips lead → shoulders → hands) force the body to plant the front
foot in time. The body organizes itself to connect to the ground; the stride
is its solution to that organization, not a command from the hitter.

See `.lovable/p3-do-not-cue-rule.md` for the enforceable banned-cue list and
approved replacements (also enforced in CI via `scripts/lint-no-p3-cue.ts`).

P3 *scoring*, *symptom attribution*, and *coach-facing diagnostic copy* all
remain unchanged — coaches still grade landing quality, and a poor involuntary
landing is still a real fault to be triaged. What changes is that the **fix**
for a poor P3 is now expressed upstream (re-tune P1/P2/P4), not by adding a
P3 stride cue.

---

## 4. The Canonical Cue (athlete-facing, one sentence)

> Knob stays back while the back elbow works forward to the inner half of the
> ball. Hands stay back to receive. Back elbow rushes past the front hip,
> chest to the plate, hands still back — hips lead, shoulders follow, hands
> last. Turn to the ball, hit *through* the ball, release through contact.
> Close the blind spot. Don't think about striding — the body will plant
> when it needs to.

---

## 5. Per-Phase Athlete Cues (overlay — coexists with prior cues)

- **P1 Hip Load (NN, felt #1):** "Load the back hip slowly. Hands frozen.
  Be loaded before the pitcher's hands break."
- **P2 Hand Load (felt #2):** "Hands load behind your head. Knob points back.
  Hands stay back to *receive* the ball — they don't go forward to get it."
- **P4 Hitter's Move (NN, felt #3):** "Back elbow leads forward to the inner
  half of the ball. Hands stay back. Elbow rushes past the front hip with
  chest to the plate. Hips lead, shoulders follow, hands last. Turn to it,
  hit *through* it, release through contact. Close the blind spot."
- **P3 Stride / Heel Plant (felt: emerges):** **No conscious cue.** If P3
  fails, the fix is upstream (P1 hip load quality, P2 hand depth, P4 elbow
  drive sequencing). The coach's job is to design the constraint that makes
  the correct landing inevitable, not to instruct the stride.

---

## 6. Mechanics Paragraph (verbatim doctrinal statement)

Keep knob back while the back elbow makes its way forward toward the inner
half of the ball while the hands stay back to receive the ball, which gets
the bat in line with the ball while the back elbow rushes forward trying to
make it past the front hip with the chest facing home plate and the hands
staying back — this creates the rest of the swing sequence, where the hips
lead the shoulders, which lead the hands, creating a power sequence with a
turn-to-the-ball / hit-through-the-ball / release-through-contact mindset.
The intent is to close the blind spot completely. The naked eye sees
P1-P2-P3-P4; the hitter feels P1 → P2 → P4 → (P3 emerges). The hitter does
not try to skip P3 — there is simply no conscious effort for P3.

---

## 7. Sequencing Law (locked)

1. **Hips lead** (driven by organized P1 + intent of P4 elbow drive).
2. **Shoulders follow** (passively, because the back elbow is rushing past
   the front hip).
3. **Hands last** (they stay back to receive; they do not chase or push).
4. **Bat enters the zone late** because the knob held its fulcrum, then the
   elbow's pass past the front hip catapults the barrel through the ball.
5. **Release through contact** — extension happens *after* impact as a
   byproduct of residual core tension, never *at* impact.

---

## 8. Constitutional / Engine Notes

- Phase ids (`P1`, `P2`, `P3`, `P4`) are stable. No DB migration.
- Phase numeric ordering (`step: 1..4`) is stable. No scoring change.
- `hittingPhases.ts` gains additive metadata: `feltOrder`, `doNotCue`,
  `involuntary`. Existing consumers ignore these safely.
- `hittingCausalChains.ts` refines P3's `fix` link (athlete voice) to the
  do-not-cue framing while preserving the diagnostic intent in `coach_note`.
- `hie_snapshots.hitting_doctrine.engine_version` bumps to
  `hitting-doctrine-v2-arakawa` for new snapshots. Prior snapshots remain
  valid under their pinned `engine_version` per replay equivalence law.
- Subordinate to Megaphase 111–150 human coaching translation governance:
  translation may compress prior cues into the new canonical cue, but never
  fabricates and never erases the prior diagnostic content (coach_note
  history preserved).
