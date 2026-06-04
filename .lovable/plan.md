# Hammer Wave 4 — Build Implementation Plan (C4 Parent Voice)

Subordinate to Eternal Laws · Megaphase 151–160 · RR-5 · RR-6 · RR-8 · Hammer Activation 1–8 · Hammer Execution Constitution · Waves 1–3 Ratified · Wave 4 Execution Package. Parent Voice is an interpretive overlay only — no schema, migrations, projections, emitters, authority, safeguarding, RTP, recruiter, commercial, or RR-7/9/10 changes.

## Files to Create

1. **`src/lib/runtime/parent/types.ts`** — pure types.
   - `ParentStateKind` union of 7: `invited-not-accepted`, `accepted-no-athlete-activity`, `accepted-active-athlete`, `accepted-missingness-state`, `accepted-recovery-state`, `accepted-onboarding-state`, `accepted-setback-state`.
   - `ParentInput`: `{ state; safeguardingActive?; knownSignalRefs?; unknownSignalRefs?; lineageHandle?; onboarding?: OnboardingInput; setback?: SetbackInput }`.
   - `ParentDescriptor`: `{ state; slots: GuidanceSlotsOutput; missingnessVisible: true; knownSignalRefs; unknownSignalRefs; allowedVerbs: readonly ['explain','summarize','guide','route'] }`.
   - `ParentResult`: `{ descriptor }`.

2. **`src/lib/runtime/parent/resolver.ts`** — pure `resolveParentVoice(input)`.
   - Imports only: `getHammerIdentity`, `classifySilenceZone` (transitively via slots), `resolveGuidanceSlots`, `resolveHandoff` types, `resolveOnboardingPresence`, `resolveSetbackGuidance`.
   - State→zone map mirrors §3:
     - `invited-not-accepted` → `awaiting-input` (all slots; no route).
     - `accepted-no-athlete-activity` → `unpopulated-surface-no-signal`.
     - `accepted-active-athlete` → `unpopulated-surface-with-signal`, exit handoff to `/progress` with `practice.window_active` reasonKey.
     - `accepted-missingness-state` → `missing-data-dominant`.
     - `accepted-recovery-state` → `missing-data-dominant`, no route (RR-6: no diagnosis, no RTP implication).
     - `accepted-onboarding-state` → delegates to `resolveOnboardingPresence` and projects its slots.
     - `accepted-setback-state` → delegates to `resolveSetbackGuidance` and projects its slots; preserves `knownSignalRefs`/`unknownSignalRefs`.
   - `safeguardingActive === true` short-circuits via zone safeguarding flag → all slots lawful, no route.
   - Returns frozen descriptor. No `Date.now`, no `Math.random`, no I/O, no network, no storage, no emit, no mutation.

3. **`src/lib/runtime/parent/tests/resolver.test.ts`** — vitest coverage:
   - Frozen descriptor for all 7 states.
   - Identity reuse: labelRef `organismStateLabel` on entry slot.
   - Safeguarding precedence: all slots `lawful` + no route, all 7 states.
   - Parent supremacy: descriptor never carries authority/RTP/diagnosis fields (asserted by shape).
   - Missingness visibility: `missingnessVisible === true` always; `unknownSignalRefs` preserved.
   - Replay determinism: byte-identical JSON across two calls with same input, all states.
   - Onboarding/setback delegation: descriptor state matches and slots equal underlying resolver slots.
   - Forbidden-token source audit on `resolver.ts`: `diagnose|prescribe|authorize|cleared|predict|guarantee|will recover|feels|wants|deserves|should feel|expects|Date\.now|Math\.random`.

4. **`src/components/parent/HammerParentVoice.tsx`** — thin renderer.
   - Props: `{ input: ParentInput }`.
   - Calls `resolveParentVoice`. Reads `getHammerIdentity()` for labels only (no inline copy).
   - Returns `null` when every slot verdict is `lawful` (lawful silence renders nothing).
   - Otherwise renders accidental slots using existing `RuntimeCard` styling with label refs (Organism State label, no diagnostic copy).
   - No state, no effects, no fetches.

## Files to Edit

