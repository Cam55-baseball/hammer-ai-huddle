# Phase 7 — Monetization & Conversion Layer Activation

Build a **derived monetization overlay** on top of the locked Phase 6 tier system. Ranking integrity is non-negotiable: monetization is a runtime read, never a write, never a ranking input.

---

## 1. `src/lib/videoMonetization.ts` — tier-aware gate (EDIT)

Replace the current `isMonetizable` with a tier-driven version + invariant header:

```ts
/**
 * PHASE 7 RULES:
 * - Monetization NEVER affects ranking
 * - Ranking remains Phase 6 deterministic system
 * - Monetization is derived, not authoritative
 * - No DB writes from suggestion logic
 */
import { normalizeTier } from './videoTier';
import type { VideoWithTags } from './videoRecommendationEngine';

export function isMonetizable(video: VideoWithTags): boolean {
  const tier = normalizeTier(video.distribution_tier);
  if (tier === 'featured' || tier === 'boosted') return true;
  if (tier === 'normal') return (video.confidence_score ?? 0) >= 75;
  return false; // throttled + blocked
}

export type RevenueLabel = 'revenue_ready' | 'upgradeable' | null;

export function revenueLabel(video: VideoWithTags): RevenueLabel {
  const tier = normalizeTier(video.distribution_tier);
  if (tier === 'featured' || tier === 'boosted') return 'revenue_ready';
  if (tier === 'normal' && (video.confidence_score ?? 0) >= 75) return 'upgradeable';
  return null;
}
```

The current threshold is `>= 70`; spec says `>= 75` for normal-tier monetization. Aligning to spec.

---

## 2. `src/lib/videoCtaSuggestions.ts` — CTA suggestion engine (NEW)

Pure, suggestion-only. Never writes, never auto-assigns.

```ts
/**
 * PHASE 7 — CTA suggestion (advisory only).
 * UI surfaces these as hints. Owner Authority: never auto-applied.
 */
import { normalizeTier } from './videoTier';
import type { VideoWithTags } from './videoRecommendationEngine';

export type CtaKind = 'program' | 'bundle' | 'consultation' | null;

export function suggestCta(video: VideoWithTags): CtaKind {
  const tier = normalizeTier(video.distribution_tier);
  if (tier === 'featured') return 'program';
  if (tier === 'boosted') return 'bundle';
  if ((video.confidence_score ?? 0) >= 80) return 'consultation';
  return null;
}

export const CTA_LABEL: Record<Exclude<CtaKind, null>, string> = {
  program: 'Link to a program',
  bundle: 'Bundle into a series',
  consultation: 'Offer a consultation',
};
```

---

## 3. `src/lib/videoRecommendationEngine.ts` — derived conversion score (EDIT)

Add **after** the existing `score = score * tierBoost` line, inside the per-video loop. Result is attached to the returned record but does NOT change sort order, filters, or thresholds.

```ts
const monetizationBoost =
  tier === 'featured' ? 1.25 :
  tier === 'boosted'  ? 1.15 :
  tier === 'normal'   ? 1.05 : 0;
const conversionScore = score * monetizationBoost; // derived overlay only
```

Extend `RecommendResult` with optional `conversionScore?: number`. Sort/cap logic stays exactly the same — `b.score - a.score`. Add inline comment: `// Phase 7: derived only — never feeds back into ranking.`

---

## 4. `src/components/owner/VideoLibraryManager.tsx` — Revenue badge (EDIT)

In the card render block (around line 213, next to `ConfidenceBadge`), add a Revenue Potential badge driven by `revenueLabel(video)`:

- `revenue_ready` → green-tinted Badge: **"Revenue Ready"**
- `upgradeable` → amber-tinted Badge: **"Upgradeable"**
- `null` → render nothing (throttled is silently hidden — no negative shaming)

Below the existing throttled banner, when `suggestCta(video)` returns a value, render a compact one-line hint:
> *Hammer Suggestion — Owner Decides:* Link to a program

Reusing the existing `OwnerAuthorityNote` tone. No buttons, no auto-wire — pure advisory text in this phase.

Imports added: `isMonetizable`, `revenueLabel` from `@/lib/videoMonetization`; `suggestCta`, `CTA_LABEL` from `@/lib/videoCtaSuggestions`.

---

## 5. Guardrails (verified, no changes needed)

- `useVideoLibrary.ts` ordering — untouched (Phase 6 deterministic chain stays).
- `useVideoSuggestions.ts` — untouched.
- DB / migrations — none. Phase 7 is **pure runtime derivation**.
- `library_video_monetization` table (created in Phase 6) is NOT written to by any of this — it remains reserved for the future explicit owner-action wiring (CTA → program → checkout).

---

## Files

**Created (1):** `src/lib/videoCtaSuggestions.ts`
**Edited (3):** `src/lib/videoMonetization.ts`, `src/lib/videoRecommendationEngine.ts`, `src/components/owner/VideoLibraryManager.tsx`
**Migration:** none.

## Owner Authority

Untouched. Every CTA hint is advisory, marked as Hammer Suggestion. No auto-application, no DB mutation, no silent assignment.

## Outcome

- Phase 6 ranking integrity preserved (verified — only additive derivation)
- Revenue signals emerge from quality tier, not engagement gaming
- Monetization layer becomes a clean overlay ready for Phase 8 (CTA → checkout wiring) without backtracking