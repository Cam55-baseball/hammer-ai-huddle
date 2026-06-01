# Final Publish Checklist

Pre-publish verification for the Hammers Modality relational organism demo.
Canonical presentation surface: **`/relational/demo?fallback=fixture`**.

## Environment

- [x] `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` present (auto-injected).
- [x] No `localhost` / `127.0.0.1` / bare `http://` strings in the relational surface (audit clean).
- [x] No hardcoded dev URLs in `src/components/relational/**`, `src/pages/RelationalDemo.tsx`, `src/lib/runtime/**`, `src/lib/relational/**`, or relational hooks.

## Mobile viewport

- [x] 440×782 (current preview) — choreography Begin → 9 steps stable; no clipping, no overflow.
- [ ] 390×844 (iPhone) — spot-check before going live; same layout class so expected to pass.

## Fallback (fixture mode)

- [x] `?fallback=fixture` short-circuits `useAsbTimeline` to `buildDemoSeed()` (verified in `src/hooks/useAsbTimeline.ts`).
- [x] Zero Supabase calls on the fixture route (timeline hook is the sole DB reader; fixture branch returns synchronously).
- [x] Fixture rows carry `visibility_scope: "demo"` and are firewalled out of `"self"` scope by `prepareRows`.

## Routes

- [x] `/relational/demo` reachable.
- [x] `/relational/demo?fallback=fixture` reachable — **canonical presentation URL**.
- [x] `/relational/demo?fallback=fixture&presenter=1` reachable — presenter overlay loads (gated).
- [x] `?debug=1` chips gated; absent by default.
- [x] `PresenterOverlay` only rendered when `presenter === true` (verified at `RelationalDemo.tsx:158`).

## Auth safety

- [x] Fixture route uses fallback athlete UUID when unauthenticated — no redirect, no auth modal.
- [x] No relational component performs direct `supabase.from(...)` (audit clean).
- [x] RLS unaffected: fixture mode never touches the DB.

## Production build

- [x] Type-check passes (prior pass: `tsc --noEmit` clean).
- [x] Test suite: 80/80 relational tests passing.
- [x] Bundle builds without errors.

## Demo route walkthrough

- [x] Begin → step 1 (Today) → step 9 (Proof) completes without crash.
- [x] Back navigation stable across all steps.
- [x] Cold-refresh on any step rebuilds projections deterministically (state machine reseeds from `stepIdx` default; ledger is fixture).

## Rollback

If the live URL is unstable mid-camp:

1. **First fallback:** switch to `?fallback=fixture` URL (always works offline).
2. **Second fallback:** revert to the previous publish via Lovable version history
   (Publish panel → previous deployment).
3. **Last resort:** narrate the demo from screenshots in
   `/mnt/documents/launch-smoke/` (captured during pre-launch rehearsal).

**Do NOT** attempt live DB seeding mid-camp — the 13 `relational.*` topics are
not yet registered in `asb_topic_registry` (tracked as backlog item #1).
