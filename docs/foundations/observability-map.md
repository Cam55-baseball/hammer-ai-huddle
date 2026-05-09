# Observability Map

Every recommendation is **traceable, replayable, and explainable**.

## Layers

1. **Trace** — `foundation_recommendation_traces` row written for every surfaced *and* suppressed video. Includes:
   - `active_triggers[]`, `matched_triggers[]`
   - `score_breakdown` (jsonb) — base, audience, length, effectiveness, watchedPenalty, tierMultiplier, domain
   - `recommendation_version`, `engine_version`, `snapshot_version`, `foundation_meta_version`
   - `suppressed` + `suppression_reason` (cooldown, fatigue, onboarding_gate, philosophy_cap, …)
2. **Replay** — `replayRecommendation(traceId)` (`src/lib/foundationReplay.ts`) re-runs the scorer against the frozen snapshot+meta and asserts deterministic equality against `final_score`. Drift = a code or data version was bumped without invalidation.
3. **Inspector** — `/owner/foundations/traces` lists recent traces with drill-down JSON view + replay button.
4. **Diagnostics** — `/owner/foundations/diagnostics` aggregates 7d totals, active triggers, suppression breakdown, low-health videos.
5. **Health Score** — nightly `nightly-foundation-health` writes `library_videos.foundation_health_score` (0–100) + `foundation_health_flags[]`.
6. **Effectiveness** — nightly `recompute-foundation-effectiveness` writes per-trigger `{ resolveRate, helpRate, rewatchRate, sample_n }` to `library_videos.foundation_effectiveness.byTrigger`. Scorer applies bounded ±15 only when `sample_n ≥ 20`.

## Invariants

- A scorer result with no trace = silent failure. CI replay tests assert all paths emit a trace (or are explicitly suppressed).
- A trace with `score_breakdown` missing the `domain` key cannot be replayed → flagged as malformed.
- `recommendation_version` mismatch between trace and current code = expected after intentional version bump; replay returns `versionDrift: true`.
