## Goal

Turn the dashboard from a stack of metric cards into one calm, motivating organism narrative. Pure presentation layer — no schema, projection, replay, parity, or capability-gate changes.

## New dashboard flow (athletes)

```text
1. Identity Card        (rebuilt — rotating single alert + "Develop This Week" + Today's Standard inline + motivational line)
2. Communication AI     (new — replaces YourNextStep visually, same data sources, tone driven by Today's Standard)
3. Command Center       (renamed labels, plain-English, always visible)
4. Game Plan            (unchanged)
5. Weekly Digest Preview
6. Forecast Preview
```

Coach/scout branch unchanged.

## Today's Standard — single source of truth

Today's Standard lives **inside the Identity Card only**. No separate strip on the dashboard. The pure derivation function is extracted so other surfaces can read the same sentence without rendering another card.

- New: `src/lib/standard/todaysStandard.ts` — `deriveTodaysStandard(rows, identitySnapshot, dayType, now)` → `{ standard, tone, rationale }`. Pure, read-only.
- `IdentityCommandCard` consumes it and renders the standard sentence in its existing standard area + adds the bottom motivational line tied to it.
- `CommunicationAI` consumes the same function to align its tone/copy with the standard, but does **not** render the standard itself.

## New / changed files

**New**
- `src/lib/standard/todaysStandard.ts` — pure derivation described above.
- `src/lib/identity/rotatingAlert.ts` — picks **one** alert from `useBehavioralEvents` + command rows by priority. Returns `{ text, tone, action? } | null`.
- `src/components/dashboard/CommunicationAI.tsx` — replaces visual role of `YourNextStep`. Uses `useAthleteCommandRows`, `useEscalationFeed`, and `deriveTodaysStandard` for tone. Renders: tier pill, title, 1 instruction, 1 explanation, 1 "why this matters" line, 1 primary CTA. Reuses the existing `deriveNextStep` priority logic with rewritten plain-English copy.
- `src/components/dashboard/WeeklyDigestPreview.tsx` — read-only preview (3 short bullets from last 7d) + "Open weekly digest" link.
- `src/components/dashboard/ForecastPreview.tsx` — read-only preview (2–3 lines, next 3–5 days outlook) + "Open forecast" link.

**Edited**
- `src/components/identity/IdentityCommandCard.tsx`
  - Replace stacked pressure-event list with a **single rotating alert** via `rotatingAlert.ts`. Keep acknowledge action.
  - Add "Develop This Week" sentence in the always-visible header area.
  - Surface Today's Standard sentence in its existing standard area (sourced from `deriveTodaysStandard`).
  - Add bottom motivational line tied to the standard.
  - Keep existing collapse behavior, tier accent, streak chips, standard-confirmed pill.
- `src/components/command/CommandCenterSection.tsx`
  - Rename section label "Organism command center" → "How Your Body Is Today".
  - Pass plain-English titles to child cards.
- Command cards (`ReadinessCard`, `FatigueCard`, `WorkloadCard`, `RecoveryCard`, `BehavioralRegulationCard`, `TrendShiftsCard`, `SchedulingLoadCard`, `EscalationFlagsCard`) — title strings + any user-visible "lineage/projection/event/canonical/runtime/envelope/deterministic/replay/emit/propagation/organism continuity/athlete.schedule.day_type" copy replaced with plain English. No behavior changes. Internal code untouched.
  - Readiness → "Ready Today"
  - Fatigue → "Energy Drain"
  - Workload → "Stress Load"
  - Recovery → "Recovery"
  - Trends → "Progress Trend"
  - Behavioral Regulation → "Daily Habits"
- `src/pages/Dashboard.tsx`
  - Replace `<YourNextStep />` with `<CommunicationAI />`.
  - After `GamePlanCard`, mount `<WeeklyDigestPreview />` and `<ForecastPreview />` (athlete branch only).
- `src/pages/Today.tsx` — swap `YourNextStep` → `CommunicationAI` for parity.

**Deleted**
- `src/components/runtime/YourNextStep.tsx` (superseded by CommunicationAI).

**Untouched (non-negotiable)**
- `GamePlanCard` (no collapsible change), ASB ledger / event schema / projections / replay / parity tests / capability gates / edge functions / `useAthleteCommandRows` / `useEscalationFeed` / `TrustFooter` / identity tier engine / day state engine / behavioral events backend / Supabase migrations.

## Adaptive priority logic (shared between CommunicationAI + Identity rotating alert)

First match wins:

1. **Survivability** — `unackedCount > 0` from `useEscalationFeed`
2. **Recovery risk** — `recovery < 0.45` or `fatigue > 0.7` (non-stale)
3. **Readiness low** — `readiness < 0.4` (non-stale)
4. **Consistency slip** — `nn_miss_count_7d ≥ 2` or recent `consistency_drop` event
5. **Performance ready** — `readiness ≥ 0.65 && fatigue ≤ 0.55`
6. **Positive reinforcement** — recent `consistency_recover` or upward `identity_tier_change`
7. **Time-of-day optimization** — prep / train / lock-in / recover
8. **Missing data** — "Log today's check-in"

Stale signals demote to optimization tier with a "based on older signals" note.

## Language sweep (user-facing strings only)

| Old | New |
|---|---|
| emit / event | update |
| canonical | official |
| projection | summary |
| lineage | history |
| deterministic | consistent |
| replay | review |
| runtime | live |
| envelope | range |
| organism continuity | your body's rhythm |
| propagation | knock-on effect |
| athlete.schedule.day_type | day type |

Internal names, types, function/file names, console logs stay as-is.

## Visual direction

- Reduce card density: more whitespace, larger headings, fewer pills above the fold.
- Identity → Communication AI form one breathable column. No overlapping muddy gradients.
- Communication AI uses one subtle primary-tinted gradient + one CTA.
- All colors via semantic tokens.

## Confirmation checklist (post-build)

- [ ] No edits under `supabase/`, `src/hooks/command/`, `src/lib/command/projections.ts`, edge functions, test files, or `GamePlanCard`
- [ ] `YourNextStep` references removed everywhere
- [ ] Today's Standard appears in exactly one place on the dashboard (Identity Card)
- [ ] Build passes
- [ ] Dashboard renders: Identity → Communication AI → Command Center → Game Plan → Weekly Digest Preview → Forecast Preview

## Out of scope

Schema rewrites, replay/parity changes, Game Plan collapsibility, new AI autonomy, notifications, gamification, TrustFooter removal, sidebar restructuring.
