
# Phase 0 Runtime Evidence Execution

Single-turn build-mode execution. No source-code changes. No fabricated rows. No manual `INSERT` into `video_analysis_runs` / `video_landmark_runs`. The seeded `videos` row (`ec24a165-…`, sha256 `a5a8692…`) and prepared payload `/tmp/body.json` from the prior turn are reused.

## Steps

1. **Invocation 1 — `ok`**
   - `supabase--curl_edge_functions` → `POST /analyze-video` with `/tmp/body.json` as the logged-in preview user.
   - Capture response + fetch the resulting `video_analysis_runs` row via `supabase--read_query`.
   - Expect `outcome='ok'`, `cache_hit=false`, populated `cache_fingerprint_hex`, version pins, FK to `video_landmark_runs`.

2. **Invocation 2 — `cache_hit`**
   - Re-POST identical body. Fetch new row.
   - Expect identical `cache_fingerprint_hex`, `cache_hit=true`, `outcome='cache_hit'`.

3. **Invocation 3 — `failed` (controlled fault injection, no row fabrication)**
   - Insert a *second* `videos` row with all mandatory deterministic fields populated but `storage_path` pointing at a non-existent object (`videos/__nonexistent__/missing.mp4`). This is a real `videos` insert (allowed), not a `video_analysis_runs` insert (forbidden).
   - POST analyze-video against that video → real edge-function execution path hits storage download failure → real `failed` row written by the function itself.

4. **`rejected`** — already exists from prior `missing_video_sha256` rows; re-query and include.

5. **Edge-function logs** — `supabase--edge_function_logs analyze-video` filtered around the three invocations, showing:
   - computed `cache_fingerprint_hex` (invocation 1)
   - cache miss branch (invocation 1)
   - cache hit branch (invocation 2)
   - storage/download failure branch (invocation 3)

6. **Aggregate matrix** — `SELECT outcome, count(*) FROM video_analysis_runs GROUP BY outcome` showing all four outcomes present.

7. **Full row dumps** — `SELECT *` for the four representative rows (ok, cache_hit, rejected, failed).

8. **Provenance statement** — explicit confirmation that the only manual DB writes were the two `videos` rows (real-upload row + fault-injection row); no `video_analysis_runs` or `video_landmark_runs` rows were hand-inserted.

## Single-reply deliverable

A single message containing, in order:
- Invocation 1 HTTP response + `ok` row
- Invocation 2 HTTP response + `cache_hit` row
- Side-by-side `cache_fingerprint_hex` comparison
- `failed` row + the `videos` fault-injection row used to produce it
- `rejected` row
- `GROUP BY outcome` matrix
- Edge-function log excerpts for all three live invocations
- Provenance statement

## Out of scope (unchanged from prior plans)

- No edits to `analyze-video`, `recompute-report-card`, `_shared/*`, `AnalyzeVideo.tsx`, or any `src/**`.
- No schema migrations. No deletions. No Phase 1 / WebCodecs work.
- No manual inserts into `video_analysis_runs` or `video_landmark_runs`.

After the evidence package is posted, await explicit Phase 0 closure before requesting Phase 1 authorization.
