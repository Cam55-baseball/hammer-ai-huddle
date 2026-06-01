# Relational ASB Topic Namespace (Megaphase 151–160)

Phase 151 reservation. Constitutional, additive-only. All topics emit through canonical `emitAsbEvent` / `buildAsbRow` into `asb_events` + `asb_event_lineage`. No parallel storage.

## Reserved topic prefix

`relational.*`

## Primitive topics

| Primitive | Topic prefix | Verbs (initial) |
|---|---|---|
| conversation_event | `relational.conversation.*` | `turn`, `shared`, `redacted` |
| relationship | `relational.relationship.*` | `created`, `confirmed`, `scoped`, `revoked`, `paused` |
| psychological_state | `relational.psych.*` | `self_report`, `inferred`, `transition` |
| developmental_stage | `relational.developmental.*` | `age_observed`, `growth_attestation`, `puberty_marker`, `deload_window`, `transition` |
| narrative_event | `relational.narrative.*` | `authored`, `revised`, `shared` |
| injury_event | `relational.injury.*` | `onset`, `assessed`, `diagnosed`, `rtp_planned`, `milestone`, `setback`, `cleared`, `recurrence_watch` |
| career_arc | `relational.career_arc.*` | `projected`, `divergence`, `goal_stated` |
| life_context_event | `relational.life_context.*` | `disclosed`, `redacted`, `safeguarding_escalation` |
| exposure_event | `relational.exposure.*` | `observed`, `aggregated`, `ingested_external` |
| recruiter_contact_event | `relational.recruiter.*` | `inquiry`, `response`, `meeting`, `offer`, `decision`, `withdrawn`, `gate_violation` |

## Visibility scopes

`payload.visibility_scope` ∈ `"self" | "coach" | "parent" | "org" | "external" | "demo"`.

- **Demo firewall (Phase 151)**: `"demo"` events are replay-legal but isolated. Production scopes never read them; demo scope never reads non-demo events. Enforced in `src/lib/runtime/projections/types.ts::prepareRows`.
- **Minor-athlete supremacy**: when `developmental_stage` indicates minor, parent visibility has constitutional precedence over coach/recruiter for safeguarding categories.

## Authority boundary

Relational primitives are **interpretive overlays**. They never author `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state` except through channels already constitutionalized in Phases 31, 52, 54, 111–150.

## Status

- **Phase 151** ✅ namespace reserved, demo firewall enforced.
- **Phases 152–160** pending — primitive-by-primitive implementation per `.lovable/plan.md`.
