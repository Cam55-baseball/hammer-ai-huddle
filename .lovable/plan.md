## G2 Remediation — Mount HammerParentVoice on Post-Accept Parent Surface

Scope: G2 only. Additive mount of the already-ratified Wave 4 `HammerParentVoice` on `src/pages/Relational.tsx`. No changes to resolver, types, authority, safeguarding, routing, schema, or any other capability.

### Files Edited

1. **`src/pages/Relational.tsx`** — additive mount only.
   - Import `HammerParentVoice` from `@/components/parent/HammerParentVoice`.
   - Import existing relational projection hooks already in use elsewhere (`useRelationshipState`, `useInjuryRecoveryState`, `useLifeContextState`) via `@/hooks/useRelationalProjections` to derive `ParentStateKind` from replay-derived state only.
   - Add a pure derivation function `deriveParentState(...)` (local to the file, no exports, no new module) returning one of the existing `ParentStateKind` values from `@/lib/runtime/parent/types`:
     - `accepted-recovery-state` when injury/recovery projection indicates active recovery
     - `accepted-missingness-state` when projections expose unknown signal refs
     - `accepted-active-athlete` otherwise (default post-accept active branch)
     - Onboarding / setback branches are NOT synthesized here — the resolver already requires `onboarding`/`setback` inputs, which Relational page does not own; those branches remain reachable only from their owning surfaces. Audit-acceptable per §2 (resolver unchanged).
   - Mount `<HammerParentVoice input={{ state, knownSignalRefs, unknownSignalRefs }} />` at the top of the page body, above `SlumpReloadFlow`, so post-accept parents always have Parent Voice visibility.
   - Renders nothing automatically when all slots are lawful-silent (existing component behavior) — no athlete-facing change.

2. **`.lovable/plan.md`** — append sealed G2 remediation entry referencing this plan and the resulting verification.

### Files NOT Touched

- `src/components/parent/HammerParentVoice.tsx`
- `src/lib/runtime/parent/{resolver,types}.ts`
- silence / guidance / handoff / onboarding / setback / authority / safeguarding modules
- routes, schema, migrations, emitters, projections
- athlete-facing components

### Verification (post-implementation)

- TypeScript + lint + preflight clean.
- Manual trace through resolver for `accepted-active-athlete`, `accepted-missingness-state`, `accepted-recovery-state`, `accepted-onboarding-state`, `accepted-setback-state` confirming no resolver change required (all five already supported by Wave 4 resolver).
- Constitutional audit: RR-5/6/8, parent supremacy, safeguarding precedence, single Hammer authority, Organism State silence, replay determinism, demo↔prod firewall — unchanged (no code touched in those layers; `scope` continues to flow through projection hooks).
- Regression: Wave 1–4 tests unchanged, no test files modified.
- Scope audit: no new capability, primitive, route, schema, migration, emitter, authority, safeguarding change. No RR-7/9/10.

### Deliverable

`PARENT LAUNCH REMEDIATION REPORT` (§0–§9) returned in chat after build mode execution, with explicit answers on parent launch and full platform launch gates.

---

# SEALED — G2 Remediation Executed

**Scope:** G2 only. Mounted existing Wave 4 `HammerParentVoice` on `src/pages/Relational.tsx` post-accept surface. State derivation purely from replay-derived projections (`useInjuryRecoveryState`, `useLifeContextState`).

**Files edited:**
- `src/pages/Relational.tsx` — additive mount + local `deriveParentState` helper.
- `.lovable/plan.md` — this entry.

**Files NOT touched:** resolver, parent types, silence, guidance, handoff, onboarding, setback, authority, safeguarding, routing, schema, migrations, emitters, projections, athlete-facing components.

**Constitutional audit:** RR-5 · RR-6 · RR-8 · Parent supremacy · Safeguarding precedence · Single Hammer authority · Organism State silence · Replay determinism · Demo↔prod firewall — all unchanged (no code touched in those layers; `scope` flows through existing projection hooks; safeguarding propagates non-downgradably from projection state into existing resolver short-circuit).

**Scope audit:** no new capability · no new primitive · no new route · no schema change · no migration · no emitter · no authority change · no safeguarding change · no RR-7 · no RR-9 · no RR-10.

**Verdict:**
- Parent launch: **proceed.** G2 resolved.
- Full platform launch: **proceed.** G1 (silence rationale microcopy) remains non-blocking backfill per Parent Launch Blocker Resolution Audit.

**SEALED.**
