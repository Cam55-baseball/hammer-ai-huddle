Add a multi-select level filter to the Defensive Drill Library and replace the age-based level labels with Beginner / Intermediate / Advanced / Expert.

What we’ll build
- A level filter dropdown next to the position filter on `/drill-library`.
- Multi-select: users can pick any combination of Beginner, Intermediate, Advanced, Expert.
- Position filter stays as the existing single-select chip row; it works together with the level filter (intersection).
- Drill card level badges will show the new labels instead of Youth / Middle School / High School / College.
- No database migration — we’ll map the existing `difficulty_levels` array values (`beginner`, `intermediate`, `advanced`, `elite`) to the requested display labels.

Technical plan
1. Create a small level label module `src/utils/drillLevelLabels.ts`.
   - `LEVEL_ORDER = ['beginner', 'intermediate', 'advanced', 'elite']`
   - `LEVEL_LABELS: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', elite: 'Expert' }`
   - Helpers: `getLevelLabel(key)` and `getDrillLevelLabel(difficultyLevels)` that returns the lowest present level label.

2. Update `src/hooks/usePlayerDrillLibrary.ts`.
   - Remove the automatic `progression_level` range restriction from the Supabase query so the full library is available for filtering.
   - Add state: `selectedLevels: string[]` and `setSelectedLevels`.
   - Compute `availableLevels` from the distinct `difficulty_levels` values across loaded drills.
   - Update `filteredDrills` memo:
     - Position filter unchanged (single canonical match).
     - New level filter: if `selectedLevels` is non-empty, keep only drills whose `difficulty_levels` intersect with it.
   - Expose `clearFilters` and selected level state.

3. Update `src/pages/DrillLibraryPlayer.tsx`.
   - Add a new level filter dropdown using `Popover` + `Checkbox` components.
   - Trigger shows selected labels or a count (e.g., “2 levels”).
   - Add a “Clear filters” button when position, level, or search is active.
   - Replace the card level badge from `getProgressionLabel(drill.progression_level)` to `getDrillLevelLabel(drill.difficulty_levels)`.
   - Keep the sort dropdown (Recommended / By Level / Recently Added) untouched.

4. Verify manually.
   - Open the library on the preview.
   - Select one level, multiple levels, combine with a position, and confirm the displayed level badges read Beginner / Intermediate / Advanced / Expert.

Files expected to change
- `src/utils/drillLevelLabels.ts` (new)
- `src/hooks/usePlayerDrillLibrary.ts`
- `src/pages/DrillLibraryPlayer.tsx`

No backend changes required.