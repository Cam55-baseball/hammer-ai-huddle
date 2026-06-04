# Hammer Wave 1 — Execution Package

**Status:** Planning artifact. No production code, UI, prompts, schema, projections, emitters, or RR-7 / RR-9 / RR-10 activation produced by this document. Build execution of C1 + C7 begins **after** this package is ratified.

**Subordinate to:** Eternal Laws · Megaphase 151–160 · RR-5 (ratified) · RR-6 (ratified) · RR-8 (sealed) · Hammer Activation Phases 1–8 · Hammer Execution Constitution (Phase 8) · all prior immutable invariants across Phases 1–150.

This document converts the sealed Phase 8 Execution Constitution into the exact, ratifiable Wave 1 work package for **C1 — Name Disambiguation** and **C7 — Silence Enforcement**.

---

## §0 Scope Verification

Wave 1 contains **exactly two capabilities**:

- **C1 — Name Disambiguation** — Single canonical Hammer identity resolution across every athlete-visible, parent-visible, ledger, and notification surface. Doctrine: `docs/asb/hammer-name-disambiguation-constitution.md`.
- **C7 — Silence Enforcement** — Runtime primitive distinguishing **lawful silence** (constitutionally required absence) from **accidental silence** (missing presence Hammer should have filled). Doctrine: `docs/asb/hammer-execution-constitution.md` §3 (Organism State silence row) + Phase 6 §F zone matrix.

### Explicitly excluded (zero leakage permitted)

