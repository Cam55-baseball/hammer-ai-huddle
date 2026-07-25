## Goal
Apply the four staged Game IQ actor enrichment SQL batches to the database and report any failures.

## Current state
- `/tmp/iq/b1.sql` (207 KB, 293 lines)
- `/tmp/iq/b2.sql` (197 KB, 285 lines)
- `/tmp/iq/b3.sql` (199 KB, 289 lines)
- `/tmp/iq/b4.sql` (84 KB, 129 lines)

Each line is one `UPDATE iq_situation_actors SET coaching_note=..., footwork_cue=..., eyes_target=..., communication_call=..., secondary_read=..., elite_cue=..., common_mistake=..., updated_at=now() WHERE situation_id=... AND role=...;` targeting ~886 actor rows across 110 published situations.

`psql` from the sandbox is blocked (permission denied for UPDATE). The `supabase--insert` data-change tool is the correct path.

## Plan
1. Apply the four batches sequentially through `supabase--insert`, one call per batch, in order b1 → b2 → b3 → b4. Sequential (not parallel) so a mid-batch failure can be isolated to one file.
2. After each batch, run a quick `supabase--read_query` to count actors updated in the last few minutes as a sanity check.
3. After all four are applied, run one verification query: for a sample of 5 situations across defense/offense/pitching/baserunning lenses, confirm every actor now has non-empty `coaching_note`, `footwork_cue`, `eyes_target`, `secondary_read`, and that `secondary_read` differs across roles inside the same situation.
4. Report: rows updated per batch, any SQL errors verbatim, and the verification sample.

## Out of scope
- No schema changes.
- No UI changes (the card already renders the seven fields).
- No regeneration of content — only application of the already-staged SQL.
