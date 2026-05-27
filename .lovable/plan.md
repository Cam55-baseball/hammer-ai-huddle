# Put the Command Center on the real Dashboard + make Game Plan collapsible

You're on `/dashboard` (the `Dashboard.tsx` page), not `/today`. The earlier passes mounted `CommandCenterSection` only on `/today` and `/command`, which is why you still don't see it here. The fix is additive and UI-only — no projection, runtime, or schema changes.

## 1. Mount Command Center on `/dashboard`

File: `src/pages/Dashboard.tsx`

- Import `CommandCenterSection` from `@/components/command/CommandCenterSection`.
- Render it in the athlete branch (gated by the existing `(isOwner || isAdmin || (!isScout && !isCoach))` condition already used around line 542) so it appears in this order:

```text
Hero / module cards
IdentityCommandCard
QuickActionsCard
CommandCenterSection            ← NEW
GamePlanCard (collapsible)      ← wrapped
LongTermVideoSuggestions
```

- Wrap the section in a thin container giving it strong visual prominence (clear top spacing, no extra card chrome — the section already supplies its own heading and cards).
- Do not render it for `isScout` / `isCoach` branches (their existing `CoachScoutGamePlanCard` flow is untouched).

The `CommandCenterSection` already provides the "How your body is doing today" header, escalation banner, four large organism cards (Readiness / Fatigue / Workload / Recovery) and the "Show more details" disclosure. Nothing changes inside that component.

## 2. Wrap Game Plan in a collapsible shell

`GamePlanCard` is ~3.6k lines and we won't touch its internals. Instead, wrap the dashboard's `<GamePlanCard />` mount in a new local component:

File: `src/components/dashboard/GamePlanCollapsible.tsx` (new)

- Uses `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` from `@/components/ui/collapsible`.
- Header row: large tap target (`min-h-14`), title "Game Plan", plain-language subtitle ("Your training plan for today"), animated chevron on the right.
- Default `open = true`.
- Persists open/closed in `localStorage` under key `dashboard.gameplan.open` (mirrors the pattern used elsewhere for `selectedSport`).
- Collapsed state: shows only the header row (no extra "compact summary" — keeps scope minimal and avoids duplicating GamePlanCard logic). When users want details, one tap expands the full card.
- Expanded state: renders `<GamePlanCard selectedSport={selectedSport} />` unchanged inside `CollapsibleContent` with the existing collapsible-down/up animation classes already used by `IdentityCommandCard`.

Replace the current `<GamePlanCard selectedSport={selectedSport} />` line in `Dashboard.tsx` with `<GamePlanCollapsible selectedSport={selectedSport} />`.

## 3. Mobile-first behavior

- `CommandCenterSection` already uses `grid-cols-1 md:grid-cols-2`, so on the 1330px and mobile viewports the four big organism cards stack cleanly and appear immediately under the identity header.
- The collapsible Game Plan header becomes a short, thumb-reachable row, eliminating the long stretch of Game Plan content that previously pushed everything else below the fold.
- No new sticky elements, no horizontal scroll.

## 4. Out of scope (unchanged)

- `/today`, `/command`, projections, replay, lineage, ASB events, confidence, capability gates, runtime emitters, parity tests, GamePlanCard internals, scout/coach Game Plan, IdentityCommandCard, QuickActionsCard.

## Files touched

- `src/pages/Dashboard.tsx` — add import, mount `CommandCenterSection`, swap `GamePlanCard` for `GamePlanCollapsible`.
- `src/components/dashboard/GamePlanCollapsible.tsx` — new wrapper.

## Verification

- Visit `/dashboard` on the 1330px viewport and on a mobile viewport (375×812): Command Center heading + organism cards visible in the first viewport above Game Plan.
- Toggle Game Plan: collapses to header-only, expands back to full card; preference survives a reload.
- No console errors; existing tests untouched since logic surfaces are unchanged.
