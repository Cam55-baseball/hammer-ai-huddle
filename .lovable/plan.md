
## Goal
Rename the user-facing "Progress Dashboard" / "Progress" surface to **The General**. The module is sport-agnostic, so this single rename covers both baseball and softball E2E. No route or file renames — internal identifiers stay stable to avoid breakage.

## User-visible changes

1. **Sidebar nav** — `src/components/AppSidebar.tsx:656`
   - `title: 'Progress Dashboard'` → `title: 'The General'`

2. **Landing page heading** — `src/pages/ProgressLanding.tsx:199`
   - `<h1>Progress</h1>` → `<h1>The General</h1>`
   - Line 246 helper copy: "Every legacy Progress Dashboard widget…" → "Every legacy The General widget…" (rephrase to "Every legacy dashboard widget, unchanged.")

3. **Legacy inner dashboard heading** — `src/pages/ProgressDashboard.tsx:94`
   - `<h1>Progress Dashboard</h1>` → `<h1>The General</h1>`

4. **Page `<title>` / document title** — if any `document.title` or `<Helmet>` references "Progress" on this route, update to "The General". (Spot-check during edit; none seen so far.)

## Intentionally NOT changed
- Route path `/progress` — preserving deep links and avoiding redirect churn.
- File names (`ProgressLanding.tsx`, `ProgressDashboard.tsx`), component identifiers, hooks (`useGpSignal`), and code comments referencing "Progress Dashboard" — internal only.
- i18n locale keys named `progress` — these are unrelated UI strings (e.g. mindfulness body-scan progress bar, "{{completed}} of {{total}}"), not the dashboard name.
- The standalone "Progress" image alt text in `PhotoTimelineDialog.tsx` — unrelated.

## Verification
- Sidebar shows "The General" linking to `/progress`.
- `/progress` page renders "The General" as the H1, both at the landing layer and inside the legacy panel when expanded.
- No remaining user-visible "Progress Dashboard" strings (`rg -i "progress dashboard" src/` returns only comments).
