

# Rename + Navigation Restructure: "The Complete Player: Speed & Throwing"

## Overview

This is a **frontend-only** update that renames the Throwing Analysis dashboard card to "The Complete Player: Speed & Throwing," introduces a new gateway page at `/complete-player`, and updates the sidebar menu header. No Stripe IDs, product slugs, entitlement logic, webhook handlers, or database references are touched.

---

## 1. Dashboard Card Update (`src/pages/Dashboard.tsx`)

**Current behavior** (lines 513-564): The "Throwing" card displays `t('dashboard.modules.throwing')` as its title and navigates to `/analyze/throwing?sport=...` via `handleModuleSelect("throwing")`.

**New behavior**:
- Display name changes to the new i18n key: `t('dashboard.modules.completePlayer')` which resolves to "The Complete Player: Speed & Throwing"
- Description changes to `t('dashboard.modules.completePlayerDescription')`
- When user **has access**: navigate to `/complete-player` instead of `/analyze/throwing`
- When user **does not have access**: keep the existing pricing redirect (unchanged)
- Button text when unlocked changes from "Start Analysis" to "Explore" (new i18n key)
- The card icon stays as `Zap` (or could be updated to a combined icon)
- Internal module key remains `"throwing"` -- only the display layer changes

---

## 2. New Complete Player Landing Page

**New file**: `src/pages/CompletePlayer.tsx`

**Route**: `/complete-player`

This page is a clean selection gateway with two tiles:

| Tile | Icon | Label | Description | Route |
|------|------|-------|-------------|-------|
| Throwing Analysis | Target | "Throwing Analysis" | "Analyze arm action, footwork, and energy transfer" | `/analyze/throwing?sport={selectedSport}` |
| Speed Lab | Zap | "Speed Lab" | "Build elite speed with structured sprints" | `/speed-lab` |

**Design**: 
- Uses `DashboardLayout` wrapper for consistent navigation
- Reads `selectedSport` from localStorage for the throwing route
- Both tiles are large, clickable cards with icons and descriptions
- No entitlement checks needed on this page (the user already passed the access gate on the dashboard)
- Page title: "The Complete Player" with a subtitle

---

## 3. App Router Update (`src/App.tsx`)

- Add lazy import: `const CompletePlayer = lazyWithRetry(() => import("./pages/CompletePlayer"));`
- Add route: `<Route path="/complete-player" element={<CompletePlayer />} />`

---

## 4. Sidebar Menu Update (`src/components/AppSidebar.tsx`)

**Current** (lines 207-220):
```
key: 'throwing',
title: t('dashboard.modules.throwingAnalysis'),  --> "Throwing Analysis"
url: /analyze/throwing?sport=...
subModules: [Speed Lab]
```

**New**:
```
key: 'throwing',
title: t('dashboard.modules.completePlayerShort'),  --> "Complete Player"
url: /complete-player
subModules: [
  { title: "Throwing Analysis", url: /analyze/throwing?sport=..., icon: Target },
  { title: "Speed Lab", url: /speed-lab, icon: Zap }
]
```

Changes:
- Dropdown header text changes from "Throwing Analysis" to "Complete Player"
- Parent URL changes from `/analyze/throwing?sport=...` to `/complete-player`
- Sub-modules now show **both** Throwing Analysis and Speed Lab (Throwing Analysis becomes a sub-item)
- `expandedModules` default state gets `throwing: true` added (already there in some cases)

---

## 5. i18n Keys (All 8 Locales)

New keys added under `dashboard.modules`:

| Key | English Value |
|-----|---------------|
| `completePlayer` | "The Complete Player: Speed & Throwing" |
| `completePlayerShort` | "Complete Player" |
| `completePlayerDescription` | "Master speed training and throwing mechanics in one program" |
| `completePlayerExplore` | "Explore" |

Translated appropriately for de, es, fr, ja, ko, nl, zh.

---

## 6. What Does NOT Change

| Item | Status |
|------|--------|
| Stripe product IDs | Unchanged |
| Product slug `throwing` | Unchanged |
| `hasAccessForSport("throwing", ...)` checks | Unchanged |
| `useSubscription` module key `throwing` | Unchanged |
| Webhook logic | Unchanged |
| Purchase confirmation messaging | Unchanged |
| Database `user_progress`, `speed_sessions` | Unchanged |
| `/analyze/throwing` route and page | Unchanged (still accessible) |
| `/speed-lab` route and page | Unchanged |
| Pricing page module references | Unchanged |
| Game Plan task IDs | Unchanged |
| Calendar event IDs | Unchanged |

---

## Summary of Files

| File | Change |
|------|--------|
| `src/pages/CompletePlayer.tsx` | **New file** -- gateway page with two selection tiles |
| `src/App.tsx` | Add lazy import + route for `/complete-player` |
| `src/pages/Dashboard.tsx` | Rename throwing card display text + change navigation target for unlocked users |
| `src/components/AppSidebar.tsx` | Rename "Throwing Analysis" dropdown to "Complete Player", restructure sub-modules |
| `src/i18n/locales/en.json` | Add 4 new `completePlayer` keys |
| `src/i18n/locales/de.json` | Add translated keys |
| `src/i18n/locales/es.json` | Add translated keys |
| `src/i18n/locales/fr.json` | Add translated keys |
| `src/i18n/locales/ja.json` | Add translated keys |
| `src/i18n/locales/ko.json` | Add translated keys |
| `src/i18n/locales/nl.json` | Add translated keys |
| `src/i18n/locales/zh.json` | Add translated keys |

**Total**: 12 files (1 new, 11 modified), 0 database migrations, 0 Stripe changes

