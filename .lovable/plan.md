

## Mobile UI Fixes — Activities Tabs & Calendar Day Sheet Close Button

Two scoped, mobile-only changes. No logic touched.

### 1. My Activities tab icons too small on mobile
**File:** `src/pages/MyCustomActivities.tsx` (lines 126–144)

On mobile the tab labels are hidden (`hidden sm:inline`), leaving only a tiny `h-4 w-4` icon — users can't tell tabs apart.

**Change:**
- Bump icon size on mobile: `h-4 w-4` → `h-6 w-6 sm:h-4 sm:w-4`
- Increase tap target: `TabsList` height `h-12` → `h-14 sm:h-12`
- Increase trigger horizontal padding on mobile: `px-3 sm:px-4` → `px-4 sm:px-4`
- Keep desktop (≥sm) appearance identical.

Result: large, clearly-distinguishable icons on phones; desktop unchanged.

### 2. Calendar day-view close button too small on mobile
**File:** `src/components/ui/sheet.tsx` (line 60–63)

The shadcn `Sheet` close button is `h-4 w-4` with no padding — ~16px hit area, well below the 44px iOS/Android touch target minimum. This is the "X" the user can't tap when viewing a specific calendar day.

**Change (mobile-first, desktop-safe):**
- Wrap close button with a real touch target: add `p-2 sm:p-1` and bump icon to `h-6 w-6 sm:h-4 sm:w-4`.
- Move slightly inward on mobile so it's not flush against the edge: `right-4 top-4` → `right-3 top-3 sm:right-4 sm:top-4`.
- Keep `opacity-70 hover:opacity-100` styling intact.

This is a global Sheet change but it only enlarges the close hit-area — every Sheet in the app benefits, and desktop sizing stays the same at the `sm:` breakpoint. No other Sheet behavior changes.

### Verification
- On mobile viewport (375px): Activities tabs show clearly readable icons; Sheet close button is comfortably tappable.
- On desktop (≥768px): No visible difference.

