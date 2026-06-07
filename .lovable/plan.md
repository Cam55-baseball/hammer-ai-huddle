## Change

The sidebar entry currently labeled **Drill Library** is actually the defensive drill library, and the generic name confuses athletes. Rename it to **Defensive Drill Library** in the user-facing surfaces tied to that sidebar destination.

## Edits

1. `src/components/AppSidebar.tsx` (line 280) — change `title: 'Drill Library'` → `'Defensive Drill Library'`.
2. `src/pages/DrillLibraryPlayer.tsx` — update the H1 (line 90) and `SubscriptionGate` `featureName` (line 85) from "Drill Library" → "Defensive Library" so the page the sidebar links to matches.

## Out of scope (intentionally not touched)

- Owner CMS panel (`DrillCmsManager.tsx`), TexVision's internal "Drill Library" section, demo upgrade copy, i18n key `texVision.drillLibrary.title`, route path `/drill-library`, file/component names, and internal identifiers. These are either operator-facing, a different surface, or non-visual — renaming them is not what the user asked for and risks scope creep.

## Verification

Visit `/drill-library` from the sidebar; confirm the menu item and page header both read "Defensive Drill Library".