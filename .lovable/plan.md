# Add Game IQ 101 to the Complete Pitcher tier

## What's happening today

- `/iq` (Game IQ 101) has no subscription gate — anyone routed to it can use it.
- The `/complete-pitcher` landing page already shows a "Pitcher Game IQ" tile that deep-links to `/iq?lens=pitching&sport=…`.
- The **sidebar** block for the Complete Pitcher tier (`src/components/AppSidebar.tsx` lines 215–228) does NOT list Game IQ 101 or Baserunning IQ. Only the 5Tool and Golden 2Way blocks list them. That's why a pitcher-only subscriber feels like they don't have it — the nav never exposes it.

This applies equally to baseball and softball, since the link uses the current `selectedSport`.

## Change

In `src/components/AppSidebar.tsx`, inside the Complete Pitcher block (`if (showAll || hasPitcherTier || hasGolden || hasLegacyPitching)`), append two sub-modules to match the other tiers:

- `Game IQ 101` → `/iq?lens=pitching&sport=${selectedSport}` (Brain icon) — pitcher-focused lens by default, but full library available via tabs.
- `Baserunning IQ` → `/baserunning-iq` (Brain icon) — pitchers need to read runners too.

No gating, route, or backend changes needed; the page is already accessible and the pitcher lens already exists.

## Verification

- Load `/complete-pitcher` sidebar as a pitcher-tier user → both entries visible.
- Click Game IQ 101 → lands on `/iq?lens=pitching` with situations filtered to pitching scenarios.
- Confirm baseball and softball both render their respective situations (existing `sportFilter` in `useIqSituations`).
