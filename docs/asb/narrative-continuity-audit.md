# RR-5 — Narrative Continuity Activation Audit

**Wave:** 1 of post-mastery expansion roadmap.
**Status:** Activated. Implementation operational under RR-5 doctrine seal.
**Subordinate to:** Eternal Laws → Megaphase 151–160 → RR-1…RR-10 →
safeguarding orchestration sub-route → developmental gating matrix → all
prior immutable invariants across Phases 1–150.

This wave operationalizes the reserved `relational.narrative.*` family.
No new primitives, no schema rewrites, no RR-6…RR-10 work, no recruiter /
injury / exposure / career-arc / life-context systems.

---

## Files changed

**Created**
- `src/lib/runtime/relational/narrativeSchemas.ts` — Zod schemas for the five
  narrative topics. Cite-bound topics enforce `lineage_parent_ids.length ≥ 1`;
  `identity_reflection.authority` pinned to `self`.
- `src/lib/runtime/relational/narrativeEmitters.ts` — canonical emit wrappers
  over `emitAsbEvent` / `emitAsbLineage`. Enforces safeguarding lockdown gate,
  citation gate, and athlete-only `identity_reflection` (RR-5 invariant 7).
- `src/lib/runtime/projections/narrativeState.ts` — pure, deterministic,
  memoized projection. Produces continuity timeline, resurfacing candidates,
  unresolved threads, longitudinal counts, revocations, and missingness.
- `src/lib/runtime/relational/__tests__/narrativeState.replay.test.ts`
- `src/lib/runtime/relational/__tests__/narrativeEmitters.test.ts`
- `src/lib/runtime/relational/__tests__/narrative-reference.test.ts`
- `docs/asb/narrative-continuity-audit.md` (this file).

**Edited**
- `src/hooks/useRelationalProjections.ts` — added read-only `useNarrativeState`.
- `src/lib/relational/copy.ts` — added `NARRATIVE_VOICE` block with templates,
  empty/revoked/safeguarded states, journey marker labels, and the enforced
  denylist (`always`, `never`, `destined`, `becoming`, `fragile`, `sabotage`,
  `broken`, `doomed`, `you are a/an`, `you will`, `you won't`, `diagnosed`,
  `diagnosis`, `disorder`, `depressed`, `anxious`).
- `src/lib/runtime/relational/hammerMemory.ts` — added
  `validateNarrativeReference` / `assertNarrativeReferenceLegality` with the
  four-rejection set: FABRICATED_NARRATIVE_RECALL, NARRATIVE_DENYLIST_HIT,
  NARRATIVE_CONFIDENCE_EXCEEDED (>0.7), NARRATIVE_UNDER_SAFEGUARDING.
- `src/components/relational/HammerConversationPanel.tsx` — single observational
  callback chip ("Remembering …") above the composer; pulled from the top
  resurfacing candidate; copy from `NARRATIVE_VOICE` templates only.
- `src/components/relational/AthleteJourneyMap.tsx` — narrative markers
  rendered inline using `NARRATIVE_VOICE.journeyMarkers`. No new section.

**Not touched** (stop gate held)
- No edits to recruiter, injury, exposure, career-arc, life-context surfaces.
- No new ASB topics outside the reserved narrative family.
- No schema rewrites, migrations, or route changes.
- No projection rewrites outside `narrativeState.ts`.

---

## Tests added & results

| Suite | File | Cases | Pass |
| --- | --- | --- | --- |
| Projection replay | `narrativeState.replay.test.ts` | 9 | 9 |
| Reference legality | `narrative-reference.test.ts` | 6 | 6 |
| Emitter legality | `narrativeEmitters.test.ts` | 6 | 6 |
| **Total** | | **21** | **21** |

`bunx tsc --noEmit` — clean (no errors in changed files).

Replay coverage:
- byte-identical rebuild under identical inputs;
- byte-identical rebuild under shuffled input (prepareRows sort is canonical);
- citation-less narrative rows dropped;
- revocation removes downstream visibility on next rebuild — no cached
  narrative authority;
- duplicate-row reordering is invariant;
- missingness preserved as explicit signal — never imputed;
- demo↔production firewall held — `self` scope never sees `demo` narrative.

---

## Replay guarantees

1. **Determinism.** `narrativeState` is pure, memoized on
   `(scope, lastEventId)`, and uses no `Date.now` / `Math.random`. Given the
   same ledger frame at pinned `engine_version` + `reasoning_version`, output
   is byte-identical.
2. **Revocation is replay-driven.** `identity_reflection.revokes_event_id`
   removes the referenced node on the next rebuild. The revoking event itself
   remains visible. No grace period, no cached narrative authority (RR-5
   invariant 10).
3. **Lineage citation required.** All cite-bound topics
   (`memory_anchor`, `slump_marker`, `breakthrough_marker`, `context_recall`)
   reject emission without `lineage_parent_ids.length ≥ 1` at the schema
   layer AND at the emitter gate. Projection drops citation-less rows as
   defence in depth (RR-5 invariant 2).
4. **Resurfacing is deterministic.** Score = `(recencyRank * 10) +
   min(citationCount, 5) + kindWeight`. Tiebreaks: occurred_at desc then
   event_id asc.
5. **Safeguarding supersedes narrative.** Both the emitter and the Hammer
   reference validator hard-reject under active safeguarding lockdown
   (RR-5 invariant 6).

