

# Fix Tool-Performance Gap Metric Naming + Verification (Tests 77–79)

## Phase 1 — Fix

**File: `supabase/functions/hie-analyze/index.ts`**

Line 1242: Change `prescriptionClass` assignment so `perf_exceeds` produces `'physical'` instead of `'physical_development'`:

```typescript
const prescriptionClass = direction === 'tool_exceeds' ? 'skill_transfer' : 'physical';
```

Line 1207: Update type to match:
```typescript
prescription_class: 'skill_transfer' | 'physical';
```

This ensures `tool_gap_${tool}_${prescriptionClass}` generates `tool_gap_field_physical` (matching switch case at line 918) instead of `tool_gap_field_physical_development` (unhandled).

No switch cases modified. Fix is at the source.

## Phase 2 — Edge Protection

In the `default` case of `buildDrillRotations` (line 934), add logging for unhandled tool_gap metrics:

```typescript
default:
  if (pattern.metric?.startsWith('tool_gap_')) {
    console.error(`UNHANDLED_METRIC: ${pattern.metric} for pattern category ${pattern.category}`);
  }
  if (pattern.category === "pitching") { ... }
  break;
```

This ensures no `tool_gap_*` metric silently falls through.

## Phase 3 — Invariant Tests (77–79)

Append to `src/test/engine-invariants.test.ts` after line 2422:

**Test 77**: Every valid tool_gap metric maps to a drill. Enumerate all 10 expected metrics (`tool_gap_{hit,power,run,field,arm}_{skill_transfer,physical}`), verify `buildDrillRotations` returns non-empty for each.

- Since `buildDrillRotations` is inside the edge function (not importable in client tests), these tests will validate the metric naming contract: construct the expected metric names using the same logic as `analyzeToolPerformanceGaps` and assert they match the known set of handled cases.

**Test 78**: `physical` case returns different drill names than `skill_transfer` for the same tool.

**Test 79**: No pattern with severity ≥ medium results in empty metric mapping (all generated metrics are in the valid set).

## Phase 4 — Re-verification

After deploying the fix, trace through the edge function to confirm:
- `tool_gap_hit_skill_transfer` → hits case at line 853 → "Live BP Situational Hitting"
- `tool_gap_field_physical` → hits case at line 918 → "Lateral Shuffle Circuit"
- Both appear in weakness_clusters and prescriptive_actions

## Files

| File | Change |
|------|--------|
| `supabase/functions/hie-analyze/index.ts` | Fix line 1242 (`physical`), line 1207 (type), line 934 (UNHANDLED_METRIC log) |
| `src/test/engine-invariants.test.ts` | Append Tests 77–79 (metric naming contract validation) |

