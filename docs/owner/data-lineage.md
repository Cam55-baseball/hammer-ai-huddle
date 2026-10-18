# Data lineage — Hammers Intelligence step 1 (Oct 18, 2026)

What each signal really records today, where it comes from, how much real data exists, and how The General may show it. Counts read from the live database on Oct 18 (all accounts, including test/demo).

| Signal | Where it is saved | What actually produces it | Rows / players | Valid as a body measurement? | How it may be shown |
|---|---|---|---|---|---|
| CNS load (plan) | `wk_cns_ledger` (units_spent, units_cap, breakdown) | Smart Week plan builder (`wk-generate-daily`) sums planned card "units" against a cap that steps down with check-ins/readiness | 207 / 48 | **No.** These are planned work units chosen by rules, not a nervous-system measurement | "Training exposure: X of Y planned units" — never "CNS fatigue" |
| CNS load (logged) | `athlete_load_tracking.cns_load_total`, `athlete_daily_log.cns_load_actual` | `calculate-load` + `src/utils/loadCalculation.ts`: fixed points per exercise (sets×reps×0.3, ×1.3 high / ×0.7 low; runs 20–50 base) | 22 / 4 | **No.** Hand-picked weights, never validated | "Training exposure" only, or hidden when empty |
| Fascial load | `athlete_load_tracking.fascial_load` {compression, elastic, glide} | +10 per exercise tagged with a fascia bias, else +8 by type; runs +15 elastic / +5 compression per rep | 22 / 4 | **No.** No measurement of tissue at all; tag counting | Not shown as a body number. At most "Jumping/sprinting volume" exposure |
| Readiness | Computed live in `useReadinessState` | Confidence-weighted blend of `hie_snapshots` readiness, `physio_daily_reports.regulation_score`, `vault_focus_quizzes.focus_score`; stale sources dropped; quiz-only is suppressed | hie 71 / 71, physio 21 / 3, quizzes 181 / 13 | Partly: it is a self-report + model composite, not a lab test | "Pattern" at best; "Need more data" when null/quiz-only |
| Body weight | `weight_entries.weight_lbs` (+ `vault_focus_quizzes.weight_lbs`, progress photos, standards attempts) ; goal in `athlete_body_goals` | Player-entered scale weight | 48 / 9; goals 13 | Yes — **Measured** (self-entered, dated) | Line over time + goal + rate of change; "Need more data" under 3 entries |
| Sleep | `vault_focus_quizzes.sleep_quality / sleep_time`, `physio_daily_reports.sleep_score`; target in `athlete_context.sleep_target_hrs` | Morning check-in answers (self-rated) | 97 rated answers | Self-report — **Measured** as an answer, not as sleep tracking | "You rated sleep…"; links to results are Pattern/Hunch only |
| Wearable sleep | `wearable_metrics.sleep_min` | Nothing connected | 0 | — | Not shown |
| Eating | `vault_nutrition_logs`, goals `vault_nutrition_goals` | Player-entered meals | 287 / 4 | Self-report — Measured as logged meals | Days logged + vs goal; links are Pattern/Hunch only |

## Decisions for The General
- CNS load and fascial load are **not defensible as body measurements**. Per the plan they are shown only as "training exposure" (planned/logged work units), labelled as such, or hidden.
- Readiness is shown only when the hook returns a score; otherwise "Need more data".
- Weight, sleep and eating are real self-entered records; any link to performance is Pattern or Hunch, never "caused".
- No wearable data exists; nothing wearable-based is shown.

## Sources checked
`supabase/functions/calculate-load/index.ts`, `src/utils/loadCalculation.ts`, `supabase/functions/wk-generate-daily/index.ts` (ledger upsert, cap step-downs), `src/hooks/useReadinessState.ts`, `src/hooks/useVault.ts`, `src/hooks/useNutritionBaseline.ts`, live table schemas and counts.
