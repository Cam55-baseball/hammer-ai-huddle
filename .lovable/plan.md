
# G-1 → G-3 Implementation Plan + Historical Landmark Immutability Rule

Authorization scope: G-1 analyze-video integration, G-2 Pass-2 retirement, G-3 Phase 0 closeout evidence. Phase 1 remains blocked until G-3 evidence is posted and approved.

---

## 0. New constitutional rule — Historical Landmark Immutability (ratified, enforced from this turn forward)

**Rule (saved to `mem://constraints/historical-landmark-immutability` and to `.lovable/plan.md` §0):**

1. `video_landmark_runs` rows are append-only and immutable once written. Updates to `landmarks_storage_path`, `landmarks_sha256_hex`, `landmark_model_version`, `fps_true`, `frame_count`, or `mean_visibility` are forbidden after insert.
2. Upgrading BlazePose or any landmark model **must** bump `LANDMARK_MODEL_VERSION` in `src/lib/biomech/versions.ts`. This creates a new row under the existing `UNIQUE (video_id, landmark_model_version)` constraint — it never overwrites the prior row.
3. Previously generated `landmarks.jsonl` files are never silently regenerated. The storage path is content-addressed by `(video_id, landmark_model_version)` and is write-once.
4. Historical `video_analysis_runs` rows continue to reference the exact `landmark_model_version` they were created against. Re-opening a historical report card resolves landmarks by `(video_id, original_landmark_model_version)`, never by "latest".
5. Re-running a historical report card under a newer model is permitted only as an **explicit migration**: a new `video_analysis_runs` row with `outcome_reason='explicit_model_migration'` and a separate `cache_fingerprint_hex`. The prior analysis row remains untouched and remains the default surface for the original timestamp.
6. Enforcement is two-layered:
   - **DB layer**: a trigger on `video_landmark_runs` rejects `UPDATE` of immutable columns (raises `historical_landmark_immutable`). `DELETE` rejected except by `service_role` with an audit reason.
   - **Code layer**: the `recordAnalysisRun` resolver and the analyze-video edge function read landmark runs by `(video_id, landmark_model_version)` only — never by `ORDER BY created_at DESC`.

This rule is added to project memory and to the Phase 0 plan before any G-1 code lands.

---

## G-1 — analyze-video integration

### Migration (single migration, approval-gated)
- Add trigger `video_landmark_runs_immutable` enforcing rule §0.6.
- Add `videos.video_bytes_storage_path text` if not already present (needed so the edge function can hash the canonical bytes).
- No other schema changes.

### Client-side hashing (`src/lib/video/uploadHash.ts`)
- On video upload, run `sha256HexOfBlob(file)` and persist to `videos.sha256_hex` alongside the existing upload write.
- Probe is deferred to Phase 1; for now `fps_true`, `width`, `height`, `duration_sec` are filled from the existing best-effort upload metadata (or left null and the analysis is `outcome='rejected'` with reason `missing_probe_metadata`).

### Shared fingerprint module (`supabase/functions/_shared/fingerprint.ts`)
- Byte-for-byte port of `buildCacheFingerprint` from `src/lib/biomech/fingerprint.ts`. Same field order, same `.toFixed(6)` rules, same `"null"` sentinel, same `":"` separator. A unit test in `supabase/functions/_shared/fingerprint.test.ts` asserts hex equivalence against the browser implementation for the canonical fixture (`5110788ec9d97e3faf91a2bfe0900fa159f1abefe709964fdd3f2b5fa708d53b`).

### `supabase/functions/analyze-video/index.ts`
- Resolve `videoRow = videos.findById(videoId)`.
- Build `cache_fingerprint_hex` via the shared module using:
  - `videoRow.sha256_hex` (required; missing → `outcome='rejected'`, reason `missing_video_sha256`)
  - `videoRow.fps_true`, `videoRow.landing_time_sec`, `videoRow.direction_sign`, `videoRow.calibration_h_px` (each required for non-rejected outcomes)
  - `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION` from a Deno mirror of `versions.ts`.
