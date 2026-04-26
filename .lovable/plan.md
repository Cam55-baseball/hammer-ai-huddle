# Phase 9 — Conversion Execution Layer (Modal → Routing Bridge)

Turn the Phase 8 "Execute" intent emission into a confirmed, owner-gated action via a modal that bridges to placeholder owner routes. Still **zero DB writes**, **zero ranking impact**, **zero auto-execution** — every step requires an explicit owner click.

System ladder after this phase:
- **Phase 6** Tier system → structural worth (immutable)
- **Phase 7** Monetization overlay → revenue eligibility (derived)
- **Phase 8** CTA → ConversionAction intent emitter (click-only)
- **Phase 9** Conversion modal → confirmed routing bridge (click-only, placeholder routes)

---

## 1. NEW — `src/components/owner/VideoConversionModal.tsx`

A confirmation modal built on the existing shadcn `Dialog` primitive (already used elsewhere in `VideoLibraryManager.tsx`, lines 36–40) so it inherits the project's tokens, focus management, portal stability, and dark-mode styling — instead of hand-rolling `<div>` overlays.

Key rules baked in:
- No DB writes, no ranking effects.
- `if (!action) return null;` guard before `<Dialog>` so we never render an empty modal.
- "Continue" handler logs the routing intent, then navigates to a placeholder owner route. Phase 10 will swap `window.location.href` for a real router push + actual builder pages.
- Cancel always closes; no side effects.

```tsx
/**
 * PHASE 9 — Conversion Execution Modal
 * - No ranking logic
 * - No DB writes
 * - Only explicit owner-triggered navigation
 * - Phase 10 hook point: replace window.location.href with real router + builder pages
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ConversionAction } from '@/lib/videoConversionActions';

type Props = {
  open: boolean;
  onClose: () => void;
  action: ConversionAction;
  videoId: string;
};

const ACTION_LABEL: Record<Exclude<ConversionAction, null>, string> = {
  open_program_builder: 'Create Training Program',
  open_bundle_builder: 'Build Video Bundle',
  open_consultation_flow: 'Start Consultation Flow',
};

export function VideoConversionModal({ open, onClose, action, videoId }: Props) {
  if (!action) return null;

  const label = ACTION_LABEL[action];

  const handleProceed = () => {
    console.log('[PHASE_9_ROUTE]', {
      action,
      videoId,
      timestamp: Date.now(),
    });
    // Phase 9 placeholder — Phase 10 will replace with router.push + real builder pages.
    window.location.href = `/owner/${action}?videoId=${encodeURIComponent(videoId)}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conversion Action</DialogTitle>
          <DialogDescription>
            {label} for the selected video. This is an owner-confirmed action — nothing
            is charged or persisted yet.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleProceed}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 2. EDIT — `src/components/owner/VideoLibraryManager.tsx`

**A. Imports** (add near the existing owner-component imports, e.g. right after line 26):
```ts
import { VideoConversionModal } from "./VideoConversionModal";
import type { ConversionAction } from "@/lib/videoConversionActions";
```

**B. Component state** — add three pieces of state alongside the existing `useState` hooks in `VideoLibraryManager`:
```ts
const [convModalOpen, setConvModalOpen] = useState(false);
const [convAction, setConvAction] = useState<ConversionAction>(null);
const [convVideoId, setConvVideoId] = useState<string>('');
```

**C. Replace the Execute button's onClick** (currently lines 258–263) so it opens the modal instead of just logging. Keep `trackCtaClick` so Phase 8 analytics still fire on intent — the modal then represents confirmation:
```tsx
onClick={() => {
  trackCtaClick(video.id, action);
  setConvAction(action);
  setConvVideoId(video.id);
  setConvModalOpen(true);
}}
```
(The surrounding `<button type="button" className="underline text-primary ...">Execute</button>` and the `cta && !isThrottled && action` guard stay exactly as-is — render purity from the prior fix is preserved.)

**D. Render the modal** once at the bottom of the component's returned JSX (a single instance, driven by state — not per-card, to keep the DOM clean for large lists):
```tsx
<VideoConversionModal
  open={convModalOpen}
  onClose={() => setConvModalOpen(false)}
  action={convAction}
  videoId={convVideoId}
/>
```

---

## 3. Guardrails (verified, no changes)

- `videoRecommendationEngine.ts` — untouched. Phase 6 ranking stays deterministic.
- `videoMonetization.ts` — untouched. Phase 7 overlay stays derived.
- `videoConversionActions.ts` / `videoConversionAnalytics.ts` / `videoCtaSuggestions.ts` — untouched.
- `useVideoLibrary.ts` / `useVideoSuggestions.ts` — untouched.
- DB / migrations — none. Phase 9 is pure UI + placeholder navigation.
- `library_video_monetization` table — still NOT written to. Reserved for Phase 10.

---

## 4. Owner Authority — invariants preserved

- ✅ Suggestion is advisory; Execute is the first explicit click.
- ✅ Modal Continue is the second explicit click — no auto-navigation.
- ✅ No checkout, no enrollment, no DB mutation triggered.
- ✅ No ranking feedback loop introduced.
- ✅ Cancel is a true no-op.

---

## 5. Files

**Created (1):** `src/components/owner/VideoConversionModal.tsx`
**Edited (1):** `src/components/owner/VideoLibraryManager.tsx`
**Migration:** none.

---

## 6. Outcome

- Phase 6 ranking integrity: preserved
- Phase 7 monetization overlay: preserved
- Phase 8 intent emitter: preserved (still fires on Execute click)
- New: a confirmed, owner-gated routing bridge ready for Phase 10 to swap placeholder URLs for real builder/checkout pages without touching the suggestion or ranking pipelines.
