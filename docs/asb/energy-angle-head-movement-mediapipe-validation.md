# MediaPipe replacement validation — `energy_angle_deg` and `head_vertical_movement_pct`

Status: **validation complete, nothing shipped to athletes.** Both metrics remain
in `RELEASE1_HIDDEN_METRICS`; both kill switches (`MEDIAPIPE_ENERGY_ANGLE_ENABLED`,
`MEDIAPIPE_HEAD_MOVEMENT_ENABLED`) are `false`.

Verdict up front:

| Metric | AI-vision behaviour (prior audit) | MediaPipe replacement | Recommendation |
| --- | --- | --- | --- |
| `energy_angle_deg` | constant `20` on every clip it answered | varies with the input, 17 distinct values across 21 measured clips, plausible range | real measurement — keep hidden until it runs on production anchors, then re-validate and flip |
| `head_vertical_movement_pct` | never produced a value (non-functional) | varies, but the values are physiologically implausible (median ~33–62% of stature, outliers to 921%) | **do not ship** — the normalizer and window are not yet trustworthy |

## What was built

- `src/lib/biomech/metrics/energyAngleDeg.ts` — plant-foot → front-hip angle off
  vertical at peak leg lift, from BlazePose coordinates. Plant side derived from
  the pose, not from handedness.
- `src/lib/biomech/metrics/headVerticalMovementPct.ts` — nose-y travel across the
  setup→release window as a percentage of the median nose→lower-ankle span.
- `src/lib/biomech/metrics/metricGuards.ts` — one shared guard core.
  `shoulderTiltGuarded.ts` was refactored onto it, so all three metrics now run
  the identical guard logic rather than three copies.
- `energyAngleGuarded.ts`, `headVerticalMovementGuarded.ts` — the two guards
  already validated for shoulder tilt, applied unchanged in meaning:
  1. **stability under a 1-frame shift** of the anchor (or, for the window
     metric, of the window), and
  2. **live-pitch gate** — ball-in-flight evidence, so dry/towel drill reps are
     never measured.

Guards can only remove a value, never create one. 38 unit tests pass across the
four metric suites, including explicit cases that a guard never manufactures a
value the base geometry refused.

## Method

- 28 real pitching clips pulled from production storage (26 baseball, 2 softball
  windmill; 1080x1920 through 360x480; 30–60 fps). Four are byte-duplicates of
  other clips — noted below where it matters.
- Per-frame pose extracted with MediaPipe Pose Landmarker (lite, VIDEO mode) —
  9,600+ posed frames. One clip (`9b95f66e`, a 2.5 KB webm) yielded no pose at
  all and correctly returned `pose_not_detected` end to end.
- The extracted pose was fed into the **real** TS modules via
  `scripts/validation/mediapipeMetricVariability.ts` — not a reimplementation.

Two honest limitations, stated rather than papered over:

- **Anchors are proxies.** The harness derives peak leg lift (highest knee
  relative to mid-hip in the first 70% of the clip) and release (maximum
  wrist-from-hip extension after that). Production uses the real anchor
  detector. Anchor error is therefore inside these numbers.
- **Ball detections are synthetic.** Detections come from the CV detector at
  analysis time and are not in the pose export, so the live-pitch gate was
  exercised in two declared conditions — ball-in-flight around release, and no
  ball at all. This measures *guard behaviour*, not detector accuracy (that is
  the separate on-device parity report).

## `energy_angle_deg` — distribution

Ungated geometry, 23 of 28 clips measured (5 refused: no pose, or plant-foot /
hip landmarks below the visibility floor):

```
n=23  min 0.35°  p50 7.19°  max 44.94°  mean 9.59°  sd 9.27°  distinct 19
```

After both guards, live-pitch condition:

```
n=21  min 1.03°  p50 7.19°  max 23.15°  mean 8.34°  sd 5.38°  distinct 17
```

This is the finding that matters: **the output tracks the input.** 17 distinct
values across 21 clips, spread over 22 degrees, with the three byte-identical
copies of one clip returning byte-identical values (12.566065 three times) and
the two copies of another returning 7.194089 twice — determinism where it should
be deterministic, variation where the footage differs.

Guard behaviour:

- 2 clips withheld by the stability guard. Both are the right calls: `cf557e7f`
  measured 44.94° — far outside a plausible energy angle — and `3ee08ea0`
  measured 0.35° on a 360x480 clip. In both the anchor moved the angle more than
  5° across a single frame, which is exactly the "the anchor is not resolving the
  motion" case the guard exists for.
- In the drill condition (no ball anywhere) **every** clip that had a measurable
  value was blocked by the live-pitch gate. No dry rep gets measured.

The 5° stability tolerance is provisional. It rejected 2 of 23 (8.7%) here, which
is a reasonable working point, but it should be re-fit once production anchors
replace the proxies.

## `head_vertical_movement_pct` — distribution, and why it is not shippable

Ungated, setup = first posed frame:

```
n=27  min 18.89%  p50 61.65%  max 450.43%  mean 95.98%  sd 112.76%  distinct 23
```

Tightened to a 2-second pre-release window:

```
n=27  min 11.93%  p50 33.36%  max 921.74%  mean 101.57%  sd 188.72%  distinct 23
```

It varies — so it is no longer the non-functional tile the audit found. But
varying is not the same as correct, and these numbers are not correct. A
pitcher's head does not travel a third of their own height vertically during a
delivery; the credible range is single-digit percent. Two concrete faults:

1. **The window is too loose.** Starting from the first posed frame swallows the
   walk-up, the sign-taking, and any camera movement. Tightening the window
   moved the median from 62% to 33% — a metric whose answer halves on a window
   choice is being driven by the window, not by the head.
2. **The normalizer breaks under occlusion.** The 360–921% outliers
   (`60dd29d3`, `6532adc1`, `8daf368d`) are clips where the ankles leave frame or
   are occluded, collapsing the nose→ankle span and inflating the ratio. A
   same-clip pixel normalizer cannot survive that.

The stability guard caught only 1 of 27 at the loose window and 4 of 27 at the
tight one, so it is **not** a sufficient backstop for this failure mode — the bad
values are stable, they are just wrong. That is worth stating plainly: passing
the guards is not evidence of correctness.

Recommendation: leave `head_vertical_movement_pct` hidden. Shipping it would
replace "no value" with "a confidently wrong value", which is worse. Before it
can be reconsidered it needs a real setup anchor from the production detector
(not "first posed frame") and a normalizer that survives ankles leaving frame —
e.g. shoulder-to-hip span, or refusing to measure when the ankle chain is
unreliable rather than dividing by it.

## Files

- `src/lib/biomech/metrics/metricGuards.ts` — shared guard core (new)
- `src/lib/biomech/metrics/energyAngleDeg.ts`, `energyAngleGuarded.ts`
- `src/lib/biomech/metrics/headVerticalMovementPct.ts`, `headVerticalMovementGuarded.ts`
- `src/lib/biomech/metrics/shoulderTiltGuarded.ts` — refactored onto the shared core, behaviour unchanged (12 tests still pass)
- `src/lib/biomech/metrics/__tests__/energyAngleGuarded.test.ts` (10 tests)
- `src/lib/biomech/metrics/__tests__/headVerticalMovementGuarded.test.ts` (7 tests)
- `scripts/validation/mediapipeMetricVariability.ts` — the harness
