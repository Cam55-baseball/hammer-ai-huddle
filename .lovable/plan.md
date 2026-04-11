

# Baserunning IQ Stress Test Plan

## What We'll Do

A comprehensive stress test: bulk-insert 100 lessons + 300 scenarios, simulate 50 concurrent user completions, then run adversarial tests (wrong sport, duplicate IDs, null values). Finally, audit data integrity and report all failures and fixes.

## Pre-Test State
- 5 lessons, 5 scenarios, 0 progress records
- Indexes: PK on all tables, UNIQUE on `(user_id, lesson_id)`, index on `user_id` and `lesson_id`
- No CHECK constraints on `sport` or `level` columns (text fields with defaults)
- No foreign key from `baserunning_progress.user_id` to `auth.users` (by design)

## Execution Steps

### Step 1: Bulk Insert 100 Lessons + 300 Scenarios
- Script generates 100 lessons: 35 baseball, 35 softball, 30 both; mixed levels
- 300 scenarios: 3 per lesson, with valid options arrays and correct_answer matching one option
- Insert via `psql` or migration data insert tool
- Verify counts match exactly

### Step 2: Simulate 50 Concurrent User Completions
- Generate 50 fake user UUIDs
- Insert 50 × random subset of lessons into `baserunning_progress` with `completed=true` and scores
- Test upsert idempotency: re-insert same (user_id, lesson_id) pairs with different scores — confirm UNIQUE constraint handles it (latest wins)
- Check for deadlocks or constraint violations

### Step 3: Data Integrity Audit
- Verify all 300 scenarios have valid `lesson_id` FK references
- Verify all progress records reference existing lessons
- Check completion % calculation correctness for 5 random users
- Confirm sport filtering: `WHERE sport IN ('baseball','both')` returns exactly 65 lessons, `('softball','both')` returns exactly 65

### Step 4: Adversarial Tests

| Test | Expected Result |
|------|----------------|
| Query `sport = 'football'` | 0 rows returned |
| Insert lesson with `sport = NULL` | **PASS** — column is NOT NULL, will reject |
| Insert scenario with non-existent `lesson_id` | **FAIL or PASS** — need to check if FK constraint exists |
| Insert duplicate `(user_id, lesson_id)` progress | Handled by UNIQUE constraint |
| Insert progress with `user_id = NULL` | Rejected — NOT NULL |

### Step 5: Performance Measurement
- Time the lesson list query (100+ lessons with sport filter)
- Time scenario fetch for a single lesson (3 scenarios)
- Time progress fetch for a user with 50 completions

### Step 6: Report
- All pass/fail results
- Identified weak points
- Suggested fixes (likely: add CHECK constraints on sport/level/difficulty, add FK on scenarios.lesson_id if missing)

## Weakness Already Identified (Pre-Test)

1. **No CHECK constraint on `sport`** — any string accepted (e.g., 'football', 'xyz'). Fix: add CHECK constraint.
2. **No CHECK constraint on `level`** — same issue. Fix: add CHECK.
3. **No CHECK constraint on `difficulty`** — same. Fix: add CHECK.
4. **No FK constraint on `baserunning_scenarios.lesson_id`** — need to verify; if missing, orphan scenarios possible.
5. **Missing index on `baserunning_lessons.sport`** — sport filter queries will table-scan at scale. Fix: add index.
6. **Progress completion % counts ALL user progress** regardless of sport filter — could show misleading % if user switches sports.

## Files Changed
None — this is a data-only stress test + migration for constraint fixes.

## Deliverables
- Full pass/fail table for all tests
- Query timing results
- Migration SQL for any fixes needed

