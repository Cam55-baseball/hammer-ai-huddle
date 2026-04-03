

# Adaptive Variation Layer — Implementation Plan

## What This Delivers
Controlled phrasing variation for Win/Focus/Cue/Tag outputs plus repetition detection across sessions, keeping the system fresh without changing any thresholds, metrics, or logic.

## Architecture

```text
sessionInsights.ts (enhanced)
├── WIN_VARIATIONS[metric] → string[][]  (2-3 phrasings per metric)
├── FOCUS_VARIATIONS[metric] → string[][] 
├── CUE_VARIATIONS[metric] → string[]
├── TAG_VARIATIONS[tag] → string[]
├── variationIndex(sessionId, metric) → deterministic hash pick
└── generateInsights(composites, drillBlocks, module, sessionContext?)
                                                        ↑
                                            { sessionType, sessionDate }
                                            for practice/game context cues

PostSessionSummaryV2.tsx
└── passes sessionContext to generateInsights()

useInsightHistory (new hook, lightweight)
└── tracks last 3-5 focus metrics per athlete in localStorage
└── provides focusVariationOffset to shift phrasing when repeated
```

## Changes

### 1. `src/lib/sessionInsights.ts` — Variation + Context

**Add variation arrays** (2-3 per metric, same meaning):
```
WIN_VARIATIONS.chase_pct = [
  (v) => `Chase discipline was elite — only ${v}% chase rate`,
  (v) => `You laid off pitches outside the zone — just ${v}% chases`,
  (v) => `${v}% chase rate — that's pro-level plate discipline`,
]
```

**Add context sensitivity**: Accept optional `sessionContext: { sessionType?: string }`. Append context suffix to cue:
- `practice/solo_work` → " — lock this in before game speed"
- `game/live_scrimmage` → " — this is showing up in competition"

**Variation selection**: Deterministic hash of `sessionDate + metric` → index into variations array. No randomness.

**Tag variations**:
```
TAG_VARIATIONS = {
  'Grind Session': ['Grind Day', 'Work Day', 'Foundation Work'],
  'Solid Work': ['Steady Session', 'Clean Work', 'Consistent Day'],
  'Elite Execution': ['Elite Day', 'Locked In', 'Peak Performance'],
  'Building': ['Growth Day', 'Progress Session', 'Developing'],
}
```

### 2. `src/hooks/useInsightHistory.ts` — Repetition Detection (NEW)

Lightweight localStorage-based tracker:
- Stores last 5 `{ focusMetric, cueIndex, date }` entries per user
- Exposes `getVariationOffset(focusMetric)` — returns 0, 1, or 2 to shift to next phrasing variant when same focus repeats
- No DB queries, no API calls

### 3. `src/components/practice/PostSessionSummaryV2.tsx` — Wire Up

- Pass `sessionContext: { sessionType }` to `generateInsights()`
- Call `useInsightHistory` to get variation offset
- After rendering, record current focus metric to history
- Zero new queries added

### 4. `src/components/practice/RecentSessionsList.tsx` — Tag Variation

- Pass session date to tag generation for deterministic variation

## Hard Guardrails Maintained
- No AI calls added
- No threshold changes
- No metric selection logic changes
- No additional DB queries
- No micro_layer_data expansion
- Base stealing trainer untouched
- Sub-2s render preserved (localStorage read is <1ms)

## Files Modified

| File | Change |
|------|--------|
| `src/lib/sessionInsights.ts` | Add variation arrays, context sensitivity, hash-based selection |
| `src/hooks/useInsightHistory.ts` | **NEW** — localStorage repetition tracker |
| `src/components/practice/PostSessionSummaryV2.tsx` | Pass context + variation offset |
| `src/components/practice/RecentSessionsList.tsx` | Use tag variations |

## Verification
- Same composite input with different dates → different phrasing (hash-based)
- Same focus metric 3x in a row → offset shifts phrasing each time
- No accuracy or metric alignment degradation (thresholds untouched)

