# Finish Wave 1 — Athlete Runtime Productization

All core surfaces, primitives, projection logic, and event wrapper already exist. Remaining work is integration + verification only. No new doctrine, schema, or runtime authority.

## Remaining tasks

### 1. Route wiring (`src/App.tsx`)
- Lazy-import `Today` and `TodaySession`.
- Add routes:
  - `/today` → `<Today />`
  - `/today/session/:id` → `<TodaySession />`
- Place behind existing auth gate alongside other athlete routes.

### 2. Coach Console integration (`src/pages/CoachConsole.tsx`)
- Mount `ReadinessDistributionStrip` at top of the roster overview.
- Mount `OverrideVisibilityQueue` in the operational rail next to `EscalationQueue` / `MissingSignalQueue`.
- No layout rewrite — additive insertion only, using existing grid slots.

### 3. Parity validator extension (`src/lib/asb/invariants/asbCrossSystemValidators.ts`)
- Add `validateRuntimeProjection(asbRow, prescription)`:
  - `prescription.confidence <= asbRow.confidence` (never amplified)
  - `prescription.missingness` ∈ canonical `MISSINGNESS_STATES`
  - escalate/recovery state must trace to readiness/fatigue/recovery lineage refs present on the row
- Register in `asbParityMatrix.ts` and `asbInvariantChecks.ts` so CI runs it.
- Add unit tests in `src/lib/asb/invariants/__tests__/parity.test.ts` (extend existing file).

### 4. Grep guard update (`scripts/check-invariants.sh`)
Forbid in `src/pages/Today*.tsx`, `src/components/runtime/**`:
- direct `supabase.from(...).insert(` on the ASB ledger table
- imports from `@/lib/asb/replay` or ledger writers
Only `emitRuntimeEvent` / `emitAsbEvent` may write.

### 5. E2E scaffold (Playwright, optional minimal)
- `tests/e2e/today.spec.ts`: load `/today`, assert PulseStrip + PrescriptionCard render with TrustFooter visible.
- `tests/e2e/today-session.spec.ts`: start a session block, assert event emission via network spy.
- Skip if Playwright isn't already configured — fall back to a Vitest render smoke test.

### 6. Final pass
- Run `bun test src/lib/runtime src/lib/asb/invariants`.
- Run `scripts/check-invariants.sh`.
- Update `.lovable/plan.md` marking Wave 1 closed.

## Files touched

Edited: `src/App.tsx`, `src/pages/CoachConsole.tsx`, `src/lib/asb/invariants/asbCrossSystemValidators.ts`, `src/lib/asb/invariants/asbParityMatrix.ts`, `src/lib/asb/invariants/asbInvariantChecks.ts`, `src/lib/asb/invariants/__tests__/parity.test.ts`, `scripts/check-invariants.sh`, `.lovable/plan.md`.

Created: 1–2 lightweight smoke/E2E test files.

Zero migrations. Zero edge functions. Zero new tables. Zero new doctrine.
