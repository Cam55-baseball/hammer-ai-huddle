
# Demo-Gated Onboarding — Finalization Plan

This plan closes every gap in the current Demo system and ships a true "for show" experience that's safe, interactive, conversion-optimized, and infinitely extensible.

---

## Phase 1 — Critical System Fixes

### 1. Real Demo Isolation Layer

**Problem:** `DemoModeContext` is a boolean with no enforcement. A demo component could still hit Supabase.

**Fix:**
- Replace `DemoModeContext` with a richer shape:
  ```ts
  { isDemo: boolean; isPreview: boolean; tier?: string; submodule?: string }
  ```
- Add `src/hooks/useDemoSafeQuery.ts` and `useDemoSafeMutation.ts`:
  - In demo mode, `useDemoSafeQuery(key, fixtureLoader)` returns seeded data from `src/demo/fixtures/<key>.ts`, never touches Supabase.
  - `useDemoSafeMutation` is a no-op that resolves with a synthetic response and logs a `demo_events` row (`event_type: 'sim_write_blocked'`).
- Add `src/demo/guard.ts` with `assertNotDemo(ctx)` for any direct supabase call inside a demo shell — throws in dev, silently no-ops in prod.
- Server-side firewall: new edge function middleware `supabase/functions/_shared/demoFirewall.ts` rejects writes when JWT custom claim `demo=true` is present (set client-side via a `is_demo_session` header that edge functions inspect; reject mutations to user data tables).

**Integration pattern (every demo shell):**
```tsx
const { isDemo } = useDemoMode();
const { data } = useDemoSafeQuery('hitting.swings', loadHittingFixtures);
const save = useDemoSafeMutation(realSaveFn);
```

### 2. Interactive Simulated Previews (3 reference shells)

Replace `DemoComingSoon` for the highest-value submodules. All shells live in `src/components/demo/shells/` and register in `DemoComponentRegistry.ts`.

**a. `HittingAnalysisDemo.tsx`**
- User picks pitch type + contact zone (chips).
- Local deterministic engine (`src/demo/sims/hittingSim.ts`) returns an Exit Velo, Launch Angle, Bat Path Score, and a 0–100 "Swing IQ".
- Shows a sample 3-frame swing strip with annotations; the "Elite Insight" panel is blurred with an Unlock CTA.

**b. `IronBambinoDemo.tsx`**
- 3-step mock builder: pick goal → pick days/wk → pick experience.
- `programSim.ts` returns a 7-day mock plan with sets/reps; one day is locked behind upgrade.

**c. `VaultDemo.tsx`**
- Thumbnail grid (static assets in `public/demo/vault/`); 2 unlocked previews, rest blurred with a Lock badge.
- Tapping a locked tile fires `view_locked` event and routes to `/demo/upgrade?from=vault`.

**Reusable simulation engine pattern** (`src/demo/sims/simEngine.ts`):
```ts
export interface DemoSim<I, O> { id: string; run(input: I, seed?: number): O }
```
Deterministic via a small seeded PRNG so previews are stable across reloads (good for screenshots and trust).

### 3. Demo Completion Engine

**Rules (hard-coded constants in `src/demo/completionRules.ts`):**
- `MIN_TIERS_VIEWED = 2`
- `MIN_CATEGORIES_VIEWED = 2`
- `MIN_SUBMODULES_VIEWED = 4`

**Implementation:**
- New DB column on `demo_progress`: `viewed_categories text[]` (migration).
- `useDemoProgress.markViewed` updates submodules + parent category + parent tier.
- New selector `useDemoCompletion()` returns `{ pct, isComplete, missing: { tiers, categories, submodules } }`.
- Visual bar in `DemoLayout` switches from `viewed/total` to weighted % based on the three thresholds.
- When `isComplete` first becomes true: auto-call `complete()`, fire confetti, route to `/demo/upgrade?reason=complete` with copy *"You've seen enough to choose."*

### 4. Conversion-Safe Skip

