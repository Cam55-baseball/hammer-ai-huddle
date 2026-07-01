## Final E2E verification pass on the Lifts + Speed plan system

### Checks
1. **DB grants** — re-query `pg_class`/`aclexplode` for all five `wk_*` tables to confirm `authenticated` (CRUD, SELECT for periodization) and `service_role` (ALL) are still present.
2. **Edge function** — hit `wk-generate-daily` with the injected preview session; confirm it returns a plan and writes `wk_prescriptions` rows without permission errors.
3. **Client wiring** — spot-check `useWkDailyPrescriptions.ts`, `WkLiftsSpeedSection.tsx`, and `HammerDailyPlan.tsx` for: auto-generate gating, game-day suppression, CNS clamp using `effectiveCnsTotal`, ErrorBoundary wrap, and Regenerate button.
4. **Types** — run `tsgo` to confirm a clean typecheck.
5. **Verdict** — report 100% complete or list remaining gaps with the exact fix.