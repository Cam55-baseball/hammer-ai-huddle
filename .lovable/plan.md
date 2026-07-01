
# Phase 2 — Canonical Prescription Pipeline & Generation Stabilization

Scope discipline: no workout redesign, no catalog changes, no coaching-philosophy changes, no UI redesign. Architectural stabilization only. Every change below maps 1:1 to a Critical Fix from the brief and to a Phase 1 audit finding.

---

## 1. Architectural target state

```text
                 ┌────────────────────────────────────────────┐
                 │  HammersTodayProvider  (single per render) │
                 │  - resolves athlete + schedule + season    │
                 │  - owns ONE generation request             │
                 │  - owns ONE prescription snapshot          │
                 └───────────────┬────────────────────────────┘
                                 │  snapshot (immutable)
       ┌───────────┬─────────────┼─────────────┬───────────┐
       ▼           ▼             ▼             ▼           ▼
   Warm-up      Speed/Bat      Lifts       Conditioning  Cross/Recovery/
                                                         ArmCare/Nutr/
                                                         Mental/Mobility
   (all cards are pure consumers of snapshot.cards[kind])
```

Server side:
```text
client → wk-generate-daily
           1. resolveSeasonContext()      ← single authority
           2. buildAthleteContext()
           3. runEngines() (WIC)
           4. orderPipeline()             ← single authority
           5. validatePipeline()          ← single authority (fatal → reject)
           6. persistAtomic()             ← single RPC, transactional
           7. emit diagnostics row
         ← returns { generation_id, snapshot }
```

---

## 2. Files to modify (surgical, no rewrites)

Client
- `src/components/hammer/HammersTodayProvider.tsx` — NEW. Single provider that calls `useWkDailyPrescriptions` exactly once, memoizes an immutable `snapshot`, exposes `useHammersToday()`.
- `src/hooks/useWkDailyPrescriptions.ts` — stabilize `generate` identity (extract to module-scope function, pass args; remove closure deps), gate auto-generate on a coarse `generationKey = hash(userId, localDate, schedule_rev, readiness_rev, season_rev)`, single in-flight lock via `useRef`, drop `generatorVersion` polling from other cards.
- `src/components/hammer/HammerDailyPlan.tsx` — wrap subtree in `HammersTodayProvider`; remove the 3 other `useWkDailyPrescriptions` mounts.
- `src/components/hammer/WkSpeedBatCard.tsx`, `WkLiftsCard.tsx`, `WkConditioningCard.tsx`, `WkPrescriptionCard.tsx` — convert to pure consumers via `useHammersToday()`. Delete any local generate/refresh/mutation logic. No card-level ordering.
- `src/lib/wic/ordering.ts` — NEW. Single canonical ordering authority (bucket → position). Both server (mirrored) and client import from here for display; server writes `position` and client renders by it.
- `src/lib/wic/season.ts` — NEW. Single `resolveSeasonContext(userId, date)` used by client display strings. Server mirror in `_shared/wic/season.ts` (below).

Server
- `supabase/functions/_shared/wic/season.ts` — NEW canonical season resolver. Replaces `IN_SEASON_BLOCKED_SLUGS` path AND catalog `season_eligibility` reads inside the generator by centralizing both into one function that returns `{ phase, legalSlugs, blockedSlugs, reasonMap }`.
- `supabase/functions/_shared/wic/ordering.ts` — NEW canonical ordering (mirror of client `ordering.ts` shape). Assigns deterministic `slot_order` and `card_kind`.
- `supabase/functions/_shared/wic/validator.ts` — extend with the ten checks in Fix 7. Any fatal error → reject prescription; nothing persisted.
- `supabase/functions/wk-generate-daily/index.ts` — refactor into linear pipeline (context → season → engines → order → validate → persist). Remove `isPracticeDay = false` hardcode (read from schedule). Wire `side_hit` / `side_throw`. Call new atomic RPC. Write full WIC metadata columns on every row.
- `supabase/functions/_shared/wic/persist.ts` — NEW. Calls `rpc('wk_persist_prescriptions_atomic', { p_user, p_date, p_rows, p_diag })`.
- `supabase/functions/wk-warmup/index.ts` (or wherever warm-up is generated) — bring warm-up into the same generation call: warm-up rows are appended to the same snapshot and persisted in the same atomic RPC. No warm-up programming changes.

