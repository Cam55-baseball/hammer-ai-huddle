## Plan — Elite Signup → Activation → Monetization Pipeline

**Goal:** Lift signup→paid conversion without breaking anything. Add a structured decision moment, make every profile field actually do work in the product, and route paid users straight into Stripe with zero internal friction. THIS Will NOT APPLY TO Coach and scout profile creation routing (Coach and scout signup route does not change). This is just for for player profile creation

This is a **layer on top** of the current flow — Auth, ProfileSetup, SelectModules, Checkout, stripe-webhook, and the `create_free_subscription` trigger all stay. We are inserting one new screen, hardening webhook-driven activation, and turning the profile into a true single source of truth.

---

### New end-to-end flow

```text
Auth (existing)
   ↓
SelectRole → SelectSport (existing)
   ↓
ProfileSetup (enhanced — every field gets a downstream consumer)
   ↓
[NEW] /activate  ← Subscription Decision Board
   ├─ "Start Free" → free tier already exists → /dashboard
   └─ "Choose a Tier" → SelectModules → Checkout → Stripe Hosted
                                          ↓
                              stripe-webhook updates subscriptions
                                          ↓
                          /checkout?status=success → /dashboard
                                          ↓
                  Dashboard reads live entitlements (no reload lag)
```

No existing route is removed. `/select-modules` and `/checkout` continue to work for upgrades from inside the app.

---

### 1. Profile becomes the single source of truth

**Problem today:** ProfileSetup collects 25+ fields (DOB, height/weight, position, throws/bats, grad year, GPA, SAT, commitment status, league, etc.). Most are written once and never read again as defaults.

**Fix — wire each field to a consumer:**


| Profile field                                                                     | Downstream consumer (prefill / filter / recommendation)                                     |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `date_of_birth`                                                                   | Already authoritative (memory rule). Confirm every age gate reads it.                       |
| `position`                                                                        | Default position in Game Hub lineup builder, Practice Hub session intent, drill recommender |
| `throwing_hand` / `batting_side`                                                  | Pre-select Session Intent Gate handedness, video analysis side                              |
| `height` / `weight`                                                               | Strength workout load defaults, Speed Lab norms, Nutrition macro baseline                   |
| `state` / `team_affiliation`                                                      | Default opponent search scope, Rankings filter                                              |
| `high_school_grad_year` / `gpa` / `sat_score` / `act_score` / `commitment_status` | Scout-facing profile card, Rankings eligibility                                             |
| `experience_level`                                                                | HIE difficulty floor, drill progression starting tier (1–7 ladder)                          |
| `preferred_language`                                                              | i18n bootstrap (already exists — verify)                                                    |


**Implementation:**

- New `useUserProfile()` hook — single React Query source for the `profiles` row, cached app-wide, invalidated on any profile mutation.
- New `<QuickEditProfile />` slide-over component, mounted globally, openable from `UserMenu` and any "Edit profile" affordance. Inline edits propagate via the shared query key.
- Touch every component listed in the table above to read defaults from `useUserProfile()` instead of empty state.
- No schema change required — the columns already exist.

---

### 2. New screen: `/activate` — Subscription Decision Board

Inserted **between** ProfileSetup completion and the Dashboard. Today ProfileSetup navigates straight to `/dashboard`, which is the single biggest leak in the funnel.

**Screen design (mobile-first, 440px viewport):**

- Header: "You're set, {firstName}. Pick how you want to train."
- Three tier cards (Complete Pitcher / 5Tool Player / Golden 2Way) using existing `TIER_CONFIG`, sport pre-selected from profile.
- Below the tiers: a single clearly-labeled **"Start free for 7 days"** secondary action (the `create_free_subscription` trigger already grants this — we just stop hiding it).
- Tertiary link: "I'll decide later" → `/dashboard` (free tier still active, no dead-end).

**Routing:**

- New route `/activate` rendered by a new `Activate.tsx` page.
- `ProfileSetup.handleCompleteSetup` final `navigate("/dashboard", ...)` becomes `navigate("/activate", ...)` **only for new players** (skip for scout/coach/admin and skip if user already has a paid module).
- Tier card click → reuses existing `navigate("/checkout", { state: { tier, sport } })`. No new checkout code path.

---

### 3. Stripe path — direct, with coupons, no internal payment page

Already in place (`create-checkout` → Stripe hosted Checkout with `allow_promotion_codes: true`). One enhancement:

- `create-checkout` accepts an optional `coupon` param. When passed, it's forwarded as `discounts: [{ coupon }]` so pre-applied promos (campaigns, partner deals) skip the manual code step.
- Success URL stays `/checkout?status=success`. Existing handler already toasts + refetches subscription + routes to dashboard.

**Webhook hardening (existing `stripe-webhook`):**

- Already idempotent (`processed_webhook_events`), already maps tier products → `subscriptions.subscribed_modules`. Verified working.
- Add: on `checkout.session.completed`, call `supabase.realtime` broadcast on channel `subscription:{user_id}` so the frontend flips to "paid" the instant the redirect lands — no polling, no reload lag.

