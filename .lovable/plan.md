

# Why Hit Distance Input Is Not Visible

## Finding

The hit distance input field exists in `RepScorer.tsx` (line 973) but is inside the `mode === 'advanced'` block (line 919). By default, the rep scorer opens in **Quick Log** mode, which hides advanced fields like Bat Speed, Exit Velo, Distance, Contact Quality, Exit Direction, and Swing Intent.

To see the distance field, users must toggle the **Quick Log / Advanced switch** at the top of the rep scorer.

## Decision Point

There are two approaches:

**Option A — Keep as-is (no code change)**
The distance field stays in advanced mode. Users flip the toggle to access it. This keeps Quick Log fast and uncluttered.

**Option B — Move hit distance to always-visible (code change)**
Move the distance input out of the `mode === 'advanced'` block so it appears in both Quick Log and Advanced modes. This makes it immediately accessible but adds another field to the quick flow.

## Recommendation

If distance is a high-value metric that athletes frequently log, **Option B** is better — move it (along with bat speed and exit velo) outside the advanced gate, or at minimum just the distance field.

### Implementation (if Option B approved)
- **File**: `src/components/practice/RepScorer.tsx`
- Move the "Distance (ft)" input (lines 973-990) out of the `mode === 'advanced'` conditional (line 919) and place it after the Swing Decision section (line 917), so it's always visible for hitting sessions regardless of mode.

