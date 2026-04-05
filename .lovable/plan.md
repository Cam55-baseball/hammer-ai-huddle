

# Tool-Performance Gap Detection System — Architecture Plan

## The Problem

Two disconnected intelligence systems:
- **Tool Grades** (Vault): hit/power/run/field/arm from 6-week physical tests — computed client-side only, never persisted as grades, never seen by HIE
- **Performance Intelligence** (HIE): BQI/FQI/PEI/Decision/Competitive from session micro-data — no awareness of physical capabilities

No system answers: "Are your tools showing up in performance?"

## Architecture Overview

```text
vault_performance_tests (raw metrics)
        │
        ▼
  computeToolGrades()        ◄── currently client-only
        │
        ▼
┌─────────────────────┐
│  GAP DETECTOR        │  ◄── NEW (inside hie-analyze)
│                     │
│  tool_grade ──┐     │
│               ├──►  tool_performance_gap patterns
│  perf_output ─┘     │
└─────────────────────┘
        │
        ▼
  weakness_clusters / primary_limiter / prescriptions
```

## Phase 1 — Gap Detection Logic

### Metric Mapping: Tool → Performance Output

| Tool Grade | Performance Metric(s) | Source |
|------------|----------------------|--------|
| **Hit** (hit tool) | BQI, contact quality %, whiff rate | mpi_scores.composite_bqi, micro patterns |
| **Power** (power tool) | Avg exit velo from sessions, hard hit % | drill_blocks, micro_layer_data |
| **Run** (run tool) | Baserunning grades, steal success, fatigue resistance | micro patterns (jump_grade, read_grade) |
| **Field** (field tool) | FQI, clean field %, exchange time, throw accuracy | mpi_scores.composite_fqi, micro patterns |
| **Arm** (arm tool) | Throw accuracy from fielding sessions, PEI (if pitcher) | mpi_scores.composite_pei, micro patterns |

### Mismatch Thresholds

A gap exists when:
- **Tool > Performance** (grade delta ≥ 15): The athlete has the physical ability but is not applying it
- **Performance > Tool** (grade delta ≥ 15): The athlete is outperforming their measurables — ceiling risk

Both are normalized to the 20-80 scale. Performance outputs (BQI etc., which are 0-100) are mapped to the 20-80 scale: `mapped = 20 + (composite / 100) * 60`.

### Output Format

```typescript
interface ToolPerformanceGap {
  tool: string;           // 'hit' | 'power' | 'run' | 'field' | 'arm'
  tool_grade: number;     // from computeToolGrades
  perf_output: number;    // mapped from session performance
  perf_source: string;    // 'BQI' | 'FQI' | etc.
  gap: number;            // tool_grade - perf_output (positive = underperforming)
  direction: 'tool_exceeds' | 'perf_exceeds';
  issue: string;          // human-readable
  prescription_class: 'skill_transfer' | 'physical_development';
}
```

## Phase 2 — New Pattern Type in HIE

Add `tool_performance_gap` as a MicroPattern category inside `hie-analyze`.

### Integration Points in hie-analyze

1. **New data fetch** (~line 1160): Query `vault_performance_tests` for the athlete's latest results
2. **New analyzer function**: `analyzeToolPerformanceGaps(toolGrades, composites, microPatterns)` — returns `MicroPattern[]`
3. **Pattern merging** (~line 1266): Add gap patterns to `allPatterns` with severity weighting:
   - Gap ≥ 20: severity `high`
   - Gap ≥ 15: severity `medium`
4. **Primary limiter eligibility** (~line 1297): Gap patterns compete with all other patterns for primary limiter via existing severity sort
5. **Weakness clusters** (~line 1316): Gap patterns become weakness clusters via existing `.slice(0, 3)` logic

### Server-Side Tool Grade Computation

`computeToolGrades` currently runs client-side only. To use it in the edge function:
- Port the pure functions (`rawToGrade`, `computeToolGrades`, benchmark data) into a shared utility within the edge function
- OR store computed tool grades alongside raw results when athletes save their 6-week test (simpler, no code duplication)

