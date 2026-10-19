# AI2 — HEVC upload check

2026-10-19, completed before 04:30 UTC. Preview only; no publish, function deployment, cron or iOS changes.

390×844 headless Chromium with mobile Safari user agent. The TEST college player was denied pitching access as expected, so the same owner pitching clip was tested as the kept TEST pitcher. This is emulation, not an actual iPhone/Safari test.

Source: owner-uploaded IMG_7346.mov, H.264, 1920×1080, 16.9 seconds, 30 fps. A private libx265 HEVC equivalent was generated without forced FPS; 507 frames and source timestamps preserved exactly. Both files passed the real upload control and automatic WebM conversion, then Upload & Analyze Video. Both completed saved qualitative reports with the camera-measurement grade placeholder. Screenshots show these final phone states.

Actual saved converted clips each contain 507 frames, duration 16.9 seconds, 30 fps. Against the original frame timestamps, maximum gap is 0.000333 seconds (WebM timestamp precision); final paired converted timestamps match. No frame additions or drops. `timing.json` records each check.

Dense pose capture logged `pose_timeout: measurements unavailable; continue coaching` on both formats, and no dense-run measurement artifact was available. Both extracted seven qualitative analysis frames. Consequently measurement impact could not be tested and is not claimed accurate or equivalent. Existing conversion tests passed 2/2.

Three new TEST analysis rows (an initial H.264 trial and final pair) were snapshotted privately, deleted by exact identifiers and TEST user, then confirmed absent. Their storage objects were removed successfully. Original owner upload preserved. Earlier TEST data and subscriptions remain for final cleanup.

Owner live check: upload one original HEVC clip on an actual iPhone after publish and confirm analysis completes without manual conversion; numeric camera measurements remain off.

Nightly verification waits until after 04:30 UTC. Final wrap-up remains open.