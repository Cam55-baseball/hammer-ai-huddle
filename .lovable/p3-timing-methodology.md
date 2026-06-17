# P3 Timing → Release — Methodology Review Memo

Status: **methodology under review. No implementation.**
Gate: cannot be implemented until determinism investigation closes AND the open questions below are answered.

## Verdict on the current metric

The current `p3_timing` tile is binary (`pass_fail`) backed by a `p3_timing_pass` boolean. This is the wrong shape.

The user-stated truth:

> P3 Timing → Release is all about how close to foot-down-at-release you can get. Getting down slightly later is acceptable, but foot-down-at-release is our perfect goal. It cannot be pass/fail.

A binary tile cannot express "perfect vs acceptable vs miss." The current tile is being kept in place for replay-determinism reasons, with corrected presentation copy that explicitly states the gradient and flags the binary shape as wrong.

## Canonical methodology (locked in this memo)

### Shape
**Graded scale**, not pass/fail. Anchored on:
- **Perfect:** front foot fully down at the exact frame of pitcher release (signed offset ≈ 0 ms).
- **Acceptable late:** front foot down a small amount after release.
- **Acceptable early:** front foot down before release (timing-acceptable; other tiles handle the consequences of being early).
- **Fail:** front foot down clearly after release — the hitter has lost meaningful look-time.

### Scoring properties (canonical)
- **Signed offset** from pitcher release, in milliseconds. Positive = late, negative = early.
- **Asymmetric:** late is penalized harder than early. Early is a near-flat region (timing is not the leak); late degrades steeply past the acceptable window.
- **Deadband** centered on 0 ms where score is ~100 (perfect).
- **Frame-rate-aware:** the smallest resolvable offset is bounded by `1 / fps_true`. Below a minimum fps the tile must report `missing` with reason `insufficient_temporal_resolution`, not fabricate a score.

## What this metric IS NOT
- Not a binary pass/fail.
- Not symmetric around release (early ≠ late in severity).
- Not "stride speed." Stride direction and heel-plant quality are separate tiles.
- Not where we punish "early then drift" — that drift belongs to P1 Hip Load Stability.

## Required new measurement field (Phase 2, gated)
- `p3_release_offset_ms`: signed integer/float. `null` allowed when not measurable.
- The existing `p3_timing_pass` boolean stays in place for backward compatibility during transition.

## Open questions (must be answered before implementation)
1. **Deadband width** — how many ms either side of release count as "perfect" (score 100)?
2. **Acceptable-late window** — ms range where score degrades but does not fail. Candidate: 0–80 ms late.
3. **Fail threshold** — ms past release where score floors. Candidate: ≥150 ms late.
4. **Early-side floor** — at what point does "very early" stop being acceptable? Probably very far out, since the issue at that range is not timing but stability/stride length.
5. **Minimum fps for scoreability** — below what `fps_true` does the tile go `missing`?
6. **Release-frame ground truth** — how is "pitcher release" identified deterministically? Pose-derived? Model-self-reported? What's its own confidence/missingness lineage?
7. **Mode swap legality** — switching `mode` from `pass_fail` to `score_meter` is a presentation change but is paired with a new compute field, which crosses the metric-change boundary. Confirm sequencing relative to the determinism investigation gate.

## Implementation gate
Implementation is blocked until:
1. The determinism investigation concludes with Verdict A (Phase 1 acceptance) or with the relevant non-determinism defects fixed.
2. All seven open questions above are answered in writing.
3. The user explicitly authorizes the metric replacement.

Until then, the current binary tile stays in place with corrected presentation copy that makes the gradient explicit and flags the shape as provisional.
