
# Full-Sweep: Activate All Missing Pieces

This plan addresses every gap identified in the System Architecture Report where data models exist but logic is not connected, UI components exist but are never rendered, or specifications were defined but simplified.

---

## What is Missing (Summary)

The app has strong data models and UI components but critical backend logic is disconnected. Specifically:

1. **Verified stat boosts** -- defined in `verifiedStatBoosts.ts` but never applied in `nightly-mpi-process`
2. **Contract status modifiers** -- defined in `contractStatusRules.ts` but never applied in nightly process
3. **Age curve multipliers** -- defined in `ageCurves.ts` for both sports but never applied in nightly process
4. **Position weight multipliers** -- defined in `positionWeights.ts` but never applied
5. **Arbitration Panel** -- component exists (`ArbitrationPanel.tsx`) but is never rendered in any page
6. **Scout evaluations not feeding MPI** -- `scout_evaluations` table exists, `useGradeHierarchy` queries it, but nightly process ignores scout grades
7. **Integrity rebuild rate** -- defined as `+0.5 per verified session` in `integrityRules.ts` but nightly only deducts, never rebuilds
8. **HoF probability tracking** -- `hof_probability` and `hof_tracking_active` columns exist in `mpi_scores` but nightly process never sets them
9. **Fatigue correlation flag** -- `fatigue_correlation_flag` column exists in `mpi_scores` but never computed
10. **Delta maturity index** -- column exists in `mpi_scores` but never computed
11. **Game-practice ratio** -- column exists in `mpi_scores` but never computed
12. **Verified stat boost column** -- exists in `mpi_scores` but never computed
13. **Contract status modifier column** -- exists in `mpi_scores` but never computed
14. **Additional governance flag types** -- only `inflated_grading` and `volume_spike` are triggered in `calculate-session`, but 14 types are defined in `integrityRules.ts`
15. **Rankings loading skeleton** -- no loading indicator during filter changes
16. **Arbitration/appeal submission** -- no player-facing UI to request an arbitration or upload video evidence
17. **Organization Dashboard** -- page exists but doesn't integrate InviteCodeCard or JoinOrganization components

---

## Implementation Plan (7 Batches)

### Batch 1: Nightly Process -- Apply All Scoring Modifiers

Update `nightly-mpi-process/index.ts` to use the full spec scoring pipeline:

**Age curve multiplier:**
- Read `date_of_birth` from `athlete_mpi_settings`
- Calculate age, apply sport-specific age curve multiplier to `adjustedScore`

**Verified stat boost:**
- Query `verified_stat_profiles` for verified profiles (where `verified = true`)
- Apply `competitiveBoost` and `validationBoost` from `verifiedStatBoosts.ts` mapping
- Store the boost value in `mpi_scores.verified_stat_boost`

**Contract status modifier:**
- Query `athlete_professional_status` for `contract_status` and `release_count`
- Apply rules: free agent = -5%, released = penalty per `contractStatusRules`, retired = freeze, IL = 0.9x
- Store in `mpi_scores.contract_status_modifier`

**Position weight:**
- Read `primary_position` from `athlete_mpi_settings`
- Apply position weight multiplier from `positionWeights.ts`

**Scout evaluation weighting:**
- Query latest `scout_evaluations` for each athlete
- If scout grade exists, blend it into the effective grade calculation with a weight
- Multiple scout submissions average together

**Game-practice ratio:**
- Count game vs practice sessions in 90-day window
- Store ratio in `mpi_scores.game_practice_ratio`

**Delta maturity index:**
- Calculate standard deviation of player-coach grade deltas over recent sessions
- Lower = more mature (smaller self-assessment gap over time)
- Store in `mpi_scores.delta_maturity_index`

**Fatigue correlation flag:**
- Cross-reference `fatigue_state_at_session` with `effective_grade`
- If high fatigue + high grades consistently, set `fatigue_correlation_flag = true`

**HoF probability tracking:**
- Query `athlete_professional_status` for MLB/AUSL season counts
- If `pro_probability >= 100` AND total pro seasons >= 5: set `hof_tracking_active = true`
- Calculate `hof_probability` based on consistency metrics

**Integrity rebuild:**
- For each verified session (has coach grade), add +0.5 to integrity score (capped at 100)
- This supplements the current deduction-only logic

### Batch 2: Enhanced Governance Flags in calculate-session

Add detection for missing flag types from `integrityRules.ts`:

- **Fatigue inconsistency**: If `fatigue_state.body <= 2` (tired/hurting) AND `execution_grade > 60`, flag as info
- **Retroactive abuse**: If `is_retroactive = true` AND user has > 3 retroactive sessions in 7 days, flag as warning
- **Grade consistency**: If last 10 sessions all have grades within 5-point band, flag as info (no differentiation)
- **Rapid improvement**: If composite average increased > 20% vs 7 days ago, flag as info
- **Game inflation**: If game session grades are > 15 points above practice average, flag as warning

### Batch 3: Arbitration and Appeal System

**Player-facing appeal submission:**
- Create `src/components/authority/AppealSubmission.tsx`
  - Player can select a session, describe the dispute, optionally upload video evidence to `scout-videos` bucket
  - Creates a governance flag with type `arbitration_request` and severity `info`
  - Stores video URL in flag details