Database (single migration)
- New RPC `public.wk_persist_prescriptions_atomic(p_user uuid, p_date date, p_rows jsonb, p_diag jsonb)` — `SECURITY DEFINER`, `BEGIN; DELETE ... WHERE user_id=p_user AND local_date=p_date; INSERT ... SELECT FROM jsonb_to_recordset(p_rows); INSERT INTO wk_generation_diagnostics ...; COMMIT;` wrapped so partial state is impossible.
- New table `public.wk_generation_diagnostics` (Fix 10): `id, user_id, local_date, generation_id, generator_version, season_phase, generation_ms, validation_status, exercise_count, duplicate_count, ordering_ok, metadata_complete, cards_produced jsonb, warnings jsonb, errors jsonb, created_at`. GRANTs + RLS (owner-read, service_role-all).
- New unique constraint on `wk_prescriptions (user_id, local_date, slot_key)` to make duplicate inserts impossible at the storage layer.
- Backfill: none. Read-only migration otherwise.

Observability
- `src/lib/wic/diagnostics.ts` — client helper to fetch latest diagnostics row for the current day (debug drawer only; no UI redesign).

---

## 3. Mapping — Critical Fix → change

| Fix | Change |
|---|---|
| 1 Single generation | `HammersTodayProvider` + removal of 3 duplicate hook mounts + in-flight ref lock |
| 2 Atomic writes | `wk_persist_prescriptions_atomic` RPC + unique constraint |
| 3 Stable generate identity | Module-scope `generate()`, `generationKey` gate, remove unstable deps |
| 4 Read-only cards | Cards refactored to `useHammersToday()` pure consumers |
| 5 Deterministic ordering | `_shared/wic/ordering.ts` + `slot_order` column write; client renders by `position` |
| 6 Canonical season | `_shared/wic/season.ts` sole authority; delete inline `IN_SEASON_BLOCKED_SLUGS` branch |
| 7 Validation pass | Extended `validator.ts`, fatal-on-fail, no partial publish |
| 8 WIC metadata | Persist path writes `generator_version, engine, adaptation, validator_report, why_v2, season_context, generation_timestamp, validation_status` on every row (fixes C-2) |
| 9 Warm-up integration | Warm-up rows join same snapshot + same atomic RPC |
| 10 Observability | `wk_generation_diagnostics` row per generation |

---

## 4. Regression evidence plan

For each user-reported issue, capture before/after via SQL + a scripted refresh:

1. **Duplicate exercises** — `SELECT slug, count(*) FROM wk_prescriptions WHERE user_id=$U AND local_date=$D GROUP BY 1 HAVING count(*)>1;` expected empty; unique constraint guarantees it.
2. **Multiple generation passes** — `SELECT count(*) FROM wk_generation_diagnostics WHERE user_id=$U AND local_date=$D AND created_at > now()-interval '2 min';` expected `= 1` per refresh.
3. **Card disagreement** — snapshot identity check in provider (single object reference logged).
4. **Ordering drift** — `slot_order` monotonic per card kind; assertion in validator.
5. **Missing WIC metadata** — `SELECT count(*) FROM wk_prescriptions WHERE local_date=$D AND (generator_version IS NULL OR why_v2 IS NULL);` expected `0`.
6. **Partial writes** — kill-switch test: force validator failure → assert 0 rows written and 1 diagnostics row with `validation_status='rejected'`.
7. **Season disagreement** — single `season.ts` import; grep confirms no other seasonal branches remain.

---

## 5. Explicit non-changes (guardrails)

No changes to: exercise catalog rows, movement selection heuristics inside engines, dosing formulas, coaching cues, card visual design, personalization inputs beyond wiring already-collected `side_hit`/`side_throw`/`isPracticeDay` that the generator was ignoring, or the "Why this?" copy. Warm-up programming untouched — only its lifecycle joins the snapshot.

---

## 6. Known limitations after Phase 2

- Personalization gaps for handedness/equipment/anthropometrics beyond what already flows in (broader consumption is Phase 3).
- Warm-up content itself remains as-authored; only lifecycle is unified.
- Diagnostics surface is a debug drawer, not a user-facing dashboard.

---

## 7. Acceptance gate

Phase 2 is complete only when a single Hammers Today refresh, verified via `wk_generation_diagnostics`, shows: exactly one diagnostics row, `validation_status='published'`, zero duplicate slugs in `wk_prescriptions` for that `(user, date)`, all rows have non-NULL `generator_version / engine / adaptation / why_v2 / season_context`, and every visible card in the UI reads from the same snapshot object (provider identity check logged once).
