## Phase 0 Defect Fix — AI Gateway Early-Return Audit Bypass

### Scope (authorized, minimal)
Convert the three AI-gateway early-return branches in `supabase/functions/analyze-video/index.ts` (HTTP 429, 402, and generic non-OK / 500) into `throw` statements so control flows into the existing `catch` block, which already writes exactly one `outcome='failed'` audit row.

### Change
**File:** `supabase/functions/analyze-video/index.ts` (lines ~2106–2138, the AI-gateway response handling block)

Replace each of the three `return new Response(...)` early exits with a `throw new Error(...)` carrying:
- the upstream status code
- the upstream error body (truncated)
- a stable error class tag (`ai_gateway_rate_limited`, `ai_gateway_payment_required`, `ai_gateway_error`) so the catch-path's `failure_reason` column is populated deterministically

No other branches, no other files, no schema changes, no shared-module edits.

### Catch-path guarantees to preserve
- The existing `catch` block already inserts exactly one `video_analysis_runs` row with `outcome='failed'`.
- No new insert sites added. No retry loop added. Idempotency preserved by the existing single-write path.

### Verification protocol (post-deploy, runtime evidence)
1. Deploy `analyze-video`.
2. Re-run the prior fault-injection invocation (the `videos` row with a deliberately broken input that triggers an AI-gateway error).
3. Capture and post:
   - the resulting `video_analysis_runs` row (`outcome='failed'`, populated `failure_reason`, `cache_fingerprint_hex`, version pins)
   - `SELECT outcome, count(*) FROM video_analysis_runs GROUP BY outcome` showing all four outcomes present
   - edge-function logs showing the gateway error and the catch-path audit write
   - `SELECT count(*) ... WHERE video_id = <fault-injection video> AND created_at > <invocation start>` proving exactly one `failed` row was written (no duplicates)
4. Re-run `rg "pass2Model|pass2System|pass2Prompt|:pass2|breadMissing|replay_input_fingerprint" supabase/functions/analyze-video supabase/functions/recompute-report-card src` to reconfirm zero matches.

### Out of scope (explicitly blocked)
- Phase 1 work
- MediaPipe / WebCodecs / event-engine work
- Any edit outside the three early-return branches in `analyze-video/index.ts`
- Schema migrations, RLS changes, shared-module edits, frontend changes
- Manual inserts into `video_analysis_runs` or `video_landmark_runs`

### Exit condition
Phase 0 formally accepted once the four-outcome matrix is complete and the single-row guarantee for the `failed` path is demonstrated from real runtime evidence.
