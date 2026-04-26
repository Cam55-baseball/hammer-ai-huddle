# Phase 9 — Final Cleanup Patch (SPA Hook Boundary)

The Phase 9 modal is structurally complete. The only remaining technical debt is the `window.location.href` navigation in `VideoConversionModal.tsx`, which causes a hard page reload, loses React state context, and would create friction when wiring real SPA routes + Stripe checkout in Phase 10.

This patch swaps that single line for a clean, log-only Phase 10 hook boundary. **No new files, no DB changes, no ranking/monetization impact.**

---

## 1. EDIT — `src/components/owner/VideoConversionModal.tsx`

Replace **only** the `handleProceed` function body. Everything else in the file (imports, props, `ACTION_LABEL`, JSX, `Dialog` wiring, Cancel/Continue buttons) stays exactly as-is.

**Current (lines ~38–46):**
```tsx
const handleProceed = () => {
  console.log('[PHASE_9_ROUTE]', {
    action,
    videoId,
    timestamp: Date.now(),
  });
  // Phase 9 placeholder — Phase 10 will replace with router.push + real builder pages.
  window.location.href = `/owner/${action}?videoId=${encodeURIComponent(videoId)}`;
};
```

**Replace with:**
```tsx
const handleProceed = () => {
  console.log('[PHASE_9_ROUTE]', {
    action,
    videoId,
    timestamp: Date.now(),
  });
  // Phase 10 hook point — replace with router.push + real builder pages
  console.log('[PHASE_10_HOOK]', `/owner/${action}?videoId=${videoId}`);
  onClose();
};
```

Two small, deliberate refinements vs. the user's snippet:
- **Add `onClose()`** at the end so the modal dismisses after the owner confirms (otherwise Continue logs but leaves the modal open, which reads as a broken click). This preserves the "owner-gated, single explicit action" contract.
- Keep the existing `[PHASE_9_ROUTE]` structured log untouched — Phase 8 analytics breadcrumbs (`trackCtaClick` in `VideoLibraryManager`) and Phase 9 route logs remain intact for debugging.

---

## 2. Guardrails (verified, no changes)

- `videoRecommendationEngine.ts` — untouched. Phase 6 ranking stays deterministic.
- `videoMonetization.ts` — untouched. Phase 7 overlay stays derived.
- `videoConversionActions.ts` / `videoConversionAnalytics.ts` / `videoCtaSuggestions.ts` — untouched.
- `VideoLibraryManager.tsx` — untouched. CTA → modal state bridge already correct.
- DB / migrations — none.
- `library_video_monetization` — still NOT written to. Reserved for Phase 10.

---

## 3. Why this matters (concretely)

`window.location.href`:
- triggers a full document reload
- destroys React state, query cache, auth context in memory
- breaks SPA-style transitions and future Stripe session continuity
- would force a rewire when Phase 10 lands

Log-only hook boundary:
- preserves all in-memory state
- gives Phase 10 a clean, single-line swap point (`router.push(...)` or modal-stack push)
- keeps the modal click feeling instant and non-disruptive
- matches the project's centralized routing/SPA standards

---

## 4. Owner Authority — invariants preserved

- ✅ Suggestion advisory (Phase 7)
- ✅ Execute = first explicit click (Phase 8)
- ✅ Continue = second explicit click, now closes modal cleanly (Phase 9)
- ✅ No auto-navigation, no checkout, no DB mutation
- ✅ No ranking feedback loop

---

## 5. Files

**Edited (1):** `src/components/owner/VideoConversionModal.tsx` — `handleProceed` body only
**Created:** none
**Migration:** none

---

## 6. Outcome

After this patch:

| Phase | State |
|-------|-------|
| 6 — Ranking | ✔ deterministic, locked |
| 7 — Monetization | ✔ derived overlay only |
| 8 — CTA intent | ✔ click-only emitter |
| 9 — Conversion modal | ✔ owner-gated, SPA-safe hook boundary |
| 10 — Real routing + checkout | 🟢 single-line swap point ready |

System reaches **🟢 production-ready architecture** with one intentional, clearly-labeled Phase 10 placeholder.
