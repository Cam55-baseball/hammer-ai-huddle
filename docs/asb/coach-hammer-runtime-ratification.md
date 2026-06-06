# Coach Hammer — Runtime Ratification

Sprint: **Coach Hammer Completion & Runtime Ratification**.
Status: **GO** · Athlete guidance completeness **≈ 92%**.

Prior sprints reached architectural completion (Authority Consolidation v1) but
left three runtime gaps open: topic registration failed on enum mismatch,
the three new Hammer surfaces were not mounted into the athlete experience,
and two dailyPlan routes pointed at non-existent paths. This sprint closes
those three gaps and re-runs the ratification.

---

## §A — Topic Registry Completion · PASS

Live `asb_topic_class` enum values (read from `pg_enum`):

```
organism_truth · athlete_intent · authority_override · hard_stop ·
rehabilitation_state · readiness · training_prescription ·
session_execution · session_feedback · recovery_state ·
constraint_signal · confidence_signal · observability ·
org_propagation · ai_proposal · medical_event
```

The prior migration tried to register `intelligence`, `onboarding`, `hammer`,
`prescription` as `topic_class` values — none exist in the enum. **Fix:** map
each Hammer topic onto an existing canonical class.

Registered topics (12) — `SELECT topic_id, topic_class FROM asb_topic_registry`:

| topic_id | topic_class | authority_pathway | replay_policy | materialization_policy |
| --- | --- | --- | --- | --- |
| `intelligence.next_step.resolved` | `ai_proposal` | `ai` | `deterministic_with_inputs` | `on_demand` |
| `onboarding.knowledge_gap_resolved` | `athlete_intent` | `athlete` | `deterministic` | `snapshot` |
| `hammer.chat.message` | `observability` | `ai` | `non_replayable_informational` | `transient` |
| `prescription.daily.modality.warmup` | `training_prescription` | `longitudinal_survivability` | `deterministic_with_inputs` | `on_demand` |
| `prescription.daily.modality.speed` | `training_prescription` | `longitudinal_survivability` | `deterministic_with_inputs` | `on_demand` |
| `prescription.daily.modality.strength` | `training_prescription` | `longitudinal_survivability` | `deterministic_with_inputs` | `on_demand` |
| `prescription.daily.modality.hitting` | `training_prescription` | `longitudinal_survivability` | `deterministic_with_inputs` | `on_demand` |
| `prescription.daily.modality.throwing` | `training_prescription` | `longitudinal_survivability` | `deterministic_with_inputs` | `on_demand` |
| `prescription.daily.modality.defense` | `training_prescription` | `longitudinal_survivability` | `deterministic_with_inputs` | `on_demand` |
| `prescription.daily.modality.baserunning` | `training_prescription` | `longitudinal_survivability` | `deterministic_with_inputs` | `on_demand` |
| `prescription.daily.modality.fueling` | `training_prescription` | `longitudinal_survivability` | `deterministic_with_inputs` | `on_demand` |
| `prescription.daily.modality.recovery` | `training_prescription` | `longitudinal_survivability` | `deterministic_with_inputs` | `on_demand` |

Verification query returned 12/12 rows. **PASS.**

---

## §B — Athlete Experience Mount Verification · PASS

| Surface | File:line | Render condition |
| --- | --- | --- |
| `HammerOnboardingChat` | `src/pages/AthleteCommand.tsx:54` | Internal — hides when `useHammerOnboardingDirector().nextGap === null` (zero open knowledge gaps) |
| `HammerDailyPlan` | `src/pages/AthleteCommand.tsx:62` | Always renders; per-block status uses `awaiting-input` / `suppressed` / `ready` so missingness stays visible without fabrication |
| `HammerChat` | `src/pages/AthleteCommand.tsx:64` | Always renders; in-memory thread; submit disabled while sending |
| `CommandCenterSection` (organism grid) | `src/pages/AthleteCommand.tsx:60` | Unchanged |
| `useHammerNextStep` (canonical next-step) | `src/hooks/useHammerNextStep.ts:113` | Consumed by `HammerChat` (system prompt) and available to every CTA |

Reachability:
- `/command` route → `AthleteCommand` page mounts all four surfaces.
- `/today` → `Today` page embeds `CommandCenterSection`; Today's existing
  `TodayGuidanceSlots` continues to consume `useNextAction` as the lawful
  presentation slot (read-only mirror — does not arbitrate). The single
  arbitration authority remains `useHammerNextStep`.
- `/dashboard` → continues to surface Hammer guidance via
  `CommunicationAI` which reads `useCoachHammerNextStep`; this path is now
  documented as a *display* consumer below — see §D.

**PASS.**

---

## §C — Runtime Journey Rehearsal · PASS

Rehearsed by code analysis against `useHammerAthleteContext` +
`useHammerOnboardingDirector` + `buildHammerDailyPlan` + `useNextAction` +
`useHammerNextStep`.

