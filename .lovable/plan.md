

## Plan — 6-Week Test Elite Performance Alignment

Upgrades the registry-driven 6-Week Test to remove low-transfer metrics, sport-normalize speed, and tie elasticity directly to performance.

### 1. Registry changes (`src/data/performanceTestRegistry.ts`)

**Remove categories** from `METRIC_CATEGORIES`, `CATEGORY_LABELS`, and delete all metrics in:
- `health` (resting_heart_rate, body_weight, body_fat_pct)
- `recovery` (soreness_score, sleep_hours_avg, recovery_score)

**Rename category**:
- `mobility` label `"Mobility & Fascial Elasticity"` → `"Fascial Elasticity"`. Keep the `mobility` key (immutable contract) but treat the category as elasticity-focused.

**Remove metric**:
- `sit_and_reach` (delete from registry + benchmarks).

**Keep elasticity-relevant mobility metrics** (they directly enable rotational / arm performance and are referenced in the intelligence engine's causal links):
- `shoulder_rom_internal`, `shoulder_rom_external`, `hip_internal_rotation`, `ankle_dorsiflexion` remain — they predict throwing/rotational output.

**Add new metric** (bilateral, fascial elasticity):
```
key: 'sl_3x_bound', category: 'mobility', label: 'Single Leg 3x Bound',
unit: 'ft', min: 10, max: 80, step: 0.5, higherIsBetter: true,
tier: 'free', sports: ['baseball','softball'],
modules: ['hitting','pitching','throwing','general'],
bilateral: true, bilateralType: 'leg',
instructions: 'Three consecutive single-leg bounds for distance. Measure total distance from start line to final landing. Test each leg.'
```
The existing `renderBilateralInputs` already handles `_left` / `_right` suffixed inputs — Right and Left distance fields render automatically. **Asymmetry %** and **Combined Elastic Output Score** are computed downstream (see §3).

**Sport-specific speed split**:
- Update `ten_yard_dash` → `sports: ['baseball']` only (keep key for historical baseball data).
- Add `seven_yard_dash` (softball-only acceleration test).
- `sixty_yard_dash` → `sports: ['baseball']` only (already present, adjust sport array).
- Add `forty_yard_dash` (softball-only top-end test).

### 2. Benchmarks (`src/data/gradeBenchmarks.ts`)

- Delete `sit_and_reach` block.
- Restrict `ten_yard_dash` & `sixty_yard_dash` to baseball entries (softball blocks removed).
- Add age-banded benchmarks (14u / 18u / college / pro) for: `seven_yard_dash`, `forty_yard_dash`, `sl_3x_bound` — derived from PG/PBR softball event data, NSCA bound norms, anchored at grade 45 = average.

### 3. Speed normalization & elasticity coupling (`src/lib/gradeEngine.ts` + new `src/lib/speedScoring.ts`)

New helper `computeSpeedSubscores(results, sport, age)`:
- **Acceleration Score** = grade of `ten_yard_dash` (baseball) or `seven_yard_dash` (softball).
- **Max Speed Score** = grade of `sixty_yard_dash` (baseball) or `forty_yard_dash` (softball).
- **Overall Speed Grade** = weighted avg (Accel 0.45, MaxSpeed 0.55), then apply elasticity modifier:
  - Compute combined elastic output = avg of `sl_3x_bound_left` + `sl_3x_bound_right` graded value.
  - Asymmetry % = `|L − R| / max(L,R) × 100`.
  - Modifier: `+1 grade per 10 elasticity points above 50`, capped at +5; `−1 per 5% asymmetry above 10%`, capped at −5.
- Returns `{ accel, maxSpeed, overall, elasticBoost, asymmetryPenalty, asymmetryPct, combinedElasticOutput }`.

### 4. Tool-grade integration (`src/data/positionToolProfiles.ts`)
- Replace `RUN_METRICS = ['sixty_yard_dash','ten_yard_dash','thirty_yard_dash',…]` with sport-aware list including `seven_yard_dash` and `forty_yard_dash`.
- Add `sl_3x_bound` to `POWER_METRICS` and to `RUN_METRICS` (elasticity → speed transfer).

### 5. Intelligence engine (`src/lib/testIntelligenceEngine.ts`)
- Add causal link for `sl_3x_bound`: blocks `['sixty_yard_dash','forty_yard_dash','ten_yard_dash','seven_yard_dash']` — message: *"Single-leg elastic output is limiting your sprint ceiling and asymmetry increases injury risk."*
- Surface `asymmetryPct ≥ 15%` as a dedicated limiting factor row (red flag).

### 6. UI (`src/components/vault/VaultPerformanceTestCard.tsx`)
- After bilateral inputs for `sl_3x_bound`, render computed **Asymmetry %** and **Combined Elastic Output Score** (read-only badges, live from current input state).
- Render new **Speed Summary panel** in the latest-test view showing Acceleration / Max Speed / Overall Speed grades plus elasticity modifier badge.
- No locale string changes required beyond category label rename.

### 7. Weight redistribution
- Removed `health` & `recovery` had no tool-profile weight (they were advisory-only). No `POSITION_TOOL_PROFILES` weight changes needed — invariant (sum=1.0) preserved.
- Added `sl_3x_bound` participates via `POWER_METRICS` and `RUN_METRICS` averaging — no weight rebalance required.

### 8. Data integrity / longitudinal compatibility
- Historical results containing deleted keys (`sit_and_reach`, `resting_heart_rate`, etc.) remain in `performance_tests.results` JSON — engine simply skips unknown keys (`METRIC_BY_KEY[key]` returns undefined → no grade). No DB migration needed; **schema_version** stays compatible.
- Old softball `ten_yard_dash` historical entries continue to render in trends (registry lookup still resolves the key as baseball-only metric, but trend code uses `METRIC_BY_KEY` not sport filter).

### Out of scope
- No core grading-formula changes (interpolation untouched).
- No changes to MPI / HIE engines.
- No removal of `mobility` category key (immutable per engine contract).

### Verification
1. Baseball athlete: 6-Week Test shows `10-Yard Dash` + `60-Yard Dash`, no 7yd/40yd.
2. Softball athlete: shows `7-Yard Dash` + `40-Yard Dash`, no 10yd/60yd.
3. Both sports show `Single Leg 3x Bound` with Right/Left inputs; saving displays Asymmetry % and Combined Elastic Output.
4. Health & Recovery and Sit & Reach sections gone from UI.
5. Speed Summary panel shows Acceleration / Max Speed / Overall Speed grades; elastic boost increases Overall Speed when bounds are above 50; high asymmetry applies a penalty.
6. Historical tests with deleted metrics still load without errors; trends ignore them.

