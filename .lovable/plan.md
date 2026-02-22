
# Remaining Phases: Iron Bambino Upgrade, Unicorn Program, Edge Functions, Migration, i18n

## Status Check

**Already completed:**
- Database migration (grandfathered_price, grandfathered_at, tier columns)
- `src/constants/tiers.ts` and `src/utils/tierAccess.ts`
- Access control updates (useSubscription, useTexVisionAccess, useGamePlan, useCalendar, Vault)
- Sidebar restructure (AppSidebar.tsx)
- Gateway pages (FiveToolPlayer, GoldenTwoWay, TheUnicorn -- shells only)
- Dashboard, Pricing, Checkout, SelectModules restructure
- `create-checkout` edge function (tier-based)
- App.tsx routes

**Remaining (this implementation):**

---

## Phase 1: Iron Bambino Upgrade -- Arm Care + Velocity Development

**File: `src/data/ironBambinoProgram.ts`**

Add two new exported data blocks integrated into the existing cycle structure:

### 1A. Pre-Lift Arm Care Block (added to every workout day)

A new exported constant `ARM_CARE_BLOCK: Exercise[]` containing:
- Band Pull-Aparts (scap retraction, 3x15)
- Wall Slides (scap upward rotation, 3x10)
- Serratus Push-Up (serratus anterior activation, 3x10)
- Prone Y-T-W Raises (rotator cuff progression, 3x8 each)
- Side-Lying External Rotation (ER strengthening, 3x12 each)
- Prone I Raise (lower trap activation, 3x10)
- Eccentric Wrist Flexor Curl (deceleration/tissue capacity, 3x10 each)
- 90/90 External Rotation Hold (isometric ER, 3x15s each)

### 1B. Deload Week Logic

Add exported constants:
- `DELOAD_VOLUME_MODIFIER = 0.6` (40% reduction)
- `isDeloadWeek(weekNumber: number): boolean` -- returns true for weeks 4, 8, 12, 16, 20, 24

### 1C. Throwing Velocity Development Blocks (2 per cycle)

New exported constants `VELOCITY_DEV_BLOCK_A` and `VELOCITY_DEV_BLOCK_B`:

**Block A (Kinetic Chain + Weighted Ball Intro):**
- Hip-Lead Throws (connection ball work, 2x8)
- Pivot Pickoffs (hip-shoulder separation, 2x8 each)
- Reverse Throws (eccentric/deceleration pattern, 2x6)
- Lightweight Weighted Ball (3oz, constraint drill, 3x8)
- Long Toss Progressive (build to 120ft+, track throw count)

**Block B (Overload/Underload + Intent Throws):**
- Overload Weighted Ball (7-11oz, into wall, 3x6)
- Underload Weighted Ball (2-3oz, intent throws, 3x6)
- Pull-Down Throws (max effort, 3x3)
- Long Toss with Intent (build to max distance, tracked)
- CNS throw count tracker (total throws x intensity coefficient)

Sport-specific notes added: baseball (overhand) vs softball (position player overhand throws).

### 1D. CNS Budget System

New exported types and constants:
- `CNS_BUDGET_DAILY = 100`
- `CNS_COSTS` mapping: strength (25-40), throwing (15-30), sprinting (20-35)
- `calculateDailyCNS(activities)` helper
- `isOverBudget(activities)` helper
- Weekly template constants for 5Tool tier (the 7-day schedule from the plan)

### 1E. Equipment List Update

Add to `HITTING_EQUIPMENT`:
- Weighted baseballs/softballs (2oz to 11oz)
- Therabands/resistance tubes (for arm care)
- Foam roller (for tissue capacity work)

---

## Phase 2: The Unicorn Program Data

**New file: `src/data/unicornProgram.ts`**

Complete merged workout program that combines Heat Factory + Iron Bambino + Speed Lab:

### Structure
- 4 cycles x 6 weeks = 24 weeks, then loops
- 5 training days per week + 2 rest days
- Each day has: Arm Care (always) + Primary Focus + Secondary Focus

### Weekly Template (per cycle, with progressive overload across cycles):

**Day 1: Full Body Strength + Scap/Arm Care**
- Arm Care Block (shared from Iron Bambino)
- Trap Bar Deadlift, Front Squat, Bench Press, Barbell Row, Pallof Press, Isometric holds
- CNS: 35

**Day 2: Pitching Velocity Development + Sprint Work**
- Arm Care Block
- Velocity Dev Block A (weighted balls, long toss)
- Sprint mechanics drills (from Speed Lab: A-skips, wall drives, falling starts)
- Build-up sprints (60-90%)
- CNS: 40

**Day 3: Hitting Power (Bat Speed) + Active Recovery**
- Arm Care Block (light)
- Bat speed work (overload/underload bats from Iron Bambino bat speed sessions)
- Med ball rotational work
- Light mobility/foam rolling
- CNS: 25

**Day 4: REST**

**Day 5: Full Body Strength + Throwing Velocity**
- Arm Care Block
- RDL, Bulgarian Split Squat, Incline Press, Weighted Pull-Up, Cable Woodchop
- Velocity Dev Block B (overload/underload, pull-downs)
- CNS: 40

**Day 6: Speed Lab + Light Arm Care**
- Light Arm Care
- Full Speed Lab session (plyometrics, sprint mechanics, isometrics from speedLabProgram.ts)
- CNS: 25

**Day 7: REST**

### Cycle Progression
- Cycle 1: Foundation (75% intensity base)
- Cycle 2: Development (80-85% intensity)
- Cycle 3: Intensification (82-88% intensity)
- Cycle 4: Peaking (85-90% intensity)
- Then loops back to Cycle 1 with increased base weights

