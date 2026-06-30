# Full-App Audit — Part 2 (2026-06-30)

## Primary fix: eviction-proof the session

User report: signed-in, kicked to `/auth` while exploring. Root cause was
that `AuthContext` cleared `user` after a **single** `getSession()` check
following a `SIGNED_OUT` event — but `SIGNED_OUT` fires spuriously from
401-on-stale-WS, multi-tab races, and token-refresh blips on mobile.

### Shipped

| Layer | Change |
|---|---|
| `src/lib/auth/canEvict.ts` (new) | Single shared gate: blocks eviction when tab hidden, offline, typing, persisted token on disk, or within 10s of a `TOKEN_REFRESHED`. |
| `src/contexts/AuthContext.tsx` | `scheduleVerifiedSignOut` now: defers via `canEvictNow()`, tries up to 3 retries with 1/2/4s backoff, calls `refreshSession()` while a persisted token exists, and only clears `user` after all of that. `TOKEN_REFRESHED` notes timestamp so the gate suppresses immediate downstream `SIGNED_OUT`s. |
| `src/hooks/useRequireAuth.ts` | Grace 1.5s → 5s. Requires **two** failed `getSession()` checks 1.5s apart, then a final `refreshSession()` attempt, then a final `canEvictNow()` recheck before redirecting. |
| `scripts/check-eternity-guards.sh` | New guard: raw `supabase.auth.signOut()` outside `AuthContext` is forbidden. |

A missed redirect is recoverable. A false eviction mid-session is not. The
guard is intentionally conservative.

### Verified
- `tsgo --noEmit` clean.
- `scripts/check-eternity-guards.sh` PASSED.
- All 30+ page-level `navigate('/auth')` callers gate on `!user`, and `user`
  is only set to `null` after the verified-sign-out path above. Page callers
  therefore inherit the hardened guarantee without per-file edits.

## Deferred (explicit; not silently changed)

These remain open and should be picked up in a dedicated wave — each needs
either schema work, content authoring, or design polish beyond a bug fix:

1. **RLS + GRANT linter sweep across all 200+ public tables.** Run
   `supabase--linter` and triage. Many `gp_*`/`iq_*` tables show only 1
   policy — confirm intentional (security-definer reads) vs. broken.
2. **Edge-function heartbeat audit.** `analyze-video` heartbeats; apply
   the same pattern to `import-schedule`, `gp-document-ingest`,
   `ask-hammer`, and IQ generation via a shared `withHeartbeat()` helper.
3. **Loggers UX parity polish.** Defense/Baserun/Sub still lack the
   inline-pitches keyboard shortcuts AtBat/Pitch have.
4. **GP signal → roadmap per-skill deltas.** `useRoadmapProgress` reads
   the aggregate bias but not per-skill game-shaped weights.
5. **Side-context coverage gaps.** Heat maps in `GameReports.tsx` and
   `gp_at_bats` filters don't yet split L/R.
6. **Calendar image-paste timeout UX.** Ceiling is 45s; surface a
   "took too long, try fewer items" state.
7. **Onboarding resume deep-link.** Banner should jump to injury-intake
   when that's the missing step, not the generic resume point.

## Re-run

```bash
bash scripts/preflight.sh
bash scripts/check-eternity-guards.sh
bunx tsgo --noEmit
```
