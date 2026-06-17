# P3 Timing → Release — Methodology Review Memo

Status: **implemented as a graded presentation/formula shape using `p3_release_offset_ms`.**
Gate note: this specific correction was authorized now because pass/fail was misleading. Broader Phase 2 metric work remains gated behind the determinism investigation.

## Verdict on the current metric

The previous `p3_timing` tile was binary (`pass_fail`) backed by a `p3_timing_pass` boolean. This was the wrong shape.

The user-stated truth:

> P3 Timing → Release is all about how close to foot-down-at-release you can get. Getting down slightly later is acceptable, but foot-down-at-release is our perfect goal. It cannot be pass/fail.

A binary tile cannot express "perfect vs acceptable vs miss." The tile is now a `score_meter` backed by signed offset from release.

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

## Measurement field
- `p3_release_offset_ms`: signed integer/float. `null` allowed when not measurable.
- The existing `p3_timing_pass` boolean is no longer used by this tile.

## Remaining calibration questions
1. **Deadband width** — how many ms either side of release count as "perfect" (score 100)?
2. **Acceptable-late window** — ms range where score degrades but does not fail. Candidate: 0–80 ms late.
3. **Fail threshold** — ms past release where score floors. Candidate: ≥150 ms late.
4. **Early-side floor** — at what point does "very early" stop being acceptable? Probably very far out, since the issue at that range is not timing but stability/stride length.
5. **Minimum fps for scoreability** — below what `fps_true` does the tile go `missing`?
6. **Release-frame ground truth** — how is "pitcher release" identified deterministically? Pose-derived? Model-self-reported? What's its own confidence/missingness lineage?
7. **Formula calibration** — current scoring uses a practical deadband around release, a gentle early-side penalty, and a steeper late-side penalty. Refine after runtime evidence review.
