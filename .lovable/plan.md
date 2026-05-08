# Scouting in demo + Ask the Coach + Scout demo

## Answer first: scouting in the demo today

No. The demo registry has 55 nodes across `5tool`, `golden2way`, `pitcher` — all athlete-facing. There is **no scout or coach surface** in `demo_registry`, no scout/coach shells under `src/components/demo/shells/`, and no persona switch on `DemoRoot`. Scouts and coaches currently see only athlete previews.

This pass adds both: a coach demo and a scout demo.

## What gets built

Two new demo shells + registry seeding. All presentation-only, deterministic, safe inside the demo firewall (`x-demo-session: 1`). No edge functions, no RLS, no real AI calls.

### 1. AskTheCoachDemo

`src/components/demo/shells/AskTheCoachDemo.tsx` — chat-style preview that mirrors `AskHammerPanel` styling.

- 6 canned coach prompts as suggestion chips:
  - "Show my team's weakest hitters this week"
  - "Which pitchers are at CNS overload risk?"
  - "Build a 45-min team practice for tomorrow"
  - "Who improved most in the last 14 days?"
  - "Flag athletes missing nutrition logs"
  - "Generate a coaching note on player #12"
- Each chip plays a **scripted streamed response** (token-by-token via `setTimeout`) with a small inline evidence card (mini bar list of athletes / CNS gauge / practice block list). Reuses existing demo viz primitives where possible.
- Footer chip: "Preview only — full Coach Hub unlocks with a Coach seat."

### 2. ScoutFeedDemo

`src/components/demo/shells/ScoutFeedDemo.tsx` — mock scout console.

- **Player feed (left)**: 5 mock athlete cards with position, age, MPI, trend arrow, and a "rising / steady / cooling" badge. Click selects.
- **Player snapshot (right)**: top 3 tools as bars, last 3 game lines, one elite badge, a sample scouting note.
- **Action row (disabled w/ tooltip)**: "Follow", "Save to list", "Generate report" — all show `Lock` icon + "Unlocks with Scout seat".
- Optional "Sort by: MPI / Trend / Recently Active" tabs (purely visual sort of the mock list).

### 3. Registry seeding (one migration)

Add a new **category** `for-your-team` with two submodules under it, mirrored under each of the 3 tiers so every persona's demo tree shows them. Idempotent inserts.

- Categories: `coach-hub-5tool`, `coach-hub-g2w`, `coach-hub-pitcher` (parent = tier slug, title "For Your Team")
- Submodules per category:
  - `ask-the-coach-{tier}` → `component_key='ask-the-coach'`, title "Ask the Coach", tagline "See what coaches see"
  - `scout-feed-{tier}` → `component_key='scout-feed'`, title "Scout Feed", tagline "What scouts see when they find you"

### 4. Component registry

Edit `src/components/demo/DemoComponentRegistry.ts` to register the two new keys (`ask-the-coach`, `scout-feed`).

## Files

- create `src/components/demo/shells/AskTheCoachDemo.tsx`
- create `src/components/demo/shells/ScoutFeedDemo.tsx`
- edit  `src/components/demo/DemoComponentRegistry.ts`
- create `supabase/migrations/<ts>_demo_coach_and_scout.sql`

## Out of scope

- Real coach/scout LLM chat (separate feature, gated by seat).
- Coach/scout persona toggle on `DemoRoot` landing — keeping tier-first navigation; the new category surfaces inside each tier instead.
- Any change to Owner dashboard, real scout flow, or RLS.
