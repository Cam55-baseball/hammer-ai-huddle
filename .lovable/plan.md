

# 6-Week Test Intelligence Engine — Full Implementation Plan

## Current State

- **Exists**: `VaultPerformanceTestCard.tsx` (666 lines) with flat metric inputs, `useVault.ts` for persistence, `dataDensityLevels.ts` for tier gating (4 levels: free/pitcher/5tool/golden2way)
- **Does NOT exist**: No registry, no grade engine, no benchmarks, no tool profiles, no intelligence engine, no adaptive logic — zero of the Phases 7-13 files have been created

## Implementation — 8 Files

### 1. `src/data/performanceTestRegistry.ts` (NEW)
Single source of truth for all ~55 metrics. Each entry:
- `key`, `category`, `label`, `unit`, `min`, `max`, `step`, `higherIsBetter`
- `tier`: maps to existing density levels (`free` = level 1, `paid` = level 2-3, `elite` = level 4)
- `sports`, `modules`, `instructions`, `bilateral` flag
- Stable decimal input config baked in (type="text", inputMode="decimal", regex)

### 2. `src/data/gradeBenchmarks.ts` (NEW)
Age-banded benchmark tables for every metric, both sports. Structure:
```typescript
{ metricKey: { baseball: { "14u": [{raw, grade}...], "18u": [...], "college": [...], "pro": [...] }, softball: {...} } }
```
Benchmarks sourced from:
- **MLB combine data** (60yd, exit velo, throw velo, pop time)
- **Perfect Game / Prep Baseball Report** published percentiles
- **NSCA strength norms** (jumps, med ball)
- **Published research** (shoulder ROM, hip mobility norms)
- Clearly documented as "research-informed estimates" where exact percentile data unavailable

### 3. `src/lib/gradeEngine.ts` (NEW)
- `rawToGrade(key, value, sport, ageBand)` → 20-80 via piecewise linear interpolation
- `gradeToLabel(grade)` → "Plus-Plus" / "Plus" / "Average" / etc.
- Handles missing metrics gracefully (returns `null`, never throws)
- `higherIsBetter: false` inverts interpolation automatically

### 4. `src/data/positionToolProfiles.ts` (NEW)
- 5-tool weight tables for all positions (SS, C, 1B, 2B, 3B, CF, LF, RF, P, DH, UT, DP)
- Metric → Tool mapping (which metrics feed Hit, Power, Run, Field, Arm)
- `computeToolGrades(results, position, sport, ageBand)` → `{ hit, power, run, field, arm, overall }`
- Missing metrics reduce denominator weight (partial tests still produce output)

### 5. `src/lib/testIntelligenceEngine.ts` (NEW)
- `generateReport(results, position, sport, ageBand)` → `TestIntelligenceReport`
- Top 3 strengths (highest grades), Top 3 limiting factors (lowest grades with causal links)
- Training priority message generated from causal map (e.g., low rotational power → exit velo ceiling)
- Handles partial data: if < 5 metrics entered, returns simplified report

### 6. `src/lib/adaptiveTestPriority.ts` (NEW)
- `getNextTestFocus(testHistory[])` → `{ prioritized: string[], reduced: string[], reason: string }`
- Algorithm: `priority = (80 - currentGrade) * (1 / (testFrequency + 1))`
- Top 5 by score → prioritized; grade > 65 + tested 2+ times → reduced

### 7. `src/lib/longitudinalEngine.ts` (NEW)
- `computeTrends(testHistory[])` → `MetricTrend[]`
- Rate per 6-week cycle, trend classification (improving > +1.5, plateau ±1.5, regressing < -1.5)
- Projection: `"Reach 60-grade {tool} in ~{weeks} weeks"` when improving

### 8. `src/components/vault/VaultPerformanceTestCard.tsx` (REWRITE)
Major changes:
- Consume registry instead of hardcoded `TEST_TYPES_BY_SPORT` / `TEST_METRICS`
- Group inputs by category with collapsible sections
- Show metric instructions inline
- Stable decimal inputs (type="text", inputMode="decimal", regex)
- Tier gating via `useDataDensityLevel` — filter registry by tier
- After save: render intelligence report (tool grades, strengths, limiting factors, training priority)
- Show longitudinal trends + projections on historical entries
- Adaptive focus badges on metric categories ("Focus" / "Stable")

### Database Migration
- Add `schema_version integer default 2` to `vault_performance_tests`
- No breaking changes — existing rows get `null` (treated as v1)

## Verification Plan (built into implementation)

After building all files, I will:

1. **Run a simulated test** via script — enter 15 sample metrics for a baseball SS age 16, compute all outputs, display: individual grades, tool grades, overall, strengths, limiting factors, training priority
2. **Simulate 3 cycles** with improving/plateau/regressing values — show trend classification, rate, projections
3. **Test partial data** — enter only 4 metrics, confirm no crashes, simplified report generated
4. **Test old schema** — confirm v1 data renders without errors
5. **Capture UI screenshots** of input form + results screen

## Benchmark Transparency

All benchmark values will include inline comments documenting source:
- `// Source: MLB Combine avg 2019-2023` or `// Source: NSCA normative tables` or `// Estimate: interpolated from PG/PBR published ranges`
- Where exact percentile data is unavailable, stated as "research-informed estimate"
- Baseball vs softball: separate tables with sport-appropriate scaling (e.g., softball pitching velo 45 avg vs baseball 85 avg)

## Risk Mitigation

- Metric keys are immutable once created — new metrics get new keys
- `schema_version` prevents future migrations from corrupting history
- Missing metrics → `null` grade, reduced weight — never breaks
- All inputs use stable decimal pattern — no `type="number"` bugs

## Files Summary

| File | Action |
|------|--------|
| `src/data/performanceTestRegistry.ts` | Create |
| `src/data/gradeBenchmarks.ts` | Create |
| `src/data/positionToolProfiles.ts` | Create |
| `src/lib/gradeEngine.ts` | Create |
| `src/lib/testIntelligenceEngine.ts` | Create |
| `src/lib/adaptiveTestPriority.ts` | Create |
| `src/lib/longitudinalEngine.ts` | Create |
| `src/components/vault/VaultPerformanceTestCard.tsx` | Rewrite |
| `src/hooks/useVault.ts` | Minor edit (schema_version) |
| Database migration | Add schema_version column |

