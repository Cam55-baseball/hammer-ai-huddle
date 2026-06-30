## Goal
Close the two gaps from last turn so the Elite Game Performance system is 100% shipped:
1. **Slice 3** — Wire `useGpSignal` into `dailyPlan.ts` and `useRoadmapProgress.ts` as an additive, survivability-bound bias.
2. **Slice 5 (remainder)** — Bring `DefenseLogger`, `BaserunLogger`, and `SubLogger` up to the same UX bar as `AtBatLogger` (empty states + 10s undo toasts; shortcuts where they fit).

No new tables, no schema changes, no auth changes. Frontend + one hook only.

---

## Slice 3 — Hammer + Roadmap signal modulation

### `src/lib/hammer/prescription/dailyPlan.ts`
- Extend the planner's athlete-context input to accept an optional `gpSignal` field (rolling 7-day: `chasePct`, `whiffPct`, `zSwingPct`, `errorsByPos`, `baseRunningOuts`, `sampleSize`, `confidence`).
- Add `applyGpSignalBias(blocks, gpSignal)` as the **last** modulator, after `applyScheduleModulation`. Rules (all additive, all clamped, all skipped when `sampleSize < 8` or `confidence === 'low'`):
  - `chasePct ≥ 0.32` → +1 priority on Tex-Vision pitch-recognition block, append rationale tag `"gp:chase"`.
  - `whiffPct ≥ 0.28` → +1 priority on contact/Bat-Path block, tag `"gp:whiff"`.
  - `errorsByPos[primary] ≥ 2` → +1 priority on Fielding block for that position, tag `"gp:def"`.
  - `baseRunningOuts ≥ 2` → +1 priority on Baserunning IQ block, tag `"gp:br"`.
  - Never *removes* blocks, never overrides schedule suppression, never exceeds existing per-day volume ceiling.
- Surface the applied tags on the returned plan so `GpInGameAdvisoryStrip` can show "Today's plan reflects your last 7 days."

### `src/hooks/useRoadmapProgress.ts`
- In `orderRoadmapMilestones`, accept optional `gpSignal` and apply a tie-breaker bias (±0.5 rank weight, clamped) when two milestones share the same base priority, biasing toward the milestone whose `category` matches the weakest GP signal axis.
- Pure additive: if `gpSignal` is absent or low-confidence, ordering is byte-identical to today.

### Wiring
- `src/components/hammer/HammerDailyPlan.tsx`: pass `gpSignal` from `useGpSignal()` into the daily plan call.
- `src/pages/Roadmap.tsx` (or wherever `useRoadmapProgress` is consumed): pass `gpSignal` through.

---

## Slice 5 (remainder) — Logger UX parity

For each of `DefenseLogger.tsx`, `BaserunLogger.tsx`, `SubLogger.tsx`:

- **Empty state**: replace the bare "No plays yet" with a guided callout matching the AtBatLogger pattern (icon + one-line prompt + "what gets logged here" hint).
- **Undo toast**: every insert and delete fires a `sonner` toast with a 10s `action: "Undo"` that performs the inverse mutation, mirroring `AtBatLogger`'s pattern via a small shared helper `src/lib/games/undoToast.ts` (so we don't duplicate the logic four times).
- **Defense-only shortcuts**: `E` = error, `P` = putout, `A` = assist, `D` = double play (only when no input is focused). Baserun/Sub do not get shortcuts (low value, easy to misfire).

### New helper
- `src/lib/games/undoToast.ts` — `withUndo({ label, doMutation, undoMutation })` returning a promise; centralizes the sonner pattern.

---

## Verification
- `tsgo` clean.
- `scripts/preflight.sh` green (already includes ledger drift + game tests from last turn).
- Manual: log a defensive error → undo within 10s → row removed. Log a sub → undo → removed. Confirm `HammerDailyPlan` shows a "gp:" rationale chip when a synthetic high-chase signal is injected.

## Out of scope
- No changes to `gp_*` schemas, RLS, or realtime.
- No redesign of the daily plan UI beyond the rationale chip already supported by `GpInGameAdvisoryStrip`.
- No new analytics surfaces.

## Risk / drift guards
- `applyGpSignalBias` is a pure function with a unit test in `src/lib/hammer/prescription/__tests__/dailyPlan.gpSignal.spec.ts` covering: (a) low-confidence no-op, (b) high-chase +1 on Tex-Vision, (c) clamp at volume ceiling, (d) never overrides schedule suppression.
- `undoToast` has a unit test for the happy path and the "toast dismissed → no undo fires" path.
