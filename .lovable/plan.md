
# Demo-Gated Onboarding System — Full Architecture

## 1. Goals & Non-Negotiables

- New users CANNOT reach `/select-modules` (paywall) until they pass through the Demo gate (view OR explicit skip).
- Demo is **non-functional** — every interaction is sandboxed, no DB writes, no real outputs.
- Resumable across refresh, logout, devices (server-side state).
- Schema-driven registry: new submodules added via one DB row, zero React refactor.
- Always-accessible globally via persistent "Demo" button (replaces today's StartHere).
- Existing `StartHereGuide` (profile setup) remains as **Step 0** — Demo is layered on top, not replacing.

---

## 2. Entry Points (exhaustive)

| # | Trigger | Behavior |
|---|---------|----------|
| 1 | First login w/ `demo_state ∈ {null, 'pending'}` | Hard redirect → `/demo` from any route except `/auth`, `/profile-setup` |
| 2 | "Start Here" button (existing) | Opens profile setup modal → on complete, routes to `/demo` |
| 3 | Persistent "Demo" button (new, in DashboardLayout header) | Opens `/demo` regardless of state; preserves return route in `?return=` |
| 4 | Re-entry after Skip | Same `/demo` route; resumes at last `current_node` |
| 5 | Mid-demo exit (refresh / nav-away) | On next app load, banner: "Resume your tour" → `/demo?resume=1` |
| 6 | Direct URL to gated route (`/select-modules`, `/pricing`) before demo done | Redirect to `/demo` with `?intent=upgrade` deep-link return |

Gate enforcement lives in a single `<DemoGate>` wrapper in `App.tsx` route tree.

---

## 3. Information Architecture

### Tier 1 — Demo Root (`/demo`)
3 cards (mirrors `TIER_CONFIG` in `src/constants/tiers.ts`):
- **5 Tool Player** — "Hit. Run. Field. Throw. Recover."
- **Complete Pitcher** — "Command the mound."
- **Golden 2-Way** — "Do it all. The Unicorn path."

Each card: icon, headline, one-line value, price, "Viewed" checkmark, "Explore" CTA.

### Tier 2 — Categories (`/demo/:tier`)
Defined per tier (initial set):

```
5tool     → hitting-power | speed | defense | player-care
pitcher   → arsenal | command | conditioning | recovery
golden2way→ unicorn-system | hitting-power | pitching | speed | defense | player-care
```

### Tier 3 — Submodules (`/demo/:tier/:category/:submodule`)
Initial registry (excerpt — full list in DB seed):

```
hitting-power → hitting-analysis | iron-bambino | tex-vision |
                royal-timing-audit | video-library | custom-cards |
                hammer-block-builder
speed         → speed-lab | base-stealing | baserunning-iq
defense       → throwing-analysis | drill-library | pickoff-trainer
player-care   → nutrition | regulation | vault
arsenal       → pitching-analysis | pitch-design | bullpen-planner
unicorn-system→ unicorn-engine | merged-block-builder
```

Each submodule renders an **interactive demo shell**: real component in read-only mode + watermark badge + locked CTA.

---

## 4. Demo Mode Logic ("for show only")

Single primitive: `<DemoModeProvider value={true}>`.

Behavior contract (enforced in 3 layers):
1. **Data layer** — All Supabase calls wrapped by `useDemoSafeQuery` / `useDemoSafeMutation`. In demo mode:
   - Reads → return seeded fixture from `/src/demo/fixtures/{module}.ts`.
   - Writes → no-op + toast "Demo mode — sign up to save".
2. **Component layer** — Components accept `demoMode` prop (default `false`); when true: disable destructive buttons, swap submit handlers with `noop`, show diagonal "DEMO" watermark via shared `<DemoWatermark>` overlay.
3. **Route layer** — `/demo/*` mounts a `DemoBoundary` that intercepts navigation away from demo subtree and redirects locked CTAs to `/demo/upgrade`.

Visual indicators: persistent top bar `"You're in Demo Mode — Exit / Upgrade"`, blurred zones for Elite-tier insights.

Transition demo → paid: any "Unlock" CTA → `/demo/upgrade?from={submodule}` → `/select-modules?context={submodule}` (post-checkout we keep attribution).

---

## 5. Navigation & Controls

- **Back button**: in `/demo/*`, every Back returns to `/demo` root, never the browser stack. Implemented via `useDemoNav()` (pushes single replace-state entries).
- **Progress**: top progress bar = `viewed_submodules / total_active_submodules`.
- **Skip Demo**: button in top-right of `/demo` root.
  - Confirmation modal: "Skip the tour? You can return any time from the Demo button."
  - Marks `demo_state = 'skipped'`, `demo_skipped_at = now()`. Does NOT mark submodules viewed.
  - Removes hard gate; user proceeds to `/select-modules`.
- **Resume**: server stores `current_node` (tier/category/submodule). Banner appears only if `demo_state = 'in_progress'`.

---

## 6. State Machine

```
        ┌───────────┐  first login   ┌────────────┐
        │   none    │───────────────▶│  pending   │
        └───────────┘                └─────┬──────┘
                                           │ enters /demo
                                           ▼
              skip                  ┌────────────┐  views all
        ┌────────────────◀──────────│ in_progress│──────────────┐
        ▼                           └─────┬──────┘              ▼
   ┌─────────┐                            │ exit mid-tour ┌──────────┐
   │ skipped │                            ▼               │completed │
   └────┬────┘                      (state persists)      └────┬─────┘
        │ reopens demo                                         │
        └────────────────▶ in_progress                         │
                                                               ▼
                                                     gate permanently lifted
```

Terminal states unlock `/select-modules`. Re-entry from `completed` is allowed (idempotent), no state regression.

---

## 7. Data Architecture

### New tables

```sql
-- Registry (seed-driven, no code deploys for new modules)
create table public.demo_registry (
  id uuid primary key default gen_random_uuid(),
  node_type text not null check (node_type in ('tier','category','submodule')),
  slug text not null,                 -- '5tool', 'hitting-power', 'iron-bambino'
  parent_slug text,                   -- null for tier
  title text not null,
  tagline text,
  icon_name text,                     -- lucide icon key
  component_key text,                 -- maps to <DemoComponentRegistry>
  display_order int not null default 0,
  is_active boolean not null default true,
  ab_variant text,                    -- for future A/B
  created_at timestamptz default now(),
  unique (node_type, slug)
);

-- Per-user progress
create table public.demo_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  demo_state text not null default 'pending'
    check (demo_state in ('pending','in_progress','skipped','completed')),
  current_node text,                  -- 'submodule:iron-bambino'
  viewed_submodules text[] not null default '{}',
  viewed_tiers text[] not null default '{}',
  skipped_at timestamptz,
  completed_at timestamptz,
  last_active_at timestamptz default now(),
  variant text,                       -- A/B bucket
  updated_at timestamptz default now()
);

-- Append-only telemetry
create table public.demo_events (
  id bigserial primary key,
  user_id uuid not null,
  event_type text not null,           -- view_node | skip | resume | unlock_click | exit
  node_slug text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
```

RLS:
- `demo_registry` — public read, admin write.
- `demo_progress` / `demo_events` — `user_id = auth.uid()` for select/insert/update.

Indexes: `demo_progress(demo_state)`, `demo_events(user_id, created_at)`.

### Existing fields touched
None destructively. `profiles.tutorial_completed` stays for the legacy 4-step Start-Here flow (profile setup); demo gating uses the new table.

---

## 8. Routing

```
/auth                          public
/profile-setup                 authed, pre-demo allowed
/demo                          authed, ANY demo_state
/demo/:tier                    authed
/demo/:tier/:category          authed
/demo/:tier/:category/:sub     authed
/demo/upgrade                  authed (interstitial → /select-modules)
/select-modules                gated: demo_state ∈ {skipped, completed}
/pricing                       gated (same)
/dashboard, /practice, ...     gated by subscription as today
```

`<DemoGate>` wrapper:
```
if (!user) → /auth
if (!profile.sport) → /profile-setup
if (demo_state === 'pending' && route !== '/demo*') → /demo
otherwise → render children
```

---

## 9. Component Hierarchy

```
src/
├─ pages/demo/
│  ├─ DemoRoot.tsx              # 3 tier cards
│  ├─ DemoTier.tsx              # category grid
│  ├─ DemoCategory.tsx          # submodule grid
│  ├─ DemoSubmodule.tsx         # mounts component from registry
│  └─ DemoUpgrade.tsx
├─ components/demo/
│  ├─ DemoGate.tsx              # route guard
│  ├─ DemoLayout.tsx            # top bar + back + progress + Skip
│  ├─ DemoCard.tsx
│  ├─ DemoWatermark.tsx
│  ├─ DemoLockedOverlay.tsx
│  ├─ DemoResumeBanner.tsx
│  └─ DemoComponentRegistry.ts  # component_key → lazy import
├─ contexts/DemoModeContext.tsx
├─ hooks/
│  ├─ useDemoProgress.ts        # CRUD on demo_progress (single source)
│  ├─ useDemoRegistry.ts        # cached registry fetch
│  ├─ useDemoSafeQuery.ts
│  └─ useDemoSafeMutation.ts
└─ demo/fixtures/               # static seeded data per submodule
```

`DemoComponentRegistry` is the only file edited when a new module is added — and even that can be eliminated by colocating each module's `Demo.tsx` and using a Vite glob import.

---

## 10. UX & Conversion Psychology

- **Curiosity loops**: Each submodule shows 60% of value, blurs the "elite payoff" (rankings, AI insights) behind `<DemoLockedOverlay/>` with a one-click upgrade CTA scoped to that feature.
- **Progressive disclosure**: 3 tiers → 4 categories → ~7 submodules. Never more than 7 choices on screen (Miller's law).
- **Loss aversion in skip**: confirmation copy mentions what they'll miss ("You haven't seen Iron Bambino yet").
- **Proof-of-value before paywall**: user lands on `/select-modules` already knowing exactly what each tier unlocks → reduces buyer's remorse + churn.
- **Frictionless re-entry**: persistent "Demo" button + resume banner = zero cognitive cost to come back.
- **Friction by design**: gate is mandatory but skippable in 2 clicks — meets compliance with "no dark patterns" while still funneling.

---

## 11. Edge Cases (all handled)

| Case | Resolution |
|------|-----------|
| Mid-demo refresh | `demo_progress.current_node` rehydrates on `/demo` mount |
| Skip then return later | Skip ≠ completed; banner offers resume; `viewed_submodules` preserved |
| Direct URL to locked submodule pre-auth | `/auth?redirect=/demo/...` |
| Direct URL to `/select-modules` while pending | `<DemoGate>` redirect with `?intent=upgrade` preserved across demo |
| Demo mutation attempt despite client guard | Edge function `demo-firewall` middleware rejects writes when `x-demo-mode: 1` header present; UI never sets it for real flows |
| New submodule added to DB | Registry hook auto-renders card; missing `component_key` shows "Coming Soon" tile (graceful degradation) |
| Removed submodule | `is_active = false` hides + filters from progress totals (no broken progress %) |
| User on multiple devices | Server-of-truth; conflict resolved by `last_active_at` (last-write-wins on `current_node`, set-union on `viewed_submodules`) |
| Demo component crash | `<ErrorBoundary>` per submodule shows fallback + "Skip this preview" |

---

## 12. Future-Proofing

- **New submodule** = 1 SQL insert + 1 React file (or zero with glob import). No router edit.
- **A/B testing**: `demo_progress.variant` assigned at first `/demo` visit via deterministic hash of `user_id`; registry filtered by `ab_variant`.
- **Personalized paths**: registry can be filtered server-side by `profiles.positions` / `sport`. Add `target_filter jsonb` column later — backward compatible.
- **No core refactor required** ever — registry + component_key indirection is the seam.

---

## 13. Failure Points & Mitigations

| Risk | Mitigation |
|------|-----------|
| Demo write leaks to prod tables | Edge-side `demo-firewall` + RLS policy denial when JWT custom claim `demo_mode = true` (set client cannot forge — set via dedicated demo session token) |
| Registry drift vs components | CI check: every active `component_key` must resolve in registry map; fail build otherwise |
| Gate bypass via client manipulation | Subscription edge functions reject checkout when `demo_state = 'pending'` |
| Slow registry fetch blocks gate | Registry cached in `localStorage` with 24h TTL; gate uses cached value optimistically |
| User stuck in pending forever (bug) | Cron job: if `demo_state='pending'` AND `created_at > 7d` → auto-promote to `skipped` with audit log |

---

## 14. Implementation Order (post-approval)

1. Migration: `demo_registry`, `demo_progress`, `demo_events`, RLS, seed data for current modules.
2. `DemoModeContext`, `useDemoProgress`, `useDemoRegistry`, safe query/mutation hooks.
3. `<DemoGate>` wrapper inserted in `App.tsx` above subscription routes.
4. `DemoLayout` + 4 demo pages (`Root`, `Tier`, `Category`, `Submodule`).
5. `DemoComponentRegistry` + first 5 submodule demo shells (Hitting Analysis, Iron Bambino, Speed Lab, Pitching Analysis, Vault).
6. Persistent "Demo" button in `DashboardLayout` header (replaces / supplements Start Here).
7. Resume banner + Skip flow + telemetry.
8. Edge `demo-firewall` middleware + RLS denial-on-claim.
9. Backfill remaining submodule demo shells iteratively (each is ~1 PR).

No changes to existing subscription, auth, or feature code beyond inserting the gate and the safe-query wrappers at the demo boundary.
