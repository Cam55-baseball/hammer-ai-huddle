## Goal

Reduce visual overwhelm on the dashboard with three small UI-only edits.

## Changes

### 1. Weekly Recap + What's Likely Next — side-by-side on every viewport
`src/pages/Dashboard.tsx` (line 540): change grid from `grid-cols-1 sm:grid-cols-2` to `grid-cols-2` and reduce gap to `gap-2 sm:gap-3` so the two boxes always sit next to each other (including the current 390px mobile view where they're stacking today).

Inside `WeeklyDigestPreview.tsx` and `ForecastPreview.tsx`: tighten padding to `p-3 sm:p-4` and headers to `text-[11px]` so the side-by-side cards stay readable on narrow screens. No data/logic changes.

### 2. Darker border around "How your body is doing today"
`src/components/command/CommandCenterSection.tsx`: wrap the existing `<section>` body with a card frame — add `rounded-2xl border-2 border-foreground/25 bg-card p-4 sm:p-5` to the section element. The internal Collapsible/cards stay unchanged.

### 3. Smaller "Your Next Best Step" card
`src/components/dashboard/CommunicationAI.tsx` (lines 241–303): reduce visual weight without removing content:
- Outer padding `p-6 sm:p-8` → `p-4 sm:p-5`
- Remove the decorative blurred blob (`-top-16 -right-16 ... blur-3xl`)
- Soften shadow to `shadow-sm`
- Title `text-2xl sm:text-3xl` → `text-lg sm:text-xl`
- Header margin `mb-5` → `mb-3`, body `space-y-3` → `space-y-2`
- Button `size="lg"` → default size, top margin `mt-6` → `mt-4`

## Out of scope

Game Plan, Identity Card, Command Center card internals, module cards, data hooks, routing — all untouched.
