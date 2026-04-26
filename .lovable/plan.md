# Phase 6 — Final Hardening Patch

Lock down the enforcement layer so **distribution tier is authoritative**, ranking is deterministic, and UI/DB/engine cannot drift apart.

---

## 1. Single source of truth — `src/lib/videoTier.ts` (NEW)

Create a tiny normalizer module so every consumer reads tier through the same gate:

```ts
export type DistributionTier = 'blocked' | 'throttled' | 'normal' | 'boosted' | 'featured';

export function normalizeTier(t: unknown): DistributionTier {
  if (t === 'blocked' || t === 'throttled' || t === 'boosted' || t === 'featured') return t;
  return 'normal';
}

export const TIER_BOOST: Record<DistributionTier, number> = {
  blocked: 0,
  throttled: 0.55,
  normal: 1.0,
  boosted: 1.15,
  featured: 1.30,
};
```

Replace every direct `video.distribution_tier` read with `normalizeTier(video.distribution_tier)` in:
- `src/lib/videoRecommendationEngine.ts` (2 sites)
- `src/components/owner/VideoLibraryManager.tsx` (line 201)
- `src/hooks/useVideoSuggestions.ts` (line 89 mapping)

---

## 2. Deterministic ranking in `videoRecommendationEngine.ts`

Add invariant header comment:

```ts
/**
 * PHASE 6 SYSTEM RULES:
 * - Blocked videos NEVER surface
 * - Tier is authoritative over raw score noise
 * - Confidence is a tie-breaker, not a driver
 * - UI must reflect DB tier exactly (no divergence)
 */
```

Refactor the per-video loop so the **tier gate + boost is computed first**, then applied as a final multiplier (so weak tag-noise can never out-rank a featured video):

```ts
const tier = normalizeTier(v.distribution_tier);
if (tier === 'blocked') continue;            // hard filter
const tierBoost = TIER_BOOST[tier];
// ...existing scoring...
score = score * tierBoost;
```

Remove the inline `TIER_MULTIPLIER` constant in favor of the shared `TIER_BOOST`.

---

## 3. Lock `public_library_videos` view (migration)

New migration: drop & recreate the view to enforce both invariants.

```sql
DROP VIEW IF EXISTS public.public_library_videos;
CREATE VIEW public.public_library_videos
WITH (security_invoker = on) AS
SELECT *
FROM public.library_videos
WHERE distribution_tier <> 'blocked'
  AND confidence_score IS NOT NULL;
```

Missing-confidence rows now hard-fail to invisible (safety net for any legacy/null records that bypass the trigger).

---

## 4. Athlete feed deterministic ordering — `src/hooks/useVideoLibrary.ts`

Replace the current confidence/created-at chain with a strict three-key ordering:

```ts
query = query
  .neq('distribution_tier', 'blocked')
  .order('distribution_tier', { ascending: false })  // featured > normal > throttled (alpha desc happens to match priority once 'blocked' is excluded — verify)
  .order('confidence_score', { ascending: false, nullsFirst: false })
  .order('created_at', { ascending: false });
```

> Note: alphabetical desc on tier strings does **not** produce the desired priority (`throttled` > `normal` > `featured` > `boosted` alphabetically). I will instead order by a computed `tier_rank` expression — since Supabase JS can't do that inline, I'll add a generated column `tier_rank smallint` to `library_videos` (via the same migration) populated by the existing `recompute_library_video_tier` function:
> - `featured=4, boosted=3, normal=2, throttled=1, blocked=0`
> Then order by `tier_rank desc, confidence_score desc, created_at desc`. This gives true deterministic ordering with no alpha-sort surprises.

---

## 5. UI guards in `VideoLibraryManager.tsx`

Replace line 201's loose cast with the normalizer, and short-circuit blocked rows defensively:

```tsx
const tier = normalizeTier(video.distribution_tier);
if (tier === 'blocked') return null; // safety: should already be filtered server-side
const isThrottled = tier === 'throttled';
```

Keep the existing throttled banner (already wired to `SYSTEM_TONE.throttledOwnerCard`).

---

## 6. Monetization safety — `src/lib/videoMonetization.ts` (NEW)

The file doesn't exist yet. Create it as the foundation for the next phase, with the gate baked in from day one:

```ts
import { normalizeTier } from './videoTier';
import type { VideoWithTags } from './videoRecommendationEngine';

export function isMonetizable(video: VideoWithTags): boolean {
  return (
    normalizeTier(video.distribution_tier) !== 'blocked' &&
    (video.confidence_score ?? 0) >= 70
  );
}
```

This locks the contract: **only solid-or-better videos can ever be wired into CTAs/bundles**.

---

## Files touched

**Created (2):**
- `src/lib/videoTier.ts`
- `src/lib/videoMonetization.ts`

**Edited (4):**
- `src/lib/videoRecommendationEngine.ts` — invariant header, normalizer, early tier gate, shared `TIER_BOOST`
- `src/hooks/useVideoLibrary.ts` — deterministic ordering via `tier_rank`
- `src/hooks/useVideoSuggestions.ts` — normalize tier on hydration
- `src/components/owner/VideoLibraryManager.tsx` — normalized tier read + blocked short-circuit

**Migration (1):**
- Adds `tier_rank smallint` column to `library_videos`, updates `recompute_library_video_tier` to populate it, backfills existing rows, recreates `public_library_videos` view with the dual `blocked + null-confidence` filter.

## Owner Authority

Untouched. No auto-application, no silent overrides. This patch is purely about enforcing existing rules consistently.

## Outcome

- Ranking becomes deterministic (tier-first, confidence tiebreak, recency final)
- Blocked content cannot leak through any path (engine gate + view filter + UI short-circuit)
- UI, DB, and engine all read tier through one normalizer — drift is structurally impossible
- Monetization layer ships with a safety gate so the next phase can build on stable ground