| Excluded | Reason |
|---|---|
| **C2 — Today Presence** | Wave 2. Forbidden until Wave 1 ratified. |
| **C3 — Onboarding Presence** | Wave 3. Forbidden until Waves 1–2 ratified. |
| **C4 — Parent Voice** | Wave 4. Forbidden until Waves 1–3 ratified. |
| **C5 — First Setback Guidance** | Wave 3. Forbidden until Waves 1–2 ratified. |
| **C6 — Navigation Handoff** | Wave 2. Forbidden until Wave 1 ratified. |
| **RR-7 Career Arc** | Sealed-only per `docs/asb/post-mastery-expansion-roadmap.md`. |
| **RR-9 Exposure & Visibility** | Sealed-only per `post-mastery-expansion-roadmap.md`. |
| **RR-10 Recruiter / Commercial** | Sealed-only per `post-mastery-expansion-roadmap.md`. |
| New Hammer personalities | Forbidden by Execution Constitution §5. |
| Parallel memory or authority surfaces | Forbidden by Execution Constitution §5. |
| Schema / projection / emitter changes | Out of scope. C1/C7 are pure substrate. |
| Athlete- or parent-visible behavioral change | Wave 1 is invisible-substrate per Master Plan §2. |
| Writes to `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, `rehabilitation_state` | Forbidden by Execution Constitution §5 and Megaphase 151–160. |

**Attestation:** Only C1 + C7. Zero capability additions. Zero scope expansion. Zero Wave 2–4 leakage.

---

## §1 File Impact Inventory

### Files planned to be touched

| # | Path | Reason | Capability | Dependency justification | Risk |
|---|------|--------|------------|--------------------------|------|
| 1 | `src/lib/hammer/identity.ts` *(new)* | Single canonical Hammer identity resolver. Pure, no I/O. Sole exported source of voice/brand/state labels. | C1 | Phase 6 §3: C1 must precede every other capability. Execution Constitution §3 single-Hammer-authority row. | Low (new file, no callers yet). |
| 2 | `src/lib/hammer/__tests__/identity.test.ts` *(new)* | Resolver shape + label invariants + forbidden-term absence + replay determinism. | C1 | Execution Constitution §6 verification gate. | Low. |
| 3 | `src/lib/runtime/silence/types.ts` *(new)* | Silence-zone primitive types: `SilenceZoneInput`, `SilenceVerdict = 'lawful' \| 'accidental' \| 'undefined'`, zone classes. | C7 | Phase 6 §F zone matrix requires a typed input contract. | Low (new file). |
| 4 | `src/lib/runtime/silence/classifier.ts` *(new)* | Pure `classifySilenceZone(input) → SilenceVerdict`. No `Date.now`, no `Math.random`, no network, no projection mutation. | C7 | Execution Constitution §3 Organism-State-silence row; replay-determinism row. | Low (new file). |
| 5 | `src/lib/runtime/silence/__tests__/classifier.test.ts` *(new)* | Every Phase 6 §F zone → expected verdict. Replay-stable across shuffled inputs at identical timestamps. Safeguarding precedence assertion. | C7 | Execution Constitution §6. | Low. |
| 6 | `src/components/hammer/HammerStateBadge.tsx` | Rename user-visible `Hammer State — {label}` → `Organism State — {label}` (and `aria-label`). Internal symbol `HammerStateBadge` retained as code-internal. | C1 | Phase 3 §2 forbidden term `Hammer State` in user-visible copy. | Low (UI string only). |
| 7 | `src/hooks/useWhyExplanation.ts` *(line 101)* | Replace user-visible logic string `Hammer State "{state}" derived from …` → `Organism State "{state}" derived from …`. | C1 | Phase 3 §2 forbidden term in transparency explanation surface. | Low. |
| 8 | `src/components/transparency/WhyExplanationSheet.tsx` *(line 17)* | Replace user-visible label `Why this Hammer State?` → `Why this Organism State?`. | C1 | Phase 3 §2 forbidden term in transparency sheet. | Low. |
| 9 | `src/pages/EngineHealthDashboard.tsx` *(lines 75, 89, 123)* | Replace operator-visible `Hammer State` strings with `Organism State` (cron card title, monitor description, pipeline diagram). | C1 | Phase 3 §2 forbidden term in operator-visible surface. | Low (operator UI; no athlete impact). |
| 10 | `.lovable/plan.md` | Append Wave 1 Execution Package entry. | governance | Constitution §4 audit trail. | None. |

### Files intentionally untouched

| Path / class | Why untouched |
|---|---|
| `src/branding.ts` | Already canonical per Phase 3 §1 (Brand Layer). No change required; resolver imports it. |
| `src/hooks/useHammerState.ts` (symbol name + `HammerStateSnapshot` interface) | Internal symbol only. Code-internal `HammerState` type names permitted per Phase 3 §2 (forbidden list scopes user-visible copy). User-visible string at line 35 doc-comment may remain; no athlete sees it. |
| `src/hooks/useEngineHealth.ts` | Internal field `lastHammerState` is operator-API-internal. User-visible label change happens in `EngineHealthDashboard.tsx` (row 9). |
| `src/lib/seasonPhase.ts` (`HammerState` type + `computeHammerState` fn) | Code-internal types. No user-visible string. |
| `src/components/today/TodayCommandBar.tsx` | Wave 2 surface. **Forbidden to touch in Wave 1.** Renames inside `HammerStateBadge` (row 6) flow through automatically. |
| All `src/pages/Today*`, all parent surfaces, all onboarding surfaces, all coach surfaces | Wave 2–4 sites. Forbidden. |
| `src/lib/runtime/projections/types.ts::prepareRows` (demo↔prod firewall) | Megaphase 151–160 invariant. Zero new bypass paths. |
| `supabase/functions/_shared/demoFirewall.ts` | Server-side firewall. Untouched. |
| `src/contexts/DemoModeContext.tsx` | Untouched. |
| All relational primitives (`src/lib/runtime/relational/**`) | Out of scope. |
| All `organism_truth` / `athlete_intent` / `authority_override` / `hard_stop` / `rehabilitation_state` writers | Constitutional firewall — Wave 1 substrate must never author. |
| Test files: `src/test/seasonWorkoutClamps.test.ts`, `src/test/seasonPhaseE2E.test.ts` | Use internal `computeHammerState` symbol; non-user-visible. |
| Supabase migrations / `config.toml` / edge functions | Out of scope. Zero migrations in Wave 1. |

---

## §2 Implementation Plan (ordered, no skipped steps)

### Step 1 — Author canonical Hammer identity resolver
- **Purpose:** Single source-of-truth for Hammer voice/brand/state labels (C1).
- **Files touched:** `src/lib/hammer/identity.ts` (new).
- **Shape:** Exported `HAMMER_IDENTITY` const + `getHammerIdentity()` pure accessor returning `{ id: 'hammer', voiceLabel: 'Hammer', brandLabel: 'Hammers Modality', organismStateLabel: 'Organism State', tagline }`. Imports `branding` from `src/branding.ts`. No `Date.now`, no `Math.random`, no I/O.
- **Verification:** TypeScript clean; module exports exactly one identity object.
- **Rollback risk:** None (additive new file, zero callers yet).

### Step 2 — Author silence-classification primitive
- **Purpose:** Runtime primitive distinguishing lawful from accidental silence (C7).
- **Files touched:** `src/lib/runtime/silence/types.ts` (new), `src/lib/runtime/silence/classifier.ts` (new).
- **Contract:** `classifySilenceZone(input: SilenceZoneInput): SilenceVerdict`. Pure. Phase 6 §F zone matrix encoded as exhaustive switch on `zone.kind`. Safeguarding-active → `lawful` (cannot be downgraded). Missing-data-dominant → `lawful`. Athlete-revoked-narrative → `lawful`. Unpopulated-surface-with-signal-present → `accidental`. Any unmatched zone → `undefined` (build-blocker per §4.1.4).
- **Verification:** Pure-module audit (no `Date`, no `Math`, no `supabase`, no `import.meta`).
- **Rollback risk:** None (additive; no consumers in Wave 1).

### Step 3 — Tests for resolver + classifier
- **Purpose:** Acceptance criteria §4.1.4–§4.1.5 enforcement.
- **Files touched:** `src/lib/hammer/__tests__/identity.test.ts`, `src/lib/runtime/silence/__tests__/classifier.test.ts`.
- **Assertions:** Identity → exactly-one-identity invariant, forbidden-term absence in any returned string, byte-stable across two cold runs. Classifier → every Phase 6 §F zone returns expected verdict, zero `undefined` verdicts on the matrix, safeguarding-active mapping immutable, deterministic output regardless of input ordering.
- **Verification:** `vitest run` green.
- **Rollback risk:** None.

### Step 4 — Rename user-visible "Hammer State" → "Organism State"
- **Purpose:** Eliminate Phase 3 §2 forbidden terms from user-visible copy (C1).
- **Files touched:** `src/components/hammer/HammerStateBadge.tsx`, `src/hooks/useWhyExplanation.ts`, `src/components/transparency/WhyExplanationSheet.tsx`, `src/pages/EngineHealthDashboard.tsx`.
- **Method:** Read identity resolver `organismStateLabel`; replace each forbidden literal string. Internal symbol names (`HammerStateBadge`, `useHammerState`, `HammerState` type) preserved.
- **Verification:** `rg "Hammer State|Hammer Readiness|Hammer Score" src/` returns only code-internal occurrences listed in §1 "intentionally untouched" rows (test files + internal types).
- **Rollback risk:** Low (string-only; reversible).

### Step 5 — Preflight + typecheck
- **Purpose:** Build-green gate.
- **Verification:** `bash scripts/preflight.sh` (if executable in env) + TS typecheck via harness.
- **Rollback risk:** None.

### Step 6 — Constitutional audit checklist (Execution Constitution §4 applied)
- **Purpose:** Manual sign-off across all 11 invariant rows.
- **Output:** Inline §3 attestation below filled with PASS/FAIL per row before merge.

**Steps must execute in order 1 → 6.** No skipping. Step 4 depends on Step 1's resolver. Step 3 depends on Steps 1 + 2.

---

## §3 Constitutional Verification

Per Execution Constitution §3, every Wave 1 change preserves:

| Invariant | Preservation argument |
|---|---|
| **RR-5 — no invented feelings / no fictional continuity** | Resolver returns labels only. Classifier emits verdicts only. Neither authors narrative, feelings, or continuity. No `narrative_event` emission in Wave 1. |
| **RR-5 — narrative revocability** | No narrative cached in Wave 1; revocability trivially preserved. |
| **RR-6 — no diagnosis, no prescription** | Classifier emits silence verdicts; never diagnoses. Resolver labels-only. |
| **RR-6 — athlete-reported pain outranks inferred readiness** | No readiness inference touched. No pain pathway modified. |
| **RR-8 — no coercive disclosure** | No new disclosure prompts added. Onboarding untouched. |
| **RR-8 — life context never authors organism truth** | Wave 1 code never reads life-context events; cannot author truth. |
| **Replay determinism** | Resolver + classifier are pure (no `Date.now`, no `Math.random`, no network, no live model). Test §5 asserts byte-identical output across two cold runs at pinned `engine_version`. |
| **Parent supremacy for minors** | No parent surface modified. C4 forbidden in Wave 1. |
| **Safeguarding precedence** | Classifier maps active-safeguarding zone → `lawful` and cannot be downgraded (test §5 enforces). |
| **Demo ↔ production firewall** | `src/lib/runtime/projections/types.ts::prepareRows` untouched. Zero new imports cross the boundary. Static audit in §5. |
| **Single Hammer authority (C1)** | Resolver is the sole identity authority. Grep audit in §4.1.3 enforces zero parallel resolvers. |
| **Organism State silence (C7)** | Renames preserve silence: Organism State remains a non-speaking biomarker chip. Classifier never causes Organism State to speak — it only classifies absence. |

---

## §4 Acceptance Criteria (measurable)

- **1.1** Every athlete-visible and parent-visible Hammer reference (voice label, brand label, Organism State label) resolves through `src/lib/hammer/identity.ts`. Audit: zero direct string literals for `'Hammer State'`, `'Hammer Readiness'`, `'Hammer Score'` in `src/**/*.{ts,tsx}` **outside** the resolver, its tests, and the code-internal exceptions listed in §1.
- **1.2** Zero occurrences of forbidden terms (`Hammer State`, `Hammer Readiness`, `Hammer Score`) in user-visible copy paths: UI strings, `aria-label`s, `src/lib/copy/**`.
- **1.3** Zero parallel identity resolution paths. Audit: `rg "voiceLabel\|brandLabel\|organismStateLabel"` shows only `src/lib/hammer/**`.
- **1.4** `classifySilenceZone` returns a defined verdict (`lawful` | `accidental`) for the **entire** Phase 6 §F zone matrix. **Undefined-verdict count must be 0.**
- **1.5** Replay-determinism test: identity + classifier output byte-identical across two cold runs at pinned `ENGINE_VERSION` from `src/lib/asb/engineVersion.ts` and `reasoning_version` per fixture convention.
- **1.6** Preflight (`scripts/preflight.sh` or harness equivalent) + TypeScript typecheck PASS.

---

## §5 Test Plan

| Category | Test | Required for ratification |
|---|------|---|
| **Unit (C1)** | `identity.test.ts` — exactly-one-identity invariant; label shape; no forbidden term in any returned string. | Yes |
| **Unit (C7)** | `classifier.test.ts` — every Phase 6 §F zone → expected verdict; zero `undefined`. | Yes |
| **Replay (C1+C7)** | Byte-identical output across two cold runs; shuffled-input invariance using `_fixtures.ts` pattern. | Yes |
| **Visibility** | Static import audit: `src/lib/runtime/silence/**` and `src/lib/hammer/**` do not import demo-only or production-only cross-boundary modules. `prepareRows` unchanged (git diff). | Yes |
| **Authority** | Grep audit: zero second-personality strings (`Coach Bot`, `Mentor`, `Assistant` in copy paths). | Yes |
| **Safeguarding** | Classifier test: active-safeguarding zone → `lawful`, cannot be downgraded by any other input flag. | Yes |
| **Regression** | Existing suites green: `src/lib/asb/invariants/__tests__/parity.test.ts`, `src/lib/ops/__tests__/wave2.test.ts`, `src/lib/runtime/relational/__tests__/relational-replay-reconstruction.test.ts`, Playwright `tests/demo/isolation.spec.ts`. | Yes |

---

## §6 Failure Analysis

| Failure | Detection | Correction | Stops execution? |
|---|---|---|---|
| **Identity drift** (caller missed → forbidden term ships) | §4.1.1 grep audit + §4.1.2 copy-path scan. | Add caller to resolver migration list; rerun Step 4. | Yes — Wave 1 cannot ratify until grep returns clean. |
| **Classifier non-determinism** | Replay test §5 fails. | Remove non-pure input (`Date.now`, `Math.random`, live read). | Yes — first non-deterministic verdict halts merge. |
| **Silence-zone undefined verdict** | §4.1.4 (any `undefined` halts merge). | Extend classifier to cover the zone OR extend Phase 6 §F matrix per Constitution §7 escalation. | Yes. |
| **Demo↔prod firewall breach** | Static import audit + Playwright `tests/demo/isolation.spec.ts`. | Remove cross-boundary import. | Yes — Megaphase 151–160 immediate halt. |
| **Safeguarding precedence breach** (classifier downgrades active safeguarding to `accidental`) | §5 safeguarding test fails. | Restore precedence rule in classifier. | Yes — Constitution §7 escalation. |
| **Parallel identity surface** (second Hammer personality emerges) | §4.1.3 audit + Constitution §5 anti-drift control. | Delete parallel surface; route through resolver. | Yes. |
| **Schema / projection / emitter mutation** (out-of-scope change) | Git diff scope check (no `supabase/migrations/**`, no `src/lib/runtime/projections/**`, no `src/lib/asb/emit*` touched). | Revert diff. | Yes — scope-lock breach. |

---

## §7 Ratification Requirements (three statuses, separately defined)

### Wave 1 Complete
- Steps §2.1 – §2.5 executed.
- All files in §1 "touched" rows modified as planned.
- All files in §1 "intentionally untouched" rows verified unmodified (`git diff` review).
- TypeScript build green; preflight green.

### Wave 1 Verified
- **Wave 1 Complete** holds, AND
- All §4 acceptance criteria 1.1 – 1.6 PASS.
- All §5 tests (Unit, Replay, Visibility, Authority, Safeguarding, Regression) PASS.
- Static audits return zero violations.

### Wave 1 Ratified
- **Wave 1 Verified** holds, AND
- Signed constitutional audit per Execution Constitution §4 — every row in §3 above attested PASS (RR-5, RR-6, RR-8, replay determinism, parent supremacy, safeguarding precedence, demo↔prod firewall, single Hammer authority, Organism State silence).
- Zero open Constitution §7-class escalations.
- `.lovable/plan.md` Wave 1 entry sealed.

---

## §8 Exit Gate (Wave 2 may begin iff)

All four conditions hold simultaneously:

1. **Wave 1 Ratified** status held per §7.
2. Identity resolver + silence classifier merged to the canonical branch.
3. `.lovable/plan.md` Wave-1 entry sealed (immutable record).
4. Per-render silence-zone classification observable (in test fixtures, not production UI) for the Today / Coach / Onboarding / Recovery / Parent route set so Wave 2 (C2 + C6) can consume verdicts immediately.

**Wave 2 build is forbidden until all four conditions hold simultaneously.** Any premature Wave 2 work triggers Constitution §7 escalation.

---

## §9 Stop Gate Confirmation

- No Wave 2 (C6, C2).
- No Wave 3 (C3, C5).
- No Wave 4 (C4).
- No RR-7.
- No RR-9.
- No RR-10.
- **Wave 1 (C1 + C7) only.**

This document is a planning artifact. Build execution begins after ratification.
