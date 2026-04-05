

# Layer 16 — External Truth Validation + Tightened Ground Truth

## Tests to Add (Tests 43–48)

### Test 43: MLB Benchmark Validation
Use known MLB-average raw values against `pro` age band benchmarks. Assert grades land at 45 ±2 (the defined anchor point).

| Metric | MLB Avg Raw | Expected Grade |
|--------|------------|----------------|
| `sixty_yard_dash` | 6.7s | 45 ±2 |
| `tee_exit_velocity` | 88 mph | 45 ±2 |
| `pitching_velocity` | 90 mph | 45 ±2 |
| `position_throw_velo` | 84 mph | 45 ±2 |
| `bat_speed` | 71 mph | 45 ±2 |
| `vertical_jump` | 31" | 45 ±2 |

Also test elite values (80-grade raw) → assert grade ≥ 78. And floor values (20-grade raw) → assert grade ≤ 22.

### Test 44: Cross-Age Progression Reality
Same raw values graded at age 12 (14u band), 16 (18u band), 20 (college band). Since the same raw performance is more impressive at younger age bands (where benchmarks are lower), assert:
- Grade at 14u ≥ grade at 18u ≥ grade at college for higher-is-better metrics
- Same pattern for lower-is-better metrics
- No regressions from maturation context

### Test 45: Edge Case Realism — Archetype Profiles
**Speed Specialist**: Elite 60yd (6.2s), elite 10yd (1.38s), poor exit velo (70mph), poor throw velo (68mph).
- Assert: Run tool ≥ 70, Hit tool ≤ 35, Power tool ≤ 35
- Assert: Overall NOT elite (one-dimensional)

**Power Slugger**: Elite exit velo (107mph), elite bat speed (89mph), poor 60yd (7.5s), poor agility (4.9s).
- Assert: Hit tool ≥ 65, Power tool ≥ 55, Run tool ≤ 30
- Assert: Training priority references speed/run/agility, not hitting

### Test 46: Coach Sanity Check — 100 Random Profiles
Generate 100 random full profiles. For each, check for "red flag" contradictions:
- Overall > 60 but ≥2 tools < 40 → flag
- Overall < 40 but ≥2 tools > 60 → flag
- Assert: ≤2 flags across 100 profiles (near-zero tolerance)

### Test 47: Tightened Ground Truth (replaces loose checks in 31–33)
Tighten existing assertions:
- **Elite SS (Test 31)**: Overall ∈ [58, 68], Hit ∈ [65, 75], Arm ∈ [63, 75], no tool < 45
- **Average 14u (Test 32)**: Overall ∈ [38, 48], all tools ∈ [30, 52]
- **Below-Avg Standout (Test 33)**: Overall ∈ [25, 38], Run tool ≥ highest other tool + 8

### Test 48: Full Pipeline Performance
Run the complete pipeline (generateReport → computeTrends → getNextTestFocus) for 1,000 random profiles with 3-cycle histories. Assert:
- Zero crashes, zero NaN
- Total time < 5 seconds
- Every report + trends + focus output passes basic validity

## Changes

| File | Change |
|------|--------|
| `src/test/engine-invariants.test.ts` | Append Layer 16 (Tests 43–48), tighten Tests 31–33 |

