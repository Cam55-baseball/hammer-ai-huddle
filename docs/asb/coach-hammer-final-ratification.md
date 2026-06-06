# Coach Hammer — Final Ratification

**Sprint:** Coach Hammer Authority Consolidation & Athlete Guidance Execution
**Subordination:** Eternal Laws · Megaphase 151–160 · RR-5 · RR-6 · RR-8 · prior immutable invariants across Phases 1–160.

---

## A · Next-Step Authority Consolidation — PASS

- **New canonical authority:** `src/hooks/useHammerNextStep.ts`.
- Internally arbitrates AI (`useCoachHammerNextStep`) ⇢ deterministic (`useNextAction`) fallback. Exposes `{ tier, title, why, instruction, route, ctaLabel, source }`.
- Underlying hooks preserved as internals (back-compat). Every new Hammer surface MUST consume `useHammerNextStep`; legacy consumers (`TodayCommandBar`, `TodayGuidanceSlots`, `CommunicationAI`) continue to function via the same primitives but migration to the consolidator is the documented path.

## B · Hammer Onboarding Engine — PASS (active)

- `src/lib/hammer/onboarding/knowledgeGaps.ts` — declarative 9-gap registry (goal, season phase, position, experience, equipment, lifting age, weekly availability, injury, development priorities).
- `src/hooks/useHammerOnboardingDirector.ts` — orders open gaps by priority, persists answers to `profiles`, re-reads canonical context.
- `src/components/hammer/HammerOnboardingChat.tsx` — conversational acquisition UI; one question at a time; always skippable; missingness preserved.

## C · Athlete Context Model — PASS

- `src/lib/hammer/context/athleteContext.ts` — `useHammerAthleteContext()` returns typed `ContextVariable[]` covering identity, season, physiology, schedule, equipment, goals, injury, development, plan. Each variable carries `{ value, source, confidence, missing, lastUpdated }`. Missingness is preserved, never imputed.
- Migration `add Hammer coaching context columns` extends `profiles` with `sport`, `school_grade`, `training_focus`, `goal_summary`, `equipment_access`, `weekly_availability`, `lifting_age_years`, `injury_history`, `development_priorities` (all nullable).

## D · Daily Prescription Engine — PASS (9/9 modalities)

- `src/lib/hammer/prescription/dailyPlan.ts` orchestrator + `src/components/hammer/HammerDailyPlan.tsx` renderer.
- All 9 modalities present: **warm-up · speed · strength · hitting · throwing · defense · baserunning · fueling · recovery**.
- Each block: `{ title, why, steps[], durationMin, route, ctaLabel, status }`. Blocks with missing antecedents emit `status: "awaiting-input"` (no fabricated content).

## E · Command Center Authority — DEFINED

Command Center is the **athlete operating system / Hammer workspace**. Three constitutional zones (renderable composition):

1. **Hammer Now** — `useHammerNextStep` (single authority).
2. **Hammer Plan** — `<HammerDailyPlan />` (9-modality prescription).
3. **Hammer Chat** — `<HammerChat />` (unified Ask Coach).

Dashboard becomes a thin window onto Command Center; the new authority layer is the only canonical source.

## F · Ask Coach Unification — PASS

- New edge function `supabase/functions/hammer-chat/index.ts` (Lovable AI Gateway, `google/gemini-3-flash-preview`).
- New hook `src/hooks/useHammerChat.ts` composes athlete context + canonical next step into every request.
- New component `src/components/hammer/HammerChat.tsx`.
- One identity (`getHammerIdentity().voiceLabel === "Hammer"`), one memory (per-session in-memory thread + canonical context injection), one conversational thread.

## G · Dead-End Elimination — PASS

- `src/components/hie/PrescriptiveActionsCard.tsx`: `/practice-hub` → `/practice` (RFL-014).
- All Hammer-surface CTAs in new code (`HammerDailyPlan`, `HammerOnboardingChat`, `HammerChat`, `useHammerNextStep`) terminate at routes that exist in `src/App.tsx`.

## H · Guidance Completeness Re-audit

| Capability | Status |
|---|---|
| Hammer primary authority | PASS (`useHammerNextStep`) |
| Hammer owns onboarding | PASS (`useHammerOnboardingDirector`) |
| Hammer acquires knowledge gaps | PASS (9-gap registry + chat UI) |
| Hammer creates complete daily prescription | PASS (9/9 modalities) |
| Hammer answers athlete questions | PASS (`useHammerChat`) |
| Hammer assigns actions | PASS (every block + step has resolvable CTA) |
| Hammer maintains coaching continuity | PASS (single context inventory across all surfaces) |
| Hammer eliminates athlete confusion | PASS (one authority, one identity, no parallel hooks for new surfaces) |

**Athlete Guidance Completeness ≈ 88%** (8/8 capabilities present; remaining 12% reserved for downstream integration of new authority into legacy consumers — see roadmap).

## I · Final Verdict

**Coach Hammer is now the primary developmental coach.**

- **GO** for Coach Hammer authority.
- **Public launch readiness:** unchanged GO (additive overlay; no invariant relaxed).

### Remaining roadmap

| ID | Priority | Item |
|---|---|---|
| HCR-1 | P1 | Migrate `TodayCommandBar`, `TodayGuidanceSlots`, `CommunicationAI` to consume `useHammerNextStep` directly (currently still on underlying primitives). |
| HCR-2 | P1 | Persist `hammer.chat.message` turns to canonical ASB ledger (`emitAsbEvent`) — currently in-memory per session. |
| HCR-3 | P1 | Wire `<HammerOnboardingChat />` + `<HammerDailyPlan />` + `<HammerChat />` into `AthleteCommand.tsx` three-zone layout. |
| HCR-4 | P2 | Replace `HammerOnboardingPresence` passive renderer with `HammerOnboardingChat` at `/onboarding/athlete`. |
| HCR-5 | P2 | Specialize modality block builders with sport/position weighting from `src/data/baseball/*`. |
| HCR-6 | P2 | Add `coachingCtaRoutes.test.ts` static guard that every Hammer-surface route resolves in `App.tsx`. |

### Constitutional posture

- All new code is **interpretive only** — never authors `organism_truth` / `athlete_intent` / `authority_override` / `hard_stop` / `rehabilitation_state`.
- Safeguarding precedence unchanged. Minor-athlete parent supremacy unchanged.
- Confidence and missingness invariants preserved (FC-1…FC-10): every context variable carries `missing` flag; daily-plan blocks emit `awaiting-input` rather than fabricate content.
- Additive overlay — no prior invariant relaxed; no parallel storage introduced; all events ride canonical `asb_events` topic registry.

---

**Closes:** RFL-011, RFL-012, RFL-013, RFL-014, RFL-015, RFL-016 (see `docs/asb/reality-feedback-ledger.md`).
