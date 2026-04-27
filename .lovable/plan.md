## Add "Builds" tab to existing Owner Dashboard

The Owner Dashboard at `/owner-dashboard` already uses a sidebar (`OwnerSidebar.tsx`) with sections like Overview, User Management, Video Library, etc. I'll add one new section: **Builds**.

No new page. No new route. No changes to the athlete `/dashboard` or Game Plan.

### Changes

**1. `src/components/owner/OwnerSidebar.tsx`**
- Extend the `OwnerSection` type union with `'builds'`.
- Add a sidebar item: `{ id: 'builds', label: 'Builds', icon: Package }` (lucide `Package`), placed right under Overview so it's the first revenue-related entry.

**2. `src/pages/OwnerDashboard.tsx`**
- Add `'builds': 'Builds'` to `sectionLabels`.
- Add a one-line subtitle for the section header: *"Create programs, bundles, and consultations — and see what you've made."*
- Add a new conditional block `{activeSection === 'builds' && <BuildsSection />}` after the existing section blocks.
- The `BuildsSection` is rendered inline (small local component or JSX block in the same file, matching the pattern used for the other sections) and contains:
  - **Quick Create row** — 3 buttons in a responsive grid (1 col mobile, 3 cols ≥640px):
    - **New Program** → `navigate('/owner/open_program_builder')`
    - **New Bundle** → `navigate('/owner/open_bundle_builder')`
    - **New Consultation** → `navigate('/owner/open_consultation_flow')`
  - **Your Builds list** — reads from `getBuilds()` in `src/lib/ownerBuildStorage.ts` and renders the same Card layout already used in `src/pages/owner/BuildLibrary.tsx`, including the **Sell / Share** button (calls `create-build-checkout` edge function) and **View Buyers** button (queries `user_build_access`, logs to console + toast). Empty state: *"No builds yet — use Quick Create above."*
  - A small "Open full library page" link to `/owner/builds` for users who prefer the standalone view (the existing `BuildLibrary` page stays as-is).

**3. Nothing else changes**
- `src/pages/Dashboard.tsx` — untouched.
- `src/pages/owner/BuildLibrary.tsx`, `ProgramBuilder.tsx`, `BundleBuilder.tsx`, `ConsultationFlow.tsx` — untouched.
- `App.tsx` routes — untouched.
- Backend, RLS, Stripe, webhooks — untouched.

### Mobile behavior
Quick Create grid: 1 col at 390px → 3 cols ≥640px. Build cards stack the action buttons in a column on the right (already the pattern in `BuildLibrary`).

### Technical notes
- Reuses existing helpers: `getBuilds`, `BuildItem`, `supabase.functions.invoke('create-build-checkout')`, `supabase.from('user_build_access')`, `toast`.
- Pulls in `Package`, `Send`, `Users`, `Loader2` from lucide (already used elsewhere).
- Local state in `OwnerDashboard.tsx`: `builds` (loaded once on `activeSection === 'builds'` first view via `useEffect`) and `pendingId` for the Sell button.

### Outcome
Open Owner Dashboard → click **Builds** in the sidebar → you see your builds list and one-click Quick Create for Program / Bundle / Consultation. Same page, same shell, just a new tab.
