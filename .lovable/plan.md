## Goal

Add a permanent, always-visible **Readiness Breakdown** panel on the Progress Dashboard that explains the four contributing sources (HIE Subjective, Training Load, Regulation, Focus Quiz), their current values, weights, freshness, and how they roll up into the composite score. Today this information only exists inside a bottom-sheet hidden behind tapping the small chip — users don't know it's there.

## Scope

Frontend / presentation only. No changes to scoring math, edge functions, DB, or weights. Reads from the existing `useReadinessState()` hook which already returns `score`, `sources[]`, `confidence`, and `hasSignal`.

## What to build

New component: `src/components/hie/ReadinessBreakdownCard.tsx`

Sections inside one Card:

1. **Header** — "Readiness Breakdown" title + composite score (large) + state pill (Ready / Caution / Recover / Set up) + confidence % subtitle.
2. **Composite bar** — `Progress` bar of the composite score, or empty state copy when `!hasSignal`.
3. **Source rows (4 fixed rows, always rendered)** — one row per source even when missing, so users see what they need to log:
   - HIE Subjective (weight 30%) — sleep / stress / pain self-report
   - Training Load (weight 30%) — consistency, NN freshness, CNS headroom
   - Regulation (weight 25%) — physio daily report
   - Focus Quiz (weight 15%) — vault focus quiz
   Each row shows: icon, name, one-line description of what it measures, weight %, current value (or "Not logged" / "Stale"), mini Progress bar, and a tiny "captured Xh ago" timestamp when present.
4. **Formula footnote** — short line: "Composite = weighted average of fresh sources. Confidence reflects how many sources are reporting."
5. **Empty/stale handling** — sources missing from `sources[]` render in a muted state with a CTA hint (e.g. "Log a focus quiz", "Run an HIE check", "File a regulation report", "Complete today's training") — no navigation logic required, hint text only.

Visual style matches existing HIE cards (`ReadinessCard`, `PlayerSnapshotCard`): `Card` + `CardHeader`/`CardTitle` + `CardContent`, semantic tokens only (no raw colors), `Progress` for bars, `lucide-react` icons (Battery, Activity, HeartPulse, Brain).

## Wire-up

Edit `src/pages/ProgressDashboard.tsx`: insert `<ReadinessBreakdownCard />` directly under the existing `<ReadinessCard />` inside the `hasAdvancedAccess` block (Section 4 area). One-line import + one-line render.

## Out of scope

- No changes to `useReadinessState`, weights, or thresholds.
- No changes to the existing `ReadinessChip` sheet (kept for the compact chip path).
- No new routes, no edge function calls, no DB migration.
- No copy changes to `ReadinessCard`.

## Files touched

- **new** `src/components/hie/ReadinessBreakdownCard.tsx`
- **edit** `src/pages/ProgressDashboard.tsx` (import + 1 render line)
