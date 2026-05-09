# Trigger Lifecycle

```text
signal observed (snapshot)
     │
     ▼
computeFoundationTriggers → trigger T fires
     │
     ▼
recordAndFilterTriggerCooldown:
     • read foundation_trigger_events (last cooldown window)
     • if T fired within TRIGGER_COOLDOWN_HOURS[T] → drop
     • else: insert (user_id, trigger=T, confidence=0.7)
     │
     ▼
T enters active set used by scorer + state machine
     │
     ▼ (each hour, cron `hourly-trigger-decay`)
confidence -= 0.1 / 24
     │
     ├─ confidence > 0.05 → still active
     └─ confidence <= 0.05 → resolved_at = now()  (auto-resolve)
     │
     ▼ (90 days later)
daily-trace-prune cleans associated traces
```

Cooldowns (hours):
- `new_user_30d`: 720 (effectively non-recurring)
- `fragile_foundation`, `lost_feel`: 72
- `mechanics_decline`, `results_decline`, `philosophy_drift`: 96
- `pre_season`: 336
- `post_layoff`: 168
- `confidence_low`: 48
- default: 72

Resolution can also happen externally: when the underlying signal disappears for N days, future `computeFoundationTriggers` simply omits T and the state machine reconciles.