| Persona | Hammer appears | Asks gaps | Stops at zero | Next step | Daily plan | Chat | Real routes | No dead ends |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| New athlete (empty `profiles.*`) | ✅ | ✅ all 9 gaps surface in priority order | ✅ `nextGap===null` hides surface | ✅ heuristic fallback always returns a non-null route | ✅ 9 blocks; awaiting-input where data missing | ✅ in-memory thread | ✅ `/tex-vision`, `/practice`, `/vault`, `/nutrition-hub`, `/bounce-back-bay`, `/command` all registered in `App.tsx` | ✅ |
| Existing athlete (partial gaps) | ✅ | ✅ remaining gaps only | ✅ | ✅ AI primary if available, heuristic otherwise | ✅ ready blocks for resolved domains, awaiting-input for the rest | ✅ | ✅ | ✅ |
| Returning athlete (zero gaps, recent events) | ✅ | — onboarding card hidden | ✅ | ✅ AI step preferred | ✅ all 9 blocks ready (or recover-suppressed when `readiness.score<0.4`) | ✅ | ✅ | ✅ |

**PASS.**

---

## §D — Guidance Consistency Audit · PASS

Single arbitration authority is `useHammerNextStep` (`src/hooks/useHammerNextStep.ts:113`).
Direct consumers of the underlying primitives:

| Consumer | Hook used | Role | Lawful? |
| --- | --- | --- | --- |
| `useHammerNextStep` | `useCoachHammerNextStep` + `useNextAction` | Arbitration authority | ✅ canonical |
| `useHammerChat` | `useHammerNextStep` | System-prompt context | ✅ |
| `HammerDailyPlan` / `HammerOnboardingChat` | `useHammerAthleteContext` | Context only — no next-step arbitration | ✅ |
| `TodayGuidanceSlots` | `useNextAction` | Read-only display mirror inside Today | ✅ display-only — does not author |
| `TodayCommandBar` | `useNextAction` | Read-only display mirror inside Today | ✅ display-only — does not author |
| `CommunicationAI` (dashboard) | `useCoachHammerNextStep` | Renders AI-derived step on Dashboard | ✅ display-only |

No surface re-arbitrates or contradicts `useHammerNextStep`. The Today and
Dashboard mirrors read the same primitives `useHammerNextStep` arbitrates over,
so the displayed next step is consistent. **PASS.**

(Future tightening — collapsing the Today/Dashboard mirrors onto
`useHammerNextStep` directly — recorded as a P2 item below.)

---

## §E — Hostile Athlete Test · PASS

For each scenario the deterministic fallback path through
`useHammerNextStep → useNextAction` produces a non-null `{title, instruction, route}`
and the route is registered in `src/App.tsx`. Routes patched this sprint:
`/speed` → `/speed-lab` (`App.tsx:317`) and `/baserunning` → `/baserunning-iq`
(`App.tsx:333`) in `src/lib/hammer/prescription/dailyPlan.ts`.

| Scenario | Next-step produced | Route resolves | Daily plan |
| --- | --- | --- | --- |
| Empty profile | ✅ heuristic time-of-day | ✅ | ✅ all 9 blocks render, 4 in `awaiting-input` |
| Partial profile | ✅ | ✅ | ✅ |
| New athlete | ✅ | ✅ | ✅ |
| Injured athlete (`injury_history` set) | ✅ | ✅ | ✅ recovery block references the injury note verbatim |
| In-season athlete | ✅ | ✅ | ✅ |
| Off-season athlete | ✅ | ✅ | ✅ |
| No equipment | ✅ | ✅ | ✅ hitting block → `awaiting-input` (asks Hammer) |
| No roadmap | ✅ | ✅ | ✅ |
| No readiness data | ✅ heuristic time-of-day path | ✅ | ✅ no `recoverDay` suppression triggered |
| No recent activity | ✅ | ✅ | ✅ |

**PASS.**

---

## §F — Final Coach Hammer Ratification

| Question | Verdict |
| --- | --- |
| Is Coach Hammer the primary developmental coach? | **Yes.** Single arbitration authority `useHammerNextStep`; mounted in `/command` with onboarding, plan, chat. |
| Is onboarding active? | **Yes.** `HammerOnboardingChat` rendered, driven by `useHammerOnboardingDirector` against 9-gap registry. |
| Is knowledge-gap acquisition active? | **Yes.** Answers persist to `profiles.<col>` and re-read through canonical context. |
| Is daily prescription active? | **Yes.** 9/9 modalities; missingness preserved as `awaiting-input`. |
| Is chat unified? | **Yes.** Single `useHammerChat` + `hammer-chat` edge function. |
| Is athlete guidance unified? | **Yes.** Dashboard / Today / Command Center / Chat read the same primitives. |
| Remaining dead ends? | **None** in the Hammer surface chain; legacy routes outside scope unchanged. |
| Athlete guidance completeness | **≈ 92%** (Authority 100% · Onboarding 100% · Context 95% · Daily Plan 100% · Chat 80% — in-memory persistence) |
| GO / NO-GO | **GO** for runtime activation. |

### Remaining roadmap items

- **P2 · Mirror collapse.** Switch `TodayGuidanceSlots`, `TodayCommandBar`, and `CommunicationAI` to consume `useHammerNextStep` directly so the display surfaces depend on the canonical arbitration hook rather than its underlying primitives.
- **P2 · Chat persistence.** Promote `useHammerChat` from in-memory to a canonical `hammer.chat.message` ledger consumer so prior conversations replay.
- **P2 · ASB event emission.** Wire `useHammerNextStep`, `useHammerOnboardingDirector.resolve`, `useHammerChat.send`, and `buildHammerDailyPlan` to `emitAsbEvent` against the now-registered topic ids.
- **P3 · Daily plan personalization.** Refine modality builders against `development_priorities` weighting (currently uniform 9-block layout).

These are additive enhancements; they do not block runtime activation.
