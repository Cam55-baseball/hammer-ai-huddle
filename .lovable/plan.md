## Goal

Activity rows in the Game Plan currently feel crammed on phones because the title, badges, description, NN copy, drag handle, lock-in button, edit, send-to-coach, and check button all compete for a narrow row. Fix this purely on mobile (≤ `sm`) without changing tablet/desktop appearance or any logic.

## Problems observed in `GamePlanCard.tsx` (`renderTask`, lines ~1151–1474)

1. Row uses `gap-3` and `p-3` on mobile — combined with up to 5 right-side icon buttons, the title block gets squeezed to a tiny column.
2. Title (`text-sm`) and description (`text-xs`) sit very close with no real line spacing, and `line-clamp-2` + multiple inline badges wrap awkwardly.
3. NN block stacks 3 paragraphs (purpose / action / done-when) at `text-[11px]` / `text-[10px]` — unreadable on phones.
4. Time badge overlaps the title area because of `right-12` + `pt-8`, eating vertical room.
5. Icon tile (`p-2`) plus drag handle take ~80px before the title even starts.

## Changes (mobile-only, all in `src/components/GamePlanCard.tsx`)

### 1. Row container
- Reduce horizontal gap on mobile: `gap-2 sm:gap-4` (was `gap-3 sm:gap-4`).
- Slightly more breathing room vertically: `px-3 py-3 sm:p-4` instead of `p-3 sm:p-4`.
- Increase top padding when time badge is shown: `pt-9 sm:pt-8` so the badge stops crowding the title.

### 2. Drag handle
- Make it smaller on mobile so the title gets more room: `h-4 w-4 sm:h-5 sm:w-5`.

### 3. Icon tile
- Tighten on mobile: `p-1.5 sm:p-2.5` and `h-4 w-4 sm:h-6 sm:w-6` for the icon (was `p-2 sm:p-2.5`, `h-5 w-5 sm:h-6 sm:w-6`).

### 4. Title + badges block
- Title: bump readability with `text-[15px] leading-snug sm:text-base` and keep `line-clamp-2`.
- Switch the badge row from `gap-2 flex-wrap` to `gap-1.5 sm:gap-2 flex-wrap` and add `mt-0` so badges hug the title.
- Cap badge text at `text-[9px] sm:text-[10px]` so chips don't force the title onto a 3rd visual line on phones.

### 5. Description line
- Change description from `text-xs sm:text-sm line-clamp-1` to `text-[12px] leading-snug sm:text-sm line-clamp-2 mt-0.5` so it's readable and can use a second line when there's room (still clamped).

### 6. NN structured body (purpose / action / done-when)
- Purpose: `text-[12px] leading-snug sm:text-xs`.
- Action: `text-[13px] leading-snug sm:text-sm font-medium`.
- Done-when: `text-[11px] leading-snug sm:text-[11px]`.
- Add `space-y-1.5 sm:space-y-1` so the three lines visually separate on mobile.

### 7. Right-side controls — collapse on mobile
Mobile rows currently render up to: drag, NN flame, edit, send-to-coach, check. That's the root cause of the cramped title.

- Hide the **inline NN "Lock In" button** on mobile (`hidden sm:flex`). The same toggle is reachable from the activity detail; on mobile we only keep the red flame badge in the title row as the NN signal.
- Hide the **Send-to-Coach** button on mobile (`hidden sm:inline-flex`). It remains accessible from the activity detail / edit screen.
- Keep Edit and the Check/Status button visible on mobile (these are the primary actions).
- Shrink the Edit button on mobile: `h-7 w-7 sm:h-8 sm:w-8` with `h-3.5 w-3.5 sm:h-4 sm:w-4` icon.

### 8. Time badge
- Shrink and reposition slightly on mobile so it doesn't crash into the check button: `top-1 right-2 sm:right-12` and `text-[9px] sm:text-[10px]`.
- On mobile, since it sits on its own line above (already accounted for via `pt-9`), this prevents the previous overlap with the action buttons.

### 9. Section headings (`renderTaskSection`)
- Tighten heading on mobile: `text-[11px] sm:text-xs` and `tracking-wider sm:tracking-widest` so the "PRE-PRACTICE / TRAINING" dividers stop dominating narrow screens.

## Out of scope
- No changes to data, ordering, completion logic, persistence, or any hooks.
- No changes to tablet (`sm:`) or desktop styles beyond what's listed.
- No changes to icons, colors, or NN behavior — purely typography, spacing, and mobile-only visibility of two secondary buttons.

## Files touched
- `src/components/GamePlanCard.tsx` (only)

## QA checklist after build
- 360–414px width: title is readable (no cramped 3-line wrap from badges), description has room, action buttons don't overlap the time badge.
- ≥640px (`sm`): layout is visually identical to today (NN Lock-In and Send-to-Coach buttons reappear, sizes match current).
- Completed state still shows strikethrough title and green check.
- NN cards still show purpose / action / done-when, just with better spacing on phones.
