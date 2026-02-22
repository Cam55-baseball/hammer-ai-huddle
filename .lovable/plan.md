
# HAMMERS MODALITY -- TIER RESTRUCTURE + ELITE PROGRAM EXPANSION

## Overview

Replace the current 3 separate $200 module model (hitting, pitching, throwing) with 3 tiered subscription packages, add new training programs (arm care, velocity development, The Unicorn), migrate existing users, and restructure all access control, sidebar, pricing, Stripe integration, and dashboard UI.

---

## PHASE 1: DATABASE + STRIPE FOUNDATION

### 1A. Database Migration

Add columns to `subscriptions` table:

- `grandfathered_price` (text, nullable) -- original Stripe price ID for grandfathered users
- `grandfathered_at` (timestamptz, nullable) -- when user was grandfathered
- `tier` (text, nullable) -- 'pitcher', '5tool', 'golden2way' for quick lookups

No structural changes to `subscribed_modules` -- it will now store values like `baseball_5tool`, `softball_golden2way`, `baseball_pitcher` (replacing the old `baseball_hitting`, etc.).

### 1B. New Stripe Products (User Provides Price IDs)

You will create 6 new Stripe products/prices (2 sports x 3 tiers):

| Tier | Baseball Price ID | Softball Price ID | Monthly |
|------|------------------|------------------|---------|
| Complete Pitcher | (existing) | (existing) | $200 |
| 5Tool Player | (you provide) | (you provide) | $300 |
| The Golden 2Way | (you provide) | (you provide) | $400 |

The existing pitching price IDs remain unchanged.

### 1C. Tier Access Mapping (Constants File)

Create `src/constants/tiers.ts`:

```text
TIER_CONFIG:
  pitcher:
    key: 'pitcher'
    displayName: 'Complete Pitcher'
    price: 200
    grantedAccess: ['pitching']
    includes: Pitching Analysis, Heat Factory, Ask the Coach, Vault

  5tool:
    key: '5tool'
    displayName: '5Tool Player'
    price: 300
    grantedAccess: ['hitting', 'throwing']
    includes: Hitting Analysis, Throwing Analysis, Iron Bambino (upgraded),
              Speed Lab, Tex Vision, Ask the Coach, Vault

  golden2way:
    key: 'golden2way'
    displayName: 'The Golden 2Way'
    price: 400
    grantedAccess: ['hitting', 'pitching', 'throwing']
    includes: Everything from Pitcher + 5Tool, The Unicorn workout system
```

---

## PHASE 2: ACCESS CONTROL REFACTOR

### 2A. Update `useSubscription.ts`

Add tier-aware helper methods:

- `hasTierAccess(tier: string, sport: string)` -- checks if user has a specific tier
- `hasFeatureAccess(feature: string, sport: string)` -- maps features to tiers

The `hasModuleForSport` and `hasAccessForSport` functions get updated to understand new keys:

- `{sport}_pitcher` grants pitching access
- `{sport}_5tool` grants hitting + throwing access
- `{sport}_golden2way` grants hitting + pitching + throwing access

**Backward compatibility**: If legacy keys (`baseball_hitting`, etc.) are still in `subscribed_modules`, they continue to work during migration.

### 2B. Update `useTexVisionAccess.ts`

Change from checking `m.includes('hitting')` to also checking for `5tool` and `golden2way`:

```text
hasHittingAccess = modules.some(m =>
  m.includes('hitting') || m.includes('5tool') || m.includes('golden2way')
)
```

### 2C. Update `useGamePlan.ts`

Same pattern -- `hasHittingAccess`, `hasPitchingAccess`, `hasThrowingAccess` all get tier-aware checks:

```text
hasHittingAccess = modules.some(m =>
  m.includes('hitting') || m.includes('5tool') || m.includes('golden2way')
)
hasPitchingAccess = modules.some(m =>
  m.includes('pitching') || m.includes('pitcher') || m.includes('golden2way')
)
hasThrowingAccess = modules.some(m =>
  m.includes('throwing') || m.includes('5tool') || m.includes('golden2way')
)
```

### 2D. Update `useCalendar.ts`, `Vault.tsx`, `VaultPerformanceTestCard.tsx`

All files that check `m.includes('hitting')` etc. get the same tier-aware pattern.

### 2E. Create Access Helper

Create `src/utils/tierAccess.ts` with a single reusable function:

```text
hasAccess(modules, accessType):
  hitting:  'hitting' OR '5tool' OR 'golden2way'
  pitching: 'pitching' OR 'pitcher' OR 'golden2way'
  throwing: 'throwing' OR '5tool' OR 'golden2way'
```

All hooks and components will use this centralized helper to avoid scattered logic.

---

## PHASE 3: STRIPE INTEGRATION UPDATE

### 3A. Update `create-checkout` Edge Function

Replace the current per-module checkout with tier-based checkout:

- Accept `tier` and `sport` instead of `modules[]`
- Map tier to the correct Stripe price ID
- Single line item per checkout (one tier = one subscription)

Price ID mapping:

```text
TIER_PRICES:
  pitcher:
    baseball: (existing price_1SKpoEGc...)
    softball: (existing price_1SPBwcGc...)
  5tool:
    baseball: (user provides)
    softball: (user provides)
  golden2way:
    baseball: (user provides)
    softball: (user provides)
```

### 3B. Update `stripe-webhook` Edge Function

The webhook currently parses product names/metadata to extract `sport` and `module`. Update to:

1. Check product metadata for `tier` field (new products will have `tier: '5tool'` etc.)
2. Based on tier, populate `subscribed_modules` with the correct keys:
   - `pitcher` -> `['{sport}_pitcher']`
   - `5tool` -> `['{sport}_5tool']`
   - `golden2way` -> `['{sport}_golden2way']`
3. Also set the `tier` column on subscriptions table
4. Preserve grandfathering: if `grandfathered_price` is set, don't overwrite it

### 3C. Update `check-subscription` Edge Function

- Owner/Admin bypass now returns full tier access: `['hitting', 'pitching', 'throwing']` (unchanged)
- Regular users: read from `subscribed_modules` as before (the new keys will work with the updated access helpers)

### 3D. Update `cancel-module-subscription` and `cancel-all-subscriptions`

These functions reference `module_subscription_mapping`. Update to work with tier-based keys instead of individual module keys.

---

## PHASE 4: SIDEBAR RESTRUCTURE

### 4A. Update `AppSidebar.tsx` Training Modules

Replace the current 3 module entries (Complete Hitter, Complete Pitcher, Complete Player) with tier-aware display:

**Visibility Rules:**

- If user has `{sport}_pitcher`: Show "Complete Pitcher" with sub-modules (Pitching Analysis, Heat Factory)
- If user has `{sport}_5tool`: Show "5Tool Player" with sub-modules (Hitting Analysis, Throwing Analysis, Iron Bambino, Speed Lab, Tex Vision)
- If user has `{sport}_golden2way`: Show "The Golden 2Way" with sub-modules (ALL sub-modules + The Unicorn)
- Owner/Admin: Show everything
- Scout/Coach: Never show training modules
- No subscription: Show nothing (they see locked cards on dashboard)
- Players Club remains visible to all

**Key Rule:** Only show the user's purchased tier. Never show tiers they don't own.

### 4B. Sidebar Sub-Module Structure

```text
5Tool Player:
  - Hitting Analysis
  - Throwing Analysis
  - Iron Bambino (upgraded with arm care + velocity)
  - Speed Lab
  - Tex Vision

The Golden 2Way:
  - Hitting Analysis
  - Pitching Analysis
  - Throwing Analysis
  - The Unicorn (merged workout system)
  - Speed Lab
  - Tex Vision

Complete Pitcher:
  - Pitching Analysis
  - Heat Factory
```

---

## PHASE 5: GATEWAY PAGES + ROUTES

### 5A. New Gateway Pages

Create two new gateway pages:

**`src/pages/FiveToolPlayer.tsx`** (route: `/5tool-player`)

Tile-based selection hub with 5 tiles:
- Hitting Analysis
- Throwing Analysis
- Iron Bambino
- Speed Lab
- Tex Vision

**`src/pages/GoldenTwoWay.tsx`** (route: `/golden-2way`)

Tile-based selection hub with 6 tiles:
- Hitting Analysis
- Pitching Analysis
- Throwing Analysis
- The Unicorn
- Speed Lab
- Tex Vision

### 5B. Update `App.tsx` Routes

Add:
- `/5tool-player` -> FiveToolPlayer
- `/golden-2way` -> GoldenTwoWay
- `/the-unicorn` -> TheUnicorn (new workout page)

Keep existing routes (`/complete-hitter`, `/complete-pitcher`, `/complete-player`) as redirects or aliases for backward compatibility.

