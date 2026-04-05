

# Zero-Tolerance Impact Verification — Tool Gap System

## 1. COMPETITION TEST

### Sorting Formula (lines 1448-1457)

```text
score = severityWeight × (1 + gameBonus + fatigueBonus)

severityWeight: high=3, medium=2, low=1
gameBonus: +0.5 if data_points.context === 'game_gap'
fatigueBonus: +0.3 if metric === 'fatigue_dropoff'
tool_gap bonus: NONE (0)
```

### Effective Scores by Pattern Type

| Pattern Type | Severity | Score |
|-------------|----------|-------|
| Traditional (game_gap context) | high | **4.5** |
| Fatigue dropoff | high | **3.9** |
| Traditional (no bonus) | high | **3.0** |
| **Tool gap** | **high** | **3.0** |
| Traditional (game_gap) | medium | **3.0** |
| **Tool gap** | **medium** | **2.0** |
| Traditional (no bonus) | medium | **2.0** |

### 3 Simulated Athletes

**Athlete A** — Hitter with game-gap AND tool gap
| # | Pattern | Severity | Score | Type |
|---|---------|----------|-------|------|
| 1 | inside_weakness (game_gap context) | high | 4.5 | traditional |
| 2 | chase_rate_high | high | 3.0 | traditional |
| 3 | tool_gap_hit_skill_transfer (delta=22) | high | 3.0 | **tool_gap** |
| 4 | whiff_rate_elevated | medium | 2.0 | traditional |
| 5 | tool_gap_power_physical (delta=16) | medium | 2.0 | tool_gap |

**Primary limiter**: inside_weakness (traditional WINS)
**Tool gap rank**: #3 (in weakness_clusters: YES)

**Athlete B** — No game-context patterns, strong tool gap
| # | Pattern | Severity | Score |
|---|---------|----------|-------|
| 1 | tool_gap_field_skill_transfer (delta=25) | high | 3.0 |
| 2 | exchange_time_slow | high | 3.0 |
| 3 | fatigue_dropoff | medium | 2.6 |
| 4 | tool_gap_arm_physical (delta=18) | medium | 2.0 |

**Primary limiter**: TIE between tool_gap and exchange_time (sort is stable — whichever appears first in the concat wins). Tool gap patterns are appended LAST in line 1447, so traditional pattern wins ties.
**Tool gap rank**: #2 (in weakness_clusters: YES)

**Athlete C** — Only tool gaps are high severity
| # | Pattern | Severity | Score |
|---|---------|----------|-------|
| 1 | tool_gap_hit_skill_transfer (delta=24) | high | 3.0 |
| 2 | vision_reaction_slow | medium | 2.0 |
| 3 | tool_gap_run_physical (delta=17) | medium | 2.0 |

**Primary limiter**: tool_gap_hit_skill_transfer (**TOOL GAP WINS**)

### Answer: Tool gap patterns WIN only when no traditional patterns have game_gap context or fatigue_dropoff at equal/higher severity. They LOSE to game-context patterns due to the 0.5 bonus. They TIE with non-bonused traditional patterns but lose ties due to array concatenation order.

---

## 2. PRESCRIPTION CHANGE TEST

**Athlete A (tool gap disabled vs enabled):**

WITHOUT tool gap:
- Primary limiter: inside_weakness
- Weakness clusters: [inside_weakness, chase_rate, whiff_rate]
- Prescriptions: Inside pitch recognition drills, plate discipline drills

WITH tool gap:
- Primary limiter: inside_weakness (unchanged)
- Weakness clusters: [inside_weakness, chase_rate, **tool_gap_hit_skill_transfer**]
- Prescriptions: Inside pitch recognition, plate discipline, **+ Live BP Situational Hitting (skill transfer drill)**

**What changed**: The 3rd weakness cluster and its associated drill changed. The primary limiter and top prescription did NOT change.

---

## 3. DOMINANCE THRESHOLD

For tool_gap to become **#1 primary_limiter**:
- Must be `high` severity (gap ≥ 20)
- AND no other pattern can have game_gap context at high severity (score 4.5 > 3.0)
- AND no fatigue_dropoff at high severity (score 3.9 > 3.0)
- If only non-bonused traditional patterns exist at high severity, tool_gap still loses ties (array order)

**Minimum realistic scenario**: Athlete has tool grades but limited session data (few micro patterns detected). This is actually common for athletes who just completed a 6-week test but haven't logged many game sessions.

For **top 3 weakness_clusters**: gap ≥ 15 (medium) is sufficient if fewer than 3 traditional patterns rank higher.

---

## 4. CONFLICT TEST

**Scenario**: Micro-data says "mechanical issue" (e.g., `whiff_rate_elevated`, high severity, score=3.0). Tool gap says "skill transfer issue" (e.g., `tool_gap_hit_skill_transfer`, high severity, score=3.0).

**Who wins**: Traditional pattern wins (appears earlier in concatenation at line 1444-1447: `...hittingPatterns` comes before `...toolGapPatterns`).

**Why**: Stable sort + array order. Tool gap patterns are always appended last. At equal scores, they always lose.

**This is a structural bias, not a deliberate design decision.**

---

## 5. OVERFIRING CHECK

Across 20 athletes, tool_gap fires ONLY when:
1. Athlete has `vault_performance_tests` with non-null `tool_grades` (requires completing a 6-week test AND saving since the migration)
2. Athlete has MPI scores (requires sufficient session history)
3. Delta ≥ 15 between mapped values

**Expected firing rate**: Very low currently because:
- The `tool_grades` column was just added — zero existing rows have it populated
- Only athletes who save a NEW 6-week test going forward will have it

**Realistic estimate**: <5% of athletes currently generate any tool_gap pattern (effectively 0% until tests are re-saved). Even at steady state, likely 30-50% would have gaps ≥15 given the different scales.

---

## 6. FINAL VERDICT

**SECONDARY** — borderline IGNORED.

Reasons:
1. **Data availability**: Zero athletes currently have `tool_grades` populated (column just added, no backfill)
2. **Structural disadvantage**: Tool gap patterns get no sorting bonus, lose all ties to traditional patterns
3. **Can never beat game-context patterns**: A high tool_gap (3.0) always loses to a high game_gap pattern (4.5)
4. **Prescription impact is real but marginal**: Changes 3rd weakness cluster at best, never changes primary limiter when traditional patterns exist

### What Would Make It PRIMARY

Two fixes needed:

**Fix A — Backfill existing data**: Run a migration or batch job to compute and store `tool_grades` for all existing `vault_performance_tests` rows. Without this, the system has zero input data.

**Fix B — Sorting equity**: Tool gap patterns need a sorting bonus comparable to game_gap (e.g., +0.4 for high-severity tool gaps). Currently they're the only "cross-system intelligence" pattern with zero bonus, despite being architecturally unique signal.

### Recommendation

The system is correctly built but **structurally muted**. The pipeline works end-to-end, but two fixable issues (no historical data + no sorting weight) prevent it from ever meaningfully influencing decisions for existing athletes.

