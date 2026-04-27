# Fix: Back Button 404 in Builders

## Root cause
The Owner Dashboard is registered in `src/App.tsx` at the route **`/owner`**, but the new back buttons (and post-save redirects) in the three builders navigate to **`/owner-dashboard`**, which has no matching route. React Router falls through to `NotFound`, producing the 404.

## Fix
Replace every `/owner-dashboard` reference in the builder pages with `/owner` (preserving the `?section=...` query string where used).

## Files to update
- `src/pages/owner/ProgramBuilder.tsx` — 3 occurrences (back button, post-save nav, "Add one in the Video Library" link)
- `src/pages/owner/BundleBuilder.tsx` — 3 occurrences (same pattern)
- `src/pages/owner/ConsultationFlow.tsx` — 2 occurrences (back button, post-create nav)

Each `navigate('/owner-dashboard')` → `navigate('/owner')`
Each `navigate('/owner-dashboard?section=videos')` → `navigate('/owner?section=videos')`

No router, dashboard, or sidebar changes needed — `OwnerDashboard` already lives at `/owner` and already reads the `section` query param.
