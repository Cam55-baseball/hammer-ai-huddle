# Relational Failure Modes

**Phase 151–154.** Catalog of constitutional failure modes for the
relational substrate, with detection point, containment route, and audit
signal for each.

| # | Failure mode | Detection point | Containment | Audit signal |
|---|---|---|---|---|
| 1 | `FABRICATED_RECALL` — Hammer claims memory without citing event ids | `hammerMemory.ts::validateHammerTurn` at emit boundary | `emitConversationTurn` throws `HAMMER_TURN_CONSTITUTIONALLY_ILLEGAL` | Console error from `emit.ts`; no row appended |
| 2 | `RECRUITER_REFERENCE_WITHOUT_CONSENT` — Hammer references recruiter to a minor without parent consent event | `hammerMemory.ts::validateHammerTurn` | Same — emission blocked | Same |
| 3 | `MISSINGNESS_HIDDEN` — Hammer turn has an unstated knowledge gap | `hammerMemory.ts::validateHammerTurn` | Same — emission blocked | Same |
| 4 | Inferred confidence ceiling breach (`> 0.7`) | `schemas.PsychInferredPayload` refine + `emit.ts::emitPsychInferred` clamp | Schema rejects; clamp is defense-in-depth | Zod parse error; clamped value if it slips |
| 5 | Self-supremacy violation — inferred contributes when self_report present | `psychInference.ts::resolveEffectiveBand` (self branch returns first) | Pure function makes it structurally impossible | Test `psych.replay.test.ts` |
| 6 | Stage regression — projection sees `to_stage` earlier than current | `developmentalState.ts` index check | Event ignored by projection (not by ledger) | Test `developmental.replay.test.ts` |
| 7 | Deload window raises ceiling | `developmentalGates.ts::effectiveLoadCeiling` (`Math.min`) | Structurally impossible | Test in `developmental.replay.test.ts` |
| 8 | Demo event leaks into production scope | `projections/types.ts::prepareRows` bidirectional firewall | Row filtered before projection sees it | Test `visibility.matrix.test.ts` |
| 9 | Production event read from demo scope | Same firewall, opposite branch | Same | Same |
| 10 | Self-scoped payload visible to coach/parent/org | `prepareRows` self filter | Row filtered | Same |
| 11 | Trust score authored directly | `trustState.ts` derives only — no setter exists | No write path | Code review + grep `trust_score =` |
| 12 | Promotion mutates demo row | `promote-relational-demo.ts` never UPDATEs | Script only INSERTs | Migration test (a) |
| 13 | Promotion missing lineage edge | Migration test invariant (b) | Promotion considered failed | Test red |
| 14 | Inferred confidence aggregation inflated above weakest evidence | `psychInference.ts::aggregateInferredConfidence` uses min | Structurally impossible | Pure-function test |
| 15 | Per-counterparty trust rate-burst | `trustState.ts` `PER_COUNTERPARTY_DELTA_CEILING` | Excess deltas discarded | Test on trust burst |

## Escalation route (cross-primitive)

When a failure mode crosses the safeguarding boundary (e.g. minor athlete
crisis psych band landing without ack) the canonical safeguarding
sub-route runs: `signal → classify → contain → notify_safeguarding_role
→ survivability_lockdown → arbitrate (Phase 31)`. The relational layer is
the **detector** only — it never authors safeguarding outcomes.

## Anti-patterns

- Silent recovery via derived-view restoration.
- Recovery-via-cached-state promotion.
- "Self-healing" reframing of a failure event.
- Single-cause narratives that erase lineage.

All forbidden per Megaphase 63–67 C5 and Phase 47 §E.
