

# Backfill MPI Scores & Activate Tool-Performance Gap System

## Current State
- **mpi_scores**: 0 rows
- **performance_sessions**: 18 sessions across 3 athletes
- **tool_grades**: Populated for all 6 vault test rows (backfilled previously)
- **Target athlete** (95de827d): 9 sessions + tool_grades = `{arm: 80, hit: null, run: 20, field: null, power: 36, overall: 46}`

## Phase 1 — Backfill MPI Scores

Run a Node.js script that replicates the **exact nightly-mpi-process logic** (lines 284-305):

1. For each of the 3 athletes with sessions, query all `performance_sessions` (90-day window)
2. Compute game-weighted composite averages (1.5x for game/scrimmage, 1.0x otherwise)
3. Apply MPI weights: BQI=0.25, FQI=0.15, PEI=0.20, Decision=0.20, Competitive=0.20
4. No tier/age/position modifiers (all athletes have NULL settings)
5. INSERT into `mpi_scores` using the insert tool with today's date

For athlete 95de827d (9 sessions), the composites will average out to roughly:
- BQI ~77, FQI ~73, PEI ~79, Decision ~78, Competitive ~78
- These map via `mapCompositeToToolScale(x) = 20 + (x/100)*60` to tool scale: BQI→66, FQI→64, PEI→67, Competitive→67

Then tool_grades `{arm: 80, run: 20, power: 36}` vs mapped composites:
- **arm (80) vs PEI mapped (67)** → delta 13, below 15 threshold → no pattern
- **run (20) vs Competitive mapped (67)** → delta -47, **HIGH severity perf_exceeds** → `tool_gap_run_physical`
- **power (36) vs BQI mapped (66)** → delta -30, **HIGH severity perf_exceeds** → `tool_gap_power_physical`

**This will generate real tool_gap patterns.**

## Phase 2 — Re-run HIE for Target Athlete

After inserting mpi_scores, invoke `hie-analyze` for athlete 95de827d and query the resulting HIE snapshot to show:
- Generated tool_gap patterns
- Sorted allPatterns top 5
- primary_limiter before vs after
- weakness_clusters before vs after
- prescriptive_actions before vs after

## Phase 3 — Report Real Impact Metrics

Query production data to answer:
- Athletes with BOTH tool_grades AND mpi_scores
- Athletes generating tool_gap patterns
- % with gap ≥15
- Cases where tool_gap enters top 3 / becomes primary_limiter

## Implementation

| Step | Action |
|------|--------|
| 1 | Run script to compute weighted composite averages for 3 athletes from their sessions |
| 2 | INSERT 3 rows into `mpi_scores` via insert tool (one per athlete, today's date) |
| 3 | Verify count: mpi_scores before=0, after=3 |
| 4 | Invoke `hie-analyze` for athlete 95de827d via curl |
| 5 | Query new HIE snapshot and compare to previous |
| 6 | Report activation metrics |

No codebase changes. Data operations only.

