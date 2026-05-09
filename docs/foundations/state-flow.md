# State Flow

States: `healthy_foundation`, `fragile`, `active_recovery`, `lost_feel`, `post_recovery`, `chronic_decline`, `post_layoff_rebuild`.

```text
                ┌──────────────────────┐
                │  healthy_foundation  │  (always allowed to leave)
                └─────────┬────────────┘
                          │ any trigger fires
       ┌──────────────────┼─────────────────────┐
       ▼                  ▼                     ▼
   fragile            lost_feel        active_recovery
   (48h dwell)        (48h dwell)      (48h dwell)
       │                  │                     │
       │                  │   mechanics+results │
       │                  │        decline      ▼
       │                  └────────────►  chronic_decline
       │                                   (96h dwell)
       │                                       │
       │  layoffDays >= 14                     │
       └─────────► post_layoff_rebuild ◄───────┘
                       (72h dwell)
                            │
                            ▼
                      post_recovery
                       (72h dwell)
                            │
                            ▼
                     healthy_foundation
```

Rules:
- `applyDwellGuard` blocks transition until `MIN_DWELL_HOURS[current]` elapses.
- Leaving `healthy_foundation` is always allowed (escalation is urgent).
- `confidence` decays per day (`CONFIDENCE_DECAY_PER_DAY = 0.1`); state itself is sticky until next reconcile.
- Reconciliation is fire-and-forget per recommendation request; failures degrade to in-memory derivation.
