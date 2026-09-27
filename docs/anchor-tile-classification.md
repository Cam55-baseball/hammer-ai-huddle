# Anchor and tile classification — position vs timing

as_of: 2026-09-27 · source: code as of this date (`src/lib/biomech/**`, `src/lib/delaycam/session/metricRegistry.ts`)

Rule: anchors carry `anchor_uncertainty_ms` (one frame) and refuse only when the SIGNAL is absent. Position-based metrics need the anchor to exist; timing-based metrics widen their ± range and refuse only when uncertainty ≥ 50 % of the value. DelayCam-only metrics keep their high-rate tiers.

## Anchors (all report ±1 frame; none refuse on ordinary 24–30 fps)

| Anchor | Refuses only when |
|---|---|
| D-STILL | no still run above noise / pose absent |
| D-FIRST-MOVE | no movement above still-clip noise |
| D-PEAK-LIFT | front ankle rise < 0.10 body heights, or front ankle unseen / out of frame |
| D-PLANT (tempo path) | no stride above noise, or foot never settles after the lift |
| D-LOAD-APEX | no confirmed rear wrist extremum |
| D-COIL (proxy) | rear-thigh angle change inside 3° deadband / rear leg unseen |
| D-SWING-START | no hand-speed rise above noise |
| D-P4 | no plant, or back elbow never leads hands after plant (30 ms persistence) |
| D-FINISH | no settle after swing above noise |
| D-RELEASE-POSE | no throwing-wrist peak above noise (60 fps floor removed) |
| Unknown time base | only anchors using per-second derivatives refuse, reason `insufficient_temporal_resolution` |

Legacy `detectors/dPlant.ts` (velocity crossing) — floor now unknown-rate only; not used by tempo or tiles 19/20.

## Metrics / tiles

| Metric | Class | At 24–30 fps |
|---|---|---|
| Tile 19 head path through stride | Position | Works (floor removed) |
| Tile 20 back-hip socket hold (proxy) | Position | Works (floor removed) |
| Head vertical movement % | Position | Works |
| Hands stay up at plant | Position | Works |
| Stride direction | Position | Works |
| Hands outside shoulders | Position | Works |
| Shoulder plane steadiness | Position | Works |
| Finish balance | Position | Works |
| Energy angle / body angles at an anchor | Position | Works |
| Tempo (lift → plant) | Timing | Value ± 1/fps (±41.7 ms at 24) |
| P2 timing | Timing | Value ± range; refuses only above tolerance |
| P3 timing | Timing | Value ± range; refuses only above tolerance |
| Time to contact | Timing | Needs D-CONTACT (not built) → missing, correct reason |
| Bat speed, ball speed, contact, launch/ball flight | DelayCam-only | Keep high-rate tiers |

Guard note: `insufficient_temporal_resolution` in `metricGuards.ts` means a one-frame shift changes the answer / no neighbouring pose — a signal-stability test, not a frame-rate floor.
