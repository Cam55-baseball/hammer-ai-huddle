# Finishing Polish — Reliability, Deferred Surfaces, Fragment Sweep

## 1. Analyze-Video Reliability ("Analysis Failed" must not happen)

Session replay shows analyze-video failing ~113s after start with a generic toast. Logs show one video at `1781382034068` succeeded, then a later attempt produced "Analysis Failed". Root causes to fix:

- **No retry / no graceful degrade**: a single Gemini / OpenAI hiccup surfaces as a fatal error. Add bounded exponential-backoff retry (3 attempts, replay-safe — same prompt, same frames, same seed) inside `analyze-video/index.ts` around the model call only.
- **Timeout swallowed**: tighten per-call timeout (90s) and on terminal failure write a structured `failure_event` row + return an actionable message (network vs model vs schema) instead of "An error occurred".
- **Determinism contract** (same video 10× → same result 10×):
  - Pin `model`, `temperature: 0`, `top_p: 0`, `seed: hash(video_id + engine_version)`, deterministic frame selection (already in `[ANALYZE-VIDEO] Landing frame index: auto-detect` — replace with stable hash-based selection if `landing_frame_index` missing).
  - Cache successful analyses by `(video_id, engine_version, reasoning_version, frame_hash)` so reruns return the same payload without re-hitting the model (replay-equivalence per Phase 47/56).
  - Add a `replay_fingerprint` field to `ai_analysis` so a recompute can verify determinism and surface drift in `RecomputeReportCardButton`.
- **Pass-2 recovery already exists** for metrics — extend the same recovery shape to the whole feedback object: if structured parse fails, retry with stricter schema instead of throwing.
- **User-facing**: replace the "Analysis Failed" generic state with status detail ("Model timeout — retrying" / "Network — tap to retry") and auto-retry once before showing the manual Retry button.

## 2. Deferred Report Card Surfaces

### A. Per-session HammerReportCard on **Vault video detail**
- Mount `<HammerReportCard videoId={video.id} analysis={video.ai_analysis} sport={video.sport} module={video.module} />` inside the existing video detail view (the page that already shows playback + AI feedback).
- Include the existing `RecomputeReportCardButton` underneath; on success it merges the new metrics into the local cache.
- Render the `useReportCardTrend` strip ("Last 8 sessions") above the card so the athlete sees grade trajectory in-context.

### B. Per-session HammerReportCard on **CoachAthleteDetail**
- Inside each athlete's per-video row, add a collapsible "Report Card" disclosure that lazy-loads `HammerReportCard` for the chosen session.
- Coach-facing affordance: show the letter grade + `measured/total` chip in the row header so coaches scan without expanding.
- Read-only for coach (no recompute) unless they have edit authority on that athlete (`useCoachAuthority`).

### C. Monthly / Vault recap aggregate block
- Add a `HammerReportCardAggregate` component that uses `useReportCardTrend(module, 30)` (limit 30) and reduces to:
  - Median letter grade, best & worst tile, longest passing streak, most common non-negotiable failure.
  - Sparkline of `grade.score` over the window.
- Mount it inside `generate-vault-recap` consumers (Vault recap page) and as a new section in the monthly recap PDF (`generateRecapPdf.ts`).
- Replay-safe: aggregate is a pure projection over already-stored `videos.ai_analysis.metrics` — no new ledger writes.

## 3. Fragment / Error / Connection Sweep

A focused sweep — not a global refactor — targeting visible breakage:

- **TypeScript / lint**: run `tsc --noEmit` + ESLint across `src/components/hammer/**`, `src/components/report-card/**`, `src/hooks/use*Hammer*.ts`, `src/lib/hammer/**`, `supabase/functions/analyze-video/**`, `supabase/functions/recompute-report-card/**`, `supabase/functions/generate-vault-recap/**`. Fix every error/warn.
- **Dead imports / unused exports**: prune in the same files (knip-style targeted pass).
- **Route audit**: verify every `<Link>` / `navigate()` target in Hammer + Report Card + Vault flows resolves to a real route in `App.tsx`.
- **Query key audit**: ensure invalidation after onboarding save, recompute, and physio intake hits the right keys (`hammer-context`, `report-card-trend`, `physio-profile`, `verified-stats`).
- **Console clean**: load Dashboard, HammerDailyPlan, Vault detail, CoachAthleteDetail in preview; resolve every console warning/error introduced in the last 5 plans.
- **Edge function smoke**: deploy + curl `analyze-video`, `recompute-report-card`, `generate-vault-recap`, `coach-hammer-next-step`, `predict-hammer-state` with a fixture payload; assert 200 + schema.

## 4. Technical Targets

```text
supabase/functions/analyze-video/index.ts        ← retry + determinism + structured errors
supabase/functions/analyze-video/replay.ts (new) ← fingerprint + cache lookup helper
supabase/functions/recompute-report-card/index.ts ← honor replay_fingerprint
src/components/vault/VideoDetail*.tsx            ← mount HammerReportCard + trend strip
src/components/coach/CoachAthleteDetail*.tsx     ← per-session disclosure + grade chip
src/components/report-card/HammerReportCardAggregate.tsx (new)
src/pages/Vault*.tsx + src/utils/generateRecapPdf.ts ← aggregate block + PDF section
src/components/hammer/HammerDailyPlan.tsx        ← surface retry-aware state if analyze running
```

Determinism contract pin: `ANALYZE_VIDEO_ENGINE_VERSION` bumps only when prompt / schema / scoring changes — never on retry logic edits.

## Out of Scope
- New report card disciplines (sb-pitching, sh) — separate plan.
- Coach edit-on-behalf authority changes.
- Replacing the underlying LLM provider.

## Acceptance
- Same video uploaded 10× returns byte-identical `ai_analysis` (verified by `replay_fingerprint`).
- No "Analysis Failed" toast on transient errors — at most "Retrying… (2/3)".
- Vault video detail and CoachAthleteDetail both render a working HammerReportCard.
- Vault recap (page + PDF) includes the 30-day aggregate block.
- `tsc --noEmit` clean across touched paths; zero new console errors on the four key routes.
