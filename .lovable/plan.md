## "Your Next Step" — adaptive coach communication layer

Replace the generic `QuickActionsCard` with a new **`YourNextStep`** RuntimeCard that synthesizes canonical ASB rows into one clear human-coach prescription: headline, why, exact next action, and a single primary CTA. Pure UI/projection layer — no event writes, no schema, no parity changes.

### New file: `src/components/runtime/YourNextStep.tsx`

A single large centered card. Reads the existing `useAthleteCommandRows({ days: 30, limit: 500 })` and `useEscalationFeed({ withinHours: 72 })` hooks (no new data sources). Pure derivation function `deriveNextStep(rows, escalations, hour)` returns `{ tier, headline, why, action, cta: { label, route } }`.

**Adaptive priority engine** (first match wins, mirrors constitutional precedence — survivability → recovery → readiness → performance → optimization):

| Tier | Trigger | Headline / Action |
|---|---|---|
| `survivability` | Any unacknowledged item in `useEscalationFeed` (foundation.pattern / behavioral.escalation / behavioral.risk) within 72h | "Pause and check in with your body." → `cta: Review Alert → /command` |
| `recovery` | Latest `behavioral.recovery` score < 0.45 **or** latest `behavioral.fatigue` score > 0.7 | "Your body needs recovery today." / "Your recent workload has been high and recovery has dropped." → `cta: Start Recovery → /bounce-back-bay` |
| `readiness-low` | Latest `behavioral.readiness` < 0.4 | "Take it easy today." / "Readiness is below your normal range." → `cta: Open Recovery → /bounce-back-bay` |
| `performance` | Readiness ≥ 0.65 and fatigue ≤ 0.55 | "You are ready to push today." → `cta: Start Training → /practice` |
| `optimization` (default time-of-day fallback) | hour < 10 → "Begin your morning prep routine." / 10–16 → "Hit your training window." / 16–21 → "Lock in today's session." / else → "Wind down — quality sleep wins." | route mirrors current `useNextAction` defaults (`/tex-vision`, `/practice`, `/vault`, `/nutrition-hub`) |

Missing-data state (no rows yet) shows: "Log today's check-in to unlock your next step." with CTA to `/today-checkin` (or whichever onboarding entry is current). Confidence and missingness from the underlying projections gate the headline strength — when the driving score is stale (>36h for readiness/fatigue, >48h for recovery) we fall back one tier and surface a small "based on older signals" note. Lineage stays one click away via the existing `LineageDrilldownButton` reused in a small "Why this?" footer link.

**Visual structure** (Tailwind, design tokens only — no raw colors):

```
┌───────────────────────────────────────────────┐
│  [icon]  YOUR NEXT STEP            [tier pill]│
│                                               │
│  Headline (text-2xl sm:text-3xl font-semibold,│
│  tracking-tight, max-w-2xl)                   │
│                                               │
│  Why this matters (text-base text-muted-fg,   │
│  max 2 lines)                                 │
│                                               │
│  → Exact next action (text-sm font-medium)    │
│                                               │
│  [ Primary CTA — large, single ]              │
│                                               │
│  Why this?  ·  Updated 2h ago                 │
└───────────────────────────────────────────────┘
```

- Rounded-2xl, generous padding (`p-6 sm:p-8`), subtle gradient (`from-primary/8 via-card to-card`), thin `border-primary/20`, single large CTA button (`size="lg"`, full-width on mobile, auto on desktop).
- No grid, no chips row, no competing actions. Tier pill is a small muted badge top-right (`Survivability` / `Recovery` / `Ready` / etc).
- Calm typography hierarchy — large headline, lighter subtext, single accented action line with `→`.

### Dashboard changes — `src/pages/Dashboard.tsx`

- Remove `QuickActionsCard` import and its mount on line 541.
- Add `YourNextStep` import and mount it in this order under the athlete branch:
  1. IdentityCommandCard (unchanged)
  2. **`<YourNextStep />`** (new — primary intelligence layer)
  3. `CommandCenterSection` wrapped in its existing supporting-surface container (unchanged structurally, but the wrapper gets a smaller header treatment: subdued label `Organism Status` instead of competing for primacy)
  4. `GamePlanCard` (unchanged — today's executable training)

### Today page changes — `src/pages/Today.tsx`

Insert `<YourNextStep />` between `<PulseStrip rx={rx} />` (line 68) and `<CommandCenterSection />` (line 69) so /today and /dashboard share the same primary coaching surface.

### Delete

`src/components/identity/QuickActionsCard.tsx` — no other usages (verified by `rg`). Its `useNextAction` hook is superseded by the new derivation, so also delete `src/hooks/useNextAction.ts` after confirming nothing else imports it (will re-verify in build mode and skip the deletion if any other file uses it).

### Out of scope (explicitly unchanged)

- `useAthleteCommandRows`, projections, escalation feed, lineage, replay, parity, capability gates, append-only ledger, edge functions, event schemas.
- Command Center internals, Game Plan internals, identity card, PulseStrip.
- No new ASB events emitted; `YourNextStep` is a pure read-only projection consumer.
- i18n strings: new copy added in component literals for now (can move to `en.json` in a follow-up); no existing keys removed.

### Verification

- Visual check on /dashboard and /today at 1330×890 and mobile (375).
- `rg QuickActionsCard src/` returns no hits.
- TypeScript build clean.
- Existing Command Center / Game Plan / Identity card render unchanged below the new card.