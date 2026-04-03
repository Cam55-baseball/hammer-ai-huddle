

# Implementation Plan: Migration Fix + Handedness Correction

## Current State (Verified)

The previous implementation pass successfully delivered:
- Context detection (`detectGamePracticeGap`), fatigue detection (`detectFatigueDropoff`), session_type tagging, weakness_scores writes, prescription-engine integration, skill-specific effectiveness, Practice Hub pre-fill/banner, and constraint enforcement.

**Two critical gaps remain:**

### Gap 1: Missing Database Columns (Silent Data Loss)
`hie-analyze/index.ts` writes `targeted_metric` (line 1543) and `drill_id` (line 1545) to `drill_prescriptions`, but neither column exists. Supabase silently drops these fields on insert. This breaks:
- Drill-to-catalog linking (`drill_id`)
- The entire skill-specific effectiveness loop (`targeted_metric` is read at line 1553 and always returns `null`, forcing MPI fallback)

### Gap 2: Handedness Blindness
Line 147: `loc.col < midCol` = "inside" regardless of batter side. A left-handed hitter's "inside" is the opposite column range. The system already fetches `primary_batting_side` (line 1357) but never passes it to `analyzeHittingMicro`.

---

## Changes

### 1. Database Migration
Add the two missing columns to `drill_prescriptions`:
```sql
ALTER TABLE public.drill_prescriptions
  ADD COLUMN IF NOT EXISTS drill_id UUID REFERENCES public.drills(id),
  ADD COLUMN IF NOT EXISTS targeted_metric TEXT;
```

### 2. Handedness Fix in `hie-analyze/index.ts`

**Modify `analyzeHittingMicro` signature** (line 55): Add `batterSide` parameter defaulting to `'R'`.

**Modify location bucketing** (lines 142-157): Flip inside/outside for left-handed hitters:
- Right-handed: `col < midCol` = inside, `col > midCol` = outside
- Left-handed: `col < midCol` = outside, `col > midCol` = inside

**Modify the call site** (line 1249): Pass `settings?.primary_batting_side || 'R'` as the third argument. This requires fetching `primary_batting_side` in the settings query (line 1175) — add it to the select.

### Files Modified
| File | Change |
|---|---|
| Migration SQL | Add `drill_id` + `targeted_metric` to `drill_prescriptions` |
| `supabase/functions/hie-analyze/index.ts` | Add `batterSide` param to `analyzeHittingMicro`, flip inside/outside for lefties, update settings select to include `primary_batting_side` |

### Implementation Order
1. Run migration (add columns)
2. Update `hie-analyze` settings query to select `primary_batting_side`
3. Update `analyzeHittingMicro` signature and location bucketing logic
4. Update call site to pass batter side

### Verification
- Query `drill_prescriptions` after next HIE run → `targeted_metric` and `drill_id` columns populated (not null)
- Simulate left-handed hitter with weak contact on `col=0` → should produce `outside_weakness` (not `inside_weakness`)

