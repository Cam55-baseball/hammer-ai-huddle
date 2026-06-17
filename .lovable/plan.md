# Phase 1 — Runtime Evidence Collection Pass

No implementation changes. No Phase 2 work. Sole deliverable: a runtime evidence package proving the Phase 1 deterministic video processing layer behaves correctly against the live database and deployed `analyze-video` edge function.

## Execution steps

1. **Fixture preparation**
   - Reuse the Phase 0 fixture video already in `videos` storage (same `video_id` used for the Phase 0 cache-hit proof).
   - Confirm SHA-256 of the source bytes once, before the run loop.

2. **Determinism Matrix (10× upload → analyze)**
   - Drive 10 real end-to-end invocations through the live UI path on `/AnalyzeVideo` (not direct edge curl), so probe + extractor + audit writer all execute as in production.
   - After each run, capture from `video_analysis_runs`: `video_id, sha256_hex, fps_true, duration_sec, width, height, orientation, cache_fingerprint_hex`.
   - Expect run 1 = `outcome='ok'`, runs 2–10 = `outcome='cache_hit'` (same fingerprint), and all 8 fields byte-identical across all 10 rows.

3. **Frame Determinism Proof**
   - Because cache hits short-circuit before extraction, force re-extraction for 2 of the 10 runs by uploading the same bytes under 2 fresh `video_id`s (different storage paths → different `video_id` but same `sha256_hex` → identical probe → identical frame selection). This isolates extractor determinism from cache behavior.
   - For both runs: `SELECT frame_index, timestamp_seconds, sha256_hex FROM video_frame_extractions WHERE video_analysis_run_id = $1 ORDER BY frame_index;`
   - Diff the two tables row-for-row.

4. **Frame Count Proof**
   - For each of the 10 runs, post requested / extracted / dropped / dropped-ratio from the audit row (extractor emits these into `video_analysis_runs` metadata + `video_frame_extractions` row count).

5. **Rejection Proof (4 crafted fixtures)**
   - `reject_low_fps`: transcode fixture to 15 fps.
   - `reject_low_resolution`: scale to 320×240.
   - `reject_duration_out_of_bounds`: trim to 0.2 s and pad to 75 s for the two bounds.
   - `reject_excessive_dropped_frames`: feed a corrupted MP4 (truncated moov) so the extractor captures < 66% of requested frames.
   - For each, post the resulting `video_analysis_runs` row (`outcome='rejected'`, `outcome_reason` matching).

6. **Persistence Proof**
   - Post `SELECT count(*) FROM video_frame_extractions;`
   - Post 3 example rows.
   - Post a join showing `video_frame_extractions.video_analysis_run_id` FK → `video_analysis_runs.id` for the runs from step 3.

7. **Device Variability Audit**
   - Run the fixture from the desktop preview (1440×900) and the current mobile viewport (440×782, dpr=3) via the same `/AnalyzeVideo` flow.
   - Post whether the per-frame `sha256_hex` tuple matches between desktop and mobile.
   - If divergent, identify the first `frame_index` where hashes differ and note probe-field differences (canvas PNG encoder is the most likely divergence source).

8. **Production Readiness Assessment**
   - End with `A. Phase 1 accepted` or `B. Phase 1 not accepted` + blocking defects.

## Out of scope (will not touch)
MediaPipe, WebCodecs beyond the current decode path, event detection, metric computation, coaching logic, biomech formulas, UI redesign, Phase 0 paths, any code or schema change. Read-only DB queries and live invocations only — zero manual inserts.

## Tools used
- Browser automation (`browser--view_preview`, `browser--act`) for the 10 live uploads + device audit.
- `supabase--read_query` / `psql` for `video_analysis_runs` and `video_frame_extractions` evidence.
- `supabase--edge_function_logs` for `analyze-video` traces.
- `ffmpeg` (via `nix run nixpkgs#ffmpeg`) to produce the 4 rejection fixtures from the Phase 0 source.

## Open question
The browser automation cannot reliably drive a real file-picker upload of a multi-MB video against the live preview. To execute the 10× determinism matrix and the device audit, I need one of:
- **(a)** a fixture video URL/path I can fetch in the sandbox and POST through a scripted client that mirrors the UI path (probe → extract → upload → invoke `analyze-video`), OR
- **(b)** confirmation that you will perform the 10 uploads + the desktop/mobile pair manually in the preview and I collect evidence from the DB and logs after each batch.

Please confirm (a) or (b) before I begin the live runs.
