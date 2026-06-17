
# Fix P2 / P3 Timing Copy + Clarify Back-Elbow Status

Presentation-layer only. No compute, schema, prompt, or engine_version changes. Determinism investigation unaffected.

## 1. Back Elbow — clarify status

**Answer to your question:** Yes, we are changing it. "Under review" was chosen as the *interim* label while the current tile still runs the old contact-frame formula. The replacement (window-based P4→contact "Connection & Barrel Delivery") is documented in `.lovable/back-elbow-methodology.md` but cannot be implemented this turn because:

- it requires new measurement fields the model doesn't currently emit (blind-spot start frame, shoulder-square duration, window length)
- those are Phase 2 metric work, which is not authorized until the determinism investigation closes

So the tile stays labeled honestly as provisional until that gate opens. **No code change in this plan for back elbow.** If you want a different interim label (e.g. "Back Elbow at Contact (deprecated — do not use)" or hide the tile entirely), tell me and I'll add it.

## 2. P2 Timing → Knee Lift — fix the copy

Current copy says "not before, not after" which is wrong. Early hand-load is fine; the only timing failure is LATE. Drift-while-early is a P1 stability problem, not a P2 timing problem.

**Change in `src/lib/reportCard/disciplines/bh.ts` tile `p2_timing` (lines 57–74):**

- `standard:` → `"Hand load is finished by the time the pitcher reaches peak knee lift. Early is fine; late is the only fail."`
- `explainer.whatWhy:` rewrite to say:
  - Your hand load must be FINISHED by pitcher peak knee lift.
  - Finishing early is acceptable and common — it is not a timing miss.
  - The only failure mode is finishing LATE, which forces a rushed P3 and a late foot down.
  - If you finish early and then drift forward while you wait, that drift is caught by P1 Hip Load Stability, not here. Don't double-count it against your timing.
- `explainer.howToImprove:` rewrite away from "sync the finish to the cue" toward "be set by the cue — earlier is fine."
- `explainer.encouragement:` → `"Be set by his knee peak. Earlier is fine. Late is the miss."`

**Not changed:** the `compute` block, the `p2_timing_pass` boolean, or the underlying threshold. We are correcting what we *tell the athlete* about the existing pass/fail signal. If the boolean is currently failing athletes for being early, that is a measurement-formula bug and belongs to the determinism investigation, not Bucket A — I will flag it in the bat-path/on-plane definitions memo style as a follow-up rather than touching compute.

## 3. P3 Timing → Release — flag mode mismatch, fix interim copy

You're right that pass/fail is wrong here. Foot-down-at-release is the **perfect target**, slightly late is **acceptable**, very late is a fail. That's a graded scale, not a binary.

The current tile reads `p3_timing_pass` (boolean). Converting it to a score_meter requires a new numeric field (e.g. `p3_release_offset_ms`) that the model does not emit today. That is metric work, which is gated behind the determinism investigation.

**What this plan does (presentation only):**
- `standard:` → `"Front foot is down at pitcher release (perfect). Slightly late is acceptable; clearly late fails."`
- `explainer.whatWhy:` rewrite to make the gradient explicit:
  - Foot-down-at-release is the ideal target.
  - A small amount later (the model currently treats anything within the tolerance window as a pass) is acceptable, not perfect.
  - Foot down BEFORE release is also acceptable from a timing standpoint, though it may indicate other issues caught elsewhere.
  - The only true failure is foot down clearly AFTER release — you lost your look at the ball.
  - Note that the current tile is binary; a graded version is queued for the metric-review phase.
- `explainer.howToImprove:` keep the "release = foot down" cue, add "earlier is okay, just don't be late."
- `explainer.encouragement:` → `"Foot down at release. A hair late is okay. Late is the miss."`

**What this plan does NOT do:** swap `mode: "pass_fail"` for `mode: "score_meter"`, or change the `compute` block, or invent a new field.

**Methodology memo (new file):** `.lovable/p3-timing-methodology.md`
- Records that the metric is misclassified as binary
- States the correct shape: graded scale anchored on foot-down-at-release = perfect
- Lists what's needed to implement (new numeric field: signed ms offset from release; deadband around 0; asymmetric scoring — late penalized harder than early)
- Gated behind determinism investigation, same as back elbow

## 4. Bucket A changes log

Append section "Round 2 — P2/P3 timing wording correction" to `.lovable/bucket-a-changes.md` documenting items 2 and 3 above and the new methodology memo.

## Out of scope

- No `compute:` changes anywhere
- No mode changes (pass_fail stays pass_fail)
- No new input fields, no schema, no prompt, no engine_version bump
- No back-elbow implementation
- Determinism investigation runbook unchanged

## Open question for you before I implement

For back elbow — keep current label "Back Elbow at Contact (under review)", or change to something stronger like "(deprecated — do not coach to this)"? I'll default to keeping current label unless you say otherwise.
