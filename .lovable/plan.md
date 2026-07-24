## Goal
Every prescribed card on Hammer's Today Plan starts collapsed with a dropdown chevron, matching the pattern already used by BlockCard (Hitting, Throwing, Baserunning, Recovery, Warm-up).

## Current state
- **BlockCard** (Hitting, Throwing, Baserunning, Recovery, Warm-up, other sport blocks) — already `useState(false)` with chevron. No change needed.
- **WkSpeedCard, WkBatSpeedCard, WkLiftsCard, WkConditioningCard** — currently `useState<boolean>(true)` (start OPEN). Need to flip default to closed.
- **WarmupCrossoverAddons** (crossover primer wrapper in `HammerDailyPlan.tsx`) — currently `useState<boolean>(true)`. Need to flip default to closed.
- **WkPrescriptionCard** (individual prescribed rows inside the crossover primer / other Wk containers) — already `useState(false)`. No change.

## Changes
1. `src/components/hammer/WkSpeedCard.tsx` — line 37: `useState<boolean>(true)` → `useState<boolean>(false)`.
2. `src/components/hammer/WkBatSpeedCard.tsx` — line 43: same flip.
3. `src/components/hammer/WkLiftsCard.tsx` — line 110: same flip.
4. `src/components/hammer/WkConditioningCard.tsx` — line 41: same flip.
5. `src/components/hammer/HammerDailyPlan.tsx` — `WarmupCrossoverAddons` (line 622): same flip.

All five cards already render a `ChevronDown` inside their `CollapsibleTrigger`, so no markup work is needed — flipping the default state gives the user the "starts closed, dropdown arrow" behavior consistently across every task card on Hammers Today.

## Not touching
- Check-in cards (Morning / Pre-lift / Night quiz launchers) — these are single-tap launchers, not collapsible cards, so leaving them as-is preserves their intended one-click flow.
- BlockCard header behavior — chevron + closed default already correct.
- Wisdom / HPI / Start Line / Schedule / Ask Hammer — already closed with chevrons from prior work.