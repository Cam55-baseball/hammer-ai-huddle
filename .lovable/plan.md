## Goal

Apply the already-generated Game IQ coaching enrichment (~343 actors across ~33 situations) and finish generating + applying the remaining ~78 situations so every position in every situation has role-specific `coaching_note`, `footwork_cue`, `eyes_target`, `communication_call`, `secondary_read`, `elite_cue`, and `common_mistake`.

## Steps

1. **Apply staged chunk (~343 actors)**
   - Split the staged `/tmp/iq_enrich.sql` into per-situation `UPDATE` batches to stay under the migration size limit that previously caused `SUPABASE_BAD_REQUEST`.
   - Apply via the migration tool in sequential batches (roughly 10 situations per migration).
   - After each batch: sample-verify a few `(situation_id, role)` rows have the new fields populated.

2. **Resume generation for the remaining ~78 situations**
   - Re-run the Gemini 1.5 Flash enrichment script against only the situations whose actors still have `NULL`/empty `footwork_cue` or `eyes_target`.
   - Same schema and guardrails already used in the first pass (role-specific verbs, ≤220 chars per field, assignment-consistent behavior).
   - Preserve any existing non-empty field unless the new value is clearly richer.

3. **Apply the remaining generated SQL**
   - Same per-situation batching strategy as step 1.

4. **Verify E2E**
   - Query: every published situation has 0 actors with NULL `footwork_cue` or `eyes_target`.
   - Spot-check `/iq/squeeze-r3-defense`, one baserunning situation, and one pitching situation in the preview — click each position and confirm the card renders all sections with role-specific content (UI already ships this from the previous turn).

## Technical Details

- Data-only work. No schema changes, no UI changes (UI + feedback surface already shipped).
- Writes go through the migration tool, one small migration per batch, to avoid the bulk-update failure from last turn.
- Enrichment script runs in the sandbox against Gemini; only the resulting SQL is committed via migrations.

## Out of Scope

- Any UI, routing, quiz-scoring, or authoring-tool changes.
- Regenerating fields for situations already fully enriched in the staged chunk.