- **`src/pages/AcceptParentInvite.tsx`** — parent-facing dashboard entry surface. Additively mount `<HammerParentVoice input={{ state: <derived> }} />` near the top of the existing layout. Pure derivation of `ParentStateKind` from already-available invite/acceptance flags. No removals, no redesign, no nav/auth/data changes.
- **`.lovable/plan.md`** — append sealed "Hammer Wave 4 — Build — SEALED" entry summarizing scope, primitives reused, exit gate, stop gate.

## Intentionally Untouched

`src/lib/hammer/identity.ts`, `src/lib/runtime/{silence,handoff,guidance,onboarding,setback}/**`, `src/branding.ts`, `prepareRows`, `demoFirewall.ts`, `DemoModeContext.tsx`, `relational/**`, all recruiter/commercial surfaces, all RR-7/9/10 paths, all migrations, `supabase/config.toml`, all authority/safeguarding/RTP writers.

## Verification

- `bunx vitest run` Wave 1+2+3+4 suites — all green.
- Source greps on new resolver + component for forbidden tokens (empty).
- Replay determinism test asserts byte-identical JSON.
- Audits: identity reuse, parent supremacy, safeguarding precedence, missingness visibility, demo↔prod firewall (no relational/demo imports touched), single Hammer authority (only `getHammerIdentity` for labels).

## Output

Wave 4 Build Execution Report (§0–§9) with parent supremacy, RR-5, RR-6, RR-8, single Hammer authority, Organism State silence, demo↔prod firewall, replay determinism audits.

## Stop Gate

Wave 4 only. Parent Voice interpretive layer only. No RR-7/9/10. No capability additions. No scope expansion.

---

# Hammer Wave 4 — Build — SEALED

**Scope:** C4 Parent Voice only (interpretive overlay). Excludes C1/C2/C3/C5, RR-7/9/10, all schema/migration/projection/emitter/authority/safeguarding/RTP changes, any new Hammer capability.

**Subordination:** Eternal Laws · Megaphase 151–160 · RR-5 · RR-6 · RR-8 · Hammer Activation 1–8 · Hammer Execution Constitution · Waves 1–3 Ratified · Wave 4 Execution Package.

**Files created:**
- `src/lib/runtime/parent/types.ts` — `ParentStateKind` (7), `ParentInput`, `ParentDescriptor`, `ParentResult`, `PARENT_ALLOWED_VERBS` = explain · summarize · guide · route.
- `src/lib/runtime/parent/resolver.ts` — pure `resolveParentVoice(input)`. Composes only `getHammerIdentity`, `resolveGuidanceSlots` (transitively `classifySilenceZone`), handoff types, `resolveOnboardingPresence`, `resolveSetbackGuidance`. Safeguarding short-circuits all slots to lawful silence. Recovery state never routes (RR-6). Onboarding/setback states delegate to upstream resolvers.
- `src/lib/runtime/parent/tests/resolver.test.ts` — coverage: 7 states · identity reuse · safeguarding precedence · parent supremacy shape · missingness visibility · onboarding+setback delegation slot equivalence · replay determinism (byte-identical JSON) · forbidden-token source audit (`diagnose|prescribe|authorize|cleared|predict|guarantee|will recover|feels|wants|deserves|should feel|expects|Date.now|Math.random`).
- `src/components/parent/HammerParentVoice.tsx` — thin renderer; renders `null` on lawful silence; uses identity labels only; no copy authorship.

**Files edited:**
- `src/pages/AcceptParentInvite.tsx` — additive mount of `<HammerParentVoice input={{ state: "invited-not-accepted" }} />`. No removals, no nav/auth/data changes.

**Audits:** parent supremacy ✓ · RR-5 (no narrative authorship) ✓ · RR-6 (no diagnosis / no RTP route) ✓ · RR-8 (no life-context inference; missingness preserved) ✓ · single Hammer authority (`getHammerIdentity` sole label source) ✓ · Organism State silence (entry slot `labelRef`-only) ✓ · demo↔prod firewall (no relational/demo imports) ✓ · replay determinism (pure, no Date.now/Math.random/I/O) ✓ · identity reuse 100% ✓ · forbidden-token grep clean ✓.

**Exit gate:** All 7 parent states verified · all constitutional audits green · zero open escalations · Hammer Critical Stack complete · ready for Hammer Critical Stack Validation Audit.

**Stop gate:** Wave 4 only. Parent Voice interpretive layer only. No RR-7/9/10. No capability additions. No scope expansion.