---

## Resurfacing examples

**Allowed** (rendered via `NARRATIVE_VOICE` templates with cited dates):
- "Remembering — You mentioned first bullpen on Jan 1."
- "This echoes what you noted after your October deload."
- "Still carrying what you logged on Mar 12."

**Forbidden** (denylist + emitter gates):
- "You are becoming mentally fragile." → NARRATIVE_DENYLIST_HIT.
- "You always sabotage yourself." → NARRATIVE_DENYLIST_HIT.
- "You'll probably feel hard tomorrow." → NARRATIVE_DENYLIST_HIT (`you will`).
- "Remembering something deep about you." (no cited event) →
  FABRICATED_NARRATIVE_RECALL.
- Hammer authoring an `identity_reflection` → NON_ATHLETE_REFLECTION
  (emitter gate, RR-5 invariant 7).

---

## Emotional safety findings

- **No emotional fabrication.** Narrative payloads carry no free-text feeling
  field. `utterance_ref` and `reflection_ref` are hashed pointers, identical
  to the existing conversation-turn pattern. There is no surface where the
  system invents what the athlete felt.
- **No destiny framing.** Identity verbs (`you are`, `you will`, `becoming`)
  blocked in code via the denylist + validator. Resurfacing copy is
  observational by construction (cited dates only, no generated prose).
- **No psychological diagnosis.** Diagnostic tokens (`diagnosed`, `disorder`,
  `depressed`, `anxious`) blocked at the validator. Inferred confidence
  ceiling of 0.7 matches the existing `psych.inferred` ceiling — human
  supremacy preserved.
- **No surveillance tone.** Resurfacing surface is a single small chip above
  the composer. No feed, no banner, no "AI memory" framing. Mobile-first at
  390/440 — preserved single-column layout.
- **No engagement-loop incentives.** No notification, no streak, no badge
  is tied to narrative artifacts.

---

## Manipulation-risk audit (RR-5 invariants 3, 4, 5, 9)

| Invariant | Surface enforcement | Code enforcement |
| --- | --- | --- |
| Inv. 3 — no invented feelings | No free-text feeling field anywhere | Schema (`MemoryAnchorPayload`, etc.) carries only tags / window / hash refs |
| Inv. 4 — no manipulation | Copy templates fixed in `NARRATIVE_VOICE` | Denylist blocks identity/diagnostic/destiny tokens before render |
| Inv. 5 — no fictional continuity | Citation-less rows dropped; gaps remain gaps | Projection refuses to bridge missingness; explicit missingness field |
| Inv. 9 — observational slump only | Slump payload is window + pattern kind, no labels | Schema rejects label fields; copy renders `Heavier stretch` (observational) |
| Inv. 7 — narrative ≠ authority | Surfaces are read-only; no gating | Emitter rejects non-athlete identity_reflection; nothing writes organism_truth/athlete_intent/authority_override/hard_stop/rehabilitation_state |
| Inv. 6 — safeguarding supersedes | Callback suppressed by validator gate | Emitter + validator both hard-reject under lockdown |
| Inv. 10 — revocation honoured | Next rebuild hides revoked node | Projection pass-1 collects revocations; pass-2 skips them |

---

## Remaining risks

- **Safeguarding lockdown wiring.** The emitter / validator gates accept the
  lockdown flag as a parameter — callers must pass the projection-derived
  flag, not a side-channel. Risk: future caller forgets to thread it.
  Mitigation: keep the parameter required (no default false); document in
  emitter JSDoc; reaffirm in Wave 2 audit.
- **Resurfacing density.** Current Hammer surface caps at one callback. If a
  future change loops candidates, RR-5 invariant 4 (manipulation) becomes
  recheckable. Mitigation: enshrine "one callback per session" in code or
  add a projection-level cap before any density change.
- **Denylist coverage.** Token list is conservative. Future languages /
  metaphors not yet covered. Mitigation: append to the denylist; never remove.
- **Identity reflection without antecedents.** Allowed by design (athlete's
  own act of reflection is the antecedent). The athlete can still revoke any
  reflection event-by-event; revocation lineage is preserved.

---

## Stop gate verification

- No RR-6 / RR-7 / RR-8 / RR-9 / RR-10 implementation.
- No recruiter / injury / exposure / career-arc / life-context surfaces touched.
- No schema rewrites or migrations.
- No new ASB topics outside the reserved `relational.narrative.*` family.
- No projection rewrites outside `narrativeState.ts`.
- No edits to `App.tsx`, routes, `runtime/projections/types.ts`,
  conversation / psych / developmental projections, recruiter / injury /
  exposure components, or any other unrelated surface.

---

## Final verdict

**RR-5 ACTIVATED — CONSTITUTIONALLY COMPLIANT.**

The organism is now continuity-aware. Hammer can resurface observable
moments with cited antecedents, calmly and once per session. Narrative
events are replay-derived overlays, additive-only, safeguarding-subordinate,
and never author organism truth. The athlete retains revocation supremacy
over every narrative thread.

Next wave (RR-6 — injury continuity activation) remains gated by the
post-mastery expansion roadmap: clinician role taxonomy, RTP authorization
workflow with explicit human action, and parent-supremacy review for minors.
No Wave 2 work begins until those prerequisites are explicitly authorized.
