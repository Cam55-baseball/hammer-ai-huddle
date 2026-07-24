## Hammers Today Plan — Reorder + Dropdown/Glow overhaul

### New card order (top → bottom inside HammerDailyPlan)

```text
1. Schedule & What Changed   (dropdown, starts CLOSED, clearly labeled)
2. Today's Wisdom            (its own card)
3. Human Performance Intel   (dropdown, starts CLOSED, GLOWS until opened today)
4. Start Line                (dropdown, starts CLOSED, GLOWS until opened today, header renamed)
5. Ask Hammer — Recall & Clarity   (unchanged link card)
6. Weekly Roadmap Strip + Do-in-this-order strip
7. All prescribed cards       (each has a dropdown arrow)
```

### 1. Schedule & What Changed card
- Wrap `HammerScheduleStrip` in a `Collapsible` (starts closed, per-day localStorage key `hammer.today.schedule.open.<YYYY-MM-DD>`).
- Trigger label: **"Schedule & What Changed"** with `CalendarClock` icon + subtext "Games, season dates, cancels/reschedules, and tell Hammer what changed." Chevron rotates open.
- Move the whole block to the very top of `HammerDailyPlan` `CardContent`, above everything else.

### 2. Today's Wisdom card (new, extracted)
- Extract the "Today's wisdom" tile currently living inside `HumanPerformanceCard` (uses `pickTodaysTip(resolvedPhase)`) into a new lean component `TodaysWisdomCard.tsx`.
- Render it as a normal (non-collapsible) card directly below the Schedule dropdown and directly above HPI.
- Remove that block from `HumanPerformanceCard`.

### 3. Human Performance Intelligence card
- Rewrap `HumanPerformanceCard` in a `Collapsible` (starts closed).
- Header stays visible: icon + "Human Performance Intelligence" + phase/element/yin-yang subline + score badge on the right, chevron on the far right.
- **Glow until first opened today.** Add `useOpenOnceToday("hpi")` hook that reads/writes `hammer.today.glow.hpi.<YYYY-MM-DD>` in localStorage. While unread, the card wears a `ring-2 ring-primary/50 animate-pulse-glow` class; opening it (or explicitly acknowledging) clears the flag for the day.
- Add a shared `pulse-glow` keyframe in `tailwind.config.ts`/`index.css` (subtle primary-tinted ring pulse, ~2s cycle).

### 4. Start Line (DailyIntentHeader)
- Already `defaultOpen={false}`. Update the header content so it is unmistakably labeled:
  - Add a small uppercase eyebrow **"Start Line"** above `intent.headline` inside the trigger.
- Apply the same `useOpenOnceToday("startline")` glow treatment on the outer container until it's opened for the day.

### 5. Ask Hammer — Recall & Clarity
- Keep the existing link card as-is; just ensure it sits directly under Start Line.

### 6. Prescribed task cards — dropdown arrow on every one
Cards already collapsible (keep): `BlockCard`, `WkPrescriptionCard`.

Add a Collapsible + chevron to those that currently render flat:
- `WkSpeedCard`
- `WkBatSpeedCard`
- `WkLiftsCard`
- `WkConditioningCard`
- `HammerCheckInCard`
- `WarmupCrossoverAddons` (the "Finish the warm-up — crossover primer" wrapper)

For each: wrap the existing header (title + badges + right-side action) in a `CollapsibleTrigger` row that shows a `ChevronDown` that rotates on open. The body (drills / prescription / quiz opener) becomes `CollapsibleContent`. Preserve every existing button (Complete/Skip, Log, Start check-in, etc.). Default `open` for these prescribed cards stays **true** (only HPI + Start Line + Schedule start closed per the user's asks).

### Dashboard cleanup
- `src/pages/Dashboard.tsx` (`DashboardTodayPlan`): remove the standalone `<HumanPerformanceCard />` and `<TodaysHammerPick />` reorder is unchanged. HPI now lives only inside `HammerDailyPlan` in its new position, so it isn't duplicated.

### Technical details
- New util hook: `src/hooks/useOpenedOnceToday.ts` — returns `{ shouldGlow, markOpened }`, keyed by `hammer.today.glow.<id>.<YYYY-MM-DD>`.
- New CSS animation `pulse-glow` in `src/index.css` (`@keyframes` + utility class) — soft ring pulse using `hsl(var(--primary) / …)` so it respects theme tokens (no hardcoded colors).
- Files touched:
  - `src/components/hammer/HammerDailyPlan.tsx` (reorder + wrap check-ins + WarmupCrossoverAddons + add Schedule dropdown wrapper + Start Line label + glow trigger)
  - `src/components/hammer/DailyIntentHeader.tsx` (Start Line eyebrow + glow hook)
  - `src/components/hpi/HumanPerformanceCard.tsx` (remove wisdom tile, add Collapsible + glow hook)
  - `src/components/hammer/TodaysWisdomCard.tsx` (new)
  - `src/components/hammer/WkSpeedCard.tsx`, `WkBatSpeedCard.tsx`, `WkLiftsCard.tsx`, `WkConditioningCard.tsx`, `HammerCheckInCard.tsx` (add Collapsible + chevron header)
  - `src/hooks/useOpenedOnceToday.ts` (new)
  - `src/index.css` (pulse-glow keyframes)
  - `src/pages/Dashboard.tsx` (remove duplicate HPI mount)

### Out of scope
- No changes to plan generation, prescription logic, or backend.
- No visual redesign of the prescribed card interiors — only the header gains a chevron and the body becomes collapsible content.
