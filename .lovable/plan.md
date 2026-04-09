

# Replace Dumbbell Icon with Custom Baseball Glove SVG

## Changes

### 1. Create custom BaseballGloveIcon component
**File: `src/components/icons/BaseballGloveIcon.tsx`** (new)

A small React component rendering an SVG baseball glove/mitt icon. Accepts `className` prop for sizing consistency with Lucide icons.

### 2. Update Sidebar
**File: `src/components/AppSidebar.tsx`** (line 301)

Replace `Dumbbell` import/usage with `BaseballGloveIcon` for the Drill Library nav item.

### 3. Update DrillLibraryPlayer page
**File: `src/pages/DrillLibraryPlayer.tsx`** (lines 9, 88, 142)

Replace all three `Dumbbell` usages (header icon, empty state icon) with `BaseballGloveIcon`.

