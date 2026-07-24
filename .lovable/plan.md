## Owner demo-video page + "Landing Page" button on Auth

### 1. Owner-dashboard page for the landing demo video
Create `src/pages/owner/LandingDemoManager.tsx` that wraps the existing `<LandingDemoVideoManager />` (upload / URL / visibility toggle / remove) plus a preview via `<LandingDemoVideo />`, gated by `useOwnerAccess`.

Wire it into `src/App.tsx`:
- Lazy import alongside the other `owner/*` pages.
- Add route `/owner/landing-demo`.

Expose it in the owner navigation so it's reachable from the dashboard (add a link in whichever owner index/nav the other `/owner/*` pages appear in — will confirm the exact file when editing).

### 2. "Landing Page" button on the Welcome Back (Auth) screen
In `src/pages/Auth.tsx`, add a `Button` labeled "Landing Page" that calls `navigate("/")`. Place it near the top of the auth card so it's visible on the "Welcome Back" sign-in view.

### Notes
- No schema or RLS changes — reuses the `landing_demo_video` table, `landing-demo` bucket, and `useLandingDemoVideo` hook already shipped.
- The owner page renders nothing for non-owners (same guard the manager already uses).
