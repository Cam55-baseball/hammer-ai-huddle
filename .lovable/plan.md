# Restrict Coach/Scout demo cards to scout/coach signups

## Goal
The **Ask the Coach** and **Scout Feed** demo cards (and their parent **For Your Team** category) should only render for users whose signup role is Scout or Coach. Player signups should not see them at all.

## How role is known today
- `localStorage.userRole` — `'player' | 'scout'` (set in `SelectUserRole.tsx`)
- `localStorage.selectedRole` — `'Player' | 'Scout/Coach' | 'Admin'` (set in `SelectRole.tsx`)
- `user_roles` table — authoritative `scout` / `coach` rows for approved accounts (used by `useScoutAccess`)

We treat a user as "team audience" if **any** of:
1. `localStorage.userRole === 'scout'`
2. `localStorage.selectedRole === 'Scout/Coach'`
3. `useScoutAccess()` returns `isScout || isCoach`

## Approach
Add a per-node audience flag to `demo_registry` and filter in the registry hook. No component-level branching, no duplicated lists.

### 1. DB migration
- Add column `demo_registry.audience text not null default 'all'` with check constraint `audience in ('all','team')`.
- Set `audience = 'team'` for these slugs (all 3 tier mirrors):
  - categories: `coach-hub-5tool`, `coach-hub-golden2way`, `coach-hub-pitcher`
  - submodules: `ask-the-coach-5tool|golden2way|pitcher`, `scout-feed-5tool|golden2way|pitcher`
- Public read RLS already allows everyone to fetch — filtering happens client-side, which is fine since this is marketing/preview content (no PII).

### 2. New hook `useDemoAudience`
Returns `'team' | 'player'`. Reads localStorage synchronously and layers in `useScoutAccess` once auth resolves. Memoized.

### 3. `useDemoRegistry` change
After fetching nodes, filter out any node where `audience === 'team'` unless `useDemoAudience() === 'team'`. Bump `CACHE_KEY` to `demo_registry_v3` so existing caches drop the new column gracefully.

### 4. TypeScript
Add `audience: 'all' | 'team'` to the `DemoNode` interface.

## Out of scope
- Reverse gating (hiding player-only nodes from scouts) — scouts/coaches still see everything.
- A signup-time toggle for "I'm a parent evaluating for my player" — current heuristic is good enough.
- Server-side RLS audience enforcement — content is non-sensitive marketing copy.
- Owner/Admin dashboard changes.

## Files touched
- New migration (column + backfill)
- `src/hooks/useDemoRegistry.ts` (filter + type + cache key bump)
- New `src/hooks/useDemoAudience.ts`
- No changes to `DemoRoot`, `DemoTier`, `DemoCategory`, or the shells themselves.