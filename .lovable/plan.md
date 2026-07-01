
# Phase 3 — Canonical Daily Training Architecture & Card Orchestration

Structural-only. No exercise, dosage, periodization, or programming changes.

## 1. Canonical Card Registry (new)

Create `src/lib/wic/cardRegistry.ts` + `supabase/functions/_shared/wic/cardRegistry.ts` (shape-parity, same pattern as `ordering.ts`/`season.ts`).

Single source of truth for the daily flow. One entry per card type with structural metadata only:

```text
order | card_type            | responsibility            | source
------+----------------------+---------------------------+-------------------
  1   | readiness            | readiness summary         | athlete_daily_log
  2   | warmup               | movement prep             | warmup engine
  3   | speed                | running speed             | wk_prescriptions.slot=speed
  4   | bat_speed            | rotational velocity       | wk_prescriptions.slot=bat_speed
  5   | lift                 | strength/power            | wk_prescriptions.slot in (lift, supplemental)
  6   | practice_or_game     | practice / game awareness | gp_games + scheduled_practice_sessions
  7   | conditioning         | conditioning              | wk_prescriptions.slot=conditioning
  8   | cross_sport          | athletic transfer         | wk_prescriptions.slot=cross_sport
  9   | recovery             | recovery                  | future
 10   | nutrition            | nutrition                 | existing surface
 11   | mental               | mental training           | existing surface
```

Each registry entry carries: `card_type`, `display_order`, `training_objective`, `estimated_duration_min?`, `intensity?`, `recovery_demand?`, `required_equipment?`, `location?`, `substitution_available`, `enabled_when(ctx)`, and empty context-message field keys (`focus`, `why_today`, `recovery_reminder`, `equipment_note`) — declared, not populated.

Update `src/lib/wic/ordering.ts` + `supabase/functions/_shared/wic/ordering.ts` `SLOT_ORDER` to derive from the registry (speed before bat_speed to match spec) so ordering can never drift from the registry.

## 2. Card-Responsibility Law — split Speed and Bat Speed

- Delete the merged `WkSpeedBatCard.tsx` (single card owning two responsibilities).
- Create `WkSpeedCard.tsx` — filters snapshot to `slot === "speed"` only.
- Create `WkBatSpeedCard.tsx` — filters snapshot to `slot === "bat_speed"` only.
- Both are pure consumers of `useHammersToday()` (no new hook instances).
- Each card reads its `card_type` + display order from the registry — no inline ordering.

`HammerDailyPlan.tsx` renders cards by iterating the registry in `display_order` and mounting the component bound to each enabled `card_type`. Removes the possibility of manual reordering.

## 3. Unified Snapshot Identity (cross-card consistency)

Extend `HammersTodayProvider` snapshot to expose a `snapshotIdentity`:

```ts
{ generation_id, generated_at, season_phase, season_display, readiness_hash, engine_version, reasoning_version }
```

`generation_id` = `wk_generation_diagnostics.id` returned by `wk-generate-daily` (already persisted Phase 2). Every card receives it via context and stamps its rendered header (dev-only visible attribute `data-generation-id` for regression proof).

Any card whose local data references a different `generation_id` renders a stale-badge and forces a snapshot refetch — prevents split-brain across cards.

## 4. Practice / Game Awareness

Add `dayKind: "game" | "practice" | "both" | "neither"` to the snapshot, derived from the same `gp_games` + `scheduled_practice_sessions` queries the generator already runs (Phase 2). Exposed to the `practice_or_game` card and to the registry's `enabled_when` predicates. No prescription logic changes.

## 5. Seasonal Display Integrity

Replace ad-hoc phase strings in all cards with a single `seasonDisplayLabel(phase)` in the shared `season.ts` (already the canonical authority from Phase 2). Every card reads its label from the snapshot, not from local mapping. Guarantees no label drift.

## 6. Card Metadata (structural only)

Every rendered card exposes the registry metadata via props: `cardType`, `displayOrder`, `trainingObjective`, `estimatedDurationMin`, `intensity`, `recoveryDemand`, `requiredEquipment`, `location`, `substitutionAvailable`, `rationaleSource`. Rendered inside a shared `<CardMeta />` slot (empty message fields left blank for future phases to populate).

## 7. Validator Extensions

Extend `supabase/functions/_shared/wic/validator.ts` with Phase 3 structural checks that run alongside Phase 2 rules. Fatal on any of:

- duplicate `card_type` in the enabled set
- duplicate `display_order`
- ordering violation (rendered order ≠ registry order)
- missing required metadata on any enabled card
- season label ≠ canonical `seasonDisplayLabel(phase)`
- any card referencing a `generation_id` other than the snapshot's

Persisted into `wk_generation_diagnostics.errors` via the existing atomic RPC — no schema change.

## 8. Files Touched

New:
- `src/lib/wic/cardRegistry.ts`
- `supabase/functions/_shared/wic/cardRegistry.ts`
- `src/components/hammer/WkSpeedCard.tsx`
- `src/components/hammer/WkBatSpeedCard.tsx`
- `src/components/hammer/cards/CardMeta.tsx`

Edited:
- `src/lib/wic/ordering.ts`, `supabase/functions/_shared/wic/ordering.ts` — derive SLOT_ORDER from registry, put speed before bat_speed
- `src/components/hammer/HammersTodayProvider.tsx` — expose `snapshotIdentity`, `dayKind`, `seasonDisplay`
- `src/components/hammer/HammerDailyPlan.tsx` — render via registry loop, drop manual card ordering
- `src/components/hammer/WkLiftsCard.tsx`, `WkConditioningCard.tsx` — consume registry metadata + snapshot identity
- `supabase/functions/_shared/wic/validator.ts` — Phase 3 checks
- `supabase/functions/wk-generate-daily/index.ts` — thread structural checks into the diagnostics payload

Deleted:
- `src/components/hammer/WkSpeedBatCard.tsx`

## 9. Regression Evidence

- Playwright pass on `/index` capturing Hammers Today with `data-generation-id` attributes: prove Speed and Bat Speed render as separate cards, one instance each, in registry order, all sharing one `generation_id`.
- `wk_generation_diagnostics` row for the test user shows `cards_produced` map with `speed` and `bat_speed` counted separately and Phase 3 validator section empty.
- Rebuild + tsgo pass.

## 10. Explicit Non-Goals (deferred)

Exercise selection, dosages, workout quality, lift/speed/bat-speed/conditioning/cross-sport programming, periodization, and coaching philosophy are untouched. Context-message copy is not written — only the fields are declared. Recovery and Mental cards are registry-only placeholders in this phase unless already implemented.
