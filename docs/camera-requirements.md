# Per-tile camera requirements

as_of: 2026-09-27 · code: `src/lib/biomech/camera/cameraView.ts`

## Why
Rigid-body length preservation on the shoulders worked (0 frames broke the constraint) but the rotation still ranged 14.1° on a still subject from side-on. At the closed position a side-on camera sees the shoulder segment at full length, where acos(d/L) is flattest: a 1.5 % width error reads as ~10°. That is a viewing-angle limit, not noise. From the pitcher-to-plate line the closed shoulders appear edge-on (d ≈ 0), where the same solve is steep and well-conditioned.

## Detection (from the pose)
Stance Lock window (else first second): median shoulder width ÷ torso height, and ankle x-spread ÷ shoulder→ankle height.
- side_on: shoulder ≥ 0.45 AND ankles ≥ 0.15
- on_line: shoulder ≤ 0.25 AND ankles ≤ 0.08
- otherwise undetermined → every tile still runs; lineage notes it.

Thresholds are geometric, not fitted. Observed: still 0.58/0.27 (side_on), 914cf54c 0.64/0.51 (side_on), 9d2e117e 0.43/0.42 (undetermined). **No on-line clip exists — the on_line branch is unvalidated.**

A known mismatch refuses with `calibration_unavailable` and detail `camera_view_mismatch:needs_<view>:clip_<view>` plus a plain message. A dedicated canonical reason (`camera_view_mismatch`) would need adding to the canonical missingness enum — owner decision.

## Classification
| Tile | Camera | Geometry |
|---|---|---|
| energy_angle_deg | side-on | fore–aft lean of hip over ankle is in the image plane |
| lift_thrust | side-on | knee rise and forward hip speed are in-plane |
| head_vertical_movement_pct | either | vertical is in-plane from both |
| premature_shoulder_open_deg | on-line | closed shoulders edge-on → well-conditioned solve |
| tile 19 head path | side-on | forward head travel in-plane |
| tile 20 back hip hold | side-on | rear-thigh angle in-plane |
| hip_load | side-on | fore–aft hip drift in-plane |
| hand_load | side-on | hands drift toward catcher in-plane |
| stride_direction | **two clips** | ground-plane angle: side-on sees only the forward part, on-line only the lateral part |
| heel_plant | side-on | heel vs toe height in-plane |
| hands_outside_shoulders_at_landing | side-on | wrist behind rear shoulder along target line |
| shoulder_plane_steadiness | side-on | shoulder-line tilt in-plane |
| finish_balance | either | centre-of-mass stillness |
| balance_at_landing | on-line, not yet released | eye-to-eye line tilt is foreshortened side-on; the on-line branch still needs a confirmed pitching fixture |
| back_knee_flex_maintained | side-on | knee angle in sagittal plane |
| post_landing_hip_drift | side-on | forward hip drift in-plane |
| hands_stay_up_at_plant | either | vertical |
| lead_elbow_bend_increasing | side-on | elbow angle roughly in-plane |
| head_vertical_movement_post_landing | either | vertical |
| tempo | either | timing |

## Two clips of one delivery — what it would take (not built)
1. A `delivery_pair` link between two `videos` rows (same athlete, owner-chosen pairing, each with its detected view).
2. Time alignment: match D-PEAK-LIFT / D-PLANT in both clips (±1 frame each; timing tiles stay per-clip).
3. Report card resolver: for each tile pick the clip whose view satisfies the requirement; two-view tiles (stride direction) combine the forward component from side-on with the lateral component from on-line at the plant frame.
4. Upload UI to attach the second clip, plus RLS on the pair row.
Estimate: medium — one table + policy, a resolver, and a pairing screen.
