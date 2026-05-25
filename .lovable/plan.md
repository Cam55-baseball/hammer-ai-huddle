# ASB Substrate — Final Certification, Freeze & Product Backlog Transition

This plan executes the four sealed phases requested: live producer validation, substrate integrity audit, freeze certification, and product-execution backlog. No new architecture, no doctrine, no schema rewrites.

## Phase 1 — Live Producer Validation (read-only + triggered traffic)

For each producer family, trigger real traffic via existing UI/edge paths and verify against `asb_events` + `/asb/timeline` + `/replay/:eventId`.

Producers under test:
- `athlete.schedule.day_type` — via `useAthleteEvents.createEvent` / `deleteEvent`
- `behavioral.*` — via `evaluate-behavioral-state` edge function
- `foundation.*` — via `detect-behavior-patterns` + `foundations-recompute-user`
- `analytics.*` — via `analytics-ingest` with explicit `athlete_id`

Per-producer verification matrix:

```text
                row in   det.    engine_ver  /timeline  /replay  dup
                asb_evts idem_key =asb-1.0.0  visible   resolves dedupes
athlete.day_type   ✓       ✓        ✓          ✓         ✓        ✓
behavioral.*       ✓       ✓        ✓          ✓         ✓        ✓
foundation.*       ✓       ✓        ✓          ✓         ✓        ✓
analytics.*        ✓       ✓        ✓          ✓         ✓        ✓
```

Verification mechanics (read-only tools):
- `supabase--read_query` against `asb_events` filtered by `topic_id` + `athlete_id` + `occurred_at`
- Recompute `idempotency_key` independently from `(athlete_id|topic_id|occurred_at|canonical(payload))` and assert equality
- Re-trigger same input → assert row count unchanged (dedupe)
- Diff payload against source row → assert raw preservation (no smoothing/imputation)
- Open `/replay/:eventId` for sample of each producer → assert deterministic re-derivation
- `supabase--edge_function_logs` to confirm `[asb] emit ok|dedupe` lines

## Phase 2 — Substrate Integrity Audit

Single audit pass producing a concrete violation list (no advisories, no doctrine):

| Dimension | Check |
|---|---|
| Replay determinism | Identical `eventId+engine_version` re-derives identical output (sample N=5 across topics) |
| Lineage continuity | `asb_event_lineage` single-hop only; ordering `(created_at, parent_event_id)` total |
| Idempotency enforcement | Unique index on `(athlete_id, topic_id, idempotency_key)` present and enforced |
| Engine version propagation | All emitters stamp `ENGINE_VERSION="asb-1.0.0"`; cache keys include it |
| Observability visibility | `/timeline` lists every produced topic; `/replay/:id` resolves for each |
| RLS correctness | `asb_events` + `asb_event_lineage` INSERT/SELECT policies scoped to athlete owner |
| Append-only guarantees | No UPDATE/DELETE paths exist against `asb_events` in client or edge code |
| Hidden retries | No catch-and-retry loops around `emitAsbEvent`; dedupe is the only "retry" |
| Silent mutation | No code path mutates `payload`/`engine_version`/`idempotency_key` post-insert |
| Parallel ledger | No alternate event store writes mirroring `asb_events` |

Tools: `supabase--read_query`, `supabase--linter`, ripgrep across `src/` + `supabase/functions/`.

Output: a violations list (may be empty). Only concrete violations block freeze.

## Phase 3 — Freeze Certification

If Phase 2 returns zero violations, declare and record in `.lovable/plan.md`:
- ASB **replay substrate** LOCKED
- ASB **lineage substrate** LOCKED
- ASB **canonical ingestion substrate** LOCKED
- Replay-certifiable **event ledger operational**
- **Ingestion/runtime substrate freeze-ready**

No code changes in this phase beyond the freeze marker doc.

## Phase 4 — Product Execution Backlog

Replace constitutional/architecture work with an implementation backlog. Written as concrete, shippable units (each ≤ 1 build iteration). Ordered by athlete-value leverage:

1. **Athlete dashboard intelligence surface v1** — readiness/fatigue/load cards reading directly from `asb_events` projections; confidence + missingness visible.
2. **Timeline/replay UX refinement** — filters by topic family, lineage breadcrumbs, copyable replay handle, engine_version chip.
3. **Coach roster monitoring** — multi-athlete dashboard, day-type heatmap, escalation flags from `behavioral.*` topics.
4. **Notification/escalation infrastructure** — rule-driven push/email on `behavioral.*` + `foundation.pattern.*` topics.
5. **Onboarding flow** — athlete first-run: profile → schedule → first canonical event emitted.
6. **Wearable/sensor adapter v1** — single vendor (Apple Health or Garmin) emitting `sensor.*` topics via existing `emitAsbEvent`.
7. **Performance intelligence delivery** — weekly digest derived from ledger, lineage-cited.
8. **Recruiter/scout intelligence surface** — read-only athlete cards with replay-cited metrics.
9. **Mobile execution surfaces** — responsive pass on dashboard + timeline + replay.
10. **Forecast/scenario surfaces** — bounded projection cards (read-only, replay-cited).

Each backlog item will be opened as its own plan when scheduled; no work begins in this plan.

## Constraints (carried forward)

- No schema changes, no migrations beyond freeze-marker doc.
- No new edge functions.
- No retries, no smoothing, no parallel ledgers.
- All future work = product execution against the locked substrate.

## Deliverables

- Phase 1 verification matrix (filled with real query results)
- Phase 2 violation list (concrete or empty)
- Phase 3 freeze declaration appended to `.lovable/plan.md`
- Phase 4 backlog written to `.lovable/backlog.md`
