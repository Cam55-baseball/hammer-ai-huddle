# G1 — Athlete Event Timeline with Lineage Drilldown

Read-only athlete-facing surface that exposes the canonical ASB event ledger, lineage graph, state snapshots, and engine/reasoning version metadata. No schema changes, no aggregation, no abstraction over the raw records.

## Scope

- New route: `/timeline` (athlete-only, accessible from Dashboard).
- New page: `src/pages/AsbTimeline.tsx`.
- New components under `src/components/asb/`:
  - `EventTimeline.tsx` — paginated chronological list of `asb_events` for the current athlete.
  - `EventCard.tsx` — collapsed event row with timestamp, topic, actor role, confidence, missingness chip, engine_version badge, "Trace lineage" toggle.
  - `LineageTrace.tsx` — on expand, walks `asb_event_lineage` (parent→child) recursively for that event and renders the causal ancestry tree with derivation_type on each edge.
  - `StateSnapshotPanel.tsx` — for each event, looks up `asb_state_snapshots` where `as_of_event_id = event.id` and renders the raw `payload` JSON (read-only, no derived rollups).
  - `EngineVersionBadge.tsx` — shows pinned `engine_version` + `schema_version` joined from `asb_engine_versions`; tooltip exposes release notes.
- New hook: `src/hooks/useAsbTimeline.ts` — paged query of `asb_events` by `athlete_id`, ordered by `occurred_at desc`, exposing raw rows.
- New hook: `src/hooks/useEventLineage.ts` — recursive fetch of `asb_event_lineage` rows (parent and child sides) for a given `event_id`.

## Doctrine alignment

- **No aggregation, no summary-only views.** Every event renders the raw row; lineage is exposed in full one click away (RW-2).
- **Confidence + missingness visible per event** from `asb_events.payload` and snapshot `confidence` field. Never smoothed, never imputed.
- **Engine + reasoning version pinned** on every card (RE-7 replay-certification badge).
- **State snapshot is the raw `payload` jsonb** of `asb_state_snapshots` keyed on `as_of_event_id` — no derived rollup.
- **Lineage is the actual graph**, not a flattened summary (`derivation_type` shown on every edge).
- **Read-only.** No writes, no mutation, no event authoring from the UI.

## Data flow

```text
Dashboard ──► /timeline ──► useAsbTimeline(athleteId)
                              └─► asb_events (paged, raw)
                                    └─► EventCard
                                          ├─► EngineVersionBadge ◄── asb_engine_versions
                                          ├─► StateSnapshotPanel ◄── asb_state_snapshots (as_of_event_id)
                                          └─► LineageTrace ◄── useEventLineage(eventId)
                                                                 └─► asb_event_lineage (recursive)
```

## RLS

Use existing policies on `asb_events`, `asb_event_lineage`, `asb_state_snapshots`, `asb_engine_versions`. No new policies. If an athlete cannot read their own ledger, that's a separate RLS gap surfaced as a follow-up (not part of G1).

## Empty state

Tables are currently empty in this environment. The UI must render a clear "No events recorded yet" state per surface (timeline, lineage, snapshot) without faking data — preserves lineage visibility doctrine even at zero events.

## Out of scope (explicitly)

- No new tables / migrations / edge functions.
- No coach, recruiter, or scout views (G3, G4 later).
- No replay execution / re-derivation (G2 badge later).
- No forecast / scenario UI (G7 later).
- No write paths.

## Acceptance

- Athlete navigates from Dashboard to `/timeline`.
- Sees their own `asb_events` in reverse-chronological order with confidence, missingness, actor role, engine_version visible inline.
- Expanding an event reveals: full payload jsonb, the associated state snapshot raw payload, and the full lineage trace with derivation_type edges.
- No event is shown without its engine_version + schema_version pinned.
- All data on screen is one click from its raw underlying row.