Replace current "Skip the tour?" dialog with a 2-step modal (`SkipDemoDialog.tsx`):
- **Step 1 — Loss-framed copy:** *"Skipping means you'll choose your plan blind. The demo is what tells you which tier fits."*
- Buttons: `Keep exploring` (primary) | `I'll skip anyway` (ghost).
- **Step 2 (only if confirmed):** *"We'll keep your spot. You can resume anytime from the Demo button."*
- On confirm: set `demo_state='skipped'`, but persist `incomplete=true` flag. Allow `/pricing` and `/select-modules` access.
- **Nudge system:** `src/components/demo/SkipNudgeBanner.tsx` shows on Pricing/Checkout if `skipped && !completed`: *"You skipped the demo — see what fits in 60 seconds."* with `Resume demo` CTA.

### 5. Start Here vs Demo (UX split)

- **Start Here** = guided, sequential, recommended path. Route: `/start-here`. Wraps demo nodes in a step-runner that auto-advances via `Next →` and prevents tier-jumping. Shows a numbered stepper.
- **Demo** = free exploration. Route stays `/demo`. Tile-based, jump anywhere.
- Both write to the **same** `demo_progress` table — completion engine is shared.
- `DemoGate` first-time users land on `/start-here`; the `/start-here` header has a **"Just let me explore"** link that flips to `/demo`.
- Header `DemoButton` becomes a split: `Start Here` (if not started) → `Resume Demo` (if in_progress) → `Explore` (if completed/skipped).

---

## Phase 2 — System Intelligence

### 6. Master Taxonomy

`demo_registry` already supports tier → category → submodule. Lock the contract:
- Migration adds `requires_features text[]` (for future gating like `requires_features={'ai_chat'}`) and `min_app_version text`.
- Seed full catalog (one migration) for all 3 tiers × every category × every real submodule (Hitting, Pitching, Throwing, Iron Bambino, Tex Vision, Heat Factory, Speed Lab, Ask the Coach, Vault, Unicorn, etc.).
- Documented add-flow in `src/demo/README.md`: insert row → optional add component to `DemoComponentRegistry` → done. Zero code changes for non-interactive previews.

### 7. Psychological Flow

Hard-wired into the components:
- **Curiosity loop:** every shell shows ~60% of value, then a blurred "Elite Insight" with `Sparkles` Unlock CTA.
- **Progressive reveal:** Start Here sequences tier 1 → 2 → 3 in ascending price; each tier ends on its strongest feature.
- **Friction removed:** no auth re-prompts, instant fixtures, deterministic outputs (no spinners > 200ms).
- **Friction added (intentional):** locked tiles, blurred panels, Upgrade modal at end of each tier.
- **Strategic prompts:** Upgrade CTA appears (a) after 2nd submodule, (b) on completion, (c) after viewing a locked tile.

### 8. Recommended Path

- Add `is_recommended boolean` and `recommended_order int` to `demo_registry`.
- `DemoTier` page shows a "⭐ Most athletes start here" ribbon on the recommended category.
- Start Here uses `recommended_order` to sequence; users can override via `Demo` mode.

---

## Phase 3 — Architecture Hardening

### 9. State Machine

Formalize in `src/demo/stateMachine.ts`:
```text
pending ──start──▶ in_progress ──explore──▶ exploring
   │                    │                       │
   │                    └──skip──▶ skipped ◀────┘
   │                    └──meets thresholds──▶ completed
   └──skip──▶ skipped
```
- `exploring` = `in_progress` after first submodule viewed (used to suppress Start Here re-entry).
- Transitions enforced in `useDemoProgress.update()`; invalid transitions throw + log to `demo_events`.
- Resume logic: `current_node` is restored on login on any device.

### 10. Edge Cases

