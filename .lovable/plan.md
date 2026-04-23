

## Plan — Activation Page Conversion Refinement

A precision UI + copy pass on `/activate`. No Stripe, webhook, or schema changes. The existing free subscription (created by the `create_free_subscription` trigger on signup) stays — we simply stop calling it a "trial."

---

### 1. Rewrite `/activate` (`src/pages/Activate.tsx`)

**New structure (top → bottom):**

- **Headline:** "Choose Your Access"
- **Subtext:** "Unlock full access instantly or continue with free tools. Upgrade anytime."
- **Three tier cards** (Complete Pitcher / 5Tool Player / Golden 2Way) — primary visual weight
  - CTA on each: **"Unlock Full Access"**
  - Click → existing `navigate("/checkout", { state: { tier, sport } })` → Stripe hosted checkout
- **Promo reassurance line** (small, centered, under tier cards):
  *"All discounts and promotions are securely applied at checkout."*
- **Free option** (visually secondary — plain text row, no card chrome, muted):
  - Single CTA: **"Continue with Free Access"**
  - Click → record `activation_choice='free'`, ensure free subscription row exists, redirect to `/dashboard`
- **Removed:** "Start free for 7 days" headline/CTA, "7-day free trial" toast copy, "I'll decide later" link, "Not ready to commit?" block, any "trial" wording.

**Language sweep:** remove "Try / Maybe / Explore / decide later / commit." Use "Unlock / Get Access / Continue."

---

### 2. Post-checkout reassurance state

In `src/pages/Checkout.tsx` (success branch — currently toasts and routes immediately):

- Render a brief full-screen confirmation: **"Access unlocked. Loading your dashboard…"** with a spinner.
- Hold ~800ms (long enough for `useSubscription` realtime broadcast to land), then `navigate("/dashboard", { replace: true })`.
- Existing toast + refetch logic preserved underneath.

---

### 3. Free flow without "trial" semantics

- `handleStartFree` → renamed `handleContinueFree`. Removes the `"You're in — 7-day free trial active"` toast. Replace with neutral: *"Free access enabled. Upgrade anytime."*
- No DB change. The `subscriptions` row created by the existing trigger is already `plan='free'`; we just stop labeling it a trial in the UI.

---

### 4. Edge cases (verify, no new code)

| Case | Behavior |
|---|---|
| Cancel Stripe checkout | Existing `?status=cancel` handler returns to `/checkout` with toast → user clicks tier again → back to Stripe. **Change:** update cancel handler to `navigate("/activate")` so the user lands back on the decision screen, not the checkout shell. |
| Payment fails | Stripe hosted page handles retry inline (existing). |
| Already subscribed | Existing guard in `Activate.tsx` auto-redirects to `/dashboard`. Unchanged. |
| Owner / Admin / Coach / Scout | Existing role guards skip `/activate`. Unchanged. |

---

### 5. Profile-as-SSOT enforcement (audit, light wiring)

The `useUserProfile` hook and `<QuickEditProfile />` shipped previously. This pass confirms active use:

- Audit Practice Hub Session Intent, Game Hub lineup builder, Speed Lab, Strength workout defaults, Drill recommender — confirm each reads `position`, `throwing_hand`, `batting_side`, `height`, `weight`, `experience_level` from `useUserProfile()` and pre-selects.
- Where any consumer still uses empty/local state, wire it to the hook.
- No new fields. No schema change. Goal: zero dead profile data.

---

### 6. What is explicitly NOT touched

- `supabase/functions/create-checkout/index.ts` (already supports `coupon` + `allow_promotion_codes`)
- `supabase/functions/stripe-webhook/index.ts`
- `subscriptions` table, `create_free_subscription` trigger
- `useSubscription` realtime broadcast wiring
- Stripe price IDs in `TIER_CONFIG`

---

### Files

**Edited**
- `src/pages/Activate.tsx` — full copy + layout rewrite, remove trial/decide-later, add promo reassurance line
- `src/pages/Checkout.tsx` — add "Access unlocked. Loading your dashboard…" confirmation state on success; route cancel back to `/activate`
- (Audit pass) any consumer not yet reading `useUserProfile()` defaults — wire it in

**Not edited**
- All edge functions, webhook, Stripe config, DB schema, subscription hook plumbing

---

### Verification

1. `/activate` shows "Choose Your Access" headline, three tier cards with **"Unlock Full Access"** CTAs, the promo reassurance line, and a single muted **"Continue with Free Access"** row beneath. No "trial," no "decide later," no "7 days" anywhere.
2. Clicking a tier opens Stripe checkout directly — coupon field and `allow_promotion_codes` still functional.
3. Successful payment → "Access unlocked. Loading your dashboard…" appears for ~800ms → dashboard loads with tier unlocked (realtime path unchanged).
4. Cancel from Stripe → returns to `/activate`, not `/checkout`.
5. "Continue with Free Access" → dashboard loads instantly with free entitlements; no trial-language toast.
6. Returning paid user → auto-redirected away from `/activate` (unchanged).
7. Coach / Scout / Admin / Owner → never see `/activate` (unchanged).
8. Profile audit: changing `position` in QuickEditProfile pre-selects the new value in Practice Hub Session Intent on next open with no reload.

