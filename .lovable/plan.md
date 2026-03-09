

# Manual E2E Testing Plan: Advanced Steal Analysis

## Implementation Verified

The code review confirms all four new analytics cards are implemented in `PerformanceAnalysis.tsx`:

1. **Elite Benchmark Comparison** (lines 306-345) - Shows avg time vs elite benchmark with difference calculation
2. **Projected Steal Success** (lines 347-387) - Progress bars for vs Avg/Elite battery with slide adjustment note
3. **Steal Window** (lines 389-422) - Time margin with interpretation labels
4. **Elite Steal Profile** (lines 424-493) - Composite card with all metrics including "Feet Stolen"

## Testing Checklist

### Test 1: Manual Mode Flow

1. Navigate to `/practice` → Base Stealing drill
2. In SessionSetup, select **Manual Entry** mode
3. Configure: Base Distance = 90ft, Lead Distance = 11ft
4. Start session and complete 2-3 reps:
   - Run through countdown → signal → tap to dismiss
   - Mark decision as Correct
   - Enter: First 2 Steps = 0.45s, Time to Base = 3.10s, Steps = 12
5. Click "Save & End Session" → Session Summary → Save
6. **Verify on Analysis screen:**
   - Elite Benchmark Comparison card shows 3.10s vs 3.05s elite
   - Projected Steal Success shows % vs Avg and Elite battery
   - Steal Window shows +/- seconds with labels
   - Elite Steal Profile shows all metrics including "Feet Stolen: 11ft (actual run: 79ft)"

### Test 2: AI Mode Flow (if camera available)

1. Select **AI Video Analysis** mode
2. Complete 2 reps with camera recording
3. On Analysis screen, verify same cards render with AI-measured timing data

### Expected Card Behavior

| Card | Shows When |
|------|------------|
| Elite Benchmark | `avgRun` (Time to Base) exists |
| Projected Steal Success | `avgRun` exists |
| Steal Window | `avgRun` exists |
| Elite Steal Profile | Always (gracefully hides null metrics) |

### Edge Cases to Test

- No Time to Base entered → Benchmark/Success/Window cards should NOT render
- No lead distance → "Feet Stolen" row should NOT appear
- First 2 Steps not entered → Acceleration Efficiency row hides

