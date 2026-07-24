# Per-Exercise Tracker for Hammers Today

Add a tiny **Log** button on every prescription card that opens an exercise-specific pop-up. Fields adapt to what was prescribed (weight × reps for lifts, velo for throwing, sprint time for speed, contact-quality for bat speed, etc.), support multiple rounds/sets, and include an AI notes bubble. Data lands in the existing `wk_session_logs` table (extended with a small `metrics jsonb`) so nothing new clutters the card and everything is queryable for future weight-prescription intelligence.

## UX (clutter-free)

- Card gets one new icon-only button next to the ✓ Done tick: a small **[＋ Log]** chip (auto-hides after a successful log; re-tap edits).
- Tapping opens a bottom sheet titled with the movement name, prescribed dosage subtitle ("3×5 @ 80%"), and a compact **round grid** — one row per prescribed set, pre-filled with target values, tap to override.
- Add-round (+) and remove-round (–) buttons handle drop sets / extra rounds without extra fields on the base card.
- Single **RPE 1–10** slider + **Bar Feel** chips (crisp / heavy / off) shared across rounds.
- **Ask Hammer** textarea (AITextBoxField pattern) at the bottom: free-form notes → sent to Gemini for a 1-sentence coaching read-back shown inline before save.
- Save writes one `wk_session_logs` row; sheet closes; card shows a tiny "logged • 185×5×3 @ RPE7" strip under the dosage line.

## Field templates (chosen by movement category + `dosage_unit`)

| Card / unit | Per-round fields | Shared |
|---|---|---|
| Lifts (`reps`) | weight, reps | RPE, bar feel, notes |
| Bat speed (`contacts`) | contacts, exit velo (opt), bat sensor (opt) | intent, notes |
| Speed/sprints (`feet` / `seconds`) | distance, time (s), rest | surface, notes |
| Throwing/pitching (`throws`) | throws, peak velo, avg velo, distance | arm feel, notes |
| Conditioning (`seconds`/innings) | duration, HR (opt) | RPE, notes |
| Mobility/EASS/warmup | quick "did it" toggle + optional depth 1–5 | notes only |

Rendered by one `<ExerciseLogSheet />` driven by a small `logTemplates.ts` map keyed on category + unit — no per-card duplication.

## Files

New:
- `src/components/hammer/logging/ExerciseLogSheet.tsx` — bottom sheet, round grid, RPE/feel, AI notes.
- `src/components/hammer/logging/RoundGrid.tsx` — dynamic set rows.
- `src/components/hammer/logging/logTemplates.ts` — unit→fields map.
- `src/components/hammer/logging/LogButton.tsx` — the tiny chip mounted on each card.
- `src/hooks/useExerciseLog.ts` — upsert into `wk_session_logs`, fetch latest for prefill/edit, invalidate queries.
- `supabase/functions/exercise-log-coach/index.ts` — Gemini call, returns short coaching read-back (`google/gemini-3.6-flash` via Lovable AI Gateway).

Edited (mount `<LogButton />` in the existing action row — no layout change beyond one icon):
- `src/components/hammer/WkPrescriptionCard.tsx`
- `src/components/hammer/WkLiftsCard.tsx`
- `src/components/hammer/WkSpeedCard.tsx`
- `src/components/hammer/WkBatSpeedCard.tsx`
- `src/components/hammer/WkConditioningCard.tsx`

Schema (single additive migration):
- `ALTER TABLE public.wk_session_logs ADD COLUMN metrics jsonb NOT NULL DEFAULT '{}'::jsonb;`
- `ADD COLUMN ai_readback text;`
- Index on `(user_id, movement_slug, plan_date DESC)` for the prescription engine's future lookups.
- No new RLS policies needed — existing owner policies cover the new columns; grants already in place.

## Future intelligence hook (scaffold only, not shipped in this pass)

- `src/lib/hammer/prescription/loadPrescriber.ts` stub reads last N `wk_session_logs` rows per movement and returns a target load. Wired into the lift generator behind a flag so it starts learning immediately but does not override today's plan until Phase 2.

## Non-goals in this pass

- No dashboard/history views (data is being collected first).
- No wearable integrations.
- No changes to any card layout beyond the single Log chip.

## Technical notes

- Sheet uses shadcn `Sheet` (side=bottom) to match `QuickLogSheet`.
- Prefill: on open, fetch most-recent `wk_session_logs` for the same `movement_slug` for last-values suggestion.
- AI read-back is optional and non-blocking — save works offline; edge-function call is fire-and-forget on save, result patched in via realtime-free re-fetch.
- All numeric inputs use existing `NumberField` (empty-string safe, per prior fix).