**Admin arbitration view:**
- Integrate `ArbitrationPanel.tsx` into `AdminDashboard.tsx` (or a session detail view)
  - Shows session grades, coach overrides, player grades, delta
  - Admin can Accept (keep grade), Adjust (set new grade), or Reject (revert)
  - Resolve action updates the governance flag and optionally the session's effective grade

**Session detail dialog updates:**
- Add "Dispute Grade" button to `SessionDetailDialog.tsx` (visible to players)
- Opens AppealSubmission flow

### Batch 4: Organization Dashboard Integration

**OrganizationDashboard.tsx updates:**
- Render `InviteCodeCard` for org owners/coaches
- Render `JoinOrganization` for players who aren't in an org
- Show team-level aggregated stats:
  - Average MPI, trend distribution, session count
  - Member list with `OrganizationMemberList` (already fixed with names)
- Ensure `primary_coach_id` is set on athlete's `athlete_mpi_settings` when they join an org (using the org owner as coach)

**Player org membership display:**
- On player Dashboard or Profile, show "Member of [Org Name]" badge
- Query `organization_members` where `user_id = auth.uid()` and join with `organizations`

### Batch 5: Rankings Loading Skeleton + Filter UX

- Add `loading` state display in Rankings during segment filter changes
- Show `Skeleton` components matching the table layout while data loads
- Prevent blank screen flash

### Batch 6: Additional Nightly Analytics

**Heat map expansion (beyond pitch location):**
The nightly process currently generates only `pitch_location` type heat maps. Add:
- `swing_chase` -- zone-based chase rate (swings at pitches outside the strike zone)
- `barrel_zone` -- zones where barrel contact occurs most
- `throw_accuracy` -- for fielding module, grid of throw outcomes

These all derive from `micro_layer_data` in the same aggregation pass.

**Split-based heat maps:**
- Generate separate heat map snapshots per `batting_side_used` (L/R)
- Generate separate heat map snapshots per `throwing_hand_used`
- Store with appropriate `split_key` values

### Batch 7: Pro Probability Refinement

Current logic: `Math.min(99, score * 1.1)` -- this is a simplified placeholder.

Replace with tiered threshold logic from `probabilityBaselines.ts`:
- Map score to probability using `tierThresholds` (elite/high/above_average/average/developing/entry)
- Interpolate between threshold boundaries for smooth probability curve
- Cap at 99% for non-verified athletes
- Only reach 100% with verified MLB/AUSL active roster confirmation
- Apply release penalty from `contractStatusRules` to reduce probability
- Free agent status reduces by 5%

---

## Technical Details

### Nightly Process Score Formula (Updated)

```text
rawScore = (BQI*0.25 + FQI*0.15 + PEI*0.20 + Decision*0.20 + Competitive*0.20)
tierAdjusted = rawScore * tierMultiplier
ageAdjusted = tierAdjusted * ageCurveMultiplier
positionAdjusted = ageAdjusted * positionWeight
verifiedBoosted = positionAdjusted + verifiedStatBoost
contractModified = verifiedBoosted * contractModifier
integrityScaled = contractModified * (integrityScore / 100)
finalScore = integrityScaled
```

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/nightly-mpi-process/index.ts` | Major: add age curves, position weights, verified boosts, contract modifiers, scout eval blending, HoF tracking, fatigue correlation, delta maturity, game-practice ratio, integrity rebuild, heat map expansion, pro probability refinement |
| `supabase/functions/calculate-session/index.ts` | Add 5 new governance flag detections |
| `src/components/authority/AppealSubmission.tsx` | NEW: player-facing dispute UI |
| `src/pages/ProgressDashboard.tsx` | Add appeal button to session details |
| `src/pages/AdminDashboard.tsx` | Integrate ArbitrationPanel for admin review |
| `src/pages/OrganizationDashboard.tsx` | Integrate InviteCodeCard, JoinOrganization, team stats |
| `src/pages/Rankings.tsx` | Add loading skeleton during filter changes |
| `src/pages/Dashboard.tsx` | Show org membership badge for players |
| `src/hooks/usePlayerOrganization.ts` | NEW: query player's org membership |

### Database Changes

No new tables needed. All columns already exist in `mpi_scores`, `performance_sessions`, `athlete_mpi_settings`, `athlete_professional_status`, `verified_stat_profiles`, and `governance_flags`. The milestones are already seeded (14 rows confirmed).

---

## Implementation Order

```text
Batch  Description                                 Effort    Impact
-----  ------------------------------------------  --------  ------
1      Nightly scoring modifiers (full pipeline)    Large     Critical -- activates 8 dormant columns
2      Enhanced governance flags                    Medium    High -- 5 new flag detections
3      Arbitration/appeal system                    Medium    High -- player dispute flow
4      Organization dashboard integration           Medium    High -- team experience
5      Rankings loading skeleton                    Small     Polish
6      Heat map expansion + splits                  Medium    Data completeness
7      Pro probability refinement                   Medium    Accuracy improvement
```

All changes use existing database schema. No migrations required. Edge functions will be redeployed after changes.
