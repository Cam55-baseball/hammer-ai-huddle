
# Entitlement System Overhaul — AI + Analytics + Nutrition Gating

## Current State (Critical Gaps Found)

**AI Edge Functions have ZERO subscription checks:**
- `generate-warmup` -- no auth header check, no subscription verification, jumps straight to AI call
- `generate-block-workout` -- same pattern, no entitlement check
- `suggest-meals` -- has auth check but no subscription check
- `analyze-food-photo` -- has auth check but no subscription check
- `recommend-workout` -- no subscription check
- `suggest-adaptation` -- no subscription check
- `ai-chat` -- no subscription check

**Nutrition Hub** -- fully open, no subscription gate at page or component level

**Analytics (ProgressDashboard)** -- fully open, no tier-based visibility filtering

**Frontend** -- no `SubscriptionGate` or `UpgradeModal` component exists anywhere in the codebase

---

## Implementation Plan

### Phase 1: Server-Side Entitlement Middleware (Edge Functions)

Create a shared entitlement check pattern that each AI edge function will use. Since edge functions cannot share imports, each function gets the same inline helper.

**Pattern to add to each AI edge function:**

```text
1. Extract Authorization header
2. Decode JWT to get user_id
3. Query subscriptions table for user_id
4. Check subscribed_modules array is non-empty
5. If empty -> return 403 { error: "Subscription required" }
6. If valid -> proceed with AI generation
```

**Functions to update (add subscription check):**
- `generate-warmup/index.ts` -- add auth + subscription check before AI call
- `generate-block-workout/index.ts` -- add auth + subscription check before AI call
- `suggest-meals/index.ts` -- add subscription check after existing auth check
- `analyze-food-photo/index.ts` -- add subscription check after existing auth check
- `recommend-workout/index.ts` -- add subscription check
- `suggest-adaptation/index.ts` -- add subscription check

**Functions that remain FREE (coach growth lever):**
- `ai-chat` -- general help, not premium AI generation
- `ai-helpdesk` -- support tool, stays free
- `calculate-session` -- coach-logged sessions must work without player subscription
- `calculate-load` -- CNS tracking runs for all logged sessions
- `detect-overlaps` -- safety feature, stays free
- `nightly-mpi-process` -- backend process, not user-facing

### Phase 2: Client-Side Gating Components

**Create `src/components/SubscriptionGate.tsx`**
A reusable wrapper component that:
- Accepts `requiredAccess: 'any' | 'hitting' | 'pitching' | 'throwing'`
- Checks `useSubscription()` modules
- If access granted: renders children
- If denied: renders a clean upgrade card with:
  - Feature name and benefit description
  - Blurred/dimmed placeholder of the locked content
  - Single "Unlock" CTA button linking to `/select-modules`
  - No hard stops, no multi-step walls

**Create `src/components/UpgradePrompt.tsx`**
A lightweight inline prompt for use inside existing UIs (not a full-page gate):
- Shows a subtle card: "Unlock [feature] with [tier name]"
- One-tap navigation to checkout
- Used inside analytics cards, nutrition sections, AI buttons

### Phase 3: Nutrition Hub Gating

**File: `src/pages/NutritionHub.tsx`**
Wrap `NutritionHubContent` with `SubscriptionGate`:
```
<SubscriptionGate requiredAccess="any" featureName="Nutrition Hub">
  <NutritionHubContent />
</SubscriptionGate>
```

This locks the entire Nutrition Hub behind any paid module. No partial access.

### Phase 4: AI Generation Client-Side Guards

**File: `src/hooks/useWarmupGenerator.ts`**
Add subscription check before calling edge function:
- Import `useSubscription` (or accept modules as parameter)
- If `modules.length === 0`, show toast "Upgrade to unlock AI workouts" and return null
- This provides instant UX feedback before the server-side 403

**File: `src/hooks/useBlockWorkoutGenerator.ts`**
Same pattern as warmup generator.

**File: `src/components/nutrition-hub/AIMealSuggestions.tsx`**
Add subscription check before `suggest-meals` invocation.

**File: `src/components/nutrition-hub/PhotoFoodLogger.tsx`**
Add subscription check before `analyze-food-photo` invocation.

### Phase 5: Analytics Tiered Visibility

**File: `src/pages/ProgressDashboard.tsx`**
Wrap advanced analytics sections with `SubscriptionGate`:

Player WITHOUT module sees:
- Basic session count
- Basic score summary (last session grade)
- "Unlock Advanced Performance Insights" upgrade prompt

