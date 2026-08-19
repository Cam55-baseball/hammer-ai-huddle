# Restore the Conditioning card on Hammers Today

## What's happening (confirmed)

The Conditioning card is not "missing" from the UI — the generator is producing **zero** conditioning movements, and the card hides itself when it has no items.

Diagnostics for the latest plans (2026-08-16 → 08-19) all show:

```text
adaptation:                     in_season_maintenance
conditioning_template_id:       cond.off_day
conditioning_validation_status: empty
cards_produced:                 lift 9, bat_speed 4, cross_sport 1, conditioning 0
```

Cause: the day-adaptation compatibility table in `wk-generate-daily` does not list
`conditioning_repeat_explosive` as compatible with `in_season_maintenance`. Every row in the
catalog with `category = 'conditioning'` (all 9: base-running sims, inning restarts, catcher
up-downs, IF lateral repeats, etc.) carries exactly that adaptation, so during the entire
in-season phase the eligibility filter rejects all of them. With no candidates, the session
builder falls back to `cond.off_day` and reports `empty`.

This is a gate bug, not a data bug — the conditioning catalog rows are metadata-complete,
scope-clean and integrity-clean.

## The fix

1. **Adaptation compatibility** — allow `conditioning_repeat_explosive` under the day
   adaptations where conditioning is constitutionally legal: `in_season_maintenance`,
   `game_readiness`, `power_transfer`, and `strength_to_power` (it is already allowed under
   `muscle_capacity`). It stays excluded from `recovery_only`, where conditioning is
   deliberately suppressed.

2. **No silent empties** — when the conditioning engine is not suppressed (not a game day,
   not post-season, not a recovery-suppressed day) but resolves zero movements, record a
   `conditioning_empty_pool` warning in `wk_generation_diagnostics` instead of quietly
   emitting `cond.off_day`. A legal training day that produces no conditioning is a defect
   and should be visible in the audit trail.

3. **Regression guard** — extend the performance-support audit so that, for each in-season
   day adaptation, at least one catalog conditioning row passes the adaptation gate. This
   fails CI the next time an adaptation label is added without wiring conditioning to it.

4. **Verify** — redeploy `wk-generate-daily`, regenerate today's plan, and confirm
   `cards_produced.conditioning > 0` with `conditioning_template_id` resolving to a real
   in-season template (`cond.practice_day` / `cond.repeated_sprint`) rather than
   `cond.off_day`.

## Technical detail

- `supabase/functions/wk-generate-daily/index.ts` — `adaptationsCompatible` map (~line 470);
  conditioning generation site (~line 1220) gains the empty-pool warning.
- `scripts/audits/performance-support-audit.ts` — new adaptation-coverage assertion.
- No schema change, no catalog migration, no UI change. `WkConditioningCard` already renders
  correctly once items exist.

## Not in scope

`speed: 0` also appears on some of these days. That is a separate resolution path
(`speed_development` is already an allowed adaptation) and would need its own investigation —
say the word and I will chase it after conditioning is restored.
