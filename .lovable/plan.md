# Add Edit & Delete to Owner Dashboard Builds Section

## Problem
Edit and Delete controls already exist on the standalone Build Library page (`/owner/builds`), but the inline "Your Builds" list shown on the Owner Dashboard (`/owner`, Builds section) only exposes "Sell / Share" and "View Buyers". The user expects edit/delete inline as well.

## Fix
Bring the same edit and delete UX from `BuildLibrary.tsx` into `OwnerDashboard.tsx`'s inline Builds section so the controls are available wherever builds are listed.

### Changes to `src/pages/OwnerDashboard.tsx`

1. Imports
   - Add `updateBuild`, `deleteBuild` from `@/lib/ownerBuildStorage`.
   - Add `useVideoLibrary` hook for the video picker.
   - Add `Pencil`, `Trash2`, `X` icons from lucide-react.
   - Add `Dialog*`, `AlertDialog*`, `Input`, `Label`, `Textarea`, `Select*` UI primitives (reuse existing imports where present).

2. State
   - `editing: BuildItem | null`
   - `draft: { name; price; description; videoId; videoIds[] }`
   - `pickerValue: string` (bundle add picker)
   - `confirmDeleteId: string | null`

3. Handlers (ported from BuildLibrary)
   - `openEdit(build)` — seed draft from build meta.
   - `saveEdit()` — validate (name non-empty, price ≥ 0.50, bundle has ≥1 video), call `updateBuild`, update local state, toast.
   - `handleDelete()` — call `deleteBuild`, update local state, toast.

4. UI additions in the existing build card (lines ~682–704)
   - Add `Edit` button (outline, Pencil icon) → `openEdit(b)`.
   - Add `Delete` button (outline + destructive styling, Trash2 icon) → `setConfirmDeleteId(b.id)`.

5. Append two portals at the end of the Builds section:
   - **Edit Dialog** — same fields as BuildLibrary (name, price, description+anchor video for `program`, video list for `bundle`). Plain price/name for `consultation`.
   - **Delete AlertDialog** — same confirmation copy: existing buyers retain access; only removes from library and stops new sales.

## Notes
- Reuses existing `ownerBuildStorage` helpers — no schema/DB changes.
- No changes to `/owner/builds` page (already complete).
- Follows the project's dialog interaction stability rules and existing UI primitives.
