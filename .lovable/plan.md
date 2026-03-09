

# Softball Stealing Trainer — Implementation Plan

## Overview

Build a complete Softball Stealing Trainer as a sibling to the existing Baseball Base Stealing system. This is manual-only (no AI/camera mode), uses softball-specific benchmarks, includes fake signal sequences, and adds three elite analytics engines (Catcher Pop-Time Matchup, Optimal Stride Model, Explosive Start Index).

## Architecture

```text
src/
├── data/softball/
│   └── softballStealBenchmarks.ts          ← NEW: all softball benchmarks
├── lib/
│   └── softballStealAnalytics.ts           ← NEW: analytics engine (stride model, explosion index, catcher matchup)
├── components/softball-stealing/
│   ├── SoftballStealSetup.tsx              ← NEW: setup (base target, distance, signal type)
│   ├── SoftballStealRepRunner.tsx          ← NEW: countdown → fake signals → real signal → post-rep entry
│   ├── SoftballStealSummary.tsx            ← NEW: session summary with save
│   └── SoftballStealAnalysis.tsx           ← NEW: full analytics output (7+ cards + 3 elite engines)
├── pages/
│   └── SoftballStealingTrainer.tsx         ← NEW: page orchestrator (setup → rep → summary → analysis)
```

## New Files

### 1. `src/data/softball/softballStealBenchmarks.ts`
Softball-specific constants:
- Reference at 60ft: Elite 2.90-3.25s, Average 3.40-3.70s
- Two-step: Elite 0.65-0.78s, Average 0.80-0.95s
- Steps to base (60ft): Elite 11-13, Average 13-15
- Pitcher time to home: Elite 1.10-1.25s, Average 1.30-1.45s, Slow 1.50+
- Catcher pop times: Elite 1.70s, Average 1.85s, Slow 2.00s
- Slide adjustment: 0.15s (softball)
- Distance scaling from 60ft reference for all supported distances (30-70ft in 5ft increments)
- No lead efficiency (softball = no leads)

### 2. `src/lib/softballStealAnalytics.ts`
Pure analytics functions:
- `calcSoftballStealWindow(timeToBase, pitcherTime, catcherPopTime)` — runner arrival vs tag arrival
- `calcCatcherMatchupSuccess(timeToBase, pitcherLevel, catcherLevel)` — **Elite Analytics #1**: projected success % vs elite/avg/slow catcher
- `calcOptimalStride(distance, steps, time)` — **Elite Analytics #2**: current stride length, optimal stride, recommendation
- `calcExplosiveStartIndex(twoStepTime, totalTime, steps)` — **Elite Analytics #3**: 0-100 score
- `calcSoftballJumpQuality(twoStepTime, baseDist)` — graded against softball benchmarks
- `calcSoftballAccelerationEfficiency(twoStepTime, totalTime)`
- `calcSoftballStrideEfficiency(steps, baseDist)` — fewer steps = longer strides = better
- `calcSoftballStealTimeRating(time, baseDist)` — percentile-style rating
- `buildSoftballStealProfile(...)` — composite object for analysis cards

### 3. `src/components/softball-stealing/SoftballStealSetup.tsx`
Minimal setup:
- **Base Being Stolen**: 2nd / 3rd (required)
- **Base Distance**: 30, 35, 40, 45, 50, 55, 60, 65, 70 ft (default 60)
- **Signal Type**: Standard Color / Even-Odd System
- **Stopwatch Instructions** card (dismissible): explains lap timing for 2-step, time-to-base, steps
- No lead config, no difficulty slider, no camera, no AI mode toggle

### 4. `src/components/softball-stealing/SoftballStealRepRunner.tsx`
Rep flow:
1. **Idle**: "Rep #N", Start Rep button, Save & End if rep > 1
2. **Countdown**: 10→1 (no "Take Lead" phase — softball has no leads)
3. **Fake Signals**: 1-2 fake color flashes (Blue/Yellow/Purple) before the real signal, each shown ~1s
4. **Real Signal**: Green (GO) or Red (HOLD) — tap to dismiss (no auto-dismiss)
5. **Confirm Decision**: Correct / Incorrect
6. **Data Entry**: 2 Step Time, Time to Base, Steps to Base (all required for GO reps), then Next Rep / Save & End / Delete Rep

