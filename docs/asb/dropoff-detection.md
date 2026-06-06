# Drop-off Detection

**Sprint:** Post-Launch Observability & Reality Validation
**Engine:** Same reducer as Section B (`src/lib/observability/funnels.ts`). No separate detector. Advisory only — never enforcement, never used to mutate organism truth.

## Per-stage metrics

For each funnel stage, the reducer reports:

- `entries` — unique athletes/users who hit this stage
- `exits` — unique users who advanced to the next stage
- `completionPct` = `exits / entries`
- `abandonmentPct` = `1 - completionPct`
- `medianTimeToNextMs` — median ms from this stage to next-stage entry

## Advisory flag thresholds

| flag | condition | severity |
|---|---|---|
| high_abandonment | `abandonmentPct >= 0.50` | warn |
| stalled | `medianTimeToNextMs > 7 * 86400_000` | warn |
| orphaned | `entries >= 10 && exits == 0` | high |
| dead_end | stage is terminal but downstream surface exists | high |
| unobservable | mapped topic is `GAP` | info — logged to reality-feedback-ledger |
| unconsumed_intelligence | intelligence surface viewed by `< 5%` of eligible athletes in 14d | warn |

## Methodology

1. Pull last 30d of `asb_events` for the cohort scope (athlete / coach / recruiter / parent).
2. Group by user, find first occurrence per stage.
3. Compute per-stage metrics deterministically (ordering by `occurred_at` then `event_id`, matching replay chronology).
4. Emit advisory flags only when thresholds cross. Never write back to ledger.

## What this does NOT do

- Does not optimize funnels.
- Does not redesign onboarding.
- Does not score users.
- Does not author organism truth.
- Does not influence recommendation ranking (consistent with `src/lib/videoConversionAnalytics.ts` posture).
