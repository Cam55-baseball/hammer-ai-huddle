
# Complete Hitter + Complete Pitcher: Frontend Restructure

## Overview

Replicate the exact pattern already established by the "Complete Player" restructure for the remaining two modules. This is purely a UI rename + navigation gateway update. All internal keys (`hitting`, `pitching`), Stripe IDs, entitlement logic, and backend references remain untouched.

---

## 1. New Gateway Pages

### `src/pages/CompleteHitter.tsx` (new file)

Mirrors `CompletePlayer.tsx` structure. Three selection tiles:

| Tile | Icon | Label | Route |
|------|------|-------|-------|
| Hitting Analysis | Target | "Hitting Analysis" | `/analyze/hitting?sport={selectedSport}` |
| Iron Bambino | Dumbbell | "Iron Bambino" (from i18n `workoutModules.productionLab.title`) | `/production-lab` |
| Tex Vision | Eye | "Tex Vision" (from i18n `navigation.texVision`) | `/tex-vision` |

Page header uses new i18n key `dashboard.modules.completeHitterShort` ("Complete Hitter") with description `dashboard.modules.completeHitterDescription`.

### `src/pages/CompletePitcher.tsx` (new file)

Same pattern. Two selection tiles:

| Tile | Icon | Label | Route |
|------|------|-------|-------|
| Pitching Analysis | Target | "Pitching Analysis" | `/analyze/pitching?sport={selectedSport}` |
| Heat Factory | Dumbbell | "Heat Factory" (from i18n `workoutModules.productionStudio.title`) | `/production-studio` |

Page header uses `dashboard.modules.completePitcherShort` ("Complete Pitcher") with description `dashboard.modules.completePitcherDescription`.

Both pages use `DashboardLayout`, read `selectedSport` from localStorage, and follow the same card layout as `CompletePlayer.tsx`.

---

## 2. App Router (`src/App.tsx`)

Add two new lazy imports and routes:

```text
const CompleteHitter = lazyWithRetry(() => import("./pages/CompleteHitter"));
const CompletePitcher = lazyWithRetry(() => import("./pages/CompletePitcher"));

<Route path="/complete-hitter" element={<CompleteHitter />} />
<Route path="/complete-pitcher" element={<CompletePitcher />} />
```

---

## 3. Dashboard Card Updates (`src/pages/Dashboard.tsx`)

### Hitting Card (lines 407-458)

- Display name: change `t('dashboard.modules.hitting')` to `t('dashboard.modules.completeHitter')`
- Description: change to `t('dashboard.modules.completeHitterDescription')`
- Click handler: when user **has access**, navigate to `/complete-hitter` instead of `/analyze/hitting`; when no access, keep existing pricing redirect (unchanged)
- Button text when unlocked: change from "Start Analysis" to "Explore" (reuse `completePlayerExplore` key)
- Internal module key remains `"hitting"`

### Pitching Card (lines 460-511)

- Display name: change `t('dashboard.modules.pitching')` to `t('dashboard.modules.completePitcher')`
- Description: change to `t('dashboard.modules.completePitcherDescription')`
- Click handler: when user **has access**, navigate to `/complete-pitcher`; when no access, keep pricing redirect
- Button text when unlocked: change to "Explore"
- Internal module key remains `"pitching"`

---

## 4. Sidebar Menu Updates (`src/components/AppSidebar.tsx`)

### Hitting module (lines 172-191)

```text
// Before:
key: 'hitting',
title: t('dashboard.modules.hittingAnalysis'),  // "Hitting Analysis"
url: `/analyze/hitting?sport=${selectedSport}`,
subModules: [Iron Bambino, Tex Vision]

// After:
key: 'hitting',
title: t('dashboard.modules.completeHitterShort'),  // "Complete Hitter"
url: '/complete-hitter',
subModules: [
  { title: "Hitting Analysis", url: /analyze/hitting?sport=..., icon: Target },
  { title: "Iron Bambino", url: /production-lab, icon: Dumbbell },
  { title: "Tex Vision", url: /tex-vision, icon: Eye }
]
```

Hitting Analysis becomes a sub-item alongside Iron Bambino and Tex Vision.

### Pitching module (lines 193-206)