### Exported Constants
- `UNICORN_CYCLES` (array of 4 cycles, each with 5 workout day templates)
- `UNICORN_WEEKLY_CNS_TARGET = 165`
- `UNICORN_DELOAD_MODIFIER = 0.6`
- `UNICORN_RULES` (array of rule strings for display)
- `isUnicornDeloadWeek(weekNumber)` helper
- `calculateUnicornWeeklyCNS(dayActivities[])` helper
- `UNICORN_THROWING_THRESHOLD = 150` (max weekly throws before auto-rest suggestion)

---

## Phase 3: The Unicorn Page Upgrade

**File: `src/pages/TheUnicorn.tsx`**

Upgrade from the current shell (which only shows the weekly template) to a full workout page following the same pattern as ProductionLab (Iron Bambino):

- Import `UNICORN_CYCLES` from the new data file
- Show current cycle + week + day
- Display exercises with sets/reps/weight tracking
- "Workout Complete" button with 24-hour unlock
- CNS budget indicator (progress bar showing daily/weekly load)
- Throwing load tracker (cumulative weekly throws)
- Deload week indicator
- Progress tracking via `sub_module_progress` table (sub_module = 'the-unicorn')

---

## Phase 4: Edge Function Updates

### 4A. `stripe-webhook/index.ts`
- Add tier detection from product metadata (`tier` field)
- Map tier to `subscribed_modules`: pitcher -> `['{sport}_pitcher']`, 5tool -> `['{sport}_5tool']`, golden2way -> `['{sport}_golden2way']`
- Set `tier` column on subscriptions table
- Preserve `grandfathered_price` if already set

### 4B. `check-subscription/index.ts`
- Owner/Admin bypass: keep returning `['hitting', 'pitching', 'throwing']` for backward compat
- No other changes needed (reads from subscribed_modules which now has tier keys)

### 4C. `cancel-module-subscription/index.ts`
- Works as-is since it uses `module_subscription_mapping[sportModule]` -- tier keys will work the same way
- Update log messages to say "tier" instead of "module"

### 4D. `cancel-all-subscriptions/index.ts`
- No structural changes needed -- already iterates all entries in `module_subscription_mapping`

### 4E. `resume-module-subscription/index.ts`
- Same pattern as cancel -- works with tier keys already via `module_subscription_mapping`

### 4F. `ai-chat/index.ts`
- Update the user context section to show tier names instead of raw module keys
- Map `baseball_5tool` -> "5Tool Player (Baseball)" etc. in the system prompt

### 4G. `ai-helpdesk/index.ts`
- Update knowledge base section to reference new tier names and pricing
- Replace references to "Complete Hitter" / "Complete Player" with "5Tool Player"

### 4H. `generate-monthly-report/index.ts`
- No structural changes needed -- reports on `subscribed_modules` which will have the new keys
- The report generation uses video analysis data which is module-type agnostic

### 4I. `search-players/index.ts`
- No changes needed -- this function searches by scout/coach role, not by subscription modules

---

## Phase 5: Migration Edge Function

**New file: `supabase/functions/migrate-to-tiers/index.ts`**

One-time admin function (requires owner authorization):

1. Read all users with active subscriptions
2. Apply migration rules:
   - Both `{sport}_hitting` + `{sport}_throwing` -> `{sport}_5tool` (grandfathered at original combined price)
   - All three -> `{sport}_golden2way` (grandfathered)
   - Only `{sport}_hitting` or `{sport}_throwing` -> `{sport}_5tool` (grandfathered at $200)
   - Only `{sport}_pitching` -> `{sport}_pitcher` (no change)
3. Update `subscribed_modules`, `tier`, `grandfathered_price`, `grandfathered_at`
4. Log all changes to `audit_log`
5. Does NOT modify Stripe subscriptions

---

## Phase 6: i18n Updates

**All 8 locale files** (`en.json`, `es.json`, `fr.json`, `de.json`, `ja.json`, `ko.json`, `nl.json`, `zh.json`):

Add keys for:
- `tiers.pitcher.name`, `tiers.pitcher.description`
- `tiers.5tool.name`, `tiers.5tool.description`
- `tiers.golden2way.name`, `tiers.golden2way.description`
- `unicorn.title`, `unicorn.description`, `unicorn.rules.*`
- `armCare.title`, `armCare.exercises.*`
- `velocityDev.title`, `velocityDev.exercises.*`
- `cns.budget`, `cns.overBudget`, `cns.deloadWeek`

---

## Implementation Order

1. Iron Bambino data upgrade (arm care + velocity blocks + CNS system)
2. Unicorn program data file
3. TheUnicorn.tsx page upgrade
4. Edge function updates (stripe-webhook tier detection, ai-chat/helpdesk context)
5. Migration edge function
6. i18n updates

---

## File Summary

| File | Action |
|------|--------|
| `src/data/ironBambinoProgram.ts` | UPDATE -- arm care block, velocity blocks, CNS system, deload logic |
| `src/data/unicornProgram.ts` | NEW -- complete merged program (4 cycles x 6 weeks) |
| `src/pages/TheUnicorn.tsx` | UPDATE -- full workout page with progress tracking |
| `supabase/functions/stripe-webhook/index.ts` | UPDATE -- tier detection from product metadata |
| `supabase/functions/ai-chat/index.ts` | UPDATE -- tier-aware context in system prompt |
| `supabase/functions/ai-helpdesk/index.ts` | UPDATE -- tier names in knowledge base |
| `supabase/functions/migrate-to-tiers/index.ts` | NEW -- one-time migration function |
| `src/i18n/locales/*.json` (8 files) | UPDATE -- tier + unicorn + arm care keys |

**Note:** The 4 Stripe price IDs for 5Tool and Golden 2Way are still needed. The `create-checkout` function currently has `PENDING_*` placeholders. Please provide these when ready.
