
# Extreme Polish Work & Testing Plan
## Elite Workout & Running Card System - Final Phase

This plan focuses on ensuring production-ready quality through comprehensive polishing, testing, and verification of the complete Elite Workout & Running Card System.

---

## Current Implementation Status

### Components Verified Complete:
- BlockContainer, BlockCard, BlockTypeSelector with drag-and-drop
- EnhancedExerciseCard with advanced fields panel
- CNSLoadIndicator and ViewModeToggle
- RunningCardBuilder with intent-driven architecture
- PresetLibrary and PresetCard for Hammers IP presets
- LoadDashboard with Recharts visualizations
- ReadinessFromVault with Vault integration
- CustomActivityBuilderDialog with block system integration
- Edge functions: calculate-load, detect-overlaps, suggest-adaptation
- i18n translations for all 8 languages

---

## Phase 1: Mobile Responsiveness Polish

### Target Areas:

**1.1 BlockCard Mobile Optimization**
- Ensure block cards collapse cleanly on screens < 375px
- Add horizontal scroll prevention for exercise grids
- Verify drag handles have 44x44px minimum touch targets
- Test collapsible sections open/close smoothly on touch

**1.2 ViewModeToggle Touch Targets**
- Already has `min-w-[44px] min-h-[44px]` - verify renders correctly
- Ensure mode labels hide gracefully on mobile (`hidden sm:inline` verified)
- Test toggle functionality on touch devices

**1.3 PresetLibrary Grid Layout**
- Verify responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- Test filter dropdowns are tap-friendly on mobile
- Ensure horizontal scroll tabs work on narrow screens

**1.4 LoadDashboard Charts**
- Charts use ResponsiveContainer - verify 100% width fills correctly
- Test tooltip touch interactions on mobile
- Ensure summary cards stack properly on mobile (grid-cols-1 sm:grid-cols-3)

---

## Phase 2: Empty States & Edge Cases

### 2.1 Empty State Verification

| Component | Empty State Location | Status |
|-----------|---------------------|--------|
| BlockContainer | No blocks - shows dashed border CTA | Implemented |
| PresetLibrary | No matching presets filter | Implemented |
| LoadDashboard | No load data recorded | Implemented |
| ReadinessFromVault | No recent Vault check-in | Implemented |
| ReceivedActivitiesList | No pending activities | Implemented |

### 2.2 Edge Cases to Test

**Block System:**
- Empty block (no exercises) - displays "No exercises yet" message
- Block with only one exercise - renders correctly
- Maximum exercises per block (test with 20+ exercises)
- Rapid block reordering - no state corruption

**Running Sessions:**
- Zero distance/reps - calculation handles gracefully
- Missing optional fields (surface, shoe type) - no errors
- Time goal edge formats (0:00:00 vs empty)

**Presets:**
- System presets (locked) - verify lock icon displays
- User presets empty list - shows empty state message
- Preset with empty blocks array

---

## Phase 3: Error Handling & Resilience

### 3.1 Edge Function Error Handling

**calculate-load:**
- Handles missing workout_blocks gracefully (returns 0)
- Handles missing running_sessions gracefully (returns 0)
- Returns meaningful error message on auth failure
- Logs calculation steps for debugging

**detect-overlaps:**
- Returns empty warnings array if no history data
- Handles missing target_date parameter
- Gracefully handles database query failures

**suggest-adaptation:**
- Returns empty suggestions if no readiness data provided
- Handles undefined pain_areas without crashing
- Provides sensible defaults for all optional params

### 3.2 Client-Side Error Handling

**Add toast notifications for:**
- Edge function call failures with retry option
- Network connectivity issues
- Invalid block data loading (corrupted JSONB)
- Missing required fields on save attempt

**Graceful degradation:**
- If CNS calculation fails, show "N/A" instead of crashing
- If preset loading fails, show error toast and close modal
- If Vault fetch fails, allow skipping readiness check

---

## Phase 4: Performance Optimization

### 4.1 Component Memoization

