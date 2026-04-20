

## Plan — Keep Merch box pinned below Game Plan

### Problem
When `moduleCardsSection` was extracted in the previous change, the Merch card was included in that block. Now for unsubscribed users the Merch box moves up above the Game Plan along with the three module cards. The user wants Merch to always stay below the Game Plan regardless of subscription state.

### Change — `src/pages/Dashboard.tsx`

1. Split the extracted `moduleCardsSection` into two pieces:
   - `moduleCardsSection` — Sport Selector + the three tier cards (Complete Pitcher, 5Tool Player, Golden 2Way) only.
   - `merchSection` — the Merch card on its own.

2. Render placement:
   - `moduleCardsSection`: above Game Plan when `!hasAnyTier`, below Game Plan when `hasAnyTier` (current conditional logic — unchanged).
   - `merchSection`: always rendered in a fixed position **below the Game Plan** (and below `moduleCardsSection` when that block is also below). Not wrapped in any `hasAnyTier` conditional.

### Out of scope
- No changes to Merch card content, styling, or link target.
- No changes to module card behavior or Game Plan.
- No changes to coach/scout layout.

### Verification
1. Unsubscribed user on `/dashboard`: three module cards appear above Game Plan; Merch box stays below Game Plan.
2. Subscribed user: module cards and Merch box both appear below Game Plan (current order preserved).
3. Owner/admin: same as subscribed — unchanged.

