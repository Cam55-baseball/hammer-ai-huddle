
## Phase 1 — Deterministic Video Processing Layer

### Objective
Same source bytes → byte-identical probe metadata and byte-identical extracted frames, proven with runtime evidence (DB rows + frame SHA-256 hashes from real uploads), not code inspection.

### Strict scope
- Deterministic video probe (already exists at `src/lib/biomech/probeVideoMetadata.ts` — harden, do not redesign).
- Deterministic frame selection + extraction (replaces the time-based, non-deterministic logic in `src/lib/frameExtraction.ts`).
- Persistence of per-frame `{frame_index, timestamp_seconds, sha256_hex}` in a new audit table.
- Rejection-path enforcement (low fps, low resolution, excessive dropped frames, out-of-bounds duration).
- Runtime evidence package.

### Explicitly out of scope (will not touch)
MediaPipe, WebCodecs beyond what's required for deterministic decode, event detection, metric computation, coaching logic, biomech formulas, UI redesign, Phase 0 paths.

---

### Work items

1. **Determinism contract module** — `src/lib/biomech/frameExtractionDeterministic.ts` (new)
   - Pure function: `selectFrameIndices(fps_true, duration_sec, landingTime|null) → number[]` (integer frame indices, no floats, no Date/Math.random).
   - Selection policy: when landing is null, pick a fixed integer-index grid (e.g. round(pct × totalFrames) for the existing 7 percentages); when landing is provided, convert offsets to integer frame indices via `round(landing × fps_true) + round(offsetSec × fps_true)`. Pure integer math → identical across runs.
   - Pure function: `framesToTimestamps(indices, fps_true) → number[]` using `index / fps_true` rounded to 6 decimals.

2. **Deterministic extractor** — replace body of `extractKeyFrames` to:
   - Take `{file, fps_true, duration_sec, landingTime}` (probe results passed in, not re-derived).
   - Seek by frame-index using `video.currentTime = index / fps_true` and `requestVideoFrameCallback` confirmation (fall back to `seeked` event).
   - Encode each frame as PNG (lossless; `image/jpeg` is encoder-dependent and not byte-stable across browsers/runs) via `canvas.toBlob('image/png')`.
   - Hash each PNG blob with `sha256HexOfBlob` (already in `src/lib/biomech/fingerprint.ts`).
   - Return `Array<{frame_index, timestamp_seconds, sha256_hex, dataUrl}>`.

3. **Rejection gates** — `src/lib/biomech/videoAcceptance.ts` (new)
   - Constants centralized: `MIN_FPS`, `MIN_WIDTH`, `MIN_HEIGHT`, `MIN_DURATION_SEC`, `MAX_DURATION_SEC`, `MAX_DROPPED_FRAME_RATIO`.
   - `evaluateProbe(probe) → { ok: true } | { ok: false, reason: 'low_fps'|'low_resolution'|'duration_out_of_bounds' }`.
   - `evaluateExtraction(requested, captured) → { ok, reason: 'excessive_dropped_frames'|null }`.

4. **Persistence** — new migration:
   - Table `public.video_frame_extractions` with columns: `id uuid pk`, `video_analysis_run_id uuid fk → video_analysis_runs(id)`, `video_id uuid`, `frame_index int`, `timestamp_seconds numeric(10,6)`, `sha256_hex text`, `width int`, `height int`, `created_at timestamptz default now()`.
   - Unique `(video_analysis_run_id, frame_index)`.
   - GRANTs for `authenticated` (select own via join) and `service_role` (all); RLS enabled; policy: athlete may select rows whose `video_id` they own.
   - No edits to existing `video_analysis_runs` schema.

5. **Wiring**
   - `analyze-video` (or the existing client path that calls `analyze-video`) writes one `video_frame_extractions` row per extracted frame in the same transaction window as the audit row. No manual inserts; written only by server code path.
   - Rejection outcomes route through the existing `outcome='rejected'` path with a stable `outcome_reason` tag (`reject_low_fps`, `reject_low_resolution`, `reject_duration_out_of_bounds`, `reject_excessive_dropped_frames`).

6. **Runtime evidence harness** — `scripts/replay/verify-frame-determinism.ts` (read-only verification)
   - Re-uploads the Phase 0 fixture video 10×.
   - Asserts identical `fps_true / duration_sec / width / height / orientation` across all 10 runs.
   - Asserts identical ordered tuple of `(frame_index, timestamp_seconds, sha256_hex)` across all 10 runs.
   - Emits matrices for the evidence pack.

---

### Phase 1 acceptance evidence (to be posted after implementation)
1. 10× upload determinism matrix from `video_analysis_runs` + `video_frame_extractions` for one fixture video showing identical probe fields and identical frame hashes.
2. `SELECT frame_index, timestamp_seconds, sha256_hex FROM video_frame_extractions WHERE video_analysis_run_id = $1 ORDER BY frame_index` for at least two of the 10 runs, byte-identical.
3. Four rejection demonstrations: fixtures crafted to trigger `reject_low_fps`, `reject_low_resolution`, `reject_duration_out_of_bounds`, `reject_excessive_dropped_frames`, each producing one `video_analysis_runs` row with the expected `outcome_reason`.
4. Confirmation no manual DB inserts were used.
5. `rg` re-audit for legacy strings remains zero.

### Exit condition
Phase 1 closed once the 10× determinism matrix, per-frame hash table, and four rejection rows are posted from real runtime invocations.