Signal logic: Colors mode — Green=GO, Red=HOLD, fakes are Blue/Yellow/Purple. Even/Odd — Even=GO, Odd=HOLD.

### 5. `src/components/softball-stealing/SoftballStealSummary.tsx`
Session summary before save:
- Total Reps, Correct, Incorrect
- Avg Time to Base, Best Time, Avg 2-Step Time, Avg Steps
- Performance insight (auto-generated coaching text using softball benchmarks)
- Rep details list
- Save Session button

### 6. `src/components/softball-stealing/SoftballStealAnalysis.tsx`
Full analytics output after save — cards:
1. **Steal Efficiency Score** — weighted composite (Jump 30%, Acceleration 30%, Stride 15%, Accuracy 25%)
2. **Performance Breakdown** — Jump Quality, Acceleration, Stride Efficiency, Decision Accuracy (all graded)
3. **Key Insight** — auto-generated coaching text
4. **Elite Benchmark Comparison** — avg time vs elite (distance-scaled)
5. **Catcher Pop-Time Matchup Engine** (**Elite #1**) — projected success % vs Elite/Avg/Slow catcher with pitcher time variants
6. **Optimal Stride Model** (**Elite #2**) — current stride length vs optimal, training recommendation
7. **Explosive Start Index** (**Elite #3**) — 0-100 score with scout-style grading (85+ = elite)
8. **Trend Analysis** — acceleration trend, stride trend, jump trend (computed from session reps)
9. **Projection Model** — projected success rate vs average catcher, vs elite catcher

### 7. `src/pages/SoftballStealingTrainer.tsx`
Page orchestrator with state machine: `setup → live_rep → summary → analysis`
- No `post_rep` phase (no AI mode)
- Sport guard: redirect if not softball
- Auth guard: require sign-in
- Saves via `usePerformanceSession` with `session_type: 'softball_stealing'`, `module: 'baserunning'`
- Micro layer stores: base_target, base_distance, signal_result, two_step_time, time_to_base, steps_to_base, rep_timestamp

## Existing Files to Edit

### `src/App.tsx`
- Add route: `<Route path="/softball-stealing" element={<SoftballStealingTrainer />} />`
- Add lazy import

### `src/components/AppSidebar.tsx`
- In 5Tool Player and Golden 2Way sub-modules, add softball-only entry:
  `...(selectedSport === 'softball' ? [{ title: 'Softball Stealing', url: '/softball-stealing', icon: Zap, description: 'Steal training for softball' }] : [])`

### `src/pages/PracticeHub.tsx`
- In baserunning module section, add softball stealing quick-link (mirroring the baseball one):
  `{mod.id === 'baserunning' && sportKey === 'softball' && (<Card>...Softball Stealing Trainer...</Card>)}`

### `src/pages/GoldenTwoWay.tsx`
- Add softball stealing card alongside the baseball one, gated by sport

## Data Storage

No new database tables needed. Uses existing `performance_sessions` table with:
- `session_type: 'softball_stealing'`
- `module: 'baserunning'`
- `sport: 'softball'`
- `drill_blocks`: type `softball_stealing`, intent `reaction`
- `micro_layer_data` per rep: `{ signal_type, signal_value, two_step_time_sec, time_to_base_sec, steps_to_base, base_distance_ft, base_target, decision_correct }`

## Key Differences from Baseball System

| Aspect | Baseball | Softball |
|--------|----------|----------|
| Lead config | Steps, shuffle, distance | None (no leads) |
| AI/Camera mode | Yes | No (manual only) |
| Fake signals | No | Yes (1-2 fakes before real) |
| Base distances | 50-90ft | 30-70ft |
| Reference distance | 90ft | 60ft |
| Defense model | Pitcher-to-plate + pop time | Pitcher-to-home + pop time (different values) |
| Difficulty setting | Easy/Med/Hard delay | No difficulty (fixed countdown) |
| Post-rep phase | Yes (AI enrichment) | No |
| Elite analytics | Steal window, success projection | + Catcher Matchup, Stride Model, Explosive Start Index |