Player WITH module sees (full unlock):
- MPI Score Card + Breakdown
- Pro Probability
- Rank Movement
- HoF Countdown
- Integrity Score
- Delta Trend Chart
- Heat Maps
- Development Roadmap

Coach viewing player data:
- Full analytics access regardless of player subscription (coaches query via their own auth context)

Implementation approach:
- Section the dashboard into "basic" (always visible) and "advanced" (gated) groups
- Wrap advanced group in `SubscriptionGate`
- Data remains stored and calculated regardless -- only visibility is gated

### Phase 6: Coach Flow Protection

**No changes needed to coach flows.** Verification:
- `calculate-session` already has `verify_jwt = false` and handles internal auth -- stays open
- `performance_sessions` RLS is `user_id = auth.uid()` -- coaches log via their own context
- Coach-logged data flows through the same pipeline regardless of player subscription
- The only gating is on the PLAYER's VIEW of advanced analytics

---

## Technical Details

### Edge Function Subscription Check Pattern

Each AI edge function will add this block after auth validation:

```typescript
// --- Subscription entitlement check ---
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('status, subscribed_modules')
  .eq('user_id', userId)
  .maybeSingle();

const hasActiveModule = subscription?.status === 'active' 
  && (subscription?.subscribed_modules?.length ?? 0) > 0;

if (!hasActiveModule) {
  return new Response(
    JSON.stringify({ error: 'Subscription required to use AI features' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### SubscriptionGate Component Structure

```typescript
interface SubscriptionGateProps {
  requiredAccess: 'any' | 'hitting' | 'pitching' | 'throwing';
  featureName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optional custom locked state
}
```

- Uses `useSubscription()` and `useOwnerAccess()` internally
- Owner/Admin always bypass
- Shows loading skeleton while subscription data initializes
- Renders children when access is confirmed
- Renders upgrade prompt when access is denied

### Files Created (New)

| File | Purpose |
|------|---------|
| `src/components/SubscriptionGate.tsx` | Reusable access gate wrapper |
| `src/components/UpgradePrompt.tsx` | Inline upgrade CTA card |

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/generate-warmup/index.ts` | Add auth + subscription check |
| `supabase/functions/generate-block-workout/index.ts` | Add auth + subscription check |
| `supabase/functions/suggest-meals/index.ts` | Add subscription check |
| `supabase/functions/analyze-food-photo/index.ts` | Add subscription check |
| `supabase/functions/recommend-workout/index.ts` | Add subscription check |
| `supabase/functions/suggest-adaptation/index.ts` | Add subscription check |
| `src/hooks/useWarmupGenerator.ts` | Add client-side subscription guard |
| `src/hooks/useBlockWorkoutGenerator.ts` | Add client-side subscription guard |
| `src/pages/NutritionHub.tsx` | Wrap with SubscriptionGate |
| `src/pages/ProgressDashboard.tsx` | Tier-based analytics visibility |
| `src/components/nutrition-hub/AIMealSuggestions.tsx` | Add subscription guard |
| `src/components/nutrition-hub/PhotoFoodLogger.tsx` | Add subscription guard |

### Edge Functions to Deploy

- `generate-warmup`
- `generate-block-workout`
- `suggest-meals`
- `analyze-food-photo`
- `recommend-workout`
- `suggest-adaptation`

---

## What Stays FREE (Coach Growth Engine)

- Session logging (practice, game, lesson)
- Session scoring
- Basic analytics (session count, last grade)
- CNS load calculation (runs for all sessions)
- Coach data entry for any player
- AI Chat (general help)
- AI Helpdesk (support)
- Game Plan (folders, activities, scheduling)
- Custom activity creation (non-AI)
- Calendar and scheduling

## What Gets LOCKED

- All AI generation (warmup, block workout, meal suggestions, food photo analysis, workout recommendations, adaptation suggestions)
- Nutrition Hub (full system)
- Advanced analytics (MPI breakdown, pro probability, heat maps, trends, HoF, integrity)

## Access Matrix

| Feature | No Module | Any Module | Coach |
|---------|-----------|------------|-------|
| AI Generation | 403 | Full | Only if personally subscribed |
| Nutrition Hub | Locked page | Full | N/A |
| Basic Analytics | Session list + last grade | Full | Full (for linked players) |
| Advanced Analytics | Upgrade prompt | Full | Full |
| Session Logging | Full | Full | Full |
| Game Plan | Full | Full | Full |
| CNS Tracking | Basic | Full breakdown | Full |
