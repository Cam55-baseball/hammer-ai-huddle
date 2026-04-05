

# System Validity Verification — 3 Unresolved Gaps

## 1. EFFECTIVENESS ENGINE — REAL LEARNING

### Current Production State (Athlete 95de827d)

All 3 active prescriptions show `effectiveness_score = 0`:

```text
targeted_metric          | pre_weakness_value | post_weakness_value | effectiveness_score
slow_reaction_time       | 656                | 656                 | 0
vision_accuracy_low      | 36                 | 36                  | 0
tool_gap_run_physical    | 17                 | 17                  | 0
```

### Why: No Learning Has Occurred

The effectiveness engine formula (L1764): `effectiveness_score = pre_weakness_value - currentWS.score`

For this to produce a non-zero result, the athlete's **weakness_score must change between HIE runs**. The weakness_score changes ONLY when the **underlying session data produces different pattern values**.

This athlete's 9 sessions have identical composite_indexes across recent runs (BQI=50, Decision=50, PEI=52.5 for the last 4 sessions). The same input → same patterns → same weakness_scores → effectiveness_score = 0.

### What Would Trigger Real Learning

A new session with different performance data (e.g., BQI=65 instead of 50) would:
1. Change the composite averages
2. Produce different pattern values (e.g., vision_accuracy_low score drops from 36 to 28)
3. `effectiveness_score = 36 - 28 = 8` (positive = improvement)

### Verdict

**The calculation is correct. The system is NOT learning because no new training data has been added.** The engine is a stateless recomputation — it recalculates from scratch each run. "Learning" requires the athlete to actually train and log new sessions with different performance data.

### Proof Plan

To prove real learning, we will:
1. Add one new session for the athlete with improved composite values (e.g., BQI=65)
2. Run `hie-analyze`
3. Show that `weakness_scores` change and `effectiveness_score ≠ 0`

This is a data operation, not a code change.

---

## 2. CONTEXT ENGINE — NON-BINARY USAGE

### Current Production State

```text
Total sessions: 18
Game sessions:  0
```

### Code Truth (L533)

```typescript
if (gameReps.length < 5 || practiceReps.length < 5) return [];
```

**Context has ZERO effect until the threshold is met.** This is binary — not gradual. There is no partial influence from 3 game reps. The function returns an empty array and the pattern is never generated.

### Is This a Bug?

No. It is a deliberate design choice to prevent noisy signals from insufficient sample sizes. With 3 game reps, any weak-contact percentage would be statistically meaningless (1 bad rep = 33% swing).

### What We Can Verify

- Confirm that `_session_type` is correctly attached to reps (code trace at L1415 already verified)
- Confirm that with 0 game sessions, `detectGamePracticeGap` returns `[]` — which it does
- Confirm that context has no hidden influence elsewhere in the pipeline

### Other Context Usage

`_session_type` is ONLY used in `detectGamePracticeGap`. It does not influence:
- Vision accuracy detection
- Reaction time detection
- Fatigue drop-off detection
- Tool gap detection
- Sorting weights (except via the `game_gap` context tag after pattern generation)

### Verdict

**Context has zero effect until ≥5 game reps AND ≥5 practice reps.** This is confirmed by code and production data. There is no partial or gradual influence. This is intentional.

---

## 3. CONTINUATION TOKEN — REAL RESUME VALIDATION

### Current Production State

```text
Continuation tokens in audit_log: 0
Timeout events in audit_log: 0
```

The system has never timed out because only 3 athletes exist. Processing completes in <1 second.

### Why We Cannot Simulate Live

The timeout check (L252) uses `Date.now() - nightlyStartTime > 50000`. To force a timeout we would need to either:
- Add 100+ athletes with session data (not feasible as a test)
- Modify the edge function to lower the timeout threshold (code change to production)

### What We Can Prove

**Code-level correctness** (already verified):
- Read token: L233-238 queries `audit_log` for `nightly_mpi_continuation` within last 24h
- Set resume index: L241-248 sets `resumeFrom` from token metadata
- Loop starts at `resumeFrom`: L250 `for (let batchStart = resumeFrom; ...)`
- Write token on timeout: L262-267 stores `resume_from: batchStart`

**Edge cases handled:**
- No token exists → `resumeFrom = 0` (default)
- Stale token (>24h) → filtered out by `gte('created_at', oneDayAgo)`
- Wrong sport → filtered by `contMeta?.sport === sport`
- Non-numeric resume_from → filtered by `typeof contMeta?.resume_from === 'number'`

### Proposed Simulation

Create a **test-only edge function** (`hie-verify-continuation`) that:
1. Inserts a fake continuation token with `resume_from: 2`
2. Calls `nightly-mpi-process` 
3. Checks that the first batch starts at index 2 (via audit_log output)
4. Cleans up the fake token

This would prove resume behavior without modifying production code.

### Verdict

**Cannot be proven with real data at current scale.** Code trace is complete and correct. Live simulation requires either a test harness edge function or sufficient athlete volume to trigger a real timeout.

---

## Implementation Plan

| Step | Action | Type |
|------|--------|------|
| 1 | Insert a new session for athlete `95de827d` with improved composites (BQI=65) | Data operation |
| 2 | Run `hie-analyze` for the athlete | Edge function call |
| 3 | Query `weakness_scores` and `drill_prescriptions` to show `effectiveness_score ≠ 0` | DB query |
| 4 | Confirm context engine returns `[]` with 0 game reps (already proven) | No action needed |
| 5 | Create `hie-verify-continuation` edge function for resume simulation | New edge function |
| 6 | Run continuation test: insert token → invoke nightly → verify start index | Edge function call |

## Files

| File | Change |
|------|--------|
| `supabase/functions/hie-verify-continuation/index.ts` | New edge function for continuation token simulation |
| No changes to existing edge functions | Verification only |
| No schema changes | Data operations only |

