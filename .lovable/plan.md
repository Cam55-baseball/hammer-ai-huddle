## G2 — Replay Certification & Re-Derivation Visibility

Read-only visibility layer on top of the existing `asb_events`, `asb_event_lineage`, `asb_state_snapshots`, `asb_engine_versions` tables. No schema changes, no migrations, no new tables, no recomputation engine rewrite. Per RE-1…RE-10 and Phase 56, replay is a deterministic reconstruction of a derived snapshot from its replay-input chain — never a re-authoring of ledger truth.

### Scope

For any selected `asb_event`:
1. Resolve the **replay input chain** = single-hop ancestors via `asb_event_lineage.child_event_id = event.id`, ordered by `created_at` then `occurred_at`. No recursion (matches G1 single-hop discipline).
2. Look up the **original state snapshot** in `asb_state_snapshots` where `as_of_event_id = event.id`.
3. Compute a **deterministic re-derived projection** purely from the ordered ancestor payloads + the selected event payload, pinned to the event's `engine_version`. The projection is a transparent, declarative merge of input payloads — no smoothing, no imputation, no statistical inference. If a key is absent, it stays absent (missingness preserved).
4. Render a **lineage-visible diff** between original snapshot payload and re-derived payload: added / removed / changed keys with raw before/after values. No aggregation, no severity scoring.
5. Emit a **replay certification verdict**: `certified` (byte-equal on overlapping keys), `divergent` (any difference), or `uncertifiable` (missing snapshot, missing engine_version match, empty lineage). Verdict is descriptive only — never mutates ledger state.

### Out of scope (explicit)

- No new tables, columns, RPCs, or migrations.
- No recomputation of organism intelligence — the re-derivation is the declared transparent merge above; we are surfacing equivalence, not authoring truth.
- No background jobs, no caching layer, no writes of any kind.
- No multi-hop / transitive replay traversal (preserves G1 discipline).
- No coach/recruiter surfaces yet (G3+).

### Files to add

```text
src/lib/asb/replay.ts                       deterministic projection + diff (pure fns)
src/hooks/useReplayCertification.ts         composes lineage + snapshot + projection
src/components/asb/ReplayCertificationPanel.tsx   verdict + version pin display
src/components/asb/ReplayInputChain.tsx     ordered ancestor list with raw payloads
src/components/asb/StateDiffView.tsx        key-level before/after diff, no abstraction
src/pages/AsbReplay.tsx                     /replay/:eventId route
```

### Files to modify

```text
src/components/asb/EventCard.tsx   add "Open replay certification" link → /replay/:eventId
src/App.tsx                        register /replay/:eventId lazy route
```

### Technical contract

`computeReDerivedState(ancestorPayloads: Record<string, unknown>[], selfPayload, engineVersion)` returns:
- `projection`: shallow-merged jsonb (ancestor[0] → … → ancestor[n] → self), preserving last-write-wins per top-level key, with full per-key provenance map `Record<key, { source_event_id, source_index }>`.
- Nested objects are merged recursively without smoothing; arrays are replaced wholesale (never concatenated, never deduped) — no fabrication.

`diffSnapshots(original, reDerived)` returns `{ added: Key[], removed: Key[], changed: { key, before, after }[] }` over the union of top-level keys, with deep equality on values (JSON canonical form). No tolerance windows, no rounding.

`certify({ snapshotPayload, reDerivedPayload, snapshotEngineVersion, eventEngineVersion })` returns `'certified' | 'divergent' | 'uncertifiable'` with a `reasons: string[]` array. Engine-version mismatch between snapshot and event → `uncertifiable`.

### UI behavior

`/replay/:eventId` renders four sections in fixed order, each lineage-visible one click away:
1. Selected event header (topic, occurred_at, engine_version, schema_version via existing `EngineVersionBadge`).
2. `ReplayCertificationPanel` — verdict badge + reasons + engine_version pin + ancestor count + snapshot presence.
3. `ReplayInputChain` — ordered ancestors with raw payload `<pre>` blocks (reuses card styling from G1).
4. `StateDiffView` — side-by-side original vs re-derived, with `added` / `removed` / `changed` key tables.

All four sections show raw underlying data; nothing is hidden behind aggregation. Empty states are explicit (e.g. "No snapshot recorded as_of this event → uncertifiable").

### Guardrails

- Pure functions in `src/lib/asb/replay.ts` with no side effects, no I/O, deterministic given inputs.
- React Query keys include `engine_version` so version drift invalidates the cache.
- RLS continues to enforce `athlete_id = auth.uid()` on every read; no new privileged paths.
- Ledger remains the only source of truth — re-derivation is presented as a *projection*, never written back.

### After G2

Proceed directly to **G5 — sensor/wearable ingestion adapter audit** (read-only inventory of existing ingest paths, confidence/missingness propagation, idempotency_key usage). No new infrastructure until that audit completes.
