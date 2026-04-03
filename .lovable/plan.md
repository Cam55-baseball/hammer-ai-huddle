

# Base Stealing Isolation Confirmation + Post-Session Redesign Readiness

## 1. Base Stealing Trainer — FULLY ISOLATED ✅

The base stealing trainers operate on **completely separate pages and components** that never touch `PostSessionSummary.tsx`.

### Baseball Base Stealing Trainer
| Component | File |
|-----------|------|
| Pre-save summary | `src/components/base-stealing/SessionSummary.tsx` |
| Post-save analysis | `src/components/base-stealing/PerformanceAnalysis.tsx` |
| Page | `src/pages/BaseStealingTrainer.tsx` |

**Data inputs**: Local `RepResult[]` array + `LeadConfig` (never fetches from DB post-session). Analytics computed client-side via `src/lib/stealAnalytics.ts` (steal window, projected success %, acceleration efficiency, lead efficiency, MLB benchmarks).

### Softball Stealing Trainer
| Component | File |
|-----------|------|
| Pre-save summary | `src/components/softball-stealing/SoftballStealSummary.tsx` |
| Post-save analysis | `src/components/softball-stealing/SoftballStealAnalysis.tsx` |
| Page | `src/pages/SoftballStealingTrainer.tsx` |

**Data inputs**: Local `RepData[]` + `StealSetupConfig`. Analytics via `src/lib/softballStealAnalytics.ts`.

**Isolation guarantee**: Neither trainer imports or references `PostSessionSummary.tsx`. They use their own page-level phase state (`setup → live_rep → summary → analysis`) with zero shared logic. Redesigning `PostSessionSummary` has **zero impact** on either stealing trainer.

---

## 2. PostSessionSummary.tsx — Current Consumers

`PostSessionSummary` is used in **exactly one place**: `src/pages/PracticeHub.tsx` (line 540), which serves **all standard modules** (Hitting, Pitching, Fielding, Throwing, Baserunning drills).

- No module overrides or extends it — it renders identically for every module.
- A new summary layer can be introduced by replacing the single `<PostSessionSummary>` call in PracticeHub without affecting any other page.

---

## 3. Data Readiness — All Confirmed Available

| Data Source | Available at post-session time? | How |
|-------------|-------------------------------|-----|
| `composite_indexes` (full set including barrel%, chase%, whiff%, power trend, etc.) | ✅ | Polled from `performance_sessions` after `calculate-session` writes them (2-6s delay) |
| `drill_blocks` (rep counts, drill types) | ✅ | Already stored on the session row; just not currently fetched in PostSessionSummary |
| `micro_layer_data` | ✅ | Stored on the session row; can be fetched for lightweight client-side aggregation |
| `effective_grade` | ✅ | Written by `calculate-session` alongside composites |
| `notes`, `coach_id`, `session_type`, `module` | ✅ | Already fetched |

---

## 4. Performance Guardrails

| Concern | Assessment |
|---------|-----------|
| **micro_layer_data aggregation** | Safe client-side for up to ~200 reps (typical session). For 500+ reps, move to edge function. Current sessions average 15-50 reps — no risk. |
| **Additional fields in post-session fetch** | Adding `drill_blocks`, `effective_grade`, `micro_layer_data` to the existing query adds negligible overhead (single row fetch). |
| **3-5 real-time insights** | Fully achievable using `composite_indexes` + `drill_blocks` + light `micro_layer_data` aggregation. No HIE or AI call needed — pure deterministic logic (e.g., "Your barrel rate this session was 32% — above your 7-day average of 24%"). |
| **Historical comparison** | Fetching last 3-5 sessions for the same module (lightweight query) enables "vs recent" comparisons without touching HIE. |

---

## Summary

- **Base stealing trainers**: Elite, isolated, untouchable. Zero shared code with PostSessionSummary.
- **PostSessionSummary**: Single consumer (PracticeHub). Safe to replace/enhance.
- **Data**: All required fields available at post-session time without HIE.
- **Performance**: No constraints blocking 3-5 real-time insights from existing data.

Ready for redesign scope definition when you are.

