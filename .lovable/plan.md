

# Live E2E Validation Results + Required Fixes

## LIVE TEST EXECUTED
HIE was triggered for athlete `95de827d` (left-handed batter, 9 sessions, 40 total reps). Results:

### What WORKED (verified with database evidence)
| Feature | Evidence |
|---------|----------|
| HIE snapshot created | `hie_snapshots` row exists: development_status="stalled", readiness=70, confidence=42 |
| weakness_scores populated | **4 rows written**: vision_accuracy_low (scores: 36, 40, 61), slow_reaction_time (656) |
| drill_prescriptions created | **2 rows**: "meter_timing Focused Training" + "Reaction Compression Training" |
| targeted_metric populated | Both prescriptions have `targeted_metric: "recognition"` |
| drill_id linked (partial) | Second prescription has `drill_id: 0133348d...` (catalog match). First has null (auto-generated name, no catalog match) |
| Smart week plan generated | 7-day AI-generated plan returned |
| Fallback path works | Switch-statement drills returned successfully after prescription-engine failure |

### What FAILED (3 bugs found)

#### Bug 1: `readinessScore` used before initialization (CRITICAL)
- **Error**: `Cannot access 'readinessScore' before initialization`
- **Location**: Line 1365 references `readinessScore`, but it's defined at line 1421
- **Impact**: Prescription engine NEVER executes. Every athlete falls through to switch-statement fallback. The AI hybrid engine is dead code in production.
- **Fix**: Move lines 1420-1421 (readiness computation) to before line 1340 (prescription engine block)

#### Bug 2: `pre_weakness_value` always null (MEDIUM)
- **Evidence**: Both prescriptions show `pre_weakness_value: <nil>`
- **Root cause**: Line 1532 tries to match `drill.drill_type` ("recognition") against `weakness_metric` ("vision_accuracy_low"). These never match because `drill_type` is a category label, not the specific metric name.
- **Impact**: Effectiveness calculation can never use weakness-specific deltas. Always falls back to MPI delta.
- **Fix**: Change line 1531-1532 to search weakness_scores by the pattern's actual metric, not the drill_type string. Use `allPatterns.find(p => p.description === action.weakness_area)?.metric` to get the real metric.

#### Bug 3: First prescription has no `drill_id` (LOW)
- **Evidence**: "meter_timing Focused Training" has `drill_id: null`
- **Root cause**: Fallback switch generates drill names that don't exist in the `drills` catalog (29 seeded drills don't include auto-generated names)
- **Impact**: Drill-to-catalog linking broken for fallback-generated prescriptions
- **Fix**: Update `buildDrillRotations` to return `drill_id` from catalog when available. For dynamically named drills, leave null (acceptable — these are fallback-generated)

---

## Implementation Plan

### Step 1: Move readiness computation before prescription engine
In `supabase/functions/hie-analyze/index.ts`:
- Cut lines 1420-1421 (`const { score: readinessScore, ... } = computeReadiness(...)`)
- Paste before line 1340 (before the prescription engine block)
- This unblocks the AI prescription engine from ever executing

### Step 2: Fix pre_weakness_value mapping
In the same file, lines 1531-1532, change the weakness value lookup:
```typescript
// Current (broken): matches drill_type against weakness_metric
const targetedMetric = drill.drill_type || action.weakness_area;
const weaknessVal = weaknessScoreRows.find(w => w.weakness_metric === targetedMetric)?.score ?? null;

// Fixed: find the pattern that generated this action, use its metric
const matchingPattern = allPatterns.find(p => p.description === action.weakness_area);
const targetedMetric = matchingPattern?.metric || drill.drill_type || action.weakness_area;
const weaknessVal = weaknessScoreRows.find(w => w.weakness_metric === targetedMetric)?.score ?? null;
```

### Step 3: Verify with second HIE run
After fixing, trigger HIE again for the same athlete and confirm:
- Prescription engine returns 200 (not fallback)
- `pre_weakness_value` is populated (not null)
- `constraints_json` contains structured data from AI engine

### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/hie-analyze/index.ts` | Move readiness computation before prescription-engine block; fix targeted_metric mapping |

### Post-Fix Verification Checklist
- [ ] Edge function logs show NO "Prescription engine call failed" error
- [ ] `drill_prescriptions.pre_weakness_value` is numeric (not null)
- [ ] `drill_prescriptions.constraints_json` contains structured JSON from AI engine
- [ ] `weakness_scores` rows match `drill_prescriptions.targeted_metric` values
- [ ] Prescription engine returns 200 with valid drill_ids

