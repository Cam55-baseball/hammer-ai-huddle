

# UI Synchronization: Purchase Cards Match Dashboard Cards

## Problem

The **Select Modules** page and **Pricing** page still display legacy names ("Hitting", "Pitching", "Throwing") while the Dashboard now shows "Complete Hitter", "Complete Pitcher", and "The Complete Player: Speed & Throwing". This creates a jarring brand disconnect during the purchase flow.

## Solution

Update the display layer on both purchase-flow pages to use the same i18n keys and descriptions as the Dashboard cards. Zero Stripe, backend, or entitlement changes.

---

## 1. SelectModules.tsx Updates (lines 46-65)

Replace the legacy labels and descriptions in the `modules` array with the new branded i18n keys:

| Module ID | Current Label Key | New Label Key | Current Description Key | New Description Key |
|-----------|------------------|---------------|------------------------|---------------------|
| `hitting` | `selectModules.hitting` ("Hitting") | `dashboard.modules.completeHitter` ("Complete Hitter") | `selectModules.hittingDescription` | `dashboard.modules.completeHitterDescription` |
| `pitching` | `selectModules.pitching` ("Pitching") | `dashboard.modules.completePitcher` ("Complete Pitcher") | `selectModules.pitchingDescription` | `dashboard.modules.completePitcherDescription` |
| `throwing` | `selectModules.throwing` ("Throwing") | `dashboard.modules.completePlayer` ("The Complete Player: Speed & Throwing") | `selectModules.throwingDescription` | `dashboard.modules.completePlayerDescription` |

The internal `id` values (`'hitting'`, `'pitching'`, `'throwing'`) remain unchanged -- only the display `label` and `description` strings change.

---

## 2. Pricing.tsx Updates (line 95)

Currently the pricing card title shows:

```text
{selectedModule} Module    -->  e.g. "hitting Module"
```

This needs a display name mapping so it shows the branded name instead:

```text
const MODULE_DISPLAY_NAMES: Record<string, string> = {
  hitting: 'Complete Hitter',
  pitching: 'Complete Pitcher',
  throwing: 'The Complete Player: Speed & Throwing',
};
```

The card title (line 95) changes from `{selectedModule} Module` to `{MODULE_DISPLAY_NAMES[selectedModule] || selectedModule}`.

Similarly, the breadcrumb pill on line 82 that shows the raw module name (`capitalize` class on `{selectedModule}`) should also use the display name map.

The subtitle on line 74 (`Add ${selectedModule} to your training modules`) should also use the mapped name.

---

## 3. Files Modified

| File | Change |
|------|--------|
| `src/pages/SelectModules.tsx` | Update 3 label keys and 3 description keys in the `modules` array to use `dashboard.modules.*` i18n keys |
| `src/pages/Pricing.tsx` | Add `MODULE_DISPLAY_NAMES` map; update card title, breadcrumb pill, and subtitle to use branded names |

**Total**: 2 files modified, 0 new files, 0 database changes, 0 Stripe changes

---

## What Does NOT Change

- Module `id` values (`hitting`, `pitching`, `throwing`) -- unchanged
- Stripe product IDs -- unchanged
- Entitlement checks -- unchanged
- Checkout flow -- unchanged
- Purchase confirmation messaging -- unchanged
- Webhook logic -- unchanged
- Pricing amounts -- unchanged
- All i18n keys already exist from previous dashboard updates -- no new locale keys needed

