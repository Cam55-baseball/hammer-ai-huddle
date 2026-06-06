# Coach Hammer Roadmap

**Date:** 2026-06-06
**Source:** `docs/asb/coach-hammer-authority-audit.md`
**Nature:** Design-only. Implementation deferred to subsequent sprint approval.

---

## Priority classification

- **P0 — launch-critical:** breaks a user contract or produces hard dead-end.
- **P1 — athlete guidance:** Hammer authority coherence; required for "primary developmental coach" claim.
- **P2 — optimization:** depth, personalization, knowledge acquisition.

---

## P0 — Launch-critical

### P0-1 — Fix `/practice-hub` dead-end in `PrescriptiveActionsCard`
- **Source:** RFL-012, audit §F
- **File:** `src/components/hie/PrescriptiveActionsCard.tsx:18–28`
- **Defect:** `navigate('/practice-hub?…')` 404s. Actual route is `/practice`.
- **Fix scope:** rename target route to `/practice` (or introduce `/practice-hub` alias). Pure presentation change, no logic.
- **Launch impact:** the only **hard dead-end** found in this audit. Should be fixed before next deploy regardless of broader Hammer roadmap.

---

## P1 — Athlete guidance (Hammer authority coherence)

### P1-1 — Single next-step arbitration layer
- **Source:** RFL-011, audit §A + §G (biggest weakness)
- **Files involved:** `src/components/dashboard/CommunicationAI.tsx`, `src/components/today/TodayGuidanceSlots.tsx`, `src/hooks/useNextAction.ts`, `src/hooks/useCoachHammerNextStep.ts`.
- **Design:** introduce a single `useHammerNextStep` authority that the AI edge function and time-of-day heuristic both feed *into*, with deterministic precedence (survivability → AI step → heuristic fallback). Both Dashboard and Today consume the same hook. `useNextAction` becomes the deterministic fallback only.
- **Outcome:** Hammer becomes the canonical owner. Cross-surface contradiction eliminated.

### P1-2 — Hammer reads `profiles` for personalization
- **Source:** RFL-013, audit §C
- **Files:** `src/hooks/useCoachHammerNextStep.ts:73–116` snapshot; `src/lib/runtime/prescription.ts`.
- **Design:** snapshot reads `profiles.position`, `throwing_hand`, `batting_side`, `experience_level`, `high_school_grad_year`, `date_of_birth` and threads them into both the edge-function payload and `buildDailyPrescription` block selection. Read-only; no schema change.
- **Constitutional note:** profile is *not* organism truth — it is athlete-asserted context, lawful for interpretation per Megaphase 111–150 athlete intelligence delivery doctrine.

### P1-3 — Hammer brand consolidation
- **Source:** RFL-016, audit §G
- **Files:** `src/components/HelpDeskChat.tsx`, `supabase/functions/ai-helpdesk`, `supabase/functions/coach-hammer-next-step`.
- **Design:** rename HelpDeskChat surface to "Ask Coach Hammer" and route through a Hammer-scoped prompt envelope using `getHammerIdentity()`. The two AI surfaces can remain separate functions; brand becomes singular.

### P1-4 — Onboarding becomes Hammer-led knowledge-gap acquisition
- **Source:** RFL-015, audit §B
- **Files:** `src/pages/AthleteOnboarding.tsx`, `src/components/onboarding/HammerOnboardingPresence.tsx`, new resolver step in `src/lib/runtime/onboarding/`.
- **Design:** `HammerOnboardingPresence` graduates from passive renderer to question-driver. It introspects which `profiles` fields and which canonical event topics are missing, and prompts the athlete to fill them — one question at a time, missingness-driven, replay-safe. Each answer emits a canonical event (`athlete.profile.field_collected`, etc. — topics to be added to `asb_topic_registry`).
- **Constitutional note:** must respect RR-8 life-context disclosure rules (no coercion) and RR-6 (no diagnosis from injury questions). Same authority bounds as existing relational primitives.

---

## P2 — Optimization

### P2-1 — Complete daily plan modality coverage
- **Source:** RFL-014, audit §D
- **File:** `src/lib/runtime/prescription.ts` block catalogs.
- **Design:** add HITTING_BLOCKS, DEFENSE_BLOCKS, BASERUNNING_BLOCKS, FUELING_BLOCKS. Selection rules driven by `profiles.position` + season phase + day_type. Maintain hardcoded block contract (interpretive, never authoring organism truth).

### P2-2 — Add missing canonical event topics
- **Source:** audit §C (4 blind spots)
- **Files:** `asb_topic_registry` (DB), `src/lib/runtime/projections/*`, new emitters.
- **Topics to constitutionalize:** `athlete.goal.declared`, `athlete.equipment.access`, `athlete.training_history.lifting_age`, `athlete.season.phase_declared`. Injury topics remain deferred under RR-6 sealing per `post-mastery-expansion-roadmap.md`.

### P2-3 — Season-phase as authored event, not date heuristic
- **Source:** audit §C `season status`
- **File:** `src/lib/seasonPhase.ts`.
- **Design:** allow athlete/coach to declare `athlete.season.phase_declared` event; date heuristic becomes the fallback when no declaration exists. Missingness preserved.

### P2-4 — Hammer continuous-adaptation visibility
- **Source:** audit §G
- **File:** `src/hooks/useCoachHammerNextStep.ts:118–121` (30-min cache window).
- **Design:** expose lineage handle on the CommunicationAI surface (event_id of last snapshot) so athlete sees *why* Hammer's answer changed when it changes. Aligns with athlete intelligence delivery doctrine ("every surface exposes lineage one interaction away").

### P2-5 — Coach-facing translation parity
- **Source:** audit §A `PieV2HammerBriefPanel`
- **Note:** coach-facing Hammer is already constitutionally constrained (translator, not coach). No change required unless coach asks for plan-authoring authority — which would violate the translation doctrine. **Recommendation: leave unchanged.**

---

## Launch impact assessment

| Item | Blocks launch? | Why |
|---|---|---|
| P0-1 | **Yes for next deploy** | Hard 404 from advertised CTA |
| P1-1 | No | Contradiction is degraded UX, not invariant violation |
| P1-2 | No | Personalization gap, not safety gap |
| P1-3 | No | Branding coherence |
| P1-4 | No | Onboarding works; depth missing |
| P2-* | No | Optimization |

**Prior GO verdict from `final-public-release-ratification.md` is preserved.** Recommended sequence: ship P0-1 with current launch, then run a focused Hammer-Authority-Consolidation sprint covering P1-1 → P1-4 as the next post-launch product sprint (NOT instrumentation, NOT doctrine — Hammer product convergence).

**Next reality-driven sprint candidate:** **Hammer Authority Consolidation Sprint** — execute P1-1 first (single arbitration layer) because it directly resolves the biggest athlete-experience weakness identified in §G with the smallest implementation surface. All other P1 items become easier once authority is canonical.
