
# Game IQ 101 — Elite Expansion & Owner Authoring Plan

You asked four things. Answers first, then the execution plan.

## Direct answers

1. **Pitcher submodules wired?** Not yet. `CompletePitcher.tsx` has no Game IQ entry. `FiveToolPlayer.tsx` / `GoldenTwoWay.tsx` reference IQ only via the sidebar. We will add a dedicated **Pitching IQ** lens entry in CompletePitcher for both Baseball and Softball (windmill vs. overhand variants), plus a Pitcher-only filter on `/iq?lens=pitching`.

2. **Does it have enough information?** Today: **4 published situations**. That is a proof-of-engine, not a market-beating product. To clear the "Polk / Geng / Inmotion / Yost / Cox" bar we target **120 canonical situations per sport** (240 total), each with full 9-defender Three B's matrix + 5 offensive actors, 3+ scenario variants, calls, mistakes, elite cues, sources. Released in **waves of ~20** until we hit 120/120.

3. **Will it ever run out?** No — by design. Each published situation is multiplied by the deterministic variant generator (count × outs × runners × score-state × inning × handedness × opponent tendency = **thousands of unique reps per situation**) and gated by SM-2 spaced repetition. At 240 situations that's **>500k unique reps** before any repeat at the same mastery interval. Plus the Owner Library lets you keep adding forever.

4. **Owner authoring system E2E?** Not built yet. The DB tables exist (`iq_situations`, `iq_situation_actors`, `iq_scenarios`, `iq_owner_review_log`) and an empty publishing gate. We will build **Owner → Game IQ Library** at `/owner/iq-library` with: list/search/filter, situation wizard (metadata → actor matrix on the same `IqDiamond` → scenarios → Three B's validator → triple-check → publish), variant authoring, and review log. Labeled **"Game IQ Library"** in the Owner dashboard nav, next to "Build Library".

---

## Execution waves

### Wave A — Pitcher integration & discoverability (small)
- Add **Game IQ — Pitching lens** card to `CompletePitcher.tsx` (Baseball + Softball variants; deep-link to `/iq?lens=pitching&sport=<x>`).
- Add to `FiveToolPlayer.tsx`, `GoldenTwoWay.tsx`, `CompleteHitter.tsx`, `CompletePlayer.tsx`, `BaserunningIQ.tsx` so every role-based module exposes its lens.
- Make `/iq` honor `?sport=` and `?lens=` query params for deep links.

### Wave B — Owner Library E2E (the authoring system)
- New page `src/pages/owner/IqLibrary.tsx` (route `/owner/iq-library`, label **"Game IQ Library"** in OwnerDashboard nav).
- Components:
  - `IqLibraryList.tsx` — table with sport/lens/difficulty/status filters, mastery telemetry, "Needs review" badges.
  - `IqSituationWizard.tsx` — 5-step flow: Metadata → **Actor Matrix** (re-uses `IqDiamond` for drag-place + assignment dropdowns per role) → Scenarios + distractors → Variant rules → Triple-check & publish.
  - `IqValidatorPanel.tsx` — live `validateThreeBs()` + completeness gates; refuses publish unless all 9 defenders assigned, ≥1 scenario, ≥1 source cited.
  - `IqOwnerReviewLog.tsx` — write to `iq_owner_review_log` on every publish/edit/archive.
- Hooks: `useIqUpsertSituation`, `useIqUpsertActors`, `useIqUpsertScenario`, `useIqPublish`, `useIqOwnerReviewLog`.
- Hammer's daily plan (`src/lib/hammer/dailyPlan.ts`): inject 1 IQ micro-rep/day + 1 weekly deep block (already stubbed; tighten selection to user's position + due queue).

### Wave C — Canonical content expansion (the bulk of the work, in sub-waves)
Target: **240 situations** (120 Baseball + 120 Softball). Authored as seed migrations, each batch with full actor matrices, ≥1 scenario, 3+ variants, sources from Polk / Geng / Inmotion / Yost / Cox / MLB & AUSL coaching manuals.

