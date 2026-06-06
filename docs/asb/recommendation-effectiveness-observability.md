# Recommendation Effectiveness Observability

**Sprint:** Post-Launch Observability & Reality Validation
**Reducer:** `src/lib/observability/recommendationFunnel.ts`
**Posture:** Measurement only. No scoring writeback. No ranking influence. Mirrors `videoConversionAnalytics.ts` posture (analytics never feeds ranking).

## Recommendation lifecycle

```
shown → opened → drill_started → drill_completed → video_watched → repeat → improvement_correlation → coach_ack
```

| stage | data source | notes |
|---|---|---|
| shown | `foundation_recommendation_traces` (insert) | trace-derived |
| opened | `foundation_recommendation_traces.opened_at` | trace-derived |
| drill_started | `foundation_video_outcomes.started_at` / drill_prescriptions activity | partial |
| drill_completed | `foundation_video_outcomes` completion + `drill_prescriptions` completion | partial |
| video_watched | `foundation_video_outcomes` with watch duration ≥ threshold | observable |
| repeat | ≥2 completions of same recommendation within 14d | derived |
| improvement_correlation | post-recommendation `athlete.readiness` / `athlete.recovery` delta vs prior 7d | derived, correlation-only |
| coach_ack | `coach_notifications` ack / coach review topic | GAP for canonical ASB topic |

## Reducer output

For each (recommendation_id) over the window:

```ts
{
  recommendation_id,
  shown, opened, drill_started, drill_completed, video_watched, repeat,
  open_rate, completion_rate, repeat_rate,
  improvement_correlation: number | null,  // null if insufficient data
  coach_ack_count,
  missingness: { stage: bool }              // which stages had unobservable data
}
```

## Reality checks

- **Ignored recommendations** — `opened / shown < 0.10` over 30d.
- **Completed recommendations** — `drill_completed / opened >= 0.50`.
- **Improvement correlation** — observation only; no causal claim. Confidence-bounded, missingness preserved (Phase 60 §D).

## Constitutional bounds

- Reducer never authors organism truth.
- Improvement correlation is **observational, not causal** (Phase 57 AE-1 bounded adaptation, no invariant mutation).
- Missingness is surfaced, never smoothed (Phase 61 SG confidence/missingness stabilization).
- No engagement-optimization framing (RR-9).
