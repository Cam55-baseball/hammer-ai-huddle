# Record Now vs Upload — split by purpose

## The reframe

| | Record Now | Upload |
|---|---|---|
| Purpose | Live/continuous capture, **per-rep metrics across a session** | Single clip in, **mechanics report card** out |
| Comparable to | PitchLab / SmartScout / HeyBLU | Mustard / Teammstrd |
| Pitching output | velocity, location in the zone, extension, movement, spin — per pitch | joint angles, sequencing, tiles, prescribed drills |
| Hitting output | exit velo, launch angle, distance, spray, bat speed — per swing | same mechanics report card |
| Reference distance | required (velocity/location math) | not asked for |
| Surface | new **Session metrics view** (list of reps + summary) | existing `HammerReportCard` |
| Both | feed the same athlete profile and grading | |

## What this changes about work already done

Keep as-is:
- Two-option chooser, DelayCam as its own sidebar module (`/delaycam`) — already shipped.
- Fully adjustable reference distance (presets 42/46/50/54/60.5 + 35/40/43 + manual entry) in `referenceDistance.ts` / `ReferenceDistanceStep.tsx` — already shipped, and it stays the single source anywhere a distance is collected.
- `FPS_TRACKING_FLOOR` unified at 58; honesty gates unchanged.
- `/pitch-velocity` stays an unlinked dev harness.
- Record Now stays owner/admin gated until real-device testing backs the claim.

Changes:
1. **Move `ReferenceDistanceStep` out of the Upload flow** in `AnalyzeVideo.tsx` and into the Record Now panel. Upload stops asking for it entirely.
2. **`BallFlightPanel` leaves the Upload report.** Ball flight is a Record Now output, not a mechanics-report tile. Upload's report card returns to pure mechanics.
3. **`runBallFlight` gets re-pointed** from "one clip → one velocity" to "one rep of a session → that rep's metrics", called per detected rep.
4. Copy rewrite on both chooser cards to describe purpose, not capture quality ("Measure every pitch in a bullpen" vs "Break down one rep in detail").

## What multi-rep session capture actually requires

Exists today: high-fps constraint negotiation, achieved-fps measurement, `MediaRecorder` capture of one clip, deterministic frame extraction, a hosted Roboflow ball detector reachable via `pitch-velocity-prep`/`-measure`, per-video calibration keyed to one reference distance.

Missing, in order of difficulty:

- **Rep segmentation.** Nothing today splits a 6-minute bullpen into 30 pitches. Needs a motion/ball-appearance segmenter over the frame stream producing rep windows. This is the gating piece — everything else is plumbing behind it.
- **Session data model.** Today calibration and measurement are per-video. Needs `capture_sessions` (one recording, one calibration, one athlete, one discipline) and `capture_session_reps` (per-rep metrics + confidence + missingness). Calibration becomes per-session, computed once, reused by every rep.
- **Location, extension, movement, spin.** Only velocity exists. Location needs plate-plane geometry (a second reference in frame or a marked plate); extension needs a rubber reference; movement needs a multi-point trajectory fit rather than two endpoints; spin is not obtainable from 60fps phone video and should be declared unavailable rather than approximated.
- **Hitting metrics.** Exit velo/launch angle/distance/spray need contact detection plus post-contact trajectory — a separate detector class from the pitching path. Bat speed needs bat detection, which the current model does not do.
- **Cost/throughput.** Hosted inference per rep multiplies credits by rep count. Needs a per-session frame budget and a hard cap before it can open past staff.
- **Session metrics surface.** New page: rep table, per-rep confidence, session summary, and the same missing-beats-fabricated treatment per metric.

Honest read: velocity-per-rep across a session is reachable on the current stack once segmentation and the session model exist. Location, extension, movement, spin, and all hitting ball-flight metrics are new capability, not refactors, and each should ship as `missing` with a plain-language reason until its own detector is validated.

## Proposed build order

1. Move reference distance to Record Now; strip ball flight from the Upload report; rewrite chooser copy. (Small, lands now.)
2. Session data model + per-session calibration.
3. Rep segmentation over the recorded stream.
4. Session metrics view, velocity only, everything else declared unavailable.
5. Per-metric detectors, one at a time, each behind the staff gate until validated.