**High-priority memoization:**
- `calculateWorkoutCNS` - called on every block change
- `calculateWorkoutFasciaBias` - expensive aggregation
- Chart data generation in LoadDashboard

**React optimization:**
- Add `useMemo` for filtered preset lists in PresetLibrary
- Add `useCallback` for block update handlers
- Debounce CNS calculation updates (300ms delay)

### 4.2 Lazy Loading

**Implement lazy loading for:**
- Preset library content (only load when tab active)
- Load dashboard charts (defer initial render)
- Advanced fields panel (already collapsible)

### 4.3 Query Optimization

**React Query settings:**
- Preset data: `staleTime: 5 * 60 * 1000` (5 minutes)
- Load tracking: `refetchInterval: 60000` (1 minute)
- Vault readiness: `staleTime: 30000` (30 seconds)

---

## Phase 5: Coach/Scout Flow Verification

### 5.1 Block Data Persistence

**Verify JSONB serialization:**
```typescript
// In CustomActivityBuilderDialog handleSave
const exercisesData = useBlockSystem 
  ? { _useBlocks: true, blocks: workoutBlocks }
  : exercises;
```

**Ensure data integrity through:**
1. Coach creates workout with blocks in builder
2. Template saves to `custom_activity_templates.exercises` as JSONB
3. Coach opens SendToPlayerDialog
4. `template_snapshot` captures full block data automatically
5. Entry created in `sent_activity_templates`
6. Player receives in ReceivedActivitiesList
7. Player accepts - blocks render in edit dialog

### 5.2 Locked Fields Verification

**Test scenarios:**
- Lock `exercises` field - BlockContainer becomes read-only
- Verify `pointer-events-none` class applied when locked
- Visual lock indicators display on locked fields
- Block reordering disabled when locked
- Add exercise button hidden when locked

### 5.3 ReceivedActivitiesList Block Rendering

**Current flow (verified):**
- ReceivedActivityCard displays template preview
- On accept, creates template via `createTemplate`
- Opens CustomActivityBuilderDialog with template
- Block system toggle auto-enabled if `_useBlocks` detected

---

## Phase 6: Testing Setup & Test Cases

### 6.1 Testing Infrastructure Setup

**Create testing configuration:**
- Add vitest.config.ts with jsdom environment
- Create src/test/setup.ts with matchMedia mock
- Update tsconfig.app.json with vitest globals

### 6.2 Unit Tests to Create

**Load Calculation Tests (`loadCalculation.test.ts`):**
```text
- calculateExerciseCNS returns correct base values by type
- calculateExerciseCNS applies velocity intent multipliers
- calculateBlockCNS sums exercise CNS correctly
- calculateWorkoutCNS aggregates block CNS
- calculateRunningCNS handles all run types
- formatCNSLoad returns correct severity labels
- formatFasciaBias identifies dominant bias
```

**Block Operations Tests (`blocks.test.ts`):**
```text
- createEmptyBlock generates valid block structure
- Block reordering updates orderIndex correctly
- Exercise add/remove within block works
- Block type configs have all required fields
```

### 6.3 Integration Tests to Create

**CustomActivityBuilderDialog Tests:**
```text
- Renders block system toggle for workout type
- Block system toggle hidden for non-workout types
- View mode toggle appears when block system enabled
- CNS indicator shows in coach mode
- Block data serializes correctly on save
- Template loads block data correctly on edit
```

**Edge Function Tests:**
```text
- calculate-load returns metrics for valid input
- detect-overlaps returns warnings for high load
- suggest-adaptation provides readiness-based suggestions
```

---

## Phase 7: End-to-End User Flows

### 7.1 Core User Journeys to Verify

**Journey 1: Coach Creates Block-Based Workout**
1. Open My Custom Activities > Templates
2. Click "Create Activity"
3. Select "Workout" type
4. Enable "Use Block-Based Builder"
5. Add Activation block with 2 exercises
6. Add Strength Output block with 3 exercises
7. Switch to Coach mode - verify CNS displays
8. Save workout
9. Open SendToPlayerDialog
10. Send to a player
11. Verify player receives in Received tab

