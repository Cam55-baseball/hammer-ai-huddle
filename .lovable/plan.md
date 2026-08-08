# Lock Game IQ 101 behind a "Coming soon" screen

Game IQ 101 gets fully closed to athletes on every plan that includes it. Owners keep full access for authoring and testing. Baserunning IQ stays live and untouched.

## What users will see

- Tapping Game IQ anywhere in the app opens a single locked screen: a construction/lock icon, "Under construction and coming soon!", a short line saying the module is being finished and will unlock for their plan automatically, and a Back button.
- No lessons, situations, review queue, or diamond animations render — nothing is fetched.
- Game IQ links stay visible in the sidebar, on the Five Tool and Golden 2Way tier pages, and on the Progress dashboard, each marked with a small "Coming soon" badge and muted styling so it's clearly not broken.
- The Progress dashboard's Game IQ insight card becomes a static "Coming soon" tile instead of showing weakest-lens data or a "Start reps" button.

## Owner behavior

Accounts with the active owner role bypass the lock and see the real Game IQ module and all authoring tools exactly as today.

## Technical notes

- New `src/pages/GameIqComingSoon.tsx` (or a small `GameIqLock` wrapper component) rendering inside `DashboardLayout`.
- Gate applied in `src/App.tsx` for `/iq`, `/iq/review`, and `/iq/:slug`: wrap each element in a guard that reads `useOwnerAccess()`; while loading show a skeleton, non-owners get the coming-soon screen, owners get the existing page. Owner authoring routes under `/owner/iq*` are unaffected.
- Because the guard sits above the page components, the IQ data hooks (`useIqSituations`, `useIqProgress`) never mount for non-owners, so no queries fire.
- Entry-point badges: `src/components/AppSidebar.tsx` Game IQ item, the `game-iq` entries in `src/pages/FiveToolPlayer.tsx` and `src/pages/GoldenTwoWay.tsx`, and `src/components/progress/IqInsightCard.tsx`.
- No database, subscription-tier, or edge-function changes — the lock is presentation-layer only and reverses by removing the guard when the module ships.
