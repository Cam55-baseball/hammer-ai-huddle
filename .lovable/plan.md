## Goal

Replace remaining raw/jargon strings on `/command` (and the shared engine version badge) with plain-English copy, while keeping canonical IDs visible as captions/tooltips so replay lineage stays one click away.

## Changes

### 1. `src/components/asb/EngineVersionBadge.tsx` (presentation only)
Change visible label from:
- `engine asb-1.0.0 · schema v1`

to:
- `Recorded by asb-1.0.0 · schema 1`

Keep the existing tooltip (full `engine_version`, `schema_version`, released/deprecated/notes) unchanged — that's where the raw canonical metadata stays accessible. Used by both the onboarding confirm card and every command-center card, so this single edit fixes the onboarding instance too.

### 2. Card subtitles in `src/components/command/cards/`

Humanize the `subtitle` prop passed to `IntelligenceCardShell`. Card titles, icons, projection logic, and the `topicId` caption rendered inside `IntelligenceCardShell` are unchanged — raw topic stays visible there.

| File | Current subtitle | New subtitle |
|---|---|---|
| `FatigueCard.tsx` | `Latest behavioral.fatigue.* event` | `Most recent fatigue signal` |
| `BehavioralRegulationCard.tsx` | `Latest behavioral.* organism-state event` | `Most recent behavioral state signal` |
| `SchedulingLoadCard.tsx` | `Raw day_type distribution across recent window` | `How your day types break down lately` |
| `WorkloadCard.tsx` | `Scheduled day_type events in the trailing 7 days` | `Days you've scheduled in the last week` |
| `EscalationFlagsCard.tsx` | `foundation.pattern.* + behavioral.escalation/risk.*` | `Pattern, escalation, and risk flags` |

### 3. Out of scope
- No changes to data hooks, projections, emit pipeline, ledger, migrations, or replay routes.
- No changes to engineer-facing surfaces (`/timeline`, `/replay/:id`, ops pages) — raw IDs there are intentional.
- `ReadinessCard` and `RecoveryCard` subtitles are already human-readable; left alone.
- `TopicLabel` caption inside each card body keeps raw `topic_id` visible (lineage one click away).

## Verification

- Visual check of `/command` and the onboarding confirm step.
- All 19 CI invariant rules still pass (no source-of-truth changes).
