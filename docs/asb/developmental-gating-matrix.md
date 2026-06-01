# Developmental Gating Matrix

**Phase 154.** Authority: `src/lib/runtime/relational/developmentalGates.ts::MATRIX`.

Frozen at module load. Commercial / recruiting / monetization pressure may
never raise a gate. Deload windows may only lower the load ceiling.

## Matrix

| Stage | Load ceiling % | Recruiter | Exposure | Psych-inferred safeguarding | External conversation share | Safeguarding default |
|---|---|---|---|---|---|---|
| `youth_intro` | 60 | blocked | blocked | parent_only | parent_consent_required | on |
| `youth_developmental` | 70 | blocked | blocked | parent_only | parent_consent_required | on |
| `adolescent_early` | 80 | parent_gate | parent_gate | parent_only | parent_consent_required | on |
| `adolescent_mid` | 85 | parent_gate | allowed | parent_visible | parent_consent_required | on |
| `adolescent_late` | 95 | parent_gate | allowed | parent_visible | self_consent_plus_parent_notify | on |
| `adult_emerging` | 100 | allowed | allowed | self_visible | self_consent | off |
| `adult_competitive` | 100 | allowed | allowed | self_visible | self_consent | off |
| `adult_pro` | 100 | allowed | allowed | self_visible | self_consent | off |

## Invariants

- **Monotonicity** — stage projection rejects regressions
  (`developmentalState.ts::stageIndex`). Only forward transitions land.
- **Effective load ceiling** — `effectiveLoadCeiling(stage, activeDeloadPct)`
  returns `min(stage_ceiling, activeDeloadPct)`. Deload windows never raise.
- **Minor supremacy** — for every minor stage, `requiresParentConsent`
  forces parent consent on recruiter, exposure (where gated), and external
  conversation sharing.
- **Commercial firewall** — recruiter/exposure gates cannot be relaxed by
  commercial or monetization pressure; they are derived from stage alone.

## Test coverage

`src/lib/runtime/relational/__tests__/relational-developmental.replay.test.ts`
asserts: gates table, ceiling clamp, minor consent requirement, projection
regression rejection, and deload precedence over stage ceiling.

## Failure mode

Any change that introduces a new stage, mutates a ceiling, opens a gate, or
allows regression must update both the matrix and its tests. Silent matrix
mutation is a constitutional drift event.
