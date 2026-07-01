
# Phase 4 — Canonical Season Intelligence & Periodization Engine

Establishes one constitutional authority for training context. No engine may infer season, day type, legality, recovery, or adaptation independently — every card consumes the same resolved `trainingContext` from the snapshot.

**Guardrails honored:** No changes to exercise catalog, movement selection, lift/speed/bat-speed/conditioning/cross-sport programming, or coaching philosophy. This phase only defines and wires context.

---

## 1. Canonical Season Registry (new)

Create shared, dual-mirrored registry as the sole source of season truth.

- `src/lib/wic/seasonRegistry.ts` + `supabase/functions/_shared/wic/seasonRegistry.ts`
- Enumerates all 12 canonical phases:
  `os_q1`, `os_q2`, `os_q3`, `os_q4`, `transition`, `preseason`, `spring_training`, `regular_season`, `tournament_block`, `postseason`, `recovery_week`, `deload_week`
- Each phase exposes: `displayLabel`, `constitutionalObjective`, `permittedEmphasis[]`, `restrictedEmphasis[]`, `recoveryPriority`, `defaultConditioningProfile`, `defaultPracticeRelationship`
- `seasonDisplayLabel()` in `src/lib/wic/seasonDisplay.ts` is refactored to read from this registry (no duplicate mapping).
- Existing `WkPhase` in `phaseQuarter.ts` and `SeasonPhase` in `seasonPhase.ts` remain — resolver output is mapped INTO the canonical phase enum via a single adapter (no logic rewrite).

## 2. Canonical Day Type Registry (new)

`src/lib/wic/dayTypeRegistry.ts` + server mirror.
- Enumerates: `game_day`, `practice_day`, `practice_plus_game`, `tournament_day`, `recovery_day`, `off_day`, `travel_day`, `deload_day`, `standard_training_day`
- Each type declares: `displayLabel`, `permittedEmphasis[]`, `restrictedEmphasis[]`, `defaultOrderingHint`

## 3. Deterministic Context Resolution Pipeline (new)

`src/lib/wic/contextResolver.ts` + `supabase/functions/_shared/wic/contextResolver.ts`

Single function `resolveTrainingContext(inputs) → TrainingContext` consuming:
- today's date, athlete season settings (existing), calendar events, games, practices (existing `scheduled_practice_sessions`), tournaments, org schedule (if present), manual overrides, travel status, recovery state, readiness, previous workload

Deterministic — same inputs → same output. Resolves exactly one `seasonPhase` and one `dayType`. No engine calls this on its own; provider calls once.

## 4. Recovery / Adaptation / Legality Profiles (new, wiring only)

Three sibling registries — declared but not populated with new coaching logic:

- `src/lib/wic/recoveryProfiles.ts` — one profile per seasonal phase: `id`, `cnsRecoveryProfile`, `tissueRecoveryProfile`, `schedulingPriority`
- `src/lib/wic/adaptationProfiles.ts` — reuses existing `PrimaryAdaptation` enum from `constitution.ts`; maps phase → default adaptation menu
- `src/lib/wic/legalityFramework.ts` — every movement category resolves to `Allowed | Restricted | Discouraged | Prohibited` given a `TrainingContext`. Wraps (does not replace) the existing `isMovementSeasonLegal` — that function becomes one input into the framework.

Existing scattered legality checks (`isPhaseHardBlocked`, in-season eccentric guards) are refactored to call the framework; behavior preserved 1:1.

## 5. TrainingContext Object Definition

```ts
interface TrainingContext {
  seasonPhase: CanonicalSeasonPhase;
  seasonDisplay: string;
  dayType: CanonicalDayType;
  recoveryProfileId: string;
  adaptationProfileId: string;
  legalityProfileId: string;
  conditioningProfile: string;
  practiceRelationship: 'none' | 'supplement' | 'replace' | 'prime';
  contextVersion: string;   // e.g. "ctx_v1"
  generationId: string;     // ties to snapshotIdentity
}
```

## 6. Snapshot Wiring

- `HammersTodayProvider.tsx`: after generation, call `resolveTrainingContext` once and attach `trainingContext` to the snapshot.
- `useWkDailyPrescriptions.ts`: expose `trainingContext` on the returned object (read-only for cards).
- `useHammersToday()` consumers (`WkLiftsCard`, `WkSpeedCard`, `WkBatSpeedCard`, `WkConditioningCard`, `WkSportBlockCard`, `WkPrescriptionCard`, warmup surface) read `ctx.trainingContext` — no card resolves season/day itself.
- `wk-generate-daily`: calls the shared server `resolveTrainingContext` first; every downstream engine receives it as a parameter. Engines are NOT rewritten — they simply accept and pass through the context.

## 7. Validator Extensions

`supabase/functions/_shared/wic/validator.ts` — add fatal checks:
- exactly one resolved `seasonPhase`
- exactly one resolved `dayType`
- every persisted prescription row references the same `contextVersion` + `generationId`
- no conflicting legality profiles across cards in the same snapshot
- no conflicting recovery profiles
- no conflicting adaptation profiles
- publication rejected if `resolveTrainingContext` returns `unresolved`

## 8. Diagnostics Extension (migration)

Extend `wk_generation_diagnostics` with columns:
- `resolved_season_phase text`
- `resolved_day_type text`
- `context_version text`
- `legality_profile_id text`
- `recovery_profile_id text`
- `adaptation_profile_id text`
- `context_validation_outcome text`

Structural metadata only. Backfill nullable; new rows populated by generator.

## 9. Files touched

**New (client):** `seasonRegistry.ts`, `dayTypeRegistry.ts`, `contextResolver.ts`, `recoveryProfiles.ts`, `adaptationProfiles.ts`, `legalityFramework.ts`, `trainingContext.ts` (types)

**New (server mirrors):** same six under `supabase/functions/_shared/wic/`

**Modified:** `HammersTodayProvider.tsx`, `useWkDailyPrescriptions.ts`, `wk-generate-daily/index.ts`, `_shared/wic/validator.ts`, `seasonDisplay.ts` (delegates to registry), all Wk*Card components (read `trainingContext` from snapshot only — no logic changes)

**Migration:** additive columns on `wk_generation_diagnostics`.

## 10. Evidence deliverable

A brief `docs/wic/phase-4-training-context.md` documenting:
- the canonical phase + day-type enums
- the resolver decision table
- a snapshot dump proving every rendered card in one Hammers Today render references identical `contextVersion` + `generationId` + `seasonPhase` + `dayType`.

---

**Explicitly deferred to later phases:** populating recovery/adaptation profiles with real coaching content, rewriting engines to actually consume `permittedEmphasis`, and any change to prescribed movements or programming.
