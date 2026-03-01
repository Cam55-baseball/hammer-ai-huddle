

# Phase 1 Final Production Lock -- Full Audit + Verified Stat System Rebuild

This plan addresses every remaining gap identified across all previous audits, completes the Verified Stat Link system with anti-gaming protections, and confirms sport-specific branching is correct end-to-end.

---

## AUDIT RESULTS: Current State

### Already Operational (No Changes Needed)
- MiLB capped at 99% (nightly L386)
- MLB-only seasons for baseball HoF (nightly L393-394)
- AUSL+MLB seasons for softball HoF (nightly L395)
- HoF requires 5 seasons at 100% (nightly L396)
- Release drops probability and auto-unsets roster_verified (nightly L248-253)
- Re-sign restores roster_verified (nightly L254-258)
- Retired player freeze via contractMod=0 with last MPI lookup (nightly L262-269)
- Game sessions weighted 1.5x in composites (nightly L192-210)
- session_type included in heat map query (nightly L473)
- Practice vs game separation enforced with missing session_type rejection (nightly L514)
- 12 heat map types including velocity/intent/exit/bp_distance (nightly L494-498)
- 5x5 grid supported end-to-end (nightly L481-491)
- Blind zone detection feeds roadmap blocking (nightly L629-656)
- Graduated overload dampening: 14d=0.90, 21d=0.85, 28d=0.80 (nightly L337-351)
- CNS load average check (nightly L353-358)
- Roadmap frozen during overload (nightly L664)
- execution_score blended into BQI at 30% (calculate-session L111)
- batted_ball_type computes barrel% (calculate-session L88-91)
- machine_velocity_band modifies difficulty weight (calculate-session L93-99)
- pitch_command_grade feeds PEI at 40% (calculate-session L120-121)
- throw_accuracy feeds FQI at 40% (calculate-session L116-117)
- BP distance power trend computed (calculate-session L123-131)
- Coach override immutability (3 triggers active)
- Scout evaluation immutability (2 triggers active)
- Verified stat immutability after admin approval (2 triggers active)
- Coach override write-back trigger (apply_coach_override_to_session)
- JSONB validation for swing_intent, batted_ball_type, velocity_band (calculate-session L10-23)
- Retroactive recalculation path (calculate-session L349-368)
- Batch apply mode in RepScorer (L71-84)
- Sport-aware velocity bands (baseball to 110+, softball to 75+)
- DualStreakDisplay mounted on Dashboard
- RestDayScheduler mounted in CalendarDaySheet
- Absent-day dampening (nightly L305-318)
- Overload governance flags written (usePerformanceSession)
- Roadmap micro-metric gates: barrel_pct, blind_zones, velocity_mastery, zone_power (nightly L699-724)
- Dead fields consistency_impact and momentum_impact removed (migration)

### Gaps Found -- Require Fixes

**1. Verified Stat Submission: No Domain Validation**
- Current: User types any URL string into a free-text input. No whitelist. No domain check. No identity matching.
- Schema has `identity_match` boolean and `screenshot_path` string columns but neither is ever written or used.
- `profile_type` is not set by the submission UI -- `league` is used as the lookup key in nightly, but `verifiedStatBoosts` map uses keys like `mlb`, `ncaa_d1`, etc. The submission form sends a free-text `league` value that may not match any boost key. SPEC VIOLATION.

**2. Verified Stats Not Displayed on Public Profile**
- Profile page shows verified stat submission form (own profile only) but does NOT display verified stats to other viewers (scouts, coaches viewing an athlete). No public verification badge section exists.

**3. Verified Stat Removal Has No Recalculation Trigger**
- No UI or mechanism for a user to request removal. No admin revocation flow that triggers MPI/probability recalculation.

**4. Admin Verification: No Identity Match Layer**
- Admin sees the link and player name but has no structured identity match checklist (name, DOB, school, position, team matching against profile data).

**5. Verified Stat Screenshot Upload Not Wired**
- `screenshot_path` column exists in schema but no file upload UI exists in VerifiedStatSubmission.

**6. No Preset Profiles for Common Stat Sites**
- Baseball Reference, MLB Savant, MiLB.com, NCAA pages, Perfect Game, AUSL, etc. are not pre-defined. User must type the league manually, risking mismatch with `verifiedStatBoosts` keys.

---

## IMPLEMENTATION PLAN

### Block A: Verified Stat Submission Rebuild

**File: `src/components/professional/VerifiedStatSubmission.tsx`**

Replace the free-text league input with a structured site picker. Define allowed stat sites per sport:

