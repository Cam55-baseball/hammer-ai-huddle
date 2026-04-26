## Phase 10.5 — Local Persistence + Owner Build Library

Add a lightweight localStorage layer so owner-created programs/bundles/consultations persist and are viewable in a new owner-only "Build Library" page. **No DB, no schema, no ranking/monetization changes.**

---

### 1. NEW — `src/lib/ownerBuildStorage.ts`

Tiny utility around `localStorage` (key: `owner_builds`).

```ts
export type BuildItem = {
  id: string;
  type: 'program' | 'bundle' | 'consultation';
  name: string;
  meta: Record<string, any>;
  createdAt: number;
};

const KEY = 'owner_builds';

export function saveBuild(item: BuildItem): void { /* try/catch unshift+set */ }
export function getBuilds(): BuildItem[] { /* try/catch parse, default [] */ }
```

All access wrapped in `try/catch` for SSR/quota safety.

---

### 2. EDIT — Three builder pages (replace console-log save handlers)

**`src/pages/owner/ProgramBuilder.tsx`** — `handleSave`:
```ts
saveBuild({
  id: crypto.randomUUID(),
  type: 'program',
  name,
  meta: { description, videoId },
  createdAt: Date.now(),
});
console.log('[PHASE_10_PROGRAM_SAVE]', { name, description, videoId });
// toast success + navigate to /owner/builds
```

**`src/pages/owner/BundleBuilder.tsx`** — `handleSave`:
```ts
saveBuild({ id: crypto.randomUUID(), type: 'bundle', name, meta: { videoId }, createdAt: Date.now() });
```

**`src/pages/owner/ConsultationFlow.tsx`** — `handleCreate`:
```ts
saveBuild({ id: crypto.randomUUID(), type: 'consultation', name: title, meta: { price, videoId }, createdAt: Date.now() });
```

Each page: keep existing `console.log`, add a `toast` confirming save, then `navigate('/owner/builds')`.

---

### 3. NEW — `src/pages/owner/BuildLibrary.tsx`

Owner-gated page (mirrors existing builder pages):
- `useOwnerAccess()` redirect guard + `Loader2` while loading
- `DashboardLayout` wrapper
- Header: "Your Builds" with `Library` icon
- Reads `getBuilds()` once on mount into `useState`
- Renders list of `Card`s — each shows name, type badge, formatted `createdAt`, and a small meta line (e.g. videoId)
- Empty state: "No builds yet — create one from your videos."

---

### 4. ROUTE — `src/App.tsx`

Add lazy import + route alongside the other `/owner/*` routes (line ~173):
```tsx
const BuildLibrary = lazyWithRetry(() => import("./pages/owner/BuildLibrary"));
<Route path="/owner/builds" element={<BuildLibrary />} />
```

---

### 5. OwnerDashboard link

In `src/pages/OwnerDashboard.tsx`, add a small "View Your Builds" button/link → `/owner/builds` near the top of the dashboard. (Owner-only page already, so no extra gating needed.)

---

### 6. Files

**Created (2):**
- `src/lib/ownerBuildStorage.ts`
- `src/pages/owner/BuildLibrary.tsx`

**Edited (5):**
- `src/pages/owner/ProgramBuilder.tsx`
- `src/pages/owner/BundleBuilder.tsx`
- `src/pages/owner/ConsultationFlow.tsx`
- `src/App.tsx` — lazy import + route
- `src/pages/OwnerDashboard.tsx` — link to `/owner/builds`

**Migrations:** none. **Backend:** none.

---

### 7. Outcome

Execute → Continue → Builder → Save → redirected to Build Library showing the new entry. Persists across reloads via `localStorage`. Ready for Phase 11 (DB + Stripe) drop-in: swap `saveBuild`/`getBuilds` for Supabase calls without UI rework.
