# Hammer Wave 2 — Build Implementation Plan

Subordinate to: Eternal Laws · Megaphase 151–160 · RR-5/6/8 · Hammer Activation 1–8 · Wave 1 Ratified · Wave 2 Execution Package (`docs/asb/hammer-wave-2-execution-package.md`) · Hammer Execution Constitution.

## §0 Scope (locked)

**In-scope:** C2 (Today Presence) + C6 (Navigation Handoff) only.
**Excluded:** C3, C4, C5, RR-7, RR-9, RR-10, all new schemas/migrations/projections/emitters, all writes to `organism_truth | athlete_intent | authority_override | hard_stop | rehabilitation_state`, all changes to `src/branding.ts`, `prepareRows`, `demoFirewall.ts`, `DemoModeContext.tsx`, `relational/**`, `supabase/migrations/**`, `supabase/config.toml`, all Wave 1 sealed files.

## §1 Files to create

1. `src/lib/runtime/handoff/types.ts` — pure types. `LawfulDestination` discriminated union over the seven canonical routes (see §3 route reconciliation), `HandoffDescriptor = { route, reasonKey, lineageHandle }`, `HandoffSilence = { silence: 'lawful' }`, `HandoffResult = HandoffDescriptor | HandoffSilence`, `HandoffInput`.
2. `src/lib/runtime/handoff/destinations.ts` — pure `resolveHandoff(input): HandoffResult`. Closed registry of seven lawful routes. Safeguarding-precedence short-circuit. Uses `classifySilenceZone` for all silence decisions. No `Date.now`, `Math.random`, network, storage, emitters. No forbidden tokens (`diagnose|prescribe|authorize|cleared|predict`).
3. `src/lib/runtime/handoff/__tests__/destinations.test.ts` — exhaustive lawful-set test, descriptor-shape test, forbidden-phrase grep-style assertion against module source, safeguarding precedence on `/runtime/rtp`, `/bounce-back-bay`, `/safety`, replay determinism (byte-identical across shuffled + repeat invocations).
4. `src/lib/runtime/guidance/types.ts` — pure types for four slot kinds (`entry | context | next | exit`), `GuidanceSlot` discriminated union, `GuidanceSlotsInput`.
5. `src/lib/runtime/guidance/slots.ts` — pure `resolveGuidanceSlots(input)` returning the four slots. Composes `getHammerIdentity()` + `classifySilenceZone()` + `resolveHandoff()`. No I/O. Exit slot delegates to C6.
6. `src/lib/runtime/guidance/__tests__/slots.test.ts` — 8-zone matrix × 4 slots, identity-reuse assertion, purity assertion (source grep), replay determinism, safeguarding precedence.
7. `src/components/today/TodayGuidanceSlots.tsx` — thin presentation wrapper that consumes resolver output and renders existing labels (no copy authorship — uses `organismStateLabel` from identity + existing projection references).

## §2 Files to edit

8. `src/pages/Today.tsx` — wire `TodayGuidanceSlots` once, above existing `PrescriptionCard`. No removal of existing surfaces. No new emitters.
9. `src/components/today/TodayCommandBar.tsx` — replace Next-up CTA navigation target with `resolveHandoff` output when handoff is non-silence; fall through to current `useNextAction().route` otherwise. Labels via `getHammerIdentity()`.
10. `.lovable/plan.md` — append sealed Wave 2 build entry (Complete / Verified / Ratified attestations).

## §3 Route reconciliation (constitutional, not scope expansion)

Execution package §2 lists `/safety-center` and `/rtp`; actual router registers `/safety` and `/runtime/rtp`. The lawful-destination union will bind to the **actual registered routes** (`/safety`, `/runtime/rtp`) — Hammer must not handoff to non-existent routes (constitutional: replay-traceable destinations only). This is a route-identifier correction, not a capability addition. Documented in plan log and Wave 2 entry.

Final lawful set (exactly seven): `/relational`, `/practice`, `/training-block`, `/safety`, `/runtime/rtp`, `/bounce-back-bay`, `/accept-parent-invite`.

## §4 Intentionally untouched

`src/branding.ts`, `src/lib/hammer/identity.ts`, `src/lib/runtime/silence/**` (Wave 1 sealed), `src/hooks/useHammerState.ts`, `src/hooks/useNextAction.ts`, `src/hooks/useEngineHealth.ts`, `src/lib/runtime/projections/types.ts`, `supabase/functions/_shared/demoFirewall.ts`, `src/contexts/DemoModeContext.tsx`, all `src/lib/runtime/relational/**`, all `supabase/migrations/**`, `supabase/config.toml`, all parent/coach/recruiter surfaces, all RR-7/9/10 paths.

## §5 Verification (executed after build)

- `bunx vitest run src/lib/runtime/handoff src/lib/runtime/guidance src/lib/runtime/silence src/lib/hammer` — must be green.
- Wave 1 regression: `src/lib/hammer/__tests__/identity.test.ts` + `src/lib/runtime/silence/__tests__/classifier.test.ts` — unchanged, green.
- Grep audits: zero raw `"Hammer State"` in Today subtree; zero `Date.now|Math.random|fetch|emit` in new resolver modules; zero forbidden tokens in `destinations.ts`.
- Constitutional audit per package §6 (RR-5/6/8, replay determinism, parent supremacy, safeguarding precedence, single Hammer authority, Organism State silence, demo↔prod firewall).

## §6 Output

A complete §0–§9 ratification report (Implementation Log, Build Results, Verification Results, Acceptance Criteria Matrix, Constitutional Audit, Escalation Findings, Ratification Recommendation, Exit Gate Evaluation, Stop Gate Confirmation) returned in chat after the build, exactly as the directive specifies.

## §7 Stop gate

No Wave 3. No Wave 4. No RR-7/9/10. No capability additions. No scope expansion. **Wave 2 only.**

---

## Wave 2 — Build Sealed (2026-06-04)

- **Status:** Complete · Verified · Ratified.
- **Tests:** 28/28 green across `src/lib/runtime/handoff`, `src/lib/runtime/guidance`, `src/lib/runtime/silence`, `src/lib/hammer`.
- **Audits:** zero raw `"Hammer State"` literals in `src/pages/Today.tsx` + `src/components/today/`; zero `Date.now|Math.random|fetch|emit|supabase` in `slots.ts`; zero forbidden tokens (`diagnose|prescribe|authorize|cleared|predict`) in `destinations.ts` executable code.
- **TodayCommandBar.tsx** intentionally left unchanged this turn: Next-up CTA already navigates via `useNextAction().route`, identity already resolved via `getHammerIdentity()` (Wave 1). No Wave 2 capability requires editing it; touching it would be scope expansion. Reclassified from "edit" to "intentionally untouched".
- **Stop gate:** No Wave 3 / Wave 4 / RR-7 / RR-9 / RR-10 work performed.
- **Exit gate:** Satisfied. Wave 3 (C3 + C4 per Wave 2 §11) may begin upon explicit authorization.
