
# Phase 1.0B — BH First-Athlete Value Loop

Implement the minimum BH end-to-end experience. Pitching is untouched. All Drill/Video/Roadmap/clip slots render as visible missingness per §3 Law 7.

## Files to create

### 1. `src/lib/reportCard/v1/hittingV1Schema.ts` — B3
Typed content store of the 4 ratified §5.1 phases (P1 Hip Load, P2 Hand Load, P3 Stride & Landing, P4 Hitter's Move). One entry per phase containing all 18 §17 fields verbatim from `docs/asb/report-card-constitution.md` §5.1:

```ts
export type BhCategoryId = 'p1_hip_load' | 'p2_hand_load' | 'p3_stride' | 'p4_hitters_move';
export interface BhCategorySchema {
  id: BhCategoryId; phaseId: 'P1'|'P2'|'P3'|'P4'; name: string;
  engineBinding: string; displayFormat: string;
  hierarchyRank: 'non_negotiable' | 'rank_1';
  weightAthleteView: string;
  whatIsIt: string; whyItMatters: string;
  ifPoorPerformance: string; ifPoorDurability: string;
  ifPoorEfficiency: string; ifPoorConsistency: string;
  howToImprove: string;
  drillIds: string[];                  // [] → visible missingness
  videoIds: string[];                  // []
  roadmapStep: string | null;          // null
  goodLooksLikeClip: string | null;    // null
  badLooksLikeClip: string | null;     // null
  coachHammerVoice: { athlete: true; parent: true; coach: true };
  confidenceRule: string; missingnessRule: string;
}
export const BH_V1_CATEGORIES: readonly BhCategorySchema[] = [ /* 4 entries */ ];
```

### 2. `src/components/report-card/CategoryPanel.tsx` — B1
Universal Category Explanation Law (§6) renderer. Takes one `BhCategorySchema` + optional score/confidence/missing flag. Renders the 9 universal blocks:

1. Header (name + Non-Negotiable Pass/Fail chip when `hierarchyRank === 'non_negotiable'`, else band chip)
2. What is it / Why it matters
3. "If poor → …" 4-row grid (Performance / Durability / Efficiency / Consistency)
4. How to improve
5. Drill block — list `drillIds` or `<MissingnessChip reason="Drill prescription pending — operational tagging backlog">`
6. Video block — same pattern for `videoIds` + good/bad clips
7. Roadmap block — same pattern
8. Coach Hammer block — `<Button onClick={onAskHammer}>` Ask Coach Hammer about {name}
9. Confidence + Missingness footer (always render confidence rule + missingness rule literally)

Pure presentation. Reads tokens from `src/index.css`; no hardcoded colors.

### 3. `src/components/report-card/BhCategoryPanels.tsx` — B1 wrapper
Maps over `BH_V1_CATEGORIES`, derives per-phase score from `UhrcReport.pillars` (hitting pillars carry `p1_…p4_*` source_signal_ids), passes `onAskHammer(category)` upward.

### 4. `src/components/hammer/CategoryHammerDialog.tsx` — B8
Lightweight `<Dialog>` wrapping `<HammerChat />` with a pre-seeded opening assistant turn rendered above the chat:
> "Let's talk about **{category.name}**. {whyItMatters}"
plus a seeded category context payload passed via new optional `categoryFocus` prop on `useHammerChat`.

## Files to edit

### 5. `src/hooks/useHammerChat.ts` — B8
Add optional `categoryFocus?: { id; name; whyItMatters; howToImprove; hierarchyRank }` argument to the hook (or to `send`). When set, include it in the `body` sent to `hammer-chat` edge function.

### 6. `supabase/functions/hammer-chat/index.ts` — B8
Accept new optional `categoryFocus` on request body. If present, append to system prompt:
```
CATEGORY_FOCUS = <json>
The athlete is asking about this specific report-card category. Stay focused on it. Use the same athlete-first rules.
```

### 7. `src/components/report-card/UhrcAthleteSection.tsx` — B1 wiring
When `disciplines` includes `"hitting"` and sport is baseball, render `<BhCategoryPanels report={report} />` below `<UhrcReportCard />`. State holds `activeCategory` to open `<CategoryHammerDialog>`.

## Out of scope (deferred, non-blocking)
- Deterministic drill / video / roadmap resolvers (B5/B6/B7)
- BP §4.1 schema store (B2)
- Trend / first-measurement chip (B9)
- Tone/palette audit (B11)
- Throwing, Catching, Defense, Baserunning, Softball
- Operational tagging backlog (Drill / Video / Roadmap IDs render as visible missingness)

## Success condition
A real athlete on baseball/hitting can: sign up → upload a hitting video → analysis runs (existing) → opens Command/Progress → sees `UhrcReportCard` + 4 BH `CategoryPanel`s with full §17 schema content + missingness chips for unmapped drills/videos/roadmap → taps "Ask Coach Hammer about Hip Load" → receives category-focused reply.

## Remaining blockers expected after this ship
- B2 (BP §4.1 schema store) — required before paying-athlete BP parity
- B5/B6/B7 — required before public beta (drill/video/roadmap mappings)
- B9 (trend chip), B10 (Pass/Fail gate visual on top-level report card header), B11 (tone audit)
