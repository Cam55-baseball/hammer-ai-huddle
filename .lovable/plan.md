# Consolidate Above-Game-Plan Messages into One Identity Command Card

## The problem

Today, the area above the Game Plan stacks **six separate components** that all pile onto the screen on first load:

1. `TodayCommandBar` (Hammer state + readiness + Next Up + Log Now)
2. `IdentityBanner` (identity tier + consistency score + streaks + Rest button)
3. `BehavioralPressureToast` (e.g. "Non-negotiables still open today")
4. `DailyStandardCheck` ("Operating at X standard?" — no explanation of what it means or what tapping Confirm does)
5. `DayControlCard` (Rest / Skip / Push buttons + weekly budget + recurring schedule)
6. `DayStateBanner` (a second small banner restating Rest/Skip/Push)
7. `StandardActivationBanner` ("You have a standard today")

That's noisy, redundant (Day state shown twice; pressure + activation often say overlapping things), and the "Operating at standard?" prompt has zero context. Mobile users (440px) see a wall of cards before any actual to-do appears.

## What we'll build

One **Identity Command Card** directly above the Game Plan. Collapsed by default once the user has scrolled it once today; opens with a single tap.

### Collapsed header (always visible — the only persistent strip)

A single row:

```text
[ Tier dot ]  ELITE          Consistency 87        ▾
              3d perf · 5d active · 1 NN open
```

- Left: identity tier label, color tone, small streak chips.
- Right: consistency score, expand chevron.
- If there's an unacknowledged high-priority pressure event (NN miss, streak risk, tier slip), a small pulsing dot shows next to the chevron — never an extra banner.

### Expanded panel (one tap)

Single `Collapsible` with four clearly-titled sections, each with its own short explainer:

1. **Today's standard** — "You're being held to the **Elite** standard today. Tap Confirm to lock in that you're operating at it. Skipping logs a light pressure event."
   - Confirm button (replaces the standalone DailyStandardCheck card).
   - Once confirmed, this section collapses to a green "✓ Standard confirmed for today" line.

2. **Day intent** — Rest / Skip / Push 3-button row + one-line explainer for the active state + weekly rest budget pill + collapsed "Recurring rest schedule".
   - Replaces both `DayControlCard` and `DayStateBanner` (no more duplicate banner above the game plan; the active state already shows up as a pill in the collapsed header AND inside this panel).

3. **Active alerts** — Behavioral pressure messages (NN miss, streak risk, etc.) rendered inline here with their action buttons. Replaces the floating `BehavioralPressureToast` and the `StandardActivationBanner`. Empty state: "All clear. Standard intact."

4. **Quick actions** — Hammer state badge + readiness chip + Next Up + Log Now (the existing `TodayCommandBar` content), tucked at the bottom of the panel.
   - Removes the standalone `TodayCommandBar` from above the Identity card.

### Auto-open vs collapsed behavior

- **First visit of the day** OR **any unread pressure event** OR **standard not yet confirmed** → expanded by default. The user sees everything once.
- After the user confirms standard / dismisses alerts → collapsed. State persists per-day in `safeStorage` (key `hm:identityCard:lastCollapsed`).
- On day rollover, re-expand automatically (same pattern `StandardActivationBanner` already uses).

### "Operating at X standard?" — fixing the missing context

Inside the **Today's standard** section, render a 2-line explainer above the Confirm button:

> Your tier is **Elite**. Confirming declares you're holding yourself to it today. The engine uses this to weight your day: a confirmed standard with met NNs locks the streak; a confirmed-but-missed day applies pressure.

Plus a small "What is this?" link that opens a tooltip with one more sentence on consequences. No more naked prompt.

## Files

**New:**
- `src/components/identity/IdentityCommandCard.tsx` — the consolidated card (header + collapsible panel + 4 sections).

**Edited:**
- `src/pages/Dashboard.tsx` — remove `TodayCommandBar`, `IdentityBanner`, `DayControlCard`, `DayStateBanner`, `StandardActivationBanner` from the above-game-plan stack. Replace with single `<IdentityCommandCard />`.

**Reused (no changes):**
- `useIdentityState`, `useDayState`, `useDailyOutcome`, `useBehavioralEvents`, `useNextAction`, `useQuickActionExecutor`.
- Existing sub-pieces composed inline: `HammerStateBadge`, `ReadinessChip`, `RestDayButton` (Rest button absorbed into the Day intent row), `QuickLogSheet`.

**Deleted/orphaned (kept on disk for now, no longer mounted on Dashboard):**
- `IdentityBanner.tsx`, `DailyStandardCheck.tsx`, `BehavioralPressureToast.tsx`, `StandardActivationBanner.tsx`, `DayControlCard.tsx`, `DayStateBanner.tsx`, `TodayCommandBar.tsx`.
  These remain importable for other pages (e.g. `ProgressDashboard`) so we don't break anything outside Dashboard. We just stop mounting them on Dashboard.

## What this does NOT change

- Game Plan row UI, NN detail dialog, NN timer, Hammer engine, evaluator function, behavioral events table — all untouched.
- Coach / Scout dashboards — the stack only mounts for athletes today, same gating preserved.
- Hooks and data sources — same hooks, same data, just one container.

## Why this works for retention

- **One thing to look at**: athletes open the app and see one identity card + their game plan. No wall of red banners.
- **Every prompt explains itself**: "Operating at Elite standard?" becomes "Your tier is Elite. Confirming declares you're holding yourself to it today. Here's why it matters."
- **Active alerts surface in context**: pressure messages live next to the standard they reference, not as floating toast clutter.
- **Day intent is one-stop**: rest/skip/push live where the user already opened the card to act, and the duplicate banner above the Game Plan is gone.