- Cache lookup keyed on `cache_fingerprint_hex` against `video_analysis_runs`. Hit → return persisted metric/coaching row, write `outcome='cache_hit'`.
- Miss → run analysis (current Gemini path, **single pass only** — see G-2), persist landmark/event/metric/coaching rows, write `outcome='ok'`.
- Every code path — `ok`, `cache_hit`, `rejected`, `failed` — writes exactly one `video_analysis_runs` row. The write is guarded by a `try { … } finally { recordAnalysisRun(…) }` that surfaces any write failure as a 500.
- All `from('video_landmark_runs')` queries scope by `(video_id, landmark_model_version)` — never by `created_at`. Enforcement: a lint rule in `scripts/lint-no-landmark-recency.ts` greps for `video_landmark_runs` + `order` and fails CI.

### Existing input-only `replay_input_fingerprint` cache path
- Deleted. The new `cache_fingerprint_hex` is the only key.

---

## G-2 — Pass-2 retirement

### Edits to `supabase/functions/analyze-video/index.ts` (lines 2102–2156)
- Delete the entire Pass-2 escalation block.
- Delete `pass2Model`, `pass2System`, `pass2`, `d2`, `recovered`, and the `:pass2` seed suffix.
- Delete `breadMissing` model-swap branching.
- Replace any tile that previously relied on Pass-2 recovery with `{missing: true, missing_reason: "single_pass_only"}`.

### `recompute-report-card`
- Becomes a thin re-runner: looks up the existing `video_metric_runs` row by `(video_id, METRIC_ENGINE_VERSION)` and returns it. Does not invoke AI. Does not write new metric rows.

### Acceptance for G-2
```
rg "pass-?2|:pass2|pass2Model|pass2System|breadMissing" supabase/functions/   # → 0 matches
```

---

## G-3 — Phase 0 closeout evidence (must all be posted in the closeout reply)

1. **First real `video_analysis_runs` row** — `SELECT * FROM video_analysis_runs ORDER BY requested_at DESC LIMIT 1;` after one analyze-video invocation against a real video.
2. **Audit-row coverage on all four outcomes**, demonstrated with four invocations and four `SELECT … WHERE outcome IN ('ok','cache_hit','rejected','failed')` rows:
   - `ok` — fresh upload with full metadata
   - `cache_hit` — re-analyze same video, identical fingerprint
   - `rejected` — upload missing `sha256_hex` or `fps_true`
   - `failed` — forced upstream failure (e.g. AI gateway returning non-OK in a one-off test path)
3. **Ripgrep output** post-removal:
   ```
   rg "pass2Model"  supabase/functions/analyze-video/   # → 0
   rg "pass2System" supabase/functions/analyze-video/   # → 0
   rg ":pass2"      supabase/functions/analyze-video/   # → 0
   rg "pass-?2"     supabase/functions/analyze-video/   # → 0
   ```
4. **Same source video uploaded twice → identical `cache_fingerprint_hex`** — paste the two `video_analysis_runs` rows side-by-side showing identical `cache_fingerprint_hex` and `cache_hit=false` then `cache_hit=true`.
5. **Historical landmark immutability proof**:
   - DB trigger present: `SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.video_landmark_runs'::regclass;`
   - Negative test: `UPDATE video_landmark_runs SET landmarks_sha256_hex='deadbeef' WHERE id = …;` → fails with `historical_landmark_immutable`.
   - Lint pass: `bun run scripts/lint-no-landmark-recency.ts` exits 0.

Until all five items are posted, Phase 1 remains blocked.

---

## Out of scope (still)

- No MediaPipe install, no WebCodecs probe, no event detectors, no real metric formulas. The analyze-video AI path stays in place for one more turn so cache behavior can be verified against the existing tile output; Phase 1 replaces it.
- No UI changes.

I will await the build-mode switch before writing any files, then execute G-1 + G-2 in one batch, then post G-3 evidence.
