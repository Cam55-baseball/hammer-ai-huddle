# Demo → Production Migration

**Phase 151–154.** Authority: `scripts/promote-relational-demo.ts`.

## Contract

Promotion is **additive-only**. Original demo events are never mutated,
deleted, or rescoped in place. Promotion emits a NEW event with the same
topic, the same logical payload, and a production `visibility_scope`, then
records the demo→prod relationship in `asb_event_lineage`.

```text
asb_events             asb_events                   asb_event_lineage
┌──────────────┐       ┌────────────────────┐       ┌────────────────────┐
│ vis=demo  E1 │──+──→ │ vis=self  E1'      │   +   │ parent=E1 child=E1'│
└──────────────┘       └────────────────────┘       │ type=demo_promotion│
        (preserved)            (new emission)       └────────────────────┘
```

## Guarantees

1. **Lineage integrity** — every promoted event records a
   `asb_event_lineage` row with `derivation_type = "demo_promotion"`
   linking it to its demo antecedent.
2. **Additive-only** — original demo rows remain valid and replay-legal in
   demo scope; the firewall in `prepareRows` ensures they never leak into
   production projections.
3. **Replay-certifiable projection continuity** — for every projection
   `P`, `P(rows_after_promotion, target_scope)` is shape-equivalent to
   `P(demo_rows, "demo")`. The companion test
   `promote-relational-demo.test.ts` enforces this.
4. **Deterministic idempotency** — promoted event idempotency keys derive
   from `sha256("promote::" + original.event_id + "::" + target_scope)` so
   re-running the migration is a no-op.

## Operator procedure

```bash
# Dry-run — prints planned promotions, writes nothing.
bun scripts/promote-relational-demo.ts --athlete <id> --to self

# Apply — emits new events + lineage edges.
bun scripts/promote-relational-demo.ts --athlete <id> --to self --apply
```

Promotion is an explicit operator action; there is no auto-promotion
trigger and no edge function. This keeps demo→prod a deliberate,
constitutionally visible transition.

## What is NOT permitted

- ❌ In-place mutation of demo events' `visibility_scope`.
- ❌ Deletion of demo events as part of promotion.
- ❌ Promotion of an event without its corresponding lineage edge.
- ❌ Bypassing `emitAsbEvent` (the canonical write path).
- ❌ Inferring promotion intent from a derived view.

## Failure modes

| Mode | Detection | Containment |
|---|---|---|
| Lineage edge missing | `promote-relational-demo.test.ts` invariant (b) | Migration aborts on first edge insert failure |
| Projection divergence post-promotion | Test invariant (c) | Promotion treated as failed; investigate projection drift |
| Demo row mutated | Test invariant (a) | Constitutional violation; rollback via ledger |
| Duplicate promotion | Idempotency key collision (23505) | `emitAsbEvent` dedupes; no-op |
