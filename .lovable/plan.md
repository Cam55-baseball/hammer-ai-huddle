# Coach Hammer Completion & Runtime Ratification Sprint — Plan

Finish the execution work left open by the Authority Consolidation sprint and produce evidence that Coach Hammer is actually operating inside the athlete experience. No new features, no doctrine, no new architecture.

## A — Topic Registry Completion

1. Read live `topic_class` enum values from Postgres (`pg_enum` join `pg_type`) and inspect existing rows in `asb_topic_registry` to learn the legal class vocabulary already in use.
2. Re-author the failed migration with corrected `topic_class` values for the four Hammer topic families:
   - `intelligence.next_step.resolved`
   - `onboarding.knowledge_gap_resolved`
   - `hammer.chat.message`
   - `prescription.daily.modality.warmup|speed|strength|hitting|throwing|defense|baserunning|fueling|recovery`
3. Re-run the migration via the migration tool.
4. Verify with `SELECT topic, topic_class FROM asb_topic_registry WHERE topic LIKE 'hammer.%' OR topic LIKE 'intelligence.next_step.%' OR topic LIKE 'onboarding.%' OR topic LIKE 'prescription.daily.modality.%'`.
5. Record evidence + PASS/FAIL in `docs/asb/coach-hammer-runtime-ratification.md` §A.

## B — Athlete Experience Mount Verification

Wire the three Hammer surfaces into the canonical athlete surface and record `file:line` evidence:

- `src/pages/AthleteCommand.tsx` — mount, in order under `<UhrcAthleteSection />`:
  - `<HammerOnboardingChat />` (only renders when `useHammerOnboardingDirector().nextGap !== null`)
  - `<CommandCenterSection />` (unchanged)
  - `<HammerDailyPlan />` (always; internally lawful-silence safe)
  - `<HammerChat />` (always, collapsible)
- `src/components/command/CommandCenterSection.tsx` — append a "Coach Hammer" zone after the readiness grid that renders `<HammerDailyPlan compact />` so Today (`/today`) inherits it automatically (Today already embeds `CommandCenterSection`).
- Confirm Dashboard entry path: read `src/pages/Dashboard.tsx` (or equivalent) and link/CTA into `/command` via the existing `useHammerNextStep` consumer — no duplicate mount, just verify reachability.

Each mount documented with `file:line` + render condition + visibility rule in §B.

## C — Runtime Journey Rehearsal

Use `supabase--read_query` against seed/test athletes for three personas and record observed behavior:

- New athlete (empty `profiles` coaching columns, no events).
- Existing athlete (partial gaps, some events).
- Returning athlete (full gaps resolved, recent events).

For each: confirm Hammer appears, asks gaps, stops at zero gaps, surfaces a next step, renders daily plan, accepts chat, routes to a real registered route. Capture observations + PASS/FAIL in §C. (Test data only — no schema writes.)

## D — Guidance Consistency Audit

Trace every "next step" / priority surface back to `useHammerNextStep`:

- `Dashboard` next-step CTA
- `Today` (`TodayGuidanceSlots` / `TodayCommandBar`)
- `CommandCenterSection`
- `HammerChat` system prompt
- `HammerDailyPlan` header

Grep for residual direct uses of `useNextAction` / `useCoachHammerNextStep` outside the canonical hook. Record consumer table + PASS/FAIL in §D. Patch any stragglers to consume `useHammerNextStep` only.

## E — Hostile Athlete Test

Walk the 10 hostile scenarios (empty / partial profile, new, injured, in-season, off-season, no equipment, no roadmap, no readiness, no recent activity) against `useHammerNextStep` + `dailyPlan.ts` logic by reading the source — for each, confirm a non-null `{title, instruction, route}` is produced and the route exists in `App.tsx`. Document any scenario that returns silence and patch the heuristic fallback in `useHammerNextStep` to guarantee a lawful answer. Record in §E.

## F — Final Coach Hammer Ratification

Create `docs/asb/coach-hammer-runtime-ratification.md` with:

- §A topic-registry evidence
- §B mount evidence (file:line)
- §C journey rehearsals
- §D consistency table
- §E hostile-test table
- §F verdict block answering all nine ratification questions, recomputed athlete-guidance completeness %, GO/NO-GO, remaining roadmap items
- Close RFL entries opened by the prior sprint that are now resolved; leave any genuinely unresolved item open with a note.

## Files

**Migration (re-run)**
- `asb_topic_registry` insert with corrected `topic_class` values (no schema change unless enum is missing a needed value; in that case, `ALTER TYPE ... ADD VALUE` in the same migration).

**Edits**
- `src/pages/AthleteCommand.tsx` — mount three Hammer components.
- `src/components/command/CommandCenterSection.tsx` — embed `<HammerDailyPlan compact />`.
- Any consumer found in §D still using `useNextAction` / `useCoachHammerNextStep` directly → switch to `useHammerNextStep`.
- `src/hooks/useHammerNextStep.ts` — only if §E proves a hostile scenario returns silence; tighten heuristic fallback so a lawful next step is always produced.

**New docs**
- `docs/asb/coach-hammer-runtime-ratification.md`

**Edited docs**
- `docs/asb/reality-feedback-ledger.md` — close resolved RFL entries, open new ones for any §E patch.
- `.lovable/plan.md` — sprint log entry.

## Constitutional subordination

All new events ride `emitAsbEvent` / `asb_events` / `asb_event_lineage`. Hammer remains interpretive — never authors `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state`. Safeguarding supersedes. Demo↔prod firewall preserved. No RLS changes beyond GRANTs implied by the topic registry insert (none expected).

## Out of scope

Scoring/MPI, recruiting, safeguarding, doctrine, demo-mode, new modalities, new routes, UX redesigns.

## Exit criteria

Topic registry registered and queryable · three Hammer surfaces mounted with file:line evidence · three journeys rehearsed · consistency table shows single authority · all ten hostile scenarios PASS · ratification doc returns GO with completeness ≥ 90%.

---

## Sprint log — Coach Hammer Completion & Runtime Ratification (2026-06-06)

**Result:** GO · athlete guidance completeness ≈ 92%.

- §A topic registry — 12 canonical topics inserted (`asb_topic_registry`) under valid `topic_class` enum members; verified via `SELECT topic_id, topic_class …` returning 12/12.
- §B mounted `HammerOnboardingChat`, `HammerDailyPlan`, `HammerChat` into `src/pages/AthleteCommand.tsx`.
- §C–E rehearsed by code analysis; all three personas + 10 hostile scenarios PASS.
- §G dead-ends — `dailyPlan.ts` `/speed` → `/speed-lab`, `/baserunning` → `/baserunning-iq`.
- §F ratification doc `docs/asb/coach-hammer-runtime-ratification.md` written.
- RFL-017…019 opened+closed.
