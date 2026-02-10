

# Checkout Flow Upgrade: Nickname Display + Multi-Module Cart

## Overview

Transform the single-module checkout confirmation page into a multi-select cart with branded display names. The edge function already maps modules to line items -- we just need to remove its single-module validation. Zero Stripe product/price changes.

---

## 1. Checkout.tsx -- Full Rewrite of Module Section

### Display Name Mapping

Add the same `MODULE_DISPLAY_NAMES` map already used in Pricing.tsx:

```text
const MODULE_DISPLAY_NAMES: Record<string, string> = {
  hitting: 'Complete Hitter',
  pitching: 'Complete Pitcher',
  throwing: 'The Complete Player: Speed & Throwing',
};
```

### State Changes

- Replace single `selectedModule` string with `selectedModules` Set (initialized with the module that brought the user here)
- Keep original `initialModule` for back-navigation context
- Filter out already-subscribed modules using `subscribedModules` from `useSubscription`

### Section Header

Change from "Selected Module" to "Select Modules"

### Module Cards

Show all 3 modules as toggleable cards:
- Pre-selected: the module that brought the user here (checked, highlighted)
- Already purchased: greyed out with "Already purchased" label, not toggleable
- Available: clickable to add/remove from cart
- Each card shows branded name + price

### Total Section

Dynamic total: `selectedModules.size * MODULE_PRICE`

### Checkout Handler

Change `modules: [selectedModule]` to `modules: Array.from(selectedModules)` when invoking the edge function. Validation changes from checking single module to checking at least one selected.

---

## 2. Edge Function Update (create-checkout/index.ts)

### Single Change

Line 99: Change validation from `modules.length !== 1` to `modules.length === 0`

This allows 1, 2, or 3 modules in a single checkout session. The existing `lineItems` mapping loop on line 138 already handles arrays of any length. Stripe checkout natively supports multiple subscription line items.

Before:
```text
if (!modules || !Array.isArray(modules) || modules.length !== 1) {
  // error: "Must select exactly one module at a time"
}
```

After:
```text
if (!modules || !Array.isArray(modules) || modules.length === 0) {
  // error: "Must select at least one module"
}
```

---

## 3. Files Modified

| File | Change |
|------|--------|
| `src/pages/Checkout.tsx` | Add display name map, convert to multi-select cart with toggleable module cards, dynamic total, array-based checkout call |
| `supabase/functions/create-checkout/index.ts` | Change validation from exactly-1 to at-least-1 module (line 99) |

**Total**: 2 files modified, 0 new files, 0 database changes, 0 Stripe product/price changes

---

## 4. What Does NOT Change

- Stripe product IDs and price IDs -- unchanged
- Stripe webhook logic -- unchanged
- Entitlement validation -- unchanged
- Subscription creation logic -- unchanged (Stripe handles multi-line-item subscriptions natively)
- Purchase confirmation flow -- unchanged
- Module internal keys (hitting/pitching/throwing) -- unchanged
- Promo code support -- unchanged (already enabled on checkout session)

---

## 5. Expected UX

```text
User arrives at /checkout with "throwing" pre-selected:

  Select Modules

  [x] The Complete Player: Speed & Throwing    $200/mo
  [ ] Complete Hitter                          $200/mo
  [ ] Complete Pitcher                         $200/mo

  Total: $200/month

User clicks "Complete Hitter":

  [x] The Complete Player: Speed & Throwing    $200/mo
  [x] Complete Hitter                          $200/mo
  [ ] Complete Pitcher                         $200/mo

  Total: $400/month

User clicks "Proceed to Payment" --> single Stripe checkout with 2 line items
```

Already-purchased modules appear greyed out and cannot be selected.