---

## PHASE 6: DASHBOARD RESTRUCTURE

### 6A. Update Dashboard Module Cards

Replace the 3 individual module cards with 3 tier cards:

| Card | Price | Locked State |
|------|-------|-------------|
| Complete Pitcher | $200/mo | "Unlock Module" button -> pricing page |
| 5Tool Player | $300/mo | "Unlock Module" button -> pricing page |
| The Golden 2Way | $400/mo | "Unlock Module" button -> pricing page |

When a user has a tier, the card navigates to the tier's gateway page. When locked, it navigates to the pricing/checkout flow.

### 6B. Module Type Updates

Change `ModuleType` from `"hitting" | "pitching" | "throwing"` to `"pitcher" | "5tool" | "golden2way"` in Dashboard.

---

## PHASE 7: PRICING + CHECKOUT RESTRUCTURE

### 7A. Update `Pricing.tsx`

Replace single module card with 3 tier cards side by side:

```text
Complete Pitcher -- $200/mo
  - Pitching Analysis
  - Heat Factory
  - Ask the Coach
  - Vault access

5Tool Player -- $300/mo (highlighted as "Most Popular")
  - Hitting + Throwing Analysis
  - Iron Bambino (upgraded)
  - Speed Lab + Tex Vision
  - Ask the Coach
  - Vault access

The Golden 2Way -- $400/mo (highlighted as "Best Value")
  - Everything in both tiers
  - The Unicorn workout system
  - Full 2-way development
```

Sport toggle (baseball/softball) at top.

### 7B. Update `Checkout.tsx`

- Replace module checkboxes with single tier selection
- Remove multi-module addition logic
- One tier = one checkout session
- Show clear price for the selected tier

### 7C. Update `SelectModules.tsx`

This page currently shows 3 modules. Update to show 3 tiers instead, with tier descriptions and pricing.

---

## PHASE 8: IRON BAMBINO UPGRADE (for 5Tool tier)

### 8A. Add Arm Care System to Iron Bambino

Add new training blocks to `src/data/ironBambinoProgram.ts`:

**Arm Care Blocks** (integrated into existing 4-day cycle):
- Scap stability exercises (band work, wall slides, serratus activation)
- Rotator cuff progression (ER/IR strengthening, prone series)
- Deceleration training (eccentric throwing patterns, reverse throws)
- Tissue capacity building (long lever holds, loaded stretches)
- Structured deload weeks (every 4th week reduces volume 40%)

These get added as a "Pre-Lift Arm Care" block at the start of each workout day.

### 8B. Add Throwing Velocity Development System

Add new exercises/blocks to Iron Bambino:

**Velocity Development Blocks** (2 days per week within the cycle):
- Kinetic chain efficiency drills (hip-lead throws, connection ball work)
- Progressive weighted ball program (2oz to 11oz, safe progressions)
- Overload/underload throwing patterns
- Long toss with intent protocols
- CNS-tracked throwing volume (total throws x intensity)
- Sport-specific: baseball (overhand) vs softball (overhand position player throws)

### 8C. CNS Integration

When Iron Bambino, Speed Lab, and throwing are all active (5Tool tier):

- Daily CNS budget calculation: base 100 units
- Strength training: 25-40 CNS units depending on volume
- Throwing/velocity work: 15-30 CNS units depending on throw count
- Sprinting: 20-35 CNS units depending on volume
- Auto-balance: If CNS budget exceeded, system suggests rest or reduced volume
- Weekly load tracking in `athlete_load_tracking` table
- No conflicting high-CNS days (never sprint + max throwing + heavy strength same day)

**Weekly Template (5Tool):**

```text
Day 1: Strength + Arm Care (Iron Bambino A) -- CNS: 40
Day 2: Speed Lab Sprint Session -- CNS: 30
Day 3: Throwing Velocity Development -- CNS: 25
Day 4: REST
Day 5: Strength + Arm Care (Iron Bambino B) -- CNS: 40
Day 6: Light Throwing + Active Recovery -- CNS: 15
Day 7: REST
Weekly Total: ~150 (within safe range of 140-170)
```

---

## PHASE 9: THE UNICORN WORKOUT SYSTEM (Golden 2Way)

### 9A. New Page: `src/pages/TheUnicorn.tsx`

A new workout page following the same structure as ProductionLab and ProductionStudio.

