# Work log

Newest first. Each entry: what changed, what I verified myself, what remains unverified.

---

## 2026-09-05 — Report card audit + status

**Changed:** nothing in the app. Two documents written: `docs/report-card-audit.md` (tile-by-tile audit of hitting, pitching, throwing, softball pitching, plus every other number an athlete sees) and this log.

**Verified myself:**
- Read every tile spec, the Release-1 filter, and the grade calculator, and traced each metric key back to where it is produced.
- Confirmed `efficiency_score` defaults to a hard-coded 75 (`analyze-video/index.ts:2279, 2310`).
- Confirmed `landmarks_storage_path: null` is written deliberately (`AnalyzeVideo.tsx:743`).
- Confirmed `HighFpsCapture` and `ReferenceDistanceStep` are imported and rendered in the real capture flow (`AnalyzeVideo.tsx:1356, 1522`).
- Confirmed no code anywhere writes to `video_coaching_runs`.
- Ran the full suite: **1133 passed, 4 failed** (133 files). Failures listed in the audit; all pre-existing.

**Unverified:** last turn's `violations_detected` pass-through and the cache-hit unwrap have not been exercised by a live analysis run. Recommendations appearing on a real hitting analysis is still unconfirmed end to end.

---

## 2026-09-04 — Video recommendations: likes, saves, fault context

**Changed:** new `library_video_saves` table; `library_video_likes` extended with the fault, skill area and surface a like came from. Heart and bookmark controls on every recommendation inside an analysis. Endorsements nudge ranking only within the same fault, capped, one athlete counted once, and never above a real tag match. Filming guidance now states upfront that upright phone video is fine and what actually breaks a clip.

**Also changed:** frame payload hygiene in `analyze-video` (malformed data URLs dropped, payload thinned to 18MB, reject if under 3 usable frames) to kill the "Invalid URL format: AAA" and 30MB gateway failures. Raw internal keys replaced with human labels in `hie-analyze` via a new shared `humanLabel` helper.

**Verified myself:** typecheck clean; suite at the same level as the prior run.

**Unverified:** no live analysis has been run since, so the gateway fixes and the recommendation loop are untested against real traffic.
