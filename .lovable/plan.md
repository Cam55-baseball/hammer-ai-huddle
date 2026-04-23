

## Plan — Conversion Copy & Hierarchy Pass on Profile + `/activate`

A precision UI/copy upgrade. No routing, Stripe, webhook, or schema changes. Existing free-subscription trigger, `TIER_CONFIG`, and checkout flow stay exactly as they are.

---

### 1. Profile Setup CTA — fix the misleading button

**File:** `src/pages/ProfileSetup.tsx`

- Change the final submit button label from **"Complete Profile and Go to Dashboard"** → **"Complete Profile & Continue"**.
- Add a small muted line directly under the button: **"Next: Choose your access"** (only shown for player role — coaches/scouts/admins skip `/activate`, so for them keep no subtext or use neutral "Next: Your dashboard").
- No logic change. Routing already sends players to `/activate` (shipped previously).

---

### 2. Rebuild `/activate` as a sales engine

**File:** `src/pages/Activate.tsx` (full rewrite of card markup; surrounding guards/handlers untouched)

#### Header
- Headline: **"Choose Your Access"**
- Subheadline: **"Get full access instantly or continue with free tools. Upgrade anytime."**

#### Tier card structure (per paid tier — Complete Pitcher, 5Tool Player, Golden 2Way)

Each card uses a new outcome-based content model layered on top of the existing `TIER_CONFIG` keys. Feature bullets in `TIER_CONFIG` stay (used elsewhere); `/activate` ignores them and uses a new local copy map:

| Tier | Positioning tag | Core value statement | 3 outcome bullets |
|---|---|---|---|
| Complete Pitcher | "For Serious Arms" | "Own the Mound. Command Every Pitch." | • Develop elite arm strength and pitch command • Follow a proven system trusted by college-level pitchers • Turn bullpens into game-day dominance |
| 5Tool Player | "Most Popular" | "Train Like a Pro. Compete With Confidence." | • Build elite-level instincts and decision making • Follow a proven system used by high-level players • Turn practice into game-speed performance |
| Golden 2Way | "Full System Access" | "Everything You Need to Separate Yourself." | • Master both sides of the game with one system • Train with the same framework as elite two-way players • Compound every rep into long-term separation |

Card layout (top → bottom):
1. Plan name (clean)
2. Positioning tag (small uppercase pill)
3. Core value statement (large, bold)
4. Three outcome bullets with check icons
5. Price — large, confident: `$X / month`
6. Primary CTA: **"Unlock Full Access"**
7. Micro-line under CTA: *"Secure checkout. Promotions applied at checkout."*

#### Free option (visually minimized, still intentional)

Rendered as a fourth, deliberately smaller, lower-contrast card beneath the paid tiers (not a plain text link — the brief asks for a clean free card):

- Title: **"Free Access"**
- Value line: **"Start with the fundamentals"**
- Bullets:
  - Access select training content
  - Get familiar with the system
  - Upgrade anytime for full access
- CTA: **"Continue Free"**

#### Visual hierarchy
- Paid tiers: full card chrome, normal scale.
- 5Tool Player card: highlighted with `ring-2 ring-primary` + slight scale (`md:scale-[1.03]`) + the "Most Popular" tag styled as a primary-colored pill.
- Free card: muted background (`bg-muted/40`), no ring, smaller padding, lower-contrast text — present but visually secondary.
- Mobile (440px): cards stack vertically, "Most Popular" still scales subtly so it remains visually dominant.

#### Removed copy (final sweep)
- Any remaining "Try / trial / 7 days / decide later / maybe / explore" language. Confirmed by grep across `Activate.tsx` and `Checkout.tsx`.

---

### 3. Behavior — unchanged

- Tier CTA → existing `navigate("/checkout", { state: { tier, sport } })` → Stripe hosted checkout
- Free CTA → existing `handleContinueFree` (records `activation_choice='free'`, ensures free `subscriptions` row, neutral toast, redirect to `/dashboard`)
- Cancel from Stripe → already returns to `/activate` (shipped last pass)
- Returning paid user, owner/admin/coach/scout role guards — unchanged

---

### 4. Files

**Edited only**
- `src/pages/ProfileSetup.tsx` — button label + subtext
- `src/pages/Activate.tsx` — full card markup rewrite, new outcome-copy map, free card, hierarchy

**Not touched**
- `src/constants/tiers.ts` (feature `includes` arrays still consumed by `/checkout` summary and other surfaces)
- `src/pages/Checkout.tsx`
- All edge functions, webhooks, DB schema, Stripe price IDs
- `useSubscription`, `useUserProfile`, `QuickEditProfile`

---

### 5. Verification

1. Profile Setup final button reads **"Complete Profile & Continue"** with **"Next: Choose your access"** beneath (player role only).
2. `/activate` shows the new headline + subheadline.
3. Three paid tier cards render with positioning tag, bold value statement, exactly 3 outcome bullets, price, **"Unlock Full Access"** CTA, and the secure-checkout micro-line.
4. **5Tool Player** card is visually dominant (ring + slight scale) and shows the **"Most Popular"** pill.
5. Free Access card appears beneath, visually minimized, with **"Continue Free"** CTA.
6. No occurrence of "trial", "7 days", "decide later", "try", "maybe", or "explore" anywhere on either screen.
7. Tier CTA still routes to Stripe; Free CTA still routes to `/dashboard`; cancel still returns to `/activate`.
8. Mobile 440px viewport: cards stack, hierarchy preserved, all CTAs full-width and tappable.

