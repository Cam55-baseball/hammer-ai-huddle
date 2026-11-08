# Hammers — Next Phase Plan (owner-adopted, saved Nov 8 2026)

Status: **plan only.** Nothing in this file is built or switched on. The code map that goes with it is
`docs/INTEGRATION-MAP.md`.

## The long-term idea

Hammers becomes a **longitudinal athlete-development platform**. Every measurement is stored with the
athlete, the time, the device, the capture conditions and a confidence, and it is judged against **the
athlete's own baseline** (not against a made-up average).

## The rules every release follows

1. **Small releases.** Each one is behind its **own feature flag**, off until it passes.
2. **Five accuracy gates** before a release opens to athletes:
   1. **Real fps counted** — the frame rate is measured from the actual frames, never assumed.
   2. **Detection proven** — the thing being measured (body, ball, bat, foot contact) is really found.
   3. **Physically possible** — the answer obeys physics (no impossible speeds, heights or angles).
   4. **Within tolerance vs a real device over 20+ trials** — compared to a trusted measuring tool.
   5. **Same answer three times** — the same input gives the same result every time.
3. **iPhone-app-only.** Every camera or measurement feature lives only in the iPhone app. Website users
   see none of them.
4. **Baseball first, softball after.**

## The release list (verbatim)

- A: Native pack. Push notifications working end to end; rest-timer local notifications plus haptics in focus mode; Apple Health read of sleep, HRV and resting HR into readiness; a home-screen widget later.
- 0: Longitudinal data foundation. One measurement table (athlete_id, metric_key, value, unit, captured_at, device_id, capture_fps, capture_conditions, confidence, source cv_measured/manual/healthkit, session_id, rep_index), a per-athlete rolling-baseline table, the metric_key vocabulary, an owner-only Validation Lab (log device reading vs app reading, automatic 5-gate scorecard), and biometric consent.
- 1: In-app recording ("Report Card+"): positioning square, phone-tilt level indicator (refuse off-level capture), the angle-to-tile map for the 18 hitting tiles, a running total across reps, averages, top rep per category and the top cumulative rep clipped.
- 2: Jump Lab: CMJ height, broad jump, mRSI, Limb Symmetry Index.
- 3: Pogo monitor = Elastic Performance Index (EPI): ground contact time + RSI, the 15–20 ms GCT-drift stop rule, the contact-time-vs-height diagnostic split.
- 4: Active ROM scan, matching the standard assessment catalog (VectorLab 80, SFMA, MLB Combine medical), with IMU tilt correction.
- 5: Automated initial assessment (CV movement screen).
- 6: Combine timing, single gate (60 yd, 10 yd baseball, 7 yd softball), cones or ARKit distance.
- 7: Multi-gate splits, 5-10-5, base paths, stride length × frequency (no running-form analysis ever).
- 8: Base-stealing reaction automation (the user enters nothing).
- 9: Readiness loop (Health + wellness + optional CMJ → auto-adjusts Hammers Today, with athlete override).
- 10: Post-activity scan → 90-second routine → 30-minute re-check.
- 11: Camera VBT (velocity zones; 20% velocity-loss cutoff for elastic work, 30% for strength).
- 12: Live CV coaching, one exercise at a time.
- 13: Two-camera sync plus a native 240 fps camera plugin.
- 14: Mechanics tiles + the Report Card back on (DelayCam per-rep compile).
- 15: Ball and bat CV.

## Plain explanations

- **A — Native pack.** Make the iPhone app do things only a phone app can: real push notifications,
  a rest timer that buzzes and pings even with the screen off, reading sleep, heart-rate variability and
  resting heart rate from Apple Health so the morning readiness uses real numbers, and later a
  home-screen widget.
- **0 — Data foundation.** One place where every number lands, stamped with who, when, which phone,
  what frame rate, what conditions, how sure, and where it came from (camera, typed, or Apple Health).
  Each athlete gets a running "normal range". A fixed list of measurement names. An owner-only lab to
  compare the app against a real measuring device and score the five gates automatically. A clear
  consent step for body-movement data.
- **1 — Report Card+ recording.** Record inside the app with an on-screen box to stand in and a level
  that refuses a tilted phone. Each camera angle maps to the hitting tiles it can honestly measure.
  Reps add up across the session: totals, averages, best rep per category, and the best overall rep
  saved as a clip.
- **2 — Jump Lab.** Measure counter-movement jump height, broad jump, reactive strength (mRSI) and the
  left-vs-right difference (Limb Symmetry Index).
- **3 — Pogo monitor (EPI).** Measure how long the feet stay on the ground and how springy each hop is.
  Stop the set when contact time drifts 15–20 ms longer (the athlete is tiring), and tell apart
  "slower contacts" from "lower hops".
- **4 — Active range-of-motion scan.** Measure joint ranges the same way the standard assessment
  batteries do, using the phone's tilt sensor to correct for how it is held.
- **5 — Automated initial assessment.** The starting movement screen is scored by the camera instead of
  by typed answers.
- **6 — Combine timing, one gate.** Time 60 yd, 10 yd (baseball) and 7 yd (softball) sprints with the
  phone, using cones or the phone's AR distance measurement.
- **7 — Multi-gate splits.** Split times, the 5-10-5, base-path times, and stride length × stride
  frequency. Never judging running form.
- **8 — Base-stealing reaction, automatic.** The phone sees the pitcher's move and the runner's first
  move and times the jump; the player types nothing.
- **9 — Readiness loop.** Apple Health + the wellness check-in + an optional jump test adjust Hammers
  Today automatically, and the athlete can override.
- **10 — Post-activity scan.** After a session: a quick scan, a 90-second routine, and a re-check 30
  minutes later.
- **11 — Camera bar speed (VBT).** Measure bar speed; stop a set when speed drops 20% (elastic work) or
  30% (strength).
- **12 — Live camera coaching.** Real-time feedback for one exercise at a time.
- **13 — Two cameras + 240 fps.** Sync two phones and add a native camera that records 240 frames a
  second.
- **14 — Mechanics tiles and the Report Card back on.** Re-open the Report Card, built from DelayCam
  rep-by-rep results.
- **15 — Ball and bat tracking.** Measure the ball and the bat from video.
