# Edit & Delete Builds from BuildLibrary

## Current State
- `BuildLibrary.tsx` already has Edit Price and Sell/Share/View Buyers actions.
- `ownerBuildStorage.ts` exposes `getBuilds`, `saveBuild`, `updateBuild` — **no `deleteBuild`** and no way to edit name/description/videos.

## Fix

### 1. Storage layer — `src/lib/ownerBuildStorage.ts`
- Add `deleteBuild(id: string): boolean` — filters the array and persists.
- Widen `updateBuild` patch type to also allow `name` (already present) — confirm `meta` merge handles videoIds replacement (it does via `...patch.meta`).

### 2. BuildLibrary card actions — `src/pages/owner/BuildLibrary.tsx`
Replace the current single "Edit price" button with two buttons:
- **Edit** (Pencil icon) → opens the full Edit dialog (see below).
- **Delete** (Trash icon, destructive variant) → opens a confirm AlertDialog. On confirm: call `deleteBuild`, splice from local `builds` state, toast "Build deleted".

Keep Sell/Share and View Buyers as-is.

### 3. Full Edit dialog (replaces the price-only dialog)
A single modal that edits all owner-controllable fields based on build type:

**Common fields:**
- Name (required, text)
- Price (USD, same text+regex+pl-8 pattern, normalized to 2 decimals on save, min $0.50)

**Program-specific (`type === 'program'`):**
- Description (textarea)
- Anchor Video (Select from `useVideoLibrary`, optional/clearable)

**Bundle-specific (`type === 'bundle'`):**
- Videos in Bundle: list with remove (X) buttons + an "Add from library…" Select for available videos. Mirrors BundleBuilder UX in compact form.

**Save:** calls `updateBuild(id, { name, meta: {...existingMeta, ...patch} })` with normalized price + updated fields. Bundle saves both `videoIds` and `videoId` (first item) for backward-compat — same as BundleBuilder.

**Validation:** Save disabled until name is non-empty, price valid, and (bundle) at least one video.

### 4. State & wiring in BuildLibrary
- Replace `editPrice` state with full draft state: `editDraft: { name, price, description, videoId, videoIds }`.
- Open handler hydrates draft from the selected build.
- Add `useVideoLibrary({ limit: 200 })` hook call so the Select pickers work.
- Add `confirmDeleteId` state for the delete AlertDialog.

### 5. Imports
Add `Trash2` from lucide-react, `AlertDialog*` from `@/components/ui/alert-dialog`, `Select*` from `@/components/ui/select`, `Textarea` from `@/components/ui/textarea`, `useVideoLibrary` from `@/hooks/useVideoLibrary`, `deleteBuild` from `@/lib/ownerBuildStorage`.

## Files Touched
- `src/lib/ownerBuildStorage.ts` — add `deleteBuild`.
- `src/pages/owner/BuildLibrary.tsx` — full edit dialog, delete confirm, button row.

No DB or schema changes. Stripe checkout unaffected (still reads `meta.price` and `meta.videoId(s)`).