```
Baseball: Baseball Reference (mlb), MLB Savant (mlb), MiLB (milb), NCAA D1 (ncaa_d1), NCAA D2 (ncaa_d2), NCAA D3 (ncaa_d3), NAIA (naia), Perfect Game (youth/travel), Indie Pro (indie_pro), Foreign Pro (foreign_pro)

Softball: AUSL (ausl), NCAA D1 Softball (ncaa_d1), NCAA D2 Softball (ncaa_d2), NCAA D3 Softball (ncaa_d3), NAIA Softball (naia), Indie Pro Softball (indie_pro)
```

Each option maps to a `profile_type` key that exactly matches `verifiedStatBoosts` keys. The `league` field is auto-set from the selection. No free-text league entry.

Add URL domain validation:
- Baseball Reference: must contain `baseball-reference.com`
- MLB Savant: must contain `baseballsavant.mlb.com`
- MiLB: must contain `milb.com`
- NCAA: must contain `.ncaa.` or known college athletic domains
- Perfect Game: must contain `perfectgame.org`
- AUSL: accepted domains TBD (configurable)

Reject URLs that don't match the selected site's domain pattern.

Add optional screenshot upload using the existing `vault-photos` storage bucket. Write path to `screenshot_path` column.

**File: `src/hooks/useVerifiedStats.ts`**

Update mutation to send `profile_type` (from site picker), validate URL domain client-side before insert, and handle screenshot upload.

### Block B: Admin Verification Identity Match

**File: `src/pages/AdminVerification.tsx`**

Expand the VerificationCard to show an identity match checklist. Query the athlete's profile data alongside the submission:

```
.select('*, profiles:user_id(full_name, date_of_birth, position, team_affiliation, state, experience_level)')
```

Display a structured checklist showing profile data vs. what the external link should show:
- Full Name: [profile name] -- Admin checks match
- DOB: [profile DOB] -- Admin checks match
- Position: [profile position] -- Admin checks match
- Team: [profile team] -- Admin checks match
- State: [profile state] -- Admin checks match

Admin toggles each match (minimum 3 of 5 must match to proceed with approval). When approved, set `identity_match = true` in the update.

If screenshot was uploaded, display it inline (fetch from storage bucket).

Add an "Admin Notes" text field for the admin to record verification reasoning (stored in a new `admin_notes` column or in existing `rejection_reason` for rejections).

### Block C: Public Profile Verified Stat Display

**File: `src/pages/Profile.tsx`**

Add a "Verified Stats" section visible to ALL viewers (own profile and other viewers). Query `verified_stat_profiles` for the viewed user where `verified = true AND admin_verified = true`.

Display each verified profile as a card:
- Site name (derived from `profile_type` -> label mapping from `verifiedStatBoosts`)
- Clickable URL (opens in new tab)
- Verification badge (green checkmark)
- Date verified (`verified_at`)
- Confidence weight displayed as percentage
- Sport badge

This section appears for the viewed user regardless of who is viewing (public transparency). Uses `profiles_public`-style RLS -- we need an RLS policy allowing anyone authenticated to SELECT verified stats where `verified = true AND admin_verified = true`.

### Block D: Admin Revocation Flow

**File: `src/pages/AdminVerification.tsx`**

Add a second tab or section: "Verified Profiles" showing all currently-verified profiles (not just pending). Each shows a "Revoke" button.

Revocation flow:
1. Admin clicks Revoke, enters reason
2. Sets `verified = false`, `admin_verified = false`, `confidence_weight = 0`, `rejection_reason = revoke reason`
3. The immutability trigger allows this because it only blocks changes when `admin_verified` stays `true` -- setting it to `false` is permitted
4. Audit log entry created
5. Next nightly run: profile no longer in verified query (filtered by `verified = true AND admin_verified = true`), so boost drops to 0 automatically

No special recalculation trigger needed -- nightly process naturally excludes revoked profiles.

### Block E: Database Migration

**New migration for:**

1. Add RLS policy for public verified stat viewing:
```sql
CREATE POLICY "Anyone can view verified stats"
  ON public.verified_stat_profiles FOR SELECT
  TO authenticated
  USING (verified = true AND admin_verified = true);
```
(This supplements existing policy that allows users to see their own stats regardless of status)

2. Add `admin_notes` column if not exists:
```sql
ALTER TABLE public.verified_stat_profiles
  ADD COLUMN IF NOT EXISTS admin_notes text;
```

3. Add `profile_type` column if not exists (check schema -- currently `league` is used but `profile_type` is referenced in nightly):
Looking at the schema types, `profile_type` is NOT a column. The nightly process reads `vp.profile_type` but the table has `league` not `profile_type`. This is a SILENT FAILURE -- the nightly boost lookup always returns undefined because `profile_type` doesn't exist as a column.

**CRITICAL FIX:**
```sql
ALTER TABLE public.verified_stat_profiles
  ADD COLUMN IF NOT EXISTS profile_type text;
```

