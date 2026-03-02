

# Fix: Show Distance and Pace Goal in Activity Detail View

## Problem

When you create a running activity with a distance and pace goal, those values are saved on the template's top-level fields (`distance_value`, `distance_unit`, `pace_value`). However, the Activity Detail dialog only displays distance/pace from `embedded_running_sessions` (a separate sub-section for multi-segment runs). Simple running activities that use the top-level fields have their details silently ignored.

## Solution

Add a "Running Details" section to `CustomActivityDetailDialog.tsx` that renders the template's top-level `distance_value`, `distance_unit`, and `pace_value` fields -- the same way `VaultDayRecapCard` already does.

## Changes

### File: `src/components/CustomActivityDetailDialog.tsx`

After the "Duration and Intensity" badges section (around line 390), add a new block that checks for `template.distance_value` or `template.pace_value` and renders them:

```tsx
{/* Running Distance & Pace Goal */}
{(template.distance_value || template.pace_value) && (
  <div className="flex flex-wrap gap-3">
    {template.distance_value && (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
        <Footprints className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {template.distance_value} {template.distance_unit || 'miles'}
        </span>
      </div>
    )}
    {template.pace_value && (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
        <Target className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          Goal: {template.pace_value}
        </span>
      </div>
    )}
  </div>
)}
```

This uses the `Footprints` and `Target` icons already imported in the file, keeping the visual style consistent with the existing duration/intensity badges. No other files need changes.

