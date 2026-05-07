## Goals

Frontend-only polish + one bug fix on the Dashboard / Game Plan area. No business logic, no engine changes.

1. **QuickActionsCard** — make it visually pop (it's the user's primary "what's next" CTA but currently looks like a flat outlined box).
2. **IdentityCommandCard** — fix readability (low-contrast text on gradient background) and make it more visually appealing.
3. **PhysioNightlyReportCard** — fix near-unreadable text on the dark card background (component-score numbers, labels, headline copy).
4. **Bug:** the "0/2 Non-Negotiables done today — tap to view" link in `StandardAwarenessHeader` does nothing when tapped.

---

## 1. QuickActionsCard (`src/components/identity/QuickActionsCard.tsx`)

Currently: muted card, small text, low hierarchy.

Changes:
- Replace the flat `border-zinc-900 bg-card/60` shell with a gradient surface using design tokens (e.g. `bg-gradient-to-br from-primary/15 via-card to-card`) plus a subtle glowing ring (`ring-1 ring-primary/30 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.4)]`).
- Promote the "Next up" line: larger, bolder, semantic foreground; add a small Hammer/Target icon accent.
- Make the primary CTA button (`{next.ctaLabel}`) visually dominant: solid primary, slightly larger, with a hover lift. Demote the "Log" button to secondary outline with an icon-only feel on small screens.
- Keep `HammerStateBadge` + `ReadinessChip` but place them inside a thin top "status row" above the action area for clearer hierarchy.
- Add a subtle pulse on the CTA when `next.label` is a fresh recommendation (purely CSS, no logic change).

## 2. IdentityCommandCard (`src/components/identity/IdentityCommandCard.tsx`)

Currently: tier-tinted gradient + small `text-muted-foreground` everywhere — eyebrow and helper text wash out, especially in Hammer/Champion tiers.

Changes (visual only — keep all logic, hooks, and structure intact):
- Lighten the gradient overlay so foreground text always meets contrast: replace `bg-gradient-to-br` with a layered approach (`bg-card` base + lower-opacity tier accent overlay), and bump tone classes to `text-foreground` / `text-foreground/80` instead of `text-muted-foreground` for headline and chip text.
- Add a stronger top border accent in the tier color (e.g. 2px top border using the `tone` color), giving identity instantly readable even at a glance.
- Increase the consistency score's contrast: render on a small dark "scoreboard" pill (`bg-background/80 ring-1 ring-border`) so the big number is always legible on any tier gradient.
- Streak chips: bump from `bg-background/60` to `bg-background/90` and use `text-foreground` so they stop disappearing on tinted backgrounds.
- Inside expanded sections, change copy text from `text-muted-foreground` to `text-foreground/85` for the explainer paragraphs (Today's Standard, Day Intent).
- Keep all section structure, buttons, and behavior identical.

## 3. PhysioNightlyReportCard (`src/components/physio/PhysioNightlyReportCard.tsx`)

The colored gradient header is fine, but the card body inherits the dark `Card` background and the muted/mono text under each emoji bar plus the disclaimer is nearly invisible.

Changes:
- Switch `Card` shell to a slightly lighter surface: `bg-card` → `bg-card/95` with `border-border` instead of `border-border/50`, and brighten `CardContent` text defaults (wrap in a `text-foreground` container).
- Component-score grid (the 7-tile bar): label emoji stays, but bump tile background from `bg-muted/30` to `bg-muted/60`, and change the score number under each tile from `text-muted-foreground` to `text-foreground font-bold`.
- Headline: change to `text-foreground` (already mostly is) but bump font weight and line-height for readability.
- Disclaimer block at the bottom: replace `bg-muted/20` + `text-muted-foreground` with `bg-muted/50` + `text-foreground/80` so it stops melting into the background.
- Inside `ReportSectionCard`: change the three info blocks (Why / What To Do / How It Helps) — bump `bg-muted/30`, `bg-muted/20` → `bg-muted/50` and ensure all body copy is `text-foreground` (not inherited muted).

## 4. Bug fix — "tap to view" does nothing

Source: `src/components/GamePlanCard.tsx` ~line 1789. The handler does:

```ts
onJumpToNN={() => {
  const el = document.getElementById('nn-section');
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}}
```

Failure modes:
- `nn-section` is rendered only when `sortMode !== 'timeline'` AND `!hideNN` AND `nnTasks.length > 0` (line 2407). If a user has NN templates but none of them happen to be in today's `customTasks` list (different schedule, archived for today, etc.), the anchor never exists → silent no-op. This matches the user's "0/2" complaint: total = 2 (templates), but the NN sub-section may render zero rows or not at all.
- In timeline mode the entire `nn-section` is never rendered.

Fix:
- Add stable secondary anchors: also tag the Custom Activities header (`<h3>` around line 2353) with `id="custom-activities-section"`, and mark the timeline section header (line 2219) with `id="timeline-section"`.
- Update `onJumpToNN` to:
  1. Try `nn-section` first.
  2. Fallback to `custom-activities-section` (or `timeline-section` when in timeline mode).
  3. If still nothing found, show a small `toast` ("No Non-Negotiables set yet — tap the flame on any activity to lock it in.") so the click never feels broken.
- Same two-line update for the older duplicate handler at line 1250.

No data changes, no engine changes — purely a frontend reliability fix and visual polish.

---

## Files touched

- `src/components/identity/QuickActionsCard.tsx` — visual refresh
- `src/components/identity/IdentityCommandCard.tsx` — contrast + visual refresh (logic untouched)
- `src/components/physio/PhysioNightlyReportCard.tsx` — readability pass
- `src/components/GamePlanCard.tsx` — fix `onJumpToNN` handlers (2 sites) + add 2 anchor ids

## Verification

- Load `/dashboard` and visually confirm: QuickActions stands out, Identity card text is legible across tiers, Physio card body is readable.
- With NN total > 0 and zero NN rows in today's plan, click "tap to view" → page scrolls to Custom Activities and shows the helper toast.
- With NN rows present, click → smooth scroll to NN section as before.