Sub-waves of 20 situations each. Pitching-heavy coverage first since you flagged pitchers:

- **C1 — Pitcher Fielding & PFP (20)**: comebackers, 1-3-1 DP, 3-1 cover, bunt coverage (1B/3B charging), 1st-and-3rd defense (cut/no-cut/look-back), pickoffs (1B/2B daylight/timing/inside move), back-picks, rundowns initiated by P, wild pitch with R3, slow roller decisions, infield fly with R-on, intentional walk holds.
- **C2 — Catcher IQ (20)**: blocking with runners, pop-ups by zone, throws to all bases, pickoffs, framing legality, plays at the plate (tag/swipe/blocking-the-plate rule), passed-ball reads, signs/mound visits, foul-tip protocols, 1st-and-3rd defense calls (catcher-initiated).
- **C3 — Infield Cutoffs / Relays / Bunt Defense (20)**: every relay alignment (LF/CF/RF single, double, triple), trail-runner reads, bunt coverages (rotation, wheel, crash, fake-bunt-slash), DP feeds, tag vs. force reads, infield in/back/halfway, drawn-in corners.
- **C4 — Outfield IQ (20)**: hit-the-cutoff vs. throw-through, do-or-die, gap reads, sun/wind/wall positioning, communication (centerfield supremacy), backing-up bases on infield throws (the "third B" most teams skip).
- **C5 — Offense & Baserunning IQ (20)**: leadoffs by base/count/outs, secondary leads, hit-and-run, run-and-hit, slug bunt, suicide squeeze, safety squeeze, tag-up rules by depth, first-to-third reads, scoring from 2nd on singles by field, delayed steals, busted hit-and-run recovery.
- **C6 — Game Management / Late-Inning (20)**: extra-innings ghost-runner positioning, no-doubles defense, infield-in late, pulling the infield back, pitcher-batter matchups, lefty-righty late switches, intentional walks to set up DP, double-switch rules, replay-challenge triggers.

After C6 we have 120 per sport. Each sub-wave is one migration + a re-validation pass through `validateThreeBs`.

### Wave D — Self-regulation & quality controls
- **Triple-check gate**: `iq_situations.triple_check_count >= 3` required to publish (already in schema; enforce in wizard).
- **Source citation gate**: ≥1 entry in `sources[]` (Polk, Geng, Inmotion, Yost, Cox, MLB.com, USA Softball, AUSL coaching docs).
- **Spaced repetition tuning**: confirm SM-2 surfaces the right next-due each day; cap daily reps to avoid burnout.
- **Variant freshness**: ensure variant generator never produces an illegal state (e.g. 4 balls).
- Vitest coverage: `threeBs.test.ts`, `variantGenerator.test.ts`, `spacedRepetition.test.ts`, `iq-library-publish.test.ts`.

### Wave E — Visual polish
- Animated routes on `IqDiamond` (per-actor easing, communication call popups).
- Lens-tinted theming (defense / offense / pitching / baserunning) already token-backed.
- Mobile-first card stack with swipe between actors in scenario runner.

---

## Technical notes

- **Owner route**: `/owner/iq-library`, gated by existing owner role check used by `ProgramBuilder`.
- **Sidebar label**: "Game IQ Library" under the Owner section of `AppSidebar.tsx`.
- **DB**: no new tables needed — existing `iq_*` schema covers it. Content ships as approved Supabase migrations (one per sub-wave).
- **Pitcher deep links**: `/iq?sport=baseball&lens=pitching` and `?sport=softball&lens=pitching`. `GameIq.tsx` already reads `useSportTheme`; we add `useSearchParams` to seed initial tab.
- **Hammer integration**: `dailyPlan.ts` queries `iq_user_progress` for due items and prepends an "IQ rep" block sorted by category goals.

---

## Suggested approval order

If you want, I can execute **Wave A + Wave B + Wave C1 (Pitcher Fielding 20)** as the first build pass — that gets pitchers covered immediately, ships your authoring tool, and proves the content pipeline. Then C2…C6 land in subsequent approved passes until 240 is reached.

Confirm and I'll begin with A + B + C1.
