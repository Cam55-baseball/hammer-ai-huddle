# AI-vision metric variability audit — BP live tiles + SP windmill tiles

Status: **audit only. No tile was changed, no flag was flipped.**
Date of run: 2026-08-28.

## Method

Replicated the production `analyze-video` metrics call exactly in shape:

- `google/gemini-2.5-flash`, `temperature: 0`, forced tool call.
- 12 evenly sampled frames per clip as sequential `image_url` parts.
- Metrics schema and prompt block built from the **same** shared file the edge
  function uses (`supabase/functions/_shared/reportCardContracts.ts`), not a copy.
- Harness lives outside the shipping codebase (`/tmp/pv2/run.ts`).

Footage: real user uploads pulled from the `videos` bucket, capped at 2–3 clips
per user to force genuine variety.

- **Baseball pitching:** 12 clips, 9 distinct athletes, mixed resolution
  (640×640 → 1080×1920), mixed duration (2 s → 9.5 s).
- **Softball pitching (windmill):** 9 clips, 5 distinct athletes.
  `sp07`/`sp08` are byte-identical (md5 match) — an accidental repeatability control.
- Baseball clips were additionally re-run with the sample window shifted ~1 frame
  (+0.033 s) to test sensitivity to input perturbation.

## Result 1 — repeatability

The byte-identical softball pair (`sp07`, `sp08`) returned **identical values on
all 15 tiles**. At temperature 0 the method is deterministic. Non-determinism is
not the problem here.

## Result 2 — baseball pitching (currently VISIBLE tiles)

Distinct non-missing values across 12 real clips:

| Metric | n non-missing | distinct values | values seen | verdict |
|---|---|---|---|---|
| `energy_angle_deg` | 5 / 12 | **1** | 20, 20, 20, 20, 20 | **effectively constant** |
| `head_vertical_movement_pct` | **0 / 12** | — | always `missing` | **never produces a value** |
| `lift_thrust_deg` | 3 / 12 | 2 | 22, 22, 15 | too sparse to certify |
| `premature_shoulder_open_deg` | 7 / 12 | 3 | 10, 10, 10, 0, 0, −5, −5 | varies (coarse) |
| `shoulder_tilt_deg` | 6 / 12 | 3 | 5, 5, 5, 8, 8, 15 | **varies** — the "always 15" claim does not reproduce |
| `tempo_sec` | 7 / 12 | 4 | 0.25 ×4, 0.2, 0.16, 0.125 | varies, but see below |

Non-visible BP keys measured in the same run: `glove_drift_outside_frame_in`
returned `0` on 5/5 (constant), `head_at_release_deg` returned `10` on 5/6,
`stride_pct_of_height` was missing on 12/12.

### `tempo_sec` is the more serious finding

It is not constant — but every value it produced (0.125 s – 0.25 s) is **below
the contract's own plausible range of 0.4–2.0 s**, and far below a real
peak-leg-lift → front-foot-strike interval. The model is not counting frames; it
is returning a small plausible-looking number. A varying wrong answer is harder
to catch than a constant one.

### Sensitivity to a 1-frame shift

On the shifted pass, values moved in ways motion cannot explain:
`tempo_sec` 0.25→0.16, 0.16→0.066, 0.25→0.15; `shoulder_tilt_deg` 15→5, 5→12;
`premature_shoulder_open_deg` −5→+10 (a pass/fail flip). Metrics also crossed
between measured and `missing` in both directions on the same clip.

## Result 3 — softball windmill (currently HIDDEN tiles)

| Metric | n non-missing | distinct | values seen | verdict |
|---|---|---|---|---|
| `sfc_hip_shoulder_rotation_deg` | 5 / 9 | **1** | 25 ×5 | **constant** |
| `windup_trunk_tibia_deg` | 5 / 9 | **1** | 15 ×5 | **constant** |
| `windup_foot_power_line_deg` | 5 / 9 | **1** | 0 ×5 | **constant** |
| `sfc_arm_path_deg` | 5 / 9 | **1** | 10 ×5 | **constant** |
| `accel_arm_path_pass` | 6 / 9 | **1** | true ×6 | **constant** |
| `sfc_trunk_alignment_pass` | 2 / 9 | 1 | true ×2 | too sparse |
| `sfc_knee_ankle_deg` | 6 / 9 | 2 | 15 ×4, 10 ×2 | two-valued |
| `windup_hip_square_deg` | 5 / 9 | 2 | 5 ×3, 10 ×2 | two-valued |
| `windup_knee_over_foot_deg` | 5 / 9 | 2 | 10 ×3, 5 ×2 | two-valued |
| `sfc_foot_angle_deg` | 5 / 9 | 2 | 30 ×3, 20 ×2 | two-valued |
| `ft_knee_ankle_deg` | 4 / 9 | 2 | 10 ×3, 20 | two-valued |
| `stride_triple_extension_pass` | 6 / 9 | 2 | true ×5, false | two-valued |
| `stride_pct_top` / `stride_pct_sfc` / `stride_pct_release` | **0 / 9** | — | always missing | **never produces a value** |

Every non-missing SP value in the whole run is a multiple of 5 (0, 5, 10, 15, 20,
25, 30). No windmill tile produced a single off-grid number across 9 real clips.

## Honest read

1. **The AI-vision method is not uniformly broken — it is uniformly coarse.**
   It snaps to a round-number grid. Some tiles land on more than one grid point
   and therefore "vary"; several land on exactly one and are constants dressed
   as measurements.
2. **The specific `shoulder_tilt_deg` = 15 claim does not reproduce.** On this
   sample it produced 5 / 8 / 15. It is the *least* suspicious of the visible
   numeric tiles, not the most. The earlier 22-clip result was a different clip
   set and did not survive re-testing.
3. **Confirmed constant, visible today:** `energy_angle_deg` (20 on 5/5).
4. **Confirmed never-measures, visible today:** `head_vertical_movement_pct`
   (missing on 12/12 — the tile can only ever show "not measurable").
5. **Confirmed out-of-range, visible today:** `tempo_sec` — varies, but every
   value is 2–8× too small.
6. **Softball windmill:** 5 of 13 tiles are constants, 6 are two-valued, 3 never
   produce a value. None of the 13 has demonstrated real measurement behaviour.
   Nothing should be built on top of them in their current form.

## Recommendation (not applied)

- Move `energy_angle_deg` and `head_vertical_movement_pct` out of
  `RELEASE1_VISIBLE_METRICS`.
- Treat `tempo_sec` as unfit until it is computed from frame indices + `fps_true`
  (`src/lib/biomech/metrics/tempoSec.ts` already does this deterministically and
  is inert — that is the fix, not a prompt change).
- Leave the SP tiles in `RELEASE1_SHOWCASE_FUTURE` and do not promote any of them
  on AI-vision evidence.
- `premature_shoulder_open_deg` and `shoulder_tilt_deg` vary but flip sign /
  pass-fail under a 1-frame shift; they need the stability guard already built in
  `shoulderTiltGuarded.ts` before they can be called measurements.
