# Phase 8 — CTA → Conversion Execution Layer

Bridge the Phase 7 advisory CTA into an **explicit, owner-triggered intent emitter**. Zero ranking impact, zero DB writes, zero auto-execution. Click is the only thing that fires anything — and even then, all it does is emit an intent + analytics breadcrumb. Real routing/checkout is deferred to Phase 9+.

System ladder after this phase:
- **Phase 6** Tier system → structural worth (immutable)
- **Phase 7** Monetization overlay → revenue eligibility (derived)
- **Phase 8** Conversion actions → owner intent emission (manual click only)

---

## 1. NEW — `src/lib/videoConversionActions.ts`

Pure mapper: `CtaKind → ConversionAction`. No side effects.

```ts
/**
 * PHASE 8 RULES:
 * - No ranking logic here
 * - No DB writes
 * - Only user-triggered intent mapping
 * - All actions are explicit (never automatic)
 */
import type { CtaKind } from './videoCtaSuggestions';

export type ConversionAction =
  | 'open_program_builder'
  | 'open_bundle_builder'
  | 'open_consultation_flow'
  | null;

export function mapCtaToAction(cta: CtaKind): ConversionAction {
  if (cta === 'program') return 'open_program_builder';
  if (cta === 'bundle') return 'open_bundle_builder';
  if (cta === 'consultation') return 'open_consultation_flow';
  return null;
}
```

---

## 2. NEW — `src/lib/videoConversionAnalytics.ts`

Lightweight, fail-silent breadcrumb emitter. No network calls, no DB. Just structured `console.log` for now — Phase 9 can replace the body with a real telemetry sink without touching callers.

```ts
/**
 * PHASE 8 — analytics only.
 * No ranking influence. No DB mutation. Never throws.
 */
export function trackCtaClick(videoId: string, action: string) {
  try {
    console.log('[CTA_CLICK]', {
      videoId,
      action,
      timestamp: Date.now(),
    });
  } catch {
    // silent fail (never break UI)
  }
}
```

---

## 3. EDIT — `src/lib/videoCtaSuggestions.ts`

Append a Phase 8 guardrail comment to the existing header (no logic change):

```
 * PHASE 8 NOTE:
 * Suggestions are pre-execution hints only.
 * Never assume business context or override owner intent.
```

---

## 4. EDIT — `src/components/owner/VideoLibraryManager.tsx`

**A. Imports** (add):
```ts
import { mapCtaToAction } from '@/lib/videoConversionActions';
import { trackCtaClick } from '@/lib/videoConversionAnalytics';
```

**B. Inside the per-video render block** (around line 215, right after `const cta = suggestCta(monetizationVideo);`):
```ts
const action = mapCtaToAction(cta);
```

**C. Replace the CTA hint block** (lines 247–252) with an execution-ready, click-only intent surface. Keep "Hammer Suggestion — Owner Decides" wording, append an `Execute` link button beside it. Guard on `cta && !isThrottled && action`.

```tsx
{cta && !isThrottled && action && (
  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
    <span className="text-muted-foreground italic">
      <span className="font-medium not-italic">Hammer Suggestion — Owner Decides:</span>{' '}
      {CTA_LABEL[cta]}
    </span>
    <button
      type="button"
      onClick={() => {
        trackCtaClick(video.id, action);
        // Phase 8: explicit intent emission only.
        // Phase 9+ hook point: route to builder / open modal / start checkout.
        console.log('[CONVERSION_ACTION]', action, video.id);
      }}
      className="underline text-primary hover:text-primary/80 font-medium"
    >
      Execute
    </button>
  </div>
)}
```

Notes:
- Uses `text-primary` (design token) instead of raw `text-blue-500` to stay on-brand.
- `<button type="button">` so it never submits a parent form.
- No router/modal wiring yet — that's Phase 9. The console logs are the explicit hook points.

---

## 5. Guardrails (verified, no changes)

- `videoRecommendationEngine.ts` — untouched. Ranking remains Phase 6 deterministic.
- `videoMonetization.ts` — untouched. Overlay stays derived.
- `useVideoLibrary.ts` / `useVideoSuggestions.ts` — untouched.
- DB / migrations — none. Phase 8 is **pure runtime intent emission**.
- `library_video_monetization` table — still NOT written to. Reserved for Phase 9 explicit wiring.

---

## 6. Owner Authority — invariants preserved

- ✅ No auto-execution
- ✅ No auto-checkout / auto-enrollment
- ✅ No DB writes from CTA system
- ✅ No ranking feedback loops
- ✅ Click is the only trigger; suggestion remains advisory until then

---

## Files

**Created (2):** `src/lib/videoConversionActions.ts`, `src/lib/videoConversionAnalytics.ts`
**Edited (2):** `src/lib/videoCtaSuggestions.ts` (comment-only), `src/components/owner/VideoLibraryManager.tsx`
**Migration:** none.

## Outcome

- Phase 6 ranking integrity: preserved
- Phase 7 monetization overlay: preserved
- CTA pipeline now has a clean, owner-gated execution seam ready for Phase 9 (real routing → builders → Stripe/checkout) without any architectural rework.
