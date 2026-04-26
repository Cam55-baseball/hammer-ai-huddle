## Phase 10 — Builder Pages + SPA Routing + Owner Gating

Activate the execution layer with three owner-only builder pages, real SPA navigation from the conversion modal, and an explicit owner gate around the Execute CTA. **No DB writes, no ranking impact, no monetization changes.**

---

### 1. NEW PAGES (3 files) — owner-only scaffolds

All three pages follow the same pattern:
- Wrapped in `DashboardLayout`
- Use `useOwnerAccess()` — redirect non-owners to `/dashboard` (mirrors `AdminEngineSettings.tsx`)
- Read `videoId` from query string via `useSearchParams`
- Show a header with the originating video ID
- Use existing design system (`Button`, `Input`, `Textarea`, `Card`)
- Save buttons `console.log` only — **no DB writes**

**`src/pages/owner/ProgramBuilder.tsx`** (route: `/owner/open_program_builder`)
- Title: "Program Builder"
- Subtext: "Building from Video ID: {videoId}"
- Inputs: Program Name (`Input`), Description (`Textarea`)
- Section card: "Selected Video" showing `videoId`
- Button: "Save Program" → `console.log('[PHASE_10_PROGRAM_SAVE]', { name, description, videoId })`

**`src/pages/owner/BundleBuilder.tsx`** (route: `/owner/open_bundle_builder`)
- Title: "Bundle Builder"
- Subtext: "Building from Video ID: {videoId}"
- Input: Bundle Name
- Section card: "Videos in Bundle" showing `videoId` as the seed entry
- Button: "Save Bundle" → `console.log('[PHASE_10_BUNDLE_SAVE]', { name, videoId })`

**`src/pages/owner/ConsultationFlow.tsx`** (route: `/owner/open_consultation_flow`)
- Title: "Consultation Setup"
- Subtext: "Based on Video ID: {videoId}"
- Inputs: Offer Title, Price (text input)
- Button: "Create Offer" → `console.log('[PHASE_10_CONSULTATION_CREATE]', { title, price, videoId })`

---

### 2. ROUTING — `src/App.tsx`

Add three lazy imports + three routes (paths match the `ConversionAction` enum values exactly so `/owner/${action}` resolves cleanly):

```tsx
const ProgramBuilder = lazyWithRetry(() => import("./pages/owner/ProgramBuilder"));
const BundleBuilder = lazyWithRetry(() => import("./pages/owner/BundleBuilder"));
const ConsultationFlow = lazyWithRetry(() => import("./pages/owner/ConsultationFlow"));
```

Routes (placed near the existing `/owner` route):
```tsx
<Route path="/owner/open_program_builder" element={<ProgramBuilder />} />
<Route path="/owner/open_bundle_builder" element={<BundleBuilder />} />
<Route path="/owner/open_consultation_flow" element={<ConsultationFlow />} />
```

---

### 3. SPA NAVIGATION — `src/components/owner/VideoConversionModal.tsx`

Replace the Phase 10 hook log with real `react-router-dom` navigation (the project already uses `BrowserRouter`).

- Add `import { useNavigate } from 'react-router-dom';`
- Inside component: `const navigate = useNavigate();`
- Update `handleProceed`:
```tsx
const handleProceed = () => {
  console.log('[PHASE_9_ROUTE]', { action, videoId, timestamp: Date.now() });
  navigate(`/owner/${action}?videoId=${encodeURIComponent(videoId)}`);
  onClose();
};
```

Rules preserved: no `window.location.href`, modal still closes on confirm, `[PHASE_9_ROUTE]` log retained.

---

### 4. OWNER GATING — `src/components/owner/VideoLibraryManager.tsx`

Currently the CTA block (lines ~256–275) renders for anyone viewing the manager. Although the manager is mounted inside `OwnerDashboard` (which is owner-gated at the page level), add an explicit defense-in-depth gate so the Execute control can never leak if this component is ever embedded elsewhere.

- Import `useOwnerAccess`: `import { useOwnerAccess } from '@/hooks/useOwnerAccess';`
- At top of component: `const { isOwner } = useOwnerAccess();`
- Update the conditional render around the CTA block from `{cta && !isThrottled && action && (...)}` to `{isOwner && cta && !isThrottled && action && (...)}`

The builder pages themselves also enforce owner-only access via `useOwnerAccess`, so even direct URL access by a non-owner redirects to `/dashboard`.

---

### 5. Guardrails (verified, untouched)

- `videoRecommendationEngine.ts` — Phase 6 ranking unchanged
- `videoMonetization.ts` — Phase 7 overlay unchanged
- `videoCtaSuggestions.ts` / `videoConversionActions.ts` / `videoConversionAnalytics.ts` — unchanged
- No DB migrations, no edge functions, no schema changes
- `library_video_monetization` still NOT written — reserved for a later commerce phase

---

### 6. Files

**Created (3):**
- `src/pages/owner/ProgramBuilder.tsx`
- `src/pages/owner/BundleBuilder.tsx`
- `src/pages/owner/ConsultationFlow.tsx`

**Edited (3):**
- `src/App.tsx` — three lazy imports + three routes
- `src/components/owner/VideoConversionModal.tsx` — `useNavigate` swap in `handleProceed`
- `src/components/owner/VideoLibraryManager.tsx` — `isOwner` guard on CTA block

**Migrations:** none

---

### 7. Outcome

| Phase | State |
|-------|-------|
| 6 — Ranking | ✔ deterministic, locked |
| 7 — Monetization | ✔ derived overlay only |
| 8 — CTA intent | ✔ click-only emitter |
| 9 — Conversion modal | ✔ owner-gated, SPA-safe |
| 10 — Builder pages + routing | ✔ owner-only scaffolds, real SPA nav |

Execute → Continue now navigates (in-app, no reload) into a real owner-only builder surface seeded with the originating `videoId`. The pages are functional placeholders ready for a future commerce/persistence phase.