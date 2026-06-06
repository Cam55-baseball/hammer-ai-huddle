# Safeguarding Observability

**Sprint:** Post-Launch Observability & Reality Validation
**Reducer:** `src/lib/observability/safeguarding.ts`
**Posture:** Verify the constitutional invariant: **no safeguarding signal disappears, none remain unseen.** (RR-10, Phase 60 §G containment.)

## Metrics

For each safeguarding signal over the window:

| metric | source | notes |
|---|---|---|
| emitted | `safeguarding_notifications` insert + `relational.safeguarding.*` ASB | canonical |
| viewed | `notification_acks` or view topic | partial |
| coach_ack | `notification_acks` filtered to coach role | observable |
| parent_ack | `notification_acks` filtered to parent role | observable |
| resolution_time | first ack timestamp − emit timestamp | derived |
| repeat_frequency | count of repeat emissions for same athlete in 30d | derived |

## Invariant checks (constitutional)

- **No signal lost** — every `safeguarding_notifications` row has a matching ASB emission. Drift logged as P0 to reality-feedback-ledger.
- **No signal unseen** — for minor athletes, parent_ack required within 24h. Coach_ack required within 72h.
- **Repeat signals** — surfaced for review; never silently absorbed (Phase 60 §G).
- **Safeguarding always supersedes exposure** — RR-9 / RR-10 precedence preserved at the reducer level (signals are never down-weighted by visibility metrics).

## Reducer output

```ts
{
  emitted, viewed, coach_ack, parent_ack,
  view_rate, ack_rate_coach, ack_rate_parent,
  median_resolution_ms,
  repeat_athletes: string[],
  invariant_violations: Array<{type, athlete_id, evidence_event_id}>
}
```

Any `invariant_violations` entry becomes a P0 row in `docs/asb/reality-feedback-ledger.md`.

## What this does NOT do

- Does not auto-resolve signals.
- Does not classify severity (existing safeguarding orchestration owns that).
- Does not silently absorb unacknowledged signals.
