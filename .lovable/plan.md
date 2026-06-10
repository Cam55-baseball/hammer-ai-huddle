# Plan — Finish Report Card Integration + Stop Analyze Eject

## A. Fix the Analyze eject (highest priority)

Root cause is in `src/pages/AnalyzeVideo.tsx` lines 163–199:

1. `useEffect(() => { refetch(); }, [refetch])` re-runs the subscription check on every mount/focus.
2. The access guard runs as soon as `subLoading=false && initialized=true`, but during the refetch transition `subscribedModules` can briefly be `[]`, so `hasAccessForSport(...)` returns false → `navigate("/dashboard", { replace: true })`.
3. During the same window, `onAuthStateChange` can fire a transient null session (e.g. after `TOKEN_REFRESHED` with a stale tab), which combined with the guard sends users to `/auth`.

Fix — keep behavior, eliminate the false-positive redirects:

- **Owner/Admin short-circuit before access check.** If `isOwner || isAdmin`, skip the `hasAccess` branch entirely (currently the value is computed but the guard still depends on `subscribedModules` arriving).
- **Require a non-empty, settled subscription snapshot before denying.** Only call `navigate("/dashboard")` when `initialized && !subLoading && subscribedModules !== null && subscribedModules.length >= 0` AND a second-tick confirmation still shows no access (use a `useRef` "deny candidate" + 400 ms grace timer that is cleared if `hasAccess` flips true).
- **Stop the auth bounce.** Replace `if (!user && !session) navigate("/auth")` with: only redirect when `!authLoading && isAuthStable && !session && !user` AND a 250 ms re-check still shows no session. Skip the redirect entirely while `document.visibilityState === 'hidden'` (prevents tab-switch evictions).
- **Drop the unconditional `refetch()` on mount.** The subscription hook already initializes itself; the forced refetch is what makes the guard race. Keep refetch only on explicit user action (e.g. after returning from Checkout via a `?refresh=1` query param).
- **Preserve scroll/upload state across the guard re-run** by gating the access useEffect on a stable dependency list (remove `refetch` and the recomputed `hasAccessForSport` identity churn — wrap the check in a `useMemo`).

Acceptance: uploading a video, switching tabs, or letting the page idle for 60 s never navigates away. Verified by watching console (the existing `console.log('AnalyzeVideo - …')` lines stay, but no `navigate(...)` fires unless access is truly absent).

## B. Cross-app surfaces

1. **CoachAthleteDetail** — in the per-session card, when `ai_analysis.metrics` exists for a video, render `<HammerReportCard metrics={…} contractId={…} compact />` (new `compact` prop = ribbon + phase rail only, tiles collapsed behind "View tiles"). If `metrics` is null but `feedback` exists, show `<RecomputeReportCardButton />` inline.
2. **Library** (`src/pages/Vault.tsx` video detail) — same treatment: full `HammerReportCard` when metrics present, recompute button otherwise.
3. **ProgressDashboard** — add `ReportCardTrendStrip` (new) directly under the existing header, above "Recent Analyses". Strip = last 8 sessions as foil-grade chips (A–F) with sparkline + non-negotiable pass-rate bar. New hook `useReportCardTrend(userId, module, limit=8)` reads `ai_analysis` rows ordered by `created_at desc`.
4. **Monthly / Vault Recap** — new `ReportCardRecapBlock` aggregating: average letter grade, NN pass-rate %, top 3 regressed tiles (lowest avg score across the period). Wired into the existing recap render path.

## C. Spectacle polish

1. **Mount stagger** in `HammerReportCard.tsx`: Framer-motion sequence — ribbon (0 ms) → phase rail (120 ms) → tiles (staggered 60 ms each). Use `useReducedMotion()` to collapse to instant fade for accessibility.
2. **Reduced-motion guard** across `FoilGradeCard`, `RadialMeter`, `PhaseRail` — disable foil-sweep, tilt parallax, and count-up; render final state immediately.
3. **Share-card PNG export** — new `src/components/report-card/hammer/visuals/ShareCardExport.tsx` using `html-to-image` (bun add). 9:16 1080×1920 PNG, athlete name + date watermark (toggleable, default ON). Triggered by a Share button beside the Recompute button. Downloads + (if `navigator.share` available) opens native share sheet.
4. **Print stylesheet** in `src/index.css` so the card prints cleanly on one page (kills tilt transforms, forces light bg).

## D. Out of scope (explicit)

- SB windmill / throwing / SH visual variants (Hammer hitting only this pass).
- Realtime tile updates during analysis stream.
- Any DB schema changes (recompute writes existing `ai_analysis.metrics` field).

## Files

**New**
- `src/hooks/useReportCardTrend.ts`
- `src/components/progress/ReportCardTrendStrip.tsx`
- `src/components/recap/ReportCardRecapBlock.tsx`
- `src/components/report-card/hammer/visuals/ShareCardExport.tsx`

**Edited**
- `src/pages/AnalyzeVideo.tsx` (auth/access guard hardening — A)
- `src/components/report-card/hammer/HammerReportCard.tsx` (compact prop, mount stagger, Share button)
- `src/components/report-card/hammer/visuals/{FoilGradeCard,RadialMeter,PhaseRail}.tsx` (reduced-motion guard)
- `src/pages/CoachAthleteDetail.tsx`, `src/pages/Vault.tsx`, `src/pages/ProgressDashboard.tsx` (surface integration)
- Existing recap renderer (wire `ReportCardRecapBlock`)
- `src/index.css` (print styles)

**Dependency**: `bun add html-to-image`
