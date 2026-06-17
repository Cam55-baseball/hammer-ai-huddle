# Phase 1 Runtime Evidence — Operator Runbook

No code changes. No Phase 2. No fabricated data. This runbook is the complete operator script for the user-driven evidence pass. After uploads, the AI will only read DB rows + edge logs and assemble the report.

---

## 0. Pre-flight (one time)

1. Sign in to the preview at `/auth` so `auth.uid()` is set (frame-extraction rows are RLS-scoped).
2. Open DevTools → Network + Console, keep open for entire run.
3. Note your `auth.users.id` — share it with the AI so queries can be scoped.
4. Confirm fixture video on disk. Required: a single MP4, ≥24 fps, ≥640×480, duration within accepted bounds (between the min and max in `src/lib/biomech/videoAcceptance.ts`). This is the "Phase 0 fixture" — reuse the exact file accepted in Phase 0.

Record the fixture's SHA-256 locally so you can prove identity:
```
shasum -a 256 /path/to/fixture.mp4
```
Share that hex with the AI.

---

## 1. Determinism Matrix — Fixture Upload Procedure

**Count:** 10 uploads of the SAME fixture file.

**Sequencing:** Strictly sequential. Wait for each upload's UI result (run row visible / "cache_hit" or "ok" badge) before starting the next.

**Cache:** Do NOT clear browser cache between uploads. The determinism test depends on the deterministic `cache_fingerprint_hex` matching across runs so runs 2–10 hit `cache_hit`.

**Refreshes:** No hard refresh between uploads 1–10. A soft page nav back to `/AnalyzeVideo` between runs is fine; full reload is fine too (cache fingerprint is server-side, not browser-side) but unnecessary.

**Per-upload runtime expectation:**
- Run 1 (cold): expect probe + extract + upload + edge invocation. Roughly 5–30s depending on fixture size.
- Runs 2–10 (cache_hit): edge function should short-circuit; expect <2s end-to-end after upload completes.

**Forced re-extraction pair (runs 11–12):**
After the 10 cache runs, perform 2 additional uploads of the same bytes but force a fresh `video_id`:
- Run 11: upload the fixture under a NEW filename (e.g. `fixture_copy_a.mp4`) so storage path differs.
- Run 12: same — new filename (`fixture_copy_b.mp4`).
Both must yield identical `sha256_hex` and identical per-frame `video_frame_extractions` rows.

Total: **12 uploads**.

---

## 2. Per-Upload Evidence Collection Checklist

For each of the 12 uploads, the following must be true. Operator only needs to confirm UI; AI will verify DB + logs after the batch.

### UI success indicators
- Upload progress reaches 100%.
- Analysis status transitions to one of: `ok`, `cache_hit`, `rejected`.
- For runs 1, 11, 12: a frame-extraction summary appears (count of extracted frames, dropped-frame ratio).
- For runs 2–10: a `cache_hit` indicator appears (no re-extraction UI).
- No red error toast.

### Database rows expected per upload
| Table | Rows | Notes |
|---|---|---|
| `video_analysis_runs` | exactly 1 | `outcome` ∈ {`ok`, `cache_hit`} for fixture runs |
| `video_frame_extractions` | N rows for runs 1, 11, 12; 0 new rows for runs 2–10 | N = extracted frame count |

### Edge function logs expected per upload (`analyze-video`)
- Run 1: `cache miss → extract → persist frame_extractions → outcome=ok`.
- Runs 2–10: `cache hit on fingerprint=<hex> → outcome=cache_hit` (no frame insert).
- Runs 11, 12: `cache miss (new video_id) → extract → persist → outcome=ok` AND identical `cache_fingerprint_hex` to run 1.

After all 12 uploads, tell the AI "uploads complete" and share timestamps of the first and last upload (UTC) so the AI can window the queries.

---

## 3. Rejection Test Procedure