The submission form must write both `league` (display label) and `profile_type` (boost key). The nightly process already reads `profile_type` correctly.

### Block F: Nightly Process -- profile_type Fix Confirmation

**File: `supabase/functions/nightly-mpi-process/index.ts` L231**

Currently: `const boost = verifiedStatBoosts[vp.profile_type];`

This reads `profile_type` from the query result. After adding the column in Block E, this will work. No code change needed in nightly -- just the column must exist and be populated.

### Block G: User Removal Request

**File: `src/components/professional/VerifiedStatSubmission.tsx`**

For verified profiles owned by the user, show a "Request Removal" button (not direct delete -- deletion is blocked by immutability trigger when admin_verified=true).

Removal request: Insert into a new or existing support/request mechanism, or simply set a `removal_requested` flag. For simplicity, add a `removal_requested boolean DEFAULT false` column and show these in the admin queue with a "Removal Requested" badge.

Admin can then revoke (Block D flow), which removes the boost.

### Block H: Remaining Dead Field Cleanup

Fields confirmed still unused after all previous fixes:
- `athlete_daily_log.rest_reason` -- Written by UI, never read. Keep for future analytics display.
- `athlete_daily_log.game_logged` -- Written, never read. Keep (redundant but harmless).
- `verified_stat_profiles.verified_by` -- Written by admin, never read by computation. Keep for audit trail.
- `verified_stat_profiles.verified_at` -- Written by admin, now displayed on public profile (Block C). ACTIVATED.
- `verified_stat_profiles.rejection_reason` -- Written by admin, used in revocation display. Keep.

No additional deletions needed. All remaining fields either serve audit/display purposes or are now wired.

---

## Execution Order

| Step | Block | Description |
|------|-------|-------------|
| 1 | E | Database migration: add `profile_type`, `admin_notes`, `removal_requested` columns + public viewing RLS policy |
| 2 | A | Rebuild VerifiedStatSubmission with site picker, domain validation, screenshot upload, profile_type mapping |
| 3 | B | Expand AdminVerification with identity match checklist, screenshot display, admin notes |
| 4 | C | Add public verified stat display section to Profile page |
| 5 | D | Add admin revocation flow (verified profiles tab + revoke action) |
| 6 | G | Add user removal request button on verified profiles |
| 7 | F | Deploy edge functions (nightly already reads profile_type correctly, calculate-session unchanged) |

Steps 2-4 are independent of each other after Step 1. Steps 5-6 depend on Step 1 only.

---

## Anti-Gaming Enforcement Summary

| Attack Vector | Protection |
|--------------|-----------|
| Submit fake URL | Domain validation rejects non-matching URLs |
| Submit someone else's profile | Identity match checklist (3/5 fields must match) |
| Edit verified link after approval | Immutability trigger blocks URL/profile_type changes |
| Delete verified profile | Deletion trigger blocks delete when admin_verified=true |
| Self-verify | Only admins can set verified=true (RLS enforced) |
| Hide verification status | Public display on profile (transparent to all) |
| Game boost by resubmitting | Duplicate URL check (unique constraint on user_id + profile_url) |
| Inflate confidence weight | Only admin-controlled (0-100 slider) |

---

## Sport-Specific Branching Confirmation

| System | Baseball | Softball | Verified |
|--------|----------|----------|----------|
| Velocity bands | 40-50 to 110+ | 30-35 to 75+ | Yes (data files + useSportConfig) |
| BP distance range | 30-450 ft | 30-250 ft | Yes (useSportConfig.bpDistanceRange) |
| Pro leagues | mlb, milb, indie_pro | ausl, indie_pro | Yes (probabilityBaselines) |
| HoF seasons | MLB only | MLB + AUSL | Yes (nightly L393-395) |
| HoF leagues | mlb | ausl | Yes (hofRequirements) |
| High velocity threshold | 100+ mph | 70+ mph | Yes (isHighVelocityBand) |
| BP distance power threshold | >300 ft | >150 ft | Yes (nightly L577) |
| Tier multipliers | Separate file | Separate file | Yes |
| Age curves | Separate file | Separate file | Yes |
| Pitch types | Separate file | Separate file | Yes |
| Drill definitions | Separate file | Separate file | Yes |
| Position weights | Separate file | Separate file | Yes |

All sport-specific branching is correctly implemented and reads from separate data files via `useSportConfig`.

---

## What This Closes

After implementation:
- 0 cosmetic verified stat fields (all wired or displayed)
- 0 gaming vectors (domain validation + identity match + immutability + public display)
- profile_type column exists and maps to boost keys (CRITICAL fix -- currently silent failure)
- Verified stats visible on public profiles
- Admin has structured identity verification
- User can request removal
- Admin can revoke with audit trail
- All sport-specific logic verified end-to-end