**Recommended approach**: Add a `tool_grades JSONB` column to `vault_performance_tests` that gets populated client-side when saving test results. The edge function reads it directly — no logic duplication.

## Phase 3 — Prescription Impact

### Case 1: Tool > Performance (has the tools, not applying them)

Prescription class: **skill_transfer**

| Tool | Focus | Drill Examples |
|------|-------|---------------|
| Hit tool > BQI | Game-speed application, pitch recognition | Live BP, vision drills, situational hitting |
| Power tool > exit velo in games | Intent transfer, timing | High-intent BP, overload/underload swings |
| Run tool > baserunning output | Decision-making, reads | Lead-off reads, jump timing drills |
| Field tool > FQI | Reps under pressure, exchange speed | Game-speed fungo, timed exchanges |
| Arm tool > throw accuracy | Mechanical transfer | Target throwing from game positions |

### Case 2: Performance > Tool (outperforming measurables)

Prescription class: **physical_development**

| Tool | Focus | Drill Examples |
|------|-------|---------------|
| BQI > Hit tool | Bat speed, hand-eye | Overload training, tee precision |
| Exit velo > Power tool | Explosive strength | Med ball, plyometrics, jump training |
| Baserunning > Run tool | Sprint mechanics, agility | Speed lab, pro agility work |
| FQI > Field tool | Lateral quickness, range | Shuffle drills, agility circuits |
| PEI > Arm tool | Arm strength, long toss | Weighted balls, long toss program |

### New Drill Rotation Entries

Add cases in `buildDrillRotations` for `tool_performance_gap_*` metric patterns, mapping to the appropriate prescription class drills.

## Phase 4 — Exact Code-Level Integration

| Location | Change |
|----------|--------|
| **DB migration** | `ALTER TABLE vault_performance_tests ADD COLUMN tool_grades JSONB;` |
| **Client save** (`VaultPerformanceTestCard.tsx`) | Persist `computeToolGrades()` output into `tool_grades` column when saving results |
| **hie-analyze ~line 1160** | New fetch: `vault_performance_tests` for latest `tool_grades` and `results` |
| **hie-analyze new function** | `analyzeToolPerformanceGaps()` — compares tool grades vs mapped composites/micro patterns |
| **hie-analyze ~line 1266** | Add `...toolPerformanceGapPatterns` to `allPatterns` |
| **hie-analyze ~line 860** | Add drill rotation cases for `tool_performance_gap_*` metrics |
| **hie_snapshots** | No schema change needed — gaps appear as weakness_clusters (existing JSONB) |
| **WeaknessClusterCard.tsx** | No change needed — already renders any cluster |
| **PrescriptiveActionsCard.tsx** | No change needed — already renders any action |

## Phase 5 — Why This Matters More Than Elite Score

1. **Elite Score** answers: "How high could this player's ceiling be?" — speculative, cosmetic
2. **Tool-Performance Gap** answers: "Is this player actually using what they have?" — actionable, diagnostic

An MLB development staff does not care about a composite ceiling number. They care about:
- "This kid has a 75 arm but can't locate throws under pressure" → mechanical transfer issue
- "This kid runs a 6.4 sixty but gets terrible jumps on steals" → decision/application issue
- "This kid hits 95 EV on the tee but only 78 in games" → pitch recognition gap

This creates prescriptions that are fundamentally different from what micro-data alone can produce. Micro-data tells you WHAT is failing. Tool-performance gaps tell you WHY — and whether the fix is physical or mental/skill-based.

## Files

| File | Change |
|------|--------|
| `supabase/migrations/new` | Add `tool_grades JSONB` column to `vault_performance_tests` |
| `src/components/vault/VaultPerformanceTestCard.tsx` | Persist computed tool grades on save |
| `supabase/functions/hie-analyze/index.ts` | Fetch tool grades, add `analyzeToolPerformanceGaps`, integrate into pattern pipeline, add drill rotations |