Create 4 fixtures, upload each ONCE, sequentially, after the 12 determinism uploads. Each must produce exactly one `video_analysis_runs` row with `outcome='rejected'` and zero `video_frame_extractions` rows.

If you have `ffmpeg` locally, exact commands:

### 3a. Low FPS — `reject_low_fps.mp4`
```
ffmpeg -f lavfi -i testsrc=duration=10:size=1280x720:rate=15 \
  -c:v libx264 -pix_fmt yuv420p reject_low_fps.mp4
```
Expected: `rejected`, reason mentions `fps_true < MIN_FPS`.

### 3b. Low Resolution — `reject_low_resolution.mp4`
```
ffmpeg -f lavfi -i testsrc=duration=10:size=320x240:rate=30 \
  -c:v libx264 -pix_fmt yuv420p reject_low_resolution.mp4
```
Expected: `rejected`, reason mentions resolution below minimum.

### 3c. Duration Out of Bounds — `reject_duration_short.mp4` AND `reject_duration_long.mp4`
```
ffmpeg -f lavfi -i testsrc=duration=0.2:size=1280x720:rate=30 \
  -c:v libx264 -pix_fmt yuv420p reject_duration_short.mp4

ffmpeg -f lavfi -i testsrc=duration=75:size=1280x720:rate=30 \
  -c:v libx264 -pix_fmt yuv420p reject_duration_long.mp4
```
Upload both. Expected: both `rejected`, reason mentions duration bounds.

### 3d. Excessive Dropped Frames — `reject_dropped_frames.mp4`
```
ffmpeg -f lavfi -i testsrc=duration=10:size=1280x720:rate=30 \
  -c:v libx264 -pix_fmt yuv420p -bsf:v noise=1000000 reject_dropped_frames.mp4
```
If the noise bitstream filter is unavailable, alternative — truncate a valid MP4 mid-stream:
```
ffmpeg -f lavfi -i testsrc=duration=10:size=1280x720:rate=30 \
  -c:v libx264 -pix_fmt yuv420p tmp_full.mp4
head -c $(( $(stat -f%z tmp_full.mp4 2>/dev/null || stat -c%s tmp_full.mp4) * 40 / 100 )) \
  tmp_full.mp4 > reject_dropped_frames.mp4
```
Expected: `rejected`, reason mentions dropped-frame ratio above `MAX_DROPPED_FRAME_RATIO`.

Per-rejection UI indicator: red/amber "Video rejected" surface with the reason text from the edge function.

If `ffmpeg` is unavailable on your machine, tell the AI — we will substitute pre-recorded equivalents from the fixture library or document this rejection class as "not exercised this pass" with explicit blocking notation.

---

## 4. Device Variability Audit

### Desktop workflow
1. From a desktop browser (Chrome or Safari), viewport ≥1280×720.
2. Sign in.
3. Upload the SAME fixture once.
4. Record: `video_id`, timestamp.

### Mobile workflow
1. From a mobile browser (iOS Safari or Android Chrome) on the published preview URL.
2. Sign in as the SAME user.
3. Upload the SAME fixture file (transfer via AirDrop / iCloud / Drive).
4. Record: `video_id`, timestamp.

### Expected outputs
- Both runs land in `video_analysis_runs`.
- `sha256_hex` must be IDENTICAL across desktop and mobile (same bytes).
- `cache_fingerprint_hex` must be IDENTICAL across desktop and mobile.
- Outcome: second of the two should be `cache_hit`.
- If we force re-extraction (new filename on each device): `video_frame_extractions.sha256_hex` per `frame_index` MUST be byte-identical desktop vs mobile. Any divergence is a Phase 1 blocker; AI will identify the first divergent `frame_index` from the diff.

---

## 5. Final Evidence Package Template

After uploads complete, the AI will populate this template using only real DB rows and real edge logs. Nothing is filled in by hand.