**Journey 2: Player Receives and Executes Workout**
1. Open My Custom Activities > Received
2. See pending activity from coach
3. Click Accept
4. View workout in edit dialog
5. Verify blocks render correctly
6. Verify locked fields are non-editable
7. Switch to Execute mode
8. Complete workout (simplified view)

**Journey 3: Load Dashboard Review**
1. Complete a workout (logs to athlete_load_tracking)
2. Open My Custom Activities > Load Dashboard
3. Verify today's CNS displays
4. Verify weekly average calculates
5. Verify charts render with data
6. Verify fascial breakdown shows

**Journey 4: Preset Usage Flow**
1. Open My Custom Activities > Elite Presets
2. Filter by category (e.g., "Explosive Lower")
3. Click "Use Preset" on a Hammers preset
4. Verify blocks load into session storage
5. Create new workout
6. Verify blocks pre-populate

**Journey 5: Readiness Integration**
1. Complete a Vault check-in (sleep, energy, soreness)
2. Open workout builder
3. Verify ReadinessFromVault shows score
4. Verify recommendation displays (Full Send / Modify / Recovery)
5. Create workout - readiness influences suggestions

---

## Phase 8: Accessibility & Internationalization

### 8.1 Accessibility Checks

**Dialog accessibility:**
- All dialogs have `DialogTitle` (verified for BlockTypeSelector)
- Screen readers announce block type selections
- Focus management on block add/delete

**Keyboard navigation:**
- Tab through blocks and exercises
- Enter/Space to expand/collapse blocks
- Arrow keys work in dropdown menus

### 8.2 i18n Verification

**Verify translations render for:**
- All 8 languages (EN, ES, FR, DE, JA, ZH, NL, KO)
- Block type names in BlockTypeSelector
- View mode labels in ViewModeToggle
- CNS load descriptors in tooltips
- Preset category and difficulty labels
- Running session fields and labels
- All empty state messages

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| vitest.config.ts | Create | Testing configuration |
| src/test/setup.ts | Create | Test setup with mocks |
| src/test/loadCalculation.test.ts | Create | Unit tests for load utils |
| src/test/blocks.test.ts | Create | Unit tests for block operations |
| tsconfig.app.json | Modify | Add vitest globals type |
| src/components/elite-workout/blocks/BlockCard.tsx | Polish | Add ARIA labels, memoize handlers |
| src/components/elite-workout/presets/PresetLibrary.tsx | Polish | Add useMemo for filtered lists |
| src/hooks/useLoadTracking.ts | Polish | Add error boundary logic |
| src/utils/loadCalculation.ts | Polish | Add input validation, memoization hints |

---

## Success Metrics

1. All mobile views render without horizontal scroll
2. Empty states display user-friendly messages
3. Edge function errors show toast with retry option
4. CNS calculation debounced (no jank on rapid editing)
5. All 8 i18n language files have complete translations
6. Coach-to-player flow works with block data intact
7. Locked fields prevent editing at block/exercise level
8. Vitest runs with 90%+ coverage on core utilities
9. All accessibility checks pass
10. No console errors during normal usage

---

## Technical Notes

### Block Data Format (JSONB)
The `exercises` column stores either flat array (legacy) or block structure:
```typescript
// Block-based format
{
  _useBlocks: true,
  blocks: WorkoutBlock[]
}

// Legacy flat format (backward compatible)
Exercise[]
```

### Edge Function Authentication
All three functions use standardized auth flow:
```typescript
const token = authHeader.replace('Bearer ', '');
const { data: claimsData } = await supabase.auth.getClaims(token);
const userId = claimsData.claims.sub;
```

### Load Calculation Algorithm
CNS load aggregates from:
- Exercise type base (5-40 points)
- Velocity intent multiplier (0.75x - 1.5x)
- Volume modifier (sets × reps × 0.5)
- CNS demand override (0.7x - 1.3x)
- Unilateral modifier (1.1x)

This polish plan ensures the Elite Workout & Running Card System meets production quality standards with robust testing, excellent mobile UX, and comprehensive error handling.