### 9B. New Data File: `src/data/unicornProgram.ts`

The Unicorn merges Heat Factory + Iron Bambino + Speed Lab into one unified system:

**Structure:**
- 4 cycles x 6 weeks = 24 weeks (then loops)
- 5 training days per week
- Tracks cumulative throwing load (pitching + position throwing)
- Tracks cumulative CNS load across ALL modalities
- Auto-cycles intensity weeks (3 build, 1 deload pattern)
- Handles dual-role athletes (pitcher days vs position days)

**Weekly Template (Golden 2Way):**

```text
Day 1: Full Body Strength + Scap/Arm Care -- CNS: 35
Day 2: Pitching Velocity Development + Sprint Work -- CNS: 40
Day 3: Hitting Power (Bat Speed) + Active Recovery -- CNS: 25
Day 4: REST
Day 5: Full Body Strength + Throwing Velocity -- CNS: 40
Day 6: Speed Lab + Light Arm Care -- CNS: 25
Day 7: REST
Weekly Total: ~165 (elite range)
```

**Key Rules:**
- Never pitch and throw max effort same day
- Never heavy lower body strength + max sprints same day
- Arm care every training day
- Deload week every 4th week (all volume drops 40%)
- Throwing load tracked as pitch count equivalents
- If total weekly throwing exceeds threshold, auto-suggests rest

**What's Merged:**
- Heat Factory strength -> Unicorn strength days (Days 1 + 5)
- Iron Bambino bat speed -> Unicorn power days (Day 3)
- Heat Factory arm care -> Unicorn arm care (every day)
- Speed Lab sprints -> Unicorn sprint work (Days 2 + 6)
- Velocity development -> Unicorn velocity days (Days 2 + 5)

**What's Eliminated:**
- Duplicate squat patterns across programs
- Conflicting high-CNS days
- Redundant arm care routines
- Overlapping sprint sessions

### 9C. Sub-Module Progress Integration

Add `the-unicorn` as a tracked sub-module in `sub_module_progress` table (no schema change needed -- uses existing `sub_module` text column).

---

## PHASE 10: USER MIGRATION

### 10A. Migration Edge Function: `supabase/functions/migrate-to-tiers/index.ts`

A one-time-use admin function that:

1. Reads all users with active subscriptions
2. Applies migration rules:

```text
IF has both {sport}_hitting AND {sport}_throwing:
  -> Set to {sport}_5tool
  -> Set grandfathered_price = original combined price
  -> Set grandfathered_at = now()
  -> Do NOT increase cost

IF has {sport}_pitching AND {sport}_hitting AND {sport}_throwing:
  -> Set to {sport}_golden2way
  -> Set grandfathered_price = original combined price
  -> Set grandfathered_at = now()
  -> Do NOT increase cost

IF has only {sport}_pitching:
  -> Set to {sport}_pitcher
  -> No price change

IF has only {sport}_hitting:
  -> Set to {sport}_5tool
  -> Set grandfathered_price = original price ($200)
  -> Preserve $200 rate (not $300)

IF has only {sport}_throwing:
  -> Set to {sport}_5tool
  -> Set grandfathered_price = original price ($200)
  -> Preserve $200 rate (not $300)
```

3. Updates `subscribed_modules` and `tier` columns
4. Logs all changes to `audit_log`
5. Does NOT modify Stripe subscriptions (keeps billing as-is for grandfathered users)

### 10B. Grandfathering Logic in Checkout

When creating new checkout sessions:
- Check if user has `grandfathered_price` set
- If so, use the grandfathered price ID instead of the current tier price
- Display "Grandfathered Rate" badge on their subscription management page

---

## PHASE 11: ADDITIONAL FILE UPDATES

### Files That Need Access Check Updates

Every file that currently checks `m.includes('hitting')`, `m.includes('pitching')`, or `m.includes('throwing')` must use the new `tierAccess.ts` helper:

1. `src/hooks/useTexVisionAccess.ts`
2. `src/hooks/useGamePlan.ts`
3. `src/hooks/useCalendar.ts`
4. `src/pages/Vault.tsx`
5. `src/components/vault/VaultPerformanceTestCard.tsx`
6. `supabase/functions/stripe-webhook/index.ts`
7. `supabase/functions/search-players/index.ts`
8. `supabase/functions/ai-chat/index.ts`
9. `supabase/functions/generate-monthly-report/index.ts`
10. `supabase/functions/cancel-module-subscription/index.ts`
11. `supabase/functions/cancel-all-subscriptions/index.ts`

