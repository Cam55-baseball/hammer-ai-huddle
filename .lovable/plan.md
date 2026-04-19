

## Plan — Consolidate Favorites, Quick Actions, and Supplements as Dropdowns inside Log Meal Card

### Goal
Reduce the Nutrition Hub's vertical clutter by collapsing three sibling sections into dropdowns nested inside the existing `LogMealCard`, joining the existing "Quick Pick Foods" collapsible.

### Changes

**1. `src/components/nutrition-hub/LogMealCard.tsx` — extend with 3 new collapsibles**
Add three new `Collapsible` sections below "Quick Pick Foods", each defaulting to closed and styled identically (full-width outline button trigger with chevron):
1. **Favorites** — renders `<FavoriteFoodsWidget onQuickAdd={...} />` content (pass through prop).
2. **Quick Actions** — renders `<QuickLogActions ... />` (hydration / barcode / photo) (pass all needed props through).
3. **Vitamins & Supplements** — renders `<VitaminSupplementTracker ... />` (pass needed props through).

Update the component's prop interface to accept the additional handlers and data the nested widgets need (e.g., `onQuickAddFavorite`, `quickActionsProps`, `supplementsProps`) — or, simpler, accept ready-built React nodes as props (`favoritesSlot`, `quickActionsSlot`, `supplementsSlot`) so the parent stays the data owner and `LogMealCard` only handles layout/state for the collapsibles.

Preferred approach: **slot props** (`favoritesSlot?: ReactNode`, `quickActionsSlot?: ReactNode`, `supplementsSlot?: ReactNode`) — keeps `LogMealCard` decoupled from each widget's API.

Each new collapsible reuses the same trigger pattern as Quick Pick Foods:
- Outline button, full width, `justify-between`, ChevronDown that rotates 180° when open.
- Distinct icon per section: `Star` (Favorites, amber), `Zap` (Quick Actions, blue), `Pill` (Supplements, purple).
- Hide a section entirely if its slot prop is not provided (so Favorites still auto-hides when there are no favorites — `FavoriteFoodsWidget` already returns `null` in that case, so we'll wrap the trigger in a check or let the parent omit the slot).

**2. `src/components/nutrition-hub/NutritionHubContent.tsx` — remove standalone renders, pass as slots**
- Remove the standalone `<FavoriteFoodsWidget />`, `<QuickLogActions />`, and `<VitaminSupplementTracker />` siblings from the section stack.
- Pass them into `<LogMealCard />` as `favoritesSlot`, `quickActionsSlot`, `supplementsSlot` props.
- New section order:
  1. Daily Targets
  2. **Log Meal** (with nested: meal types → Quick Pick Foods → Favorites → Quick Actions → Supplements)
  3. Physio suggestions
  4. Tabs (Today / Weekly / Planning / Shopping / Recipes)
  5. Weight Tracking

### Out of scope
- No changes to the underlying `FavoriteFoodsWidget`, `QuickLogActions`, or `VitaminSupplementTracker` component internals or behavior.
- No data/schema changes.
- Hydration tracker header widget untouched.

### Verification
- `/nutrition-hub` on 390px mobile: only the Log Meal card is visible between Daily Targets and Physio. Tapping each dropdown reveals its widget. All existing flows (favorite quick-add, hydration, barcode/photo, supplement logging, recipes from tab) still work.