**Frontend reactivity:**

- `useSubscription` subscribes to that broadcast channel and to `postgres_changes` on `subscriptions` for the user. Dashboard locked/unlocked state updates within ~300ms of webhook write.

**Failure handling:**

- Cancel → `?status=cancel` already returns to `/checkout` with a toast → user can re-pick tier.
- `invoice.payment_failed` → already handled in webhook; add a lightweight banner on Dashboard that reads `subscriptions.status = 'past_due'` and links to `/customer-portal`.

---

### 4. State, performance, editability

- **State:** `AuthContext` (existing) + `useSubscription` (existing) + new `useUserProfile`. All three keyed off `user.id`, all three use React Query so there is one cache per concept and zero desync.
- **Performance:** Activate screen is code-split. SelectModules and Checkout already exist — no extra bundle.
- **Editability:** `<QuickEditProfile />` opens from anywhere; on save it `upsert`s `profiles` and invalidates the shared query — every consumer re-renders with new defaults instantly.

---

### 5. Database / schema

No structural changes required. Optional additions for analytics only:

- `profiles.activation_choice` (`text`, nullable) — values: `paid`, `free`, `deferred`. Written by `/activate`. Lets us measure conversion at the decision point. Migration is additive and safe.
- Index on `subscriptions(user_id, status)` if not already present (verify before migration).

---

### 6. Edge cases


| Case                                        | Behavior                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| User refreshes mid-`/activate`              | Page is idempotent; reads profile + subscription, re-renders same state.                                           |
| User already paid (returning)               | `/activate` detects `modules.length > 0` and auto-redirects to `/dashboard`.                                       |
| Scout / Coach / Admin                       | Skip `/activate` entirely — they don't pay. Existing behavior preserved.                                           |
| Owner                                       | Existing owner bypass in `create-checkout` and `check-subscription` untouched.                                     |
| Webhook arrives before redirect             | Realtime broadcast + DB write means dashboard is correct regardless of order.                                      |
| Webhook delayed                             | `useSubscription` polls on focus + 60s interval (existing) as backstop.                                            |
| Profile incomplete then user navigates away | DOB + name + role still required to leave ProfileSetup. `/activate` requires a profile row — guard redirects back. |
| Existing users (rollout safety)             | They never hit `/activate` (they're past ProfileSetup). Nothing changes for them. New signups only.                |


---

### 7. Files

**New**

- `src/pages/Activate.tsx` — Subscription Decision Board
- `src/hooks/useUserProfile.ts` — single source of truth hook
- `src/components/profile/QuickEditProfile.tsx` — global slide-over editor

**Edited**

- `src/App.tsx` — register `/activate` route, mount `<QuickEditProfile />` globally
- `src/pages/ProfileSetup.tsx` — final navigate target switches to `/activate` for new players
- `src/components/UserMenu.tsx` — "Edit profile" opens QuickEditProfile
- `src/hooks/useSubscription.ts` — subscribe to `subscription:{userId}` realtime channel
- `supabase/functions/create-checkout/index.ts` — accept optional `coupon` param → `discounts`
- `supabase/functions/stripe-webhook/index.ts` — broadcast subscription update on `checkout.session.completed`
- (Defaults wiring) Practice Hub session intent, Game Hub lineup, Strength workout, Speed Lab, Nutrition macros, Drill recommender — read defaults from `useUserProfile`

**Migration (optional, additive)**

- Add `profiles.activation_choice text` for funnel analytics

---

### 8. Verification

1. New signup as Player → ProfileSetup → lands on `/activate` (not `/dashboard`).
2. Tap a tier → Stripe Checkout opens directly, coupon field works, `allow_promotion_codes` accepts a code.
3. Pay successfully → returned to `/checkout?status=success` → toast → `/dashboard` shows tier unlocked within ~1s, no manual refresh.
4. Cancel checkout → returned to `/checkout?status=cancel` → toast → can re-select tier.
5. Pick "Start free for 7 days" → `subscriptions.plan = 'free'` (already created by trigger) → `/dashboard` loads immediately.
6. Edit profile from UserMenu → change `position` → open Practice Hub → new session pre-selects the new position with no reload.
7. Existing paid user signs in → `/activate` is skipped (auto-redirect to `/dashboard`).
8. Scout/Coach/Admin signups → never see `/activate`.
9. Webhook test event for `customer.subscription.updated` → dashboard entitlements update without user action.
10. `invoice.payment_failed` → past-due banner appears on dashboard with link to customer portal.

---

### 9. Rollout

- Ship behind a feature flag check on `profiles.created_at > <release_timestamp>` so only **new** signups are routed through `/activate`. Existing users are completely unaffected.
- After 7 days of clean metrics, remove the gate so any user without a paid module sees `/activate` on next dashboard visit (gentle, not forced).