| Case | Handling |
|---|---|
| Page refresh mid-demo | `current_node` restored from `demo_progress`; `DemoGate` re-routes there |
| Exit and return | `Resume Demo` button in header; landing page banner if `in_progress` |
| Direct URL to `/pricing` while `pending` | `DemoGate` redirects to `/start-here?intent=...` |
| Direct URL to a `/demo/:tier/:cat/:sub` that doesn't exist | `DemoSubmodule` shows "Preview not found" + back link |
| New feature added later | New `demo_registry` row auto-appears; `total` denominator updates; existing completed users keep `completed` (we don't downgrade) |
| Demo write leak | `useDemoSafeMutation` + edge `demoFirewall` middleware double-block |
| Multiple tabs | `BroadcastChannel('data-sync')` already used project-wide; emit `demo:progress` so progress bars stay in sync |
| Auth race on first load | `DemoGate` waits for `isAuthStable` before redirect |
| Crashed shell | `ErrorBoundary` per submodule with `Skip this preview` button that marks viewed and returns home |

### 11. Routing & Guards

```text
/start-here                        → guided runner (gate: authed)
/demo                              → free explore
/demo/:tier
/demo/:tier/:category
/demo/:tier/:category/:submodule
/demo/upgrade                      → CTA page
/select-modules, /pricing, /checkout → DemoGate redirects if state=pending
```
- `<DemoGate>` wraps `<App>` routes (already in place); extend `GATED_PREFIXES` to include `/dashboard` for first-session users only (allow if `state ∈ {skipped, completed, in_progress}`).
- Edge function middleware `_shared/demoFirewall.ts` rejects writes from headers flagged `x-demo-session: 1`.

### 12. Expansion Model

- **New submodule:** insert `demo_registry` row. Component optional.
- **A/B test:** `ab_variant` column already exists. `useDemoRegistry` filters by `variant` from `demo_progress.variant` (assigned at first load via 50/50 hash of `user_id`).
- **Personalized paths (future):** `recommended_order` can be overridden by a future `demo_personalization` table keyed on (sport, position, age_band) without breaking current schema.

---

## Technical Section

**DB migration (`20260505_demo_finalization.sql`):**
```sql
ALTER TABLE demo_progress
  ADD COLUMN viewed_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN incomplete boolean NOT NULL DEFAULT false,
  ADD COLUMN resume_path text;

ALTER TABLE demo_registry
  ADD COLUMN is_recommended boolean NOT NULL DEFAULT false,
  ADD COLUMN recommended_order int,
  ADD COLUMN requires_features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN min_app_version text;
```
+ seed inserts for the full catalog and recommended flags.

**New files:**
- `src/contexts/DemoModeContext.tsx` (replaced — richer shape)
- `src/hooks/useDemoSafeQuery.ts`, `useDemoSafeMutation.ts`, `useDemoCompletion.ts`
- `src/demo/{completionRules,stateMachine,guard,README}.ts`
- `src/demo/fixtures/{hitting,ironBambino,vault}.ts`
- `src/demo/sims/{simEngine,hittingSim,programSim}.ts`
- `src/components/demo/shells/{HittingAnalysisDemo,IronBambinoDemo,VaultDemo}.tsx`
- `src/components/demo/{SkipDemoDialog,SkipNudgeBanner,RecommendedRibbon}.tsx`
- `src/pages/start-here/StartHereRunner.tsx` + route
- `supabase/functions/_shared/demoFirewall.ts`

**Edited:**
- `App.tsx` (add `/start-here`, extend gate)
- `DashboardLayout.tsx` (split Start Here / Resume button)
- `DemoLayout.tsx` (weighted progress, recommended ribbon)
- `DemoSubmodule.tsx` (per-shell ErrorBoundary skip action)
- `DemoComponentRegistry.ts` (register 3 shells)
- `useDemoProgress.ts` (categories, state-machine guard, completion auto-trigger)
- `useDemoRegistry.ts` (variant filter, recommended sort)

---

## Weaknesses Fixed (audit)

| Old weakness | Fix |
|---|---|
| `DemoModeProvider` was a no-op flag | Real isolation via safe query/mutation hooks + edge firewall |
| All shells were "Coming Soon" | 3 deterministic interactive shells + reusable sim engine |
| Completion was viewed-count only | Multi-axis rule (tiers+categories+submodules) with weighted % |
| Skip was 1-click escape | 2-step loss-framed dialog + persistent nudge banner |
| Start Here and Demo were the same thing | Two distinct entry points sharing one progress backend |
| Registry only listed seed examples | Full catalog seeded + add-flow documented |
| No state machine — ad-hoc state writes | Formal transitions enforced + logged |
| No A/B / personalization hook | `ab_variant` + `recommended_order` wired through registry |
| No write protection if a real component leaked in | Client guard + server `demoFirewall` |
| Multi-tab progress drift | `BroadcastChannel('data-sync')` event for `demo:progress` |

Approve to implement.
