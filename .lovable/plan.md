

# Backfill Tool Grades & Live Validation

## Current State (from production DB)

- **6 rows** in `vault_performance_tests`, **0 have tool_grades**
- **3 unique users** with vault tests; only **1 user** (`95de827d-7418-460b-8b79-267bf79bdca4`) also has HIE snapshots
- All athletes have `primary_position = NULL` and `date_of_birth = NULL` → `computeToolGrades` will use default `UT` profile

## Phase 1 — Backfill Script

Create and run a one-time Node.js script (`/tmp/backfill-tool-grades.ts`) that:

1. Queries all `vault_performance_tests` rows where `tool_grades IS NULL`
2. Joins `athlete_mpi_settings` for `primary_position`, `date_of_birth`, `sport`
3. For each row, imports the same `computeToolGrades` logic (copy the pure function into the script since edge functions can't import from `src/`)
4. Filters `results` to only numeric values (strips `_batting_side`, `_throwing_hand` prefixes)
5. Computes tool grades and UPSERTs via `psql` INSERT/UPDATE

Since we only have **read + insert** access via psql (no UPDATE), we'll use the **Supabase insert tool** to run UPDATE statements for each row.

Alternatively: Create a **small edge function** (`backfill-tool-grades`) that:
- Reads all vault tests with NULL tool_grades
- Recomputes using the same grading logic already available server-side
- Updates each row

This is cleaner because the grading logic (benchmarks, interpolation) lives client-side and would need to be duplicated. Instead, we'll use the **insert tool** to run 6 UPDATE statements directly, computing the grades via the script first.

**Approach**: Run a Node.js script that contains the `computeToolGrades` + `rawToGrade` logic (copied from source), processes the 6 rows of results data we already queried, then outputs the UPDATE SQL statements. Execute those via the insert tool.

### Output
- Before: 6 total rows, 0 with tool_grades
- After: 6 total rows, 6 with tool_grades (or fewer if some results don't map to any graded metrics)

## Phase 2 — Live Validation

After backfill, for the **1 athlete with both systems** (`95de827d-7418-460b-8b79-267bf79bdca4`):

1. Query their tool_grades from DB
2. Query their latest HIE snapshot (primary_limiter, weakness_clusters, prescriptive_actions)
3. Invoke `hie-analyze` via curl to trigger a fresh analysis
4. Query the NEW HIE snapshot and compare before vs after
5. Show full trace: tool_grades → MPI composites → gap patterns → sorted patterns → primary_limiter → prescriptions

For the other 2 users (no HIE snapshots), show their computed tool_grades only.

## Phase 3 — Real Impact Numbers

After backfill + re-analysis:
- Count athletes generating ≥1 tool_gap pattern
- Count athletes with gaps ≥15
- Count where tool_gap enters top 3 weakness_clusters
- Count where tool_gap becomes primary_limiter

**Honest expectation**: With only 1 athlete having both vault tests AND session data, impact will be limited to that single athlete. The system is structurally sound but the user base is small.

## Files

| File | Change |
|------|--------|
| `/tmp/backfill.js` | One-time script to compute tool grades for 6 rows |
| DB (via insert tool) | 6 UPDATE statements to populate tool_grades |
| No codebase changes | Backfill only, no engine modifications |

## Technical Detail

The script will replicate:
- `rawToGrade()` from `src/lib/gradeEngine.ts` (piecewise linear interpolation)
- `computeToolGrades()` from `src/data/positionToolProfiles.ts` (tool mapping + weighted average)
- Benchmark data from `src/data/gradeBenchmarks.ts`

All 6 rows and their results are already known from the DB query above, so the computation can be done deterministically.