### Edge Function Updates

- `check-subscription` -- owner bypass returns all access; tier-aware module reading
- `create-checkout` -- tier-based pricing with grandfathering
- `stripe-webhook` -- tier detection from product metadata
- `cancel-module-subscription` -- cancel by tier
- `cancel-all-subscriptions` -- works with tier subscriptions
- `ai-chat` -- reports tier name instead of individual modules
- `generate-monthly-report` -- reports on tier access
- `ai-helpdesk` -- updated knowledge base with new tier names

### i18n Updates (8 locale files)

New keys for tier names, descriptions, The Unicorn labels, arm care exercise names, velocity development descriptions.

---

## COMPLETE FILE CHANGE SUMMARY

| File | Action |
|------|--------|
| `src/constants/tiers.ts` | NEW -- tier config, access mapping, price mapping |
| `src/utils/tierAccess.ts` | NEW -- centralized access check helper |
| `src/pages/FiveToolPlayer.tsx` | NEW -- 5Tool gateway page |
| `src/pages/GoldenTwoWay.tsx` | NEW -- Golden 2Way gateway page |
| `src/pages/TheUnicorn.tsx` | NEW -- The Unicorn workout page |
| `src/data/unicornProgram.ts` | NEW -- merged workout program data |
| `supabase/functions/migrate-to-tiers/index.ts` | NEW -- one-time migration function |
| `src/data/ironBambinoProgram.ts` | UPDATE -- add arm care + velocity blocks |
| `src/hooks/useSubscription.ts` | UPDATE -- tier-aware helpers |
| `src/hooks/useTexVisionAccess.ts` | UPDATE -- tier-aware access |
| `src/hooks/useGamePlan.ts` | UPDATE -- tier-aware access |
| `src/hooks/useCalendar.ts` | UPDATE -- tier-aware access |
| `src/components/AppSidebar.tsx` | UPDATE -- tier-based sidebar display |
| `src/pages/Dashboard.tsx` | UPDATE -- 3 tier cards |
| `src/pages/Pricing.tsx` | UPDATE -- 3 tier pricing cards |
| `src/pages/Checkout.tsx` | UPDATE -- tier-based checkout |
| `src/pages/SelectModules.tsx` | UPDATE -- tier selection |
| `src/pages/Vault.tsx` | UPDATE -- tier-aware access |
| `src/pages/App.tsx` | UPDATE -- new routes |
| `src/components/vault/VaultPerformanceTestCard.tsx` | UPDATE -- tier-aware |
| `supabase/functions/create-checkout/index.ts` | UPDATE -- tier pricing |
| `supabase/functions/stripe-webhook/index.ts` | UPDATE -- tier detection |
| `supabase/functions/check-subscription/index.ts` | UPDATE -- tier-aware |
| `supabase/functions/cancel-module-subscription/index.ts` | UPDATE -- tier cancel |
| `supabase/functions/cancel-all-subscriptions/index.ts` | UPDATE -- tier cancel |
| `supabase/functions/ai-chat/index.ts` | UPDATE -- tier context |
| `supabase/functions/ai-helpdesk/index.ts` | UPDATE -- tier knowledge |
| `supabase/functions/generate-monthly-report/index.ts` | UPDATE -- tier-aware |
| `supabase/functions/search-players/index.ts` | UPDATE -- tier-aware |
| DB Migration | ADD -- grandfathered columns + tier column |
| `src/i18n/locales/*.json` (8 files) | UPDATE -- tier + unicorn keys |

---

## IMPLEMENTATION ORDER

Due to the size, implementation will proceed in this order:

1. Database migration (add columns)
2. `src/constants/tiers.ts` + `src/utils/tierAccess.ts` (foundation)
3. Access control updates (all hooks + components using the new helper)
4. Sidebar restructure
5. Gateway pages + routes
6. Dashboard + Pricing + Checkout restructure
7. Iron Bambino upgrade (arm care + velocity data)
8. The Unicorn program data + page
9. Edge function updates (Stripe, webhooks, etc.)
10. Migration function
11. i18n updates

**You will need to provide the 4 new Stripe price IDs before we can update the checkout edge function:**
- Baseball 5Tool ($300)
- Softball 5Tool ($300)
- Baseball Golden 2Way ($400)
- Softball Golden 2Way ($400)