```text
// Before:
key: 'pitching',
title: t('dashboard.modules.pitchingAnalysis'),  // "Pitching Analysis"
url: `/analyze/pitching?sport=${selectedSport}`,
subModules: [Heat Factory]

// After:
key: 'pitching',
title: t('dashboard.modules.completePitcherShort'),  // "Complete Pitcher"
url: '/complete-pitcher',
subModules: [
  { title: "Pitching Analysis", url: /analyze/pitching?sport=..., icon: Target },
  { title: "Heat Factory", url: /production-studio, icon: Dumbbell }
]
```

Pitching Analysis becomes a sub-item alongside Heat Factory.

---

## 5. i18n Keys (All 8 Locales)

New keys under `dashboard.modules`:

| Key | English Value |
|-----|---------------|
| `completeHitter` | "Complete Hitter" |
| `completeHitterShort` | "Complete Hitter" |
| `completeHitterDescription` | "Master hitting mechanics, strength training, and vision in one program" |
| `completePitcher` | "Complete Pitcher" |
| `completePitcherShort` | "Complete Pitcher" |
| `completePitcherDescription` | "Master pitching mechanics and arm strength in one program" |

These will be translated for all 7 non-English locales (de, es, fr, ja, ko, nl, zh).

The existing `completePlayerExplore` ("Explore") key will be reused for all three gateway button labels.

---

## 6. What Does NOT Change

| Item | Status |
|------|--------|
| Stripe product IDs | Unchanged |
| Product slugs `hitting`, `pitching` | Unchanged |
| `hasAccessForSport("hitting", ...)` checks | Unchanged |
| `hasAccessForSport("pitching", ...)` checks | Unchanged |
| `useSubscription` module keys | Unchanged |
| Webhook logic | Unchanged |
| Purchase confirmation messaging | Unchanged |
| Database tables | Unchanged |
| `/analyze/hitting` route and page | Unchanged (still accessible) |
| `/analyze/pitching` route and page | Unchanged (still accessible) |
| `/production-lab` (Iron Bambino) | Unchanged |
| `/production-studio` (Heat Factory) | Unchanged |
| `/tex-vision` | Unchanged |
| Pricing page module references | Unchanged |
| Game Plan task IDs | Unchanged |
| Calendar event IDs | Unchanged |

---

## Summary of Files

| File | Change |
|------|--------|
| `src/pages/CompleteHitter.tsx` | New file -- gateway page with 3 tiles (Hitting Analysis, Iron Bambino, Tex Vision) |
| `src/pages/CompletePitcher.tsx` | New file -- gateway page with 2 tiles (Pitching Analysis, Heat Factory) |
| `src/App.tsx` | Add 2 lazy imports + 2 routes |
| `src/pages/Dashboard.tsx` | Rename hitting/pitching card display text + change navigation for unlocked users |
| `src/components/AppSidebar.tsx` | Rename dropdown headers, restructure sub-modules for hitting and pitching |
| `src/i18n/locales/en.json` | Add 6 new keys |
| `src/i18n/locales/de.json` | Add translated keys |
| `src/i18n/locales/es.json` | Add translated keys |
| `src/i18n/locales/fr.json` | Add translated keys |
| `src/i18n/locales/ja.json` | Add translated keys |
| `src/i18n/locales/ko.json` | Add translated keys |
| `src/i18n/locales/nl.json` | Add translated keys |
| `src/i18n/locales/zh.json` | Add translated keys |

**Total**: 13 files (2 new, 11 modified), 0 database migrations, 0 Stripe changes

---

## E2E Flow

```text
COMPLETE HITTER:
  Dashboard card: "Complete Hitter"
  Click (with access) --> /complete-hitter
  Gateway shows: Hitting Analysis | Iron Bambino | Tex Vision
  Click any --> routes to existing module
  Sidebar: "Complete Hitter" dropdown --> Hitting Analysis, Iron Bambino, Tex Vision

COMPLETE PITCHER:
  Dashboard card: "Complete Pitcher"
  Click (with access) --> /complete-pitcher
  Gateway shows: Pitching Analysis | Heat Factory
  Click any --> routes to existing module
  Sidebar: "Complete Pitcher" dropdown --> Pitching Analysis, Heat Factory

No access flow unchanged:
  Click card without subscription --> /pricing (same as before)
```
