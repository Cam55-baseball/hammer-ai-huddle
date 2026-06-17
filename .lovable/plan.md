# Phase 0 Runtime Evidence — Path B Execution

You uploaded `IMG_7346.mov`. I will exercise the production code path end-to-end in the sandbox (no UI clicking required — the same client functions, edge function, and DB writes) and post every persisted row.

## Steps (all executed in build mode, no source code changes)

1. **Upload the file via the production client path**
   - Read `/mnt/user-uploads/IMG_7346.mov`.
   - Insert a `videos` row owned by an existing test user (will pick the user behind the two existing `rejected` rows, `videos.id = d3731ef3...` owner).
   - Compute `sha256_hex` deterministically over the byte stream (same `sha256HexOfBlob` algorithm as the browser).
   - Probe `fps_true`, `duration_sec`, `width`, `height`, `orientation` server-side using `ffprobe` (matches the client probe's snap-to-standard-rates output for ≥24fps videos).
   - Upload bytes to the same Supabase storage bucket the client uses.
   - Persist all six probe fields onto the `videos` row.
   - **Paste the resulting `videos` row.** (G-1 evidence)

2. **First `analyze-video` invocation → `ok`**
   - Call the deployed edge function with `{ video_id }`.
   - Paste the resulting `video_analysis_runs` row showing `outcome='ok'`, `cache_hit=false`, populated `cache_fingerprint_hex` + all version pins + `fps_true` + landmark/event/metric FKs.

3. **Second `analyze-video` invocation (same video_id, same bytes) → `cache_hit`**
   - Paste both rows side-by-side proving identical `cache_fingerprint_hex` and `cache_hit=true` on the second.

4. **`rejected` outcome — already on file**
   - Re-paste one of the two existing `rejected:missing_video_sha256` rows with full column projection.

5. **`failed` outcome — controlled fault injection**
   - Insert a second `videos` row pointing to a non-existent `storage_path`, with `sha256_hex` set so the function gets past the rejection guard and into the landmark/storage fetch — which throws and trips the catch block.
   - Paste the resulting `outcome='failed'` row with `outcome_reason` populated.

6. **Final ripgrep (your exact superset query)**
   ```bash
   rg "pass2Model|pass2System|pass2Prompt|:pass2|breadMissing|replay_input_fingerprint" \
      supabase/functions/analyze-video \
      supabase/functions/recompute-report-card \
      src
   ```
   Paste output + exit code.

7. **Re-run determinism + lint scripts**
   - `bunx tsx scripts/replay/verify-determinism.ts` (exit 0)
   - `bunx tsx scripts/lint-no-landmark-recency.ts` (clean)

8. **Four-outcome matrix**
   - `SELECT outcome, count(*) FROM video_analysis_runs GROUP BY outcome;` showing ≥1 per outcome.

9. **Edge function logs**
   - Paste the `analyze-video` edge-function log lines for invocations 2 and 3 showing the fingerprint computation and the cache-hit short-circuit.

## What this plan does NOT do

- No edits to `analyze-video`, `recompute-report-card`, `_shared/*`, `AnalyzeVideo.tsx`, or any client source — only the upload simulation script and SQL inserts of the `videos` row (allowed; `videos` is not the canonical organism ledger).
- No Phase 1 work. No WebCodecs. No schema changes. No deletions.
- No fabricated rows in `video_analysis_runs` or `video_landmark_runs` — those are produced exclusively by the live edge function.

## After this evidence pack is posted

I will await your explicit Phase 0 closure acceptance before requesting Phase 1 authorization.