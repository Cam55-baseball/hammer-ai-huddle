

# Defensive Drill Recommendation System — Zero-Tolerance E2E

## Current State Summary

**Existing tables**: `drills` (29 rows, modules: practice-hub/speed-lab/tex-vision), `drill_prescriptions`, `vault_saved_drills`, `tex_vision_drill_results`, `udl_drill_completions`

**Existing `drills` schema**: id, name, module, skill_target, default_constraints (jsonb), video_url, difficulty_levels (text[]), created_at

**Gaps**: No sport column, no tags/tag-map, no ai_context, no description, no subscription tier gating. Recommendation logic is hardcoded in `src/data/s2DrillRecommendations.ts` (Tex Vision only) — not database-driven.

---

## Phase 1 — Schema Changes (Migration)

### Extend `drills` table
```sql
ALTER TABLE public.drills
  ADD COLUMN sport text NOT NULL DEFAULT 'baseball',
  ADD COLUMN description text,
  ADD COLUMN ai_context text,
  ADD COLUMN premium boolean NOT NULL DEFAULT false,
  ADD COLUMN is_active boolean NOT NULL DEFAULT true;
```

### Create `drill_tags` enum + table
```sql
CREATE TYPE public.drill_tag_category AS ENUM (
  'skill', 'body_part', 'equipment', 'intensity', 'phase', 'position'
);

CREATE TABLE public.drill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category drill_tag_category NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.drill_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read drill tags" ON public.drill_tags FOR SELECT USING (true);
CREATE POLICY "Owner manages drill tags" ON public.drill_tags
  USING (user_has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (user_has_role(auth.uid(), 'owner'::app_role));
```

### Create `drill_tag_map` junction table
```sql
CREATE TABLE public.drill_tag_map (
  drill_id UUID NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.drill_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (drill_id, tag_id)
);

ALTER TABLE public.drill_tag_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tag map" ON public.drill_tag_map FOR SELECT USING (true);
CREATE POLICY "Owner manages tag map" ON public.drill_tag_map
  USING (user_has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (user_has_role(auth.uid(), 'owner'::app_role));
```

### Update `drills` RLS — add owner write
```sql
CREATE POLICY "Owner can manage drills" ON public.drills
  USING (user_has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (user_has_role(auth.uid(), 'owner'::app_role));
```

### Seed initial tags
Insert ~20 starter tags across categories (e.g., skill: "pitch_recognition", "barrel_contact"; body_part: "arm", "legs"; equipment: "tee", "net"; intensity: "low", "high"; phase: "preseason", "in_season").

### Backfill existing 29 drills
Set `sport = 'baseball'` and map `skill_target` values to corresponding tags in the junction table.

---

## Phase 2 — Pure Recommendation Engine

### New file: `src/utils/drillRecommendationEngine.ts`

A **pure function** with zero side effects:

```typescript
interface DrillInput {
  id: string;
  name: string;
  module: string;
  sport: string;
  skill_target: string | null;
  premium: boolean;
  tags: string[];       // tag names from junction
  ai_context: string | null;
  difficulty_levels: string[];
}

interface WeaknessInput {
  area: string;          // e.g. "pitch_recognition"
  score: number;         // 0-100, lower = weaker
  metric?: string;       // optional specific metric
}

interface RecommendationInput {
  drills: DrillInput[];
  weaknesses: WeaknessInput[];
  sport: string;
  userHasPremium: boolean;
  excludeDrillIds?: string[];
}

interface ScoredDrill {
  drill: DrillInput;
  score: number;
  breakdown: {
    skillMatch: number;     // 0-40
    tagRelevance: number;   // 0-30
    difficultyFit: number;  // 0-15
    variety: number;        // 0-15
  };
  locked: boolean;  // true if premium && !userHasPremium
}

interface RecommendationOutput {
  recommended: ScoredDrill[];
  fallbackUsed: boolean;
}

export function computeDrillRecommendations(input: RecommendationInput): RecommendationOutput
```

**Scoring logic**:
1. Filter by `sport` and `is_active`
2. Score each drill against each weakness: skill_target match (40pts), tag overlap with weakness area (30pts), difficulty spread bonus (15pts), module variety (15pts)
3. Sum scores, sort descending, take top 5
4. Mark `locked: true` for premium drills when `userHasPremium === false` (drill appears in list but is gated)
5. If no drills match weaknesses, return all drills sorted by name as fallback (`fallbackUsed: true`)
6. Unknown weakness areas → skip gracefully (no crash)
7. Empty drills array → return `{ recommended: [], fallbackUsed: true }`

**Deterministic**: Same input always produces same output (no randomness, no Date calls).

---

## Phase 3 — Subscription Gating (Prove It)

The engine returns `locked: boolean` per drill. The UI component wraps premium drills in the existing `SubscriptionGate` pattern. The engine itself never filters out premium drills — it always returns them but marks access.

**Test cases baked into the test file**:
- User A (no subscription): receives drills with `locked: true` on premium ones
- User B (premium): receives same drills with `locked: false`
- Both see identical ordering/scores — only `locked` differs

---

## Phase 4 — Test Suite

### New file: `src/utils/__tests__/drillRecommendationEngine.test.ts`

**Functional tests** (vitest, pure function, no DB):
1. Basic recommendation with matching weakness → correct top drill
2. Determinism: call twice with same input → identical output
3. Scoring breakdown sums correctly
4. No tags on any drill → fallback drills returned
5. Unknown weakness area → no crash, returns available drills
6. Mixed sport input → only matching sport returned
7. Empty drills array → safe empty return
8. Premium gating: User A vs User B
9. Admin tag update simulation: change tags, re-run → different results
10. Stress test: 1,000 drills × 20 weaknesses → returns in <100ms

---

## Phase 5 — Files

| File | Action |
|------|--------|
| Migration SQL | Add columns to `drills`, create `drill_tags`, `drill_tag_map`, seed data |
| `src/utils/drillRecommendationEngine.ts` | Pure recommendation function |
| `src/utils/__tests__/drillRecommendationEngine.test.ts` | 10+ tests including stress test |

No UI changes in this phase — engine and schema only. The engine is designed to plug into existing recommendation surfaces (game plan, practice hub, Tex Vision diagnostics) in a follow-up.

