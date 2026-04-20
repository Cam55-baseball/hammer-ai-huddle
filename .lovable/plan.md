

## Plan — Show module cards above Game Plan for unsubscribed users

### Behavior
- **No tier purchased** (no `pitcher`, `5tool`, or `golden2way` in subscribed modules): module cards render **above** the Game Plan so the upgrade path is the first thing the user sees.
- **At least one tier purchased**: module cards render **below** the Game Plan (current behavior).
- Owners/admins keep the current order (treated as "subscribed").

### Change — `src/pages/Dashboard.tsx`

1. Compute a flag near the existing tier logic (line ~70):
   ```ts
   const hasAnyTier = isOwner || isAdmin || activeTier !== null;
   ```

2. Extract the **Module Cards** block (lines ~450–560, the `<div className="grid ... module-cards">` containing the three tier `<Card>`s, including the Sport Selector row at lines 429–448 that contextually belongs with them) into a local `const moduleCardsSection = (...)` variable just before the `return`. Keep the Sport Selector tied to the module cards since it controls which tier prices/routes they target.

3. In the JSX, render conditionally:
   - If `!hasAnyTier`: render `{moduleCardsSection}` **before** the Game Plan block (after the Hero card, line 383).
   - If `hasAnyTier`: render `{moduleCardsSection}` in its current position **after** the Game Plan block.

   Implemented with two placements wrapped in `{!hasAnyTier && moduleCardsSection}` and `{hasAnyTier && moduleCardsSection}`.

### Out of scope
- No change to coach/scout dashboard layout (`CoachScoutGamePlanCard` path unchanged).
- No change to the module cards' content, styling, locked/unlocked treatment, or click handlers.
- No change to `ModuleManagementCard` or any other dashboard section ordering.

### Verification
1. Brand-new user with no subscriptions on `/dashboard`: module cards (Complete Pitcher / 5Tool / Golden 2Way) appear directly under the hero, above the Game Plan.
2. Purchase any one tier → refresh access → module cards move below the Game Plan.
3. Owner/admin account: module cards remain below the Game Plan.
4. Coach/scout view: layout unchanged.

