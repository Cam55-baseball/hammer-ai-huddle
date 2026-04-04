

# User Lock-In Layer — Performance Habit Engine

## Summary
Add a lightweight behavioral feedback system that rewards real nutrient improvements, tracks micro-coverage streaks, shows daily micro-goals, and provides context-aware identity framing — all derived from existing data. No new tables, no fake signals.

## Architecture
All new components are pure read-only consumers of existing `vault_nutrition_logs` and guidance data. One new hook (`useNutritionFeedback`) aggregates all signals and enforces the "max 1 nudge + 1 reward + 1 goal" noise rule.

## New Files

### 1. `src/hooks/useNutritionFeedback.ts` — Central Feedback Engine
Single hook that computes all behavioral signals from existing data:

- **Action→Reward**: Compares current day's micro totals against state *before* the latest meal. If a limiting nutrient improved, emits a reward signal: `{ nutrient: 'Calcium', deltaPercent: 19, scoreGain: 2.1, outcome: 'recovery potential improved' }`.
- **Micro-Progression**: Computes today vs yesterday micro coverage delta. Only emits when positive change exists.
- **Consistency Streak**: Counts consecutive days with ≥50% micro coverage (≥7/13 nutrients above 50% RDA). Reads from `vault_nutrition_logs` for last 14 days. Resets on zero-micro day.
- **Identity Frame**: Emits 1 identity line when streak ≥3 or score ≥70. Pool of 4 rotating messages keyed to `dateStr` for determinism. No fake praise — threshold-gated.
- **Smart Nudge**: State-aware, single nudge (replaces static nudges in GuidancePanel):
  - If nutrient improved this session → "Strong correction — keep this pattern"
  - If latest meal has no micros → "Low micronutrient density — consider adding one high-impact food"
  - If streak about to break (1 day gap) → "Log one nutrient-complete meal to maintain your streak"
- **Daily Micro-Goal**: Derives from top limiting factor: "1 more calcium-rich food to reach 60%" or "Add 1 verified meal to unlock full scoring" (when 0 micros).
- **Zero-Friction Re-entry**: When 0 micros today, all other signals suppressed. Only goal shown: "Log 1 verified meal to activate full tracking".
- **Noise Rule**: Returns max 1 of each signal type. Hook consumers render at most 3 lines total.

Inputs: `date`, `meals` (from existing query), `guidanceData` (from `useNutritionGuidance`).

### 2. `src/components/nutrition-hub/NutritionFeedbackStrip.tsx` — Compact UI
Renders below GuidancePanel in NutritionDailyLog. Lightweight strip, not a card:

```
Layout (max 3 lines):
┌──────────────────────────────────────────┐
│ ✓ +19% Calcium → recovery improved      │  ← reward (green, only if action taken)
│ ↑ Calcium: 22% → 41% today              │  ← progression (only if delta exists)
│ ◎ 1 more calcium-rich food to reach 60%  │  ← goal (always, if data exists)
└──────────────────────────────────────────┘
```

- Streak badge inline: "3-day streak" pill when active
- Identity line replaces progression line when streak ≥3 (max 1 line, rotates daily)
- Smart nudge replaces reward line when no improvement detected
- Zero-data state: single line "Log 1 verified meal to activate full tracking"
- No card chrome — just a `div` with subtle `bg-muted/30` and `rounded-lg`

## Modified Files

### 3. `src/components/nutrition-hub/NutritionDailyLog.tsx`
- Import and render `<NutritionFeedbackStrip />` between `<GuidancePanel />` and `<HydrationQualityBreakdown />`
- Pass `meals`, `guidanceData`, and `currentDate` as props

### 4. `src/components/nutrition-hub/GuidancePanel.tsx`
- Remove the nudge section (moved to FeedbackStrip for unified noise control)
- Keep limiting factors and food suggestions unchanged

## Data Flow
```text
vault_nutrition_logs (existing)
        │
        ├──→ useNutritionGuidance (existing) → limitingFactors, foodSuggestions
        │
        └──→ useNutritionFeedback (new)
                ├── reward signal (before/after latest meal comparison)
                ├── progression (today vs yesterday delta)
                ├── streak (14-day lookback, ≥50% micro coverage)
                ├── identity frame (streak/score gated)
                ├── smart nudge (state-aware, single)
                └── daily goal (from top limiting factor)
                        │
                        ▼
              NutritionFeedbackStrip (new) — max 3 lines rendered
```

## Noise Budget (Enforced)
| Signal | Max | Condition |
|--------|-----|-----------|
| Reward | 1 | Only when nutrient improved this session |
| Progression/Identity | 1 | Progression if delta exists, else identity if streak ≥3 |
| Nudge | 1 | Moved from GuidancePanel, state-aware |
| Goal | 1 | Always (derived from limiting factor or zero-data) |
| **Total visible** | **3** | Reward + Progression/Identity + Goal. Nudge replaces reward when no improvement. |

## Files Changed
| File | Change |
|------|--------|
| `src/hooks/useNutritionFeedback.ts` | New — central feedback engine |
| `src/components/nutrition-hub/NutritionFeedbackStrip.tsx` | New — compact 3-line UI strip |
| `src/components/nutrition-hub/NutritionDailyLog.tsx` | Add FeedbackStrip between GuidancePanel and HydrationQualityBreakdown |
| `src/components/nutrition-hub/GuidancePanel.tsx` | Remove nudge section (moved to FeedbackStrip) |

## What This Does NOT Do
- No new database tables or migrations
- No simulated data or fake progress
- No toast notifications or modals
- No new API calls beyond existing `vault_nutrition_logs` queries
- Identity framing only appears when behavior justifies it

