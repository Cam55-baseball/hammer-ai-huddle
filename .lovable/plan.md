
# Fix P2 / P3 Timing + Implement Specific Back-Elbow Replacement

User-authorized changes for the specific disputed timing/elbow tiles. No schema migration. Determinism investigation continues for all broader Phase 2 work.

## 1. Back Elbow — clarify status

**Resolved:** the tile is no longer marked under review. It is now **Connection & Barrel Delivery**, a standalone P4 launch → barrel-delivery → contact window score using `connection_barrel_delivery_score_100`. The old contact-frame `back_elbow_past_bb_deg` formula no longer drives the tile.

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

**Changed:** the metric prompt now explicitly says early is acceptable and must not fail. The existing boolean remains only because P2 is late-only pass/fail.

## 3. P3 Timing → Release — flag mode mismatch, fix interim copy

You're right that pass/fail is wrong here. Foot-down-at-release is the **perfect target**, slightly late is **acceptable**, very late is a fail. That's a graded scale, not a binary.

The tile now reads `p3_release_offset_ms` and displays as a score meter.

**What changed:**
- `standard:` → `"Front foot is down at pitcher release (perfect). Slightly late is acceptable; clearly late fails."`
- `explainer.whatWhy:` rewrite to make the gradient explicit:
  - Foot-down-at-release is the ideal target.
  - A small amount later (the model currently treats anything within the tolerance window as a pass) is acceptable, not perfect.
  - Foot down BEFORE release is also acceptable from a timing standpoint, though it may indicate other issues caught elsewhere.
  - The only true failure is foot down clearly AFTER release — you lost your look at the ball.
  - Note that the current tile is binary; a graded version is queued for the metric-review phase.
- `explainer.howToImprove:` keep the "release = foot down" cue, add "earlier is okay, just don't be late."
- `explainer.encouragement:` → `"Foot down at release. A hair late is okay. Late is the miss."`

The score is highest at release, accepts slightly late, fails clearly late, and only lightly penalizes early because early-then-drift belongs to stability/landing metrics.

**Methodology memo (new file):** `.lovable/p3-timing-methodology.md`
- Records that the metric is misclassified as binary
- States the correct shape: graded scale anchored on foot-down-at-release = perfect
- Lists what's needed to implement (new numeric field: signed ms offset from release; deadband around 0; asymmetric scoring — late penalized harder than early)
- Marked implemented for this specific correction; remaining values are calibration questions for runtime review.

## 4. Bucket A changes log

Append Round 3 documenting the authorized formula-shape changes.

## Out of scope

- No unrelated metric changes.
- No database schema migration.
- No engine_version bump.
- Determinism investigation runbook unchanged for broader Phase 2 work.
