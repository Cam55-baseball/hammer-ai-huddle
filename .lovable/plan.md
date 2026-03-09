

# Advanced Steal Analysis Engine

## Overview

Add pro-level analytics to `PerformanceAnalysis.tsx`: MLB benchmark comparisons scaled by base distance, projected steal success %, steal window, acceleration efficiency, lead efficiency, feet stolen, and an Elite Steal Profile card. All metrics work for both AI and Manual modes using whichever data is available.

## Benchmarks Data

Create a new file with distance-scaled elite benchmarks and defense timing constants:

| File | Purpose |
|------|---------|
| `src/data/baseball/stealBenchmarks.ts` | **New.** Elite/good/avg steal times by base distance (50/60/70/80/90ft), first-two-step benchmarks, defense timing constants (avg/elite pitcher-to-plate, catcher pop time), slide time adjustment (0.17s) |

Benchmark scaling approach: use 90ft as the reference point and linearly scale times for shorter distances. Elite benchmarks at 90ft: 3.05s total, 0.40s first two steps. Defense constants: avg pitcher 1.2s + avg catcher 2.0s = 3.2s; elite pitcher 0.9s + elite catcher 1.5s = 2.4s.

## New Metrics (Pure Functions)

Create a utility file with all calculation functions:

| File | Purpose |
|------|---------|
| `src/lib/stealAnalytics.ts` | **New.** Pure functions for all advanced metrics |

Functions:
- `getEliteBenchmark(baseDist)` → scaled elite time for given distance
- `calcStealWindow(timeToBase, baseDist, defenseLevel: 'avg' | 'elite')` → seconds margin (positive = safe)
- `interpretStealWindow(window)` → label string ("Easy steal", "Bang-bang", "Out", etc.)
- `calcProjectedStealSuccess(timeToBase, baseDist, leadDist, defenseLevel)` → percentage 0-100, accounting for 0.17s slide time subtraction since drill is standing run
- `calcAccelerationEfficiency(firstTwoStepsSec, timeToBaseSec)` → percentage + grade
- `calcLeadEfficiency(leadDist, baseDist)` → percentage + grade  
- `calcFeetStolen(leadDist)` → actual running distance saved
- `buildStealProfile(...)` → composite object for the profile card

Steal success % formula: Compare player's adjusted time (timeToBase - 0.17 slide adjustment) against defense total time. Use a sigmoid curve around the breakeven point to produce a probability (not binary safe/out).

## UI Changes

| File | Changes |
|------|---------|
| `src/components/base-stealing/PerformanceAnalysis.tsx` | Add 4 new card sections below existing cards, before the Done button |

New cards in order:

**1. Elite Benchmark Comparison Card**
- Your avg time vs elite benchmark for selected base distance
- Difference shown as "+X.XXs from elite" (red) or "At elite level" (green)
- Sub-rows: First Two Steps comparison, Acceleration Phase comparison (only shown when data exists)

**2. Projected Steal Success Card**
- Two gauges/progress bars: vs Avg MLB Battery, vs Elite MLB Battery
- Shows percentage with color coding (green >80%, yellow 60-80%, red <60%)
- Only renders when `avgRun` is available

**3. Steal Window Card**
- Two rows: vs Avg Battery, vs Elite Battery
- Shows +/- seconds with interpretation label
- Color coded: green (>+0.10), yellow (0 to +0.10), red (negative)

**4. Elite Steal Profile Card** (the "power move" card)
- Compact summary combining: Takeoff Speed grade, Acceleration Efficiency %, Lead Efficiency %, Time to Base, Steal Window vs Avg, Projected Success %, Feet Stolen
- Only shows metrics that have data — gracefully hides rows with null values

All cards conditionally render based on data availability. Manual mode will show everything except reaction-time-dependent metrics (Takeoff Speed falls back to "No data" label).

## Files Summary

| File | Action |
|------|--------|
| `src/data/baseball/stealBenchmarks.ts` | Create — benchmark data |
| `src/lib/stealAnalytics.ts` | Create — calculation functions |
| `src/components/base-stealing/PerformanceAnalysis.tsx` | Edit — add 4 new analysis cards |

No changes needed to `RepResult`, `SessionSetup`, `ManualRepRunner`, or `SessionSummary`. All new metrics are derived from existing data fields (`timeToBaseSec`, `firstTwoStepsSec`, `leadDistanceFt`, `baseDistanceFt`).