```
PHASE 1 RUNTIME EVIDENCE PACKAGE
================================
Operator user_id: <uuid>
Fixture sha256:   <hex>
Window:           <first_ts_utc> .. <last_ts_utc>

A. DETERMINISM MATRIX (12 runs)
   run | video_id | outcome   | sha256_hex | fps_true | duration_sec | width | height | orientation | cache_fingerprint_hex
   ----+----------+-----------+------------+----------+--------------+-------+--------+-------------+----------------------
    1  |  ...     | ok        | ...        | ...      | ...          | ...   | ...    | ...         | ...
    2  |  ...     | cache_hit | ==run1     | ==run1   | ==run1       | ==r1  | ==r1   | ==r1        | ==run1
   ... (through 10)
   11  |  ...     | ok        | ==run1     | ==run1   | ==run1       | ==r1  | ==r1   | ==r1        | ==run1
   12  |  ...     | ok        | ==run1     | ==run1   | ==run1       | ==r1  | ==r1   | ==r1        | ==run1
   Determinism: PASS | FAIL  (first divergent field if FAIL)

B. FRAME DETERMINISM PROOF (runs 1 vs 11 vs 12)
   frame_count:           <n>
   per-frame sha diff:    0 mismatches (PASS) | <k> mismatches at frame_index=[...] (FAIL)

C. FRAME COUNT PROOF (runs 1, 11, 12)
   requested | extracted | dropped | dropped_ratio | accepted?
   ...

D. REJECTION PROOF (4 fixtures, 5 uploads incl. short+long duration)
   fixture                       | outcome   | reason                          | video_analysis_runs rows | frame_extraction rows
   reject_low_fps                | rejected  | fps_true=15 < MIN_FPS=24        | 1                        | 0
   reject_low_resolution         | rejected  | 320x240 < min                   | 1                        | 0
   reject_duration_short         | rejected  | duration<min                    | 1                        | 0
   reject_duration_long          | rejected  | duration>max                    | 1                        | 0
   reject_dropped_frames         | rejected  | dropped_ratio>MAX               | 1                        | 0

E. PERSISTENCE PROOF
   SELECT count(*) FROM video_frame_extractions WHERE run_id IN (...):  <n>
   3 sample rows (frame_index, timestamp_seconds, sha256_hex):           ...
   FK join (video_analysis_runs ⨝ video_frame_extractions): all rows joinable, no orphans.

F. EDGE FUNCTION LOG EXCERPTS (analyze-video)
   - run 1   cold path:        <log line>
   - run 2   cache_hit path:   <log line>
   - run 11  forced re-extract: <log line>
   - rejection paths × 5:      <log lines>

G. DEVICE VARIABILITY AUDIT
   desktop run: video_id=<>, sha256=<>, cache_fp=<>, frame_sha tuple hash=<>
   mobile  run: video_id=<>, sha256=<>, cache_fp=<>, frame_sha tuple hash=<>
   match: PASS | FAIL (first divergent frame_index if FAIL)

H. ONE-ROW-PER-INVOCATION INVARIANT
   For every upload attempt in the window:
     COUNT(video_analysis_runs) per (user_id, video_id) = 1  →  PASS | FAIL

I. PRODUCTION READINESS ASSESSMENT
   A. Phase 1 accepted
      — OR —
   B. Phase 1 not accepted
      Blocking defects:
        1. ...
```

---

## Operator Action Summary

1. Pre-flight (sign in, share user_id + fixture sha256).
2. Upload fixture 10× sequentially. Note start/end timestamps.
3. Upload same fixture 2× more with new filenames.
4. Create + upload 5 rejection fixtures (4 classes, duration class has 2 fixtures).
5. Perform desktop + mobile pair (same fixture, new filenames).
6. Tell the AI "uploads complete" with timestamp window and the new filenames used in steps 3 + 5.
7. AI runs queries against `video_analysis_runs`, `video_frame_extractions`, and `analyze-video` edge logs, then fills the template above and renders the A/B verdict.

No implementation work will occur during evidence collection.
