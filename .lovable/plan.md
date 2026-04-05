

# Layer 17 — Adversarial Robustness + System Invariance Lock (Tests 50–55)

Append one new `describe` block with 6 tests to `src/test/engine-invariants.test.ts`.

## Test 50: Frankenstein Profiles (Extreme Imbalance)

Three hardcoded one-dimensional profiles graded as SS:

| Profile | Dominant Tool | Key Inputs |
|---------|--------------|------------|
| Track Freak | Run | 60yd: 6.1, 10yd: 1.35, agility: 3.7, EV: 65, bat: 50, throw: 65 |
| Raw Power | Hit/Power | EV: 110, bat: 90, 60yd: 7.6, agility: 5.0, throw: 65 |
| Arm-Only Pitcher | Arm | pitch: 97, throw: 95, 60yd: 7.8, EV: 65, bat: 50 |

Assertions per profile:
- Dominant tool grade ≥ 70
- Non-dominant tools ≤ 40
- Overall ≤ 60 (one tool cannot inflate overall)

## Test 51: Tool Monotonicity Across 3 Cycles

Define 3 full result sets (weak → medium → strong) where ALL metrics improve monotonically. Compute `computeToolGrades` for each cycle.

Assertions:
- For each of the 5 tools: `tool_cycle3 ≥ tool_cycle2 ≥ tool_cycle1`
- `overall_cycle3 ≥ overall_cycle2 ≥ overall_cycle1`
- This closes the gap where Test 49 only checked individual metric grades, not tool-level aggregates.

## Test 52: Missing Data Chaos

Generate 50 profiles with only 3–6 random metrics each. For each:
- Assert: no crash, no NaN in any tool grade or overall
- Assert: tools with zero contributing metrics return `null` (not 0)
- Assert: overall is non-null if ≥1 tool has data
- Assert: all non-null grades ∈ [20, 80]

## Test 53: Weighting Stability (No Single Metric Hijack)

Fix a baseline hitting profile. Then spike ONE metric (e.g., `tee_exit_velocity` from 85 → 110) while keeping all others constant.

Assertions:
- Hit tool increase ≤ 12 points from the spike
- Overall increase ≤ 5 points
- Proves no single metric can hijack a tool or overall grade

## Test 54: Cross-Tool Independence

Fix a full profile. Then improve ONLY speed metrics (60yd, 10yd, pro_agility) significantly.

Assertions:
- Run tool increases
- Hit, Power, Arm tools do NOT decrease (zero coupling)
- Field tool may increase slightly (shares lateral_shuffle/pro_agility) — that's valid
- Overall increases or stays same

## Test 55: Out-of-Distribution Guardrails

Feed impossible/invalid inputs:
- `sixty_yard_dash: 4.0` (impossible speed)
- `tee_exit_velocity: 140` (impossible power)
- `bat_speed: -10` (negative/invalid)
- `vertical_jump: 0`
- `pitching_velocity: 999`

Assertions:
- Zero crashes
- All returned grades ∈ [20, 80] (clamped by engine)
- `generateReport` completes without error
- No NaN in any output field

## Files

| File | Change |
|------|--------|
| `src/test/engine-invariants.test.ts` | Append Layer 17 (Tests 50–55) after line 1542 |

Total after this: 55 invariant tests across 17 layers